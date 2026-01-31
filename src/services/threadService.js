import Thread from "../models/Thread.js";
import Like from "../models/Like.js";
import Reply from "../models/Reply.js";
import Follow from "../models/Follow.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js"; // Import Notification model to create likes notifications
import settingsService from "./settingsService.js";
import userService from "./userService.js";
import notificationService from "./notificationService.js";

class ThreadService {
  /**
   * Créer un thread
   */
  async createThread(authorId, content, media = null) {
    try {
      const thread = await Thread.create({
        author: authorId,
        content,
        media,
      });

      // Incrémenter le compteur de threads de l'utilisateur
      await userService.incrementThreadsCount(authorId);

      // Détecter et créer les notifications de mention
      await notificationService.createMentionNotifications(
        content,
        authorId,
        thread._id
      );

      // Populate l'auteur
      await thread.populate(
        "author",
        "username name profilePicture isVerified"
      );

      return thread;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtenir tous les threads avec pagination et respect de la confidentialité (Explore Feed)
   */
  async getAllThreads(page = 1, limit = 20, currentUserId = null) {
    try {
      const skip = (page - 1) * limit;

      const privateUsers = await User.find({ isPrivate: true }).select("_id");
      const privateUserIds = privateUsers.map((user) => user._id);

      let followedPrivateUsers = [];
      if (currentUserId) {
        const follows = await Follow.find({
          follower: currentUserId,
          status: "accepte",
        }).select("following");
        followedPrivateUsers = follows.map((f) => f.following.toString());
      }

      const query = {
        $or: [
          // Threads des comptes publics
          { author: { $nin: privateUserIds } },
          // Threads de l'utilisateur connecté (seulement si connecté)
          ...(currentUserId ? [{ author: currentUserId }] : []),
          // Threads des comptes privés suivis (seulement si connecté)
          ...(currentUserId && followedPrivateUsers.length > 0
            ? [{ author: { $in: followedPrivateUsers } }]
            : []),
        ],
      };

      const threads = await Thread.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "author",
          "username name profilePicture isVerified isPrivate"
        );

      const total = await Thread.countDocuments(query);

      // Ajouter isLiked et isFollowing pour chaque thread
      let threadsWithLikes = threads;
      if (currentUserId) {
        // Pré-charger les utilisateurs suivis pour éviter N requêtes
        const followedUsers = await Follow.find({
          follower: currentUserId,
          status: { $in: ["accepte", "en_attente"] }
        }).select("following status");

        const followedMap = new Map();
        followedUsers.forEach(f => {
          followedMap.set(f.following.toString(), f.status);
        });

        threadsWithLikes = await Promise.all(
          threads.map(async (thread) => {
            const isLiked = await Like.exists({
              user: currentUserId,
              thread: thread._id,
            });

            const authorId = thread.author._id.toString();
            const followStatus = followedMap.get(authorId);
            const isFollowing = !!followStatus;

            return {
              ...thread.toObject(),
              isLiked: !!isLiked,
              repliesCount: thread.replies ? thread.replies.length : 0,
              author: {
                ...thread.author.toObject(),
                isFollowing: isFollowing, // true si suivi ou en attente
                followStatus: followStatus // "accepte" ou "en_attente"
              }
            };
          })
        );
      } else {
        // Si pas d'utilisateur connecté, ajouter seulement le repliesCount
        threadsWithLikes = threads.map(thread => ({
          ...thread.toObject(),
          repliesCount: thread.replies ? thread.replies.length : 0,
        }));
      }

      return {
        threads: threadsWithLikes,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalThreads: total,
          hasMore: skip + threads.length < total,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtenir les threads des utilisateurs suivis (Home Feed)
   */
  async getFollowedThreads(page = 1, limit = 20, currentUserId) {
    try {
      if (!currentUserId) {
        return this.getAllThreads(page, limit, null);
      }

      const skip = (page - 1) * limit;

      // Trouver les IDs des utilisateurs suivis (acceptés)
      const follows = await Follow.find({
        follower: currentUserId,
        status: "accepte",
      }).select("following");

      const followedIds = follows.map((f) => f.following);

      // Inclure l'utilisateur lui-même dans son flux
      const authorIds = [...followedIds, currentUserId];

      // Trouver les IDs des utilisateurs privés
      const privateUsers = await User.find({ isPrivate: true }).select("_id");
      const privateUserIds = privateUsers.map((user) => user._id.toString());

      const query = {
        $or: [
          // 1. Posts des utilisateurs suivis (Followed)
          { author: { $in: followedIds } },
          // 2. Posts de l'utilisateur connecté (Self)
          { author: currentUserId },
          // 3. TOUS les posts publics (Public), même ceux non suivis
          // Exclure les auteurs privés qui ne sont PAS dans les suivis (déjà géré par le point 1 si suivis)
          // Mais plus simplement: on prend tout ce qui n'est pas privé
          { author: { $nin: privateUserIds } }
        ]
      };

      const threads = await Thread.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "author",
          "username name profilePicture isVerified isPrivate"
        );

      const total = await Thread.countDocuments(query);

      // Ajouter isLiked et isFollowing pour chaque thread
      // Note: followedIds contient déjà les IDs suivis (acceptés) récupérés plus haut, 
      // mais on doit aussi savoir s'il y a des "en_attente" et mapper pour chaque thread.
      // Récupérons le statut exact.

      const allFollows = await Follow.find({
        follower: currentUserId,
        status: { $in: ["accepte", "en_attente"] }
      }).select("following status");

      const followedMap = new Map();
      allFollows.forEach(f => {
        followedMap.set(f.following.toString(), f.status);
      });

      const threadsWithLikes = await Promise.all(
        threads.map(async (thread) => {
          const isLiked = await Like.exists({
            user: currentUserId,
            thread: thread._id,
          });

          const authorId = thread.author._id.toString();
          const followStatus = followedMap.get(authorId);

          return {
            ...thread.toObject(),
            isLiked: !!isLiked,
            repliesCount: thread.replies ? thread.replies.length : 0,
            author: {
              ...thread.author.toObject(),
              isFollowing: !!followStatus,
              followStatus: followStatus
            }
          };
        })
      );

      return {
        threads: threadsWithLikes,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalThreads: total,
          hasMore: skip + threads.length < total,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtenir un thread par ID avec vérification de confidentialité
   */
  async getThreadById(threadId, currentUserId = null) {
    try {
      const thread = await Thread.findById(threadId).populate(
        "author",
        "username name profilePicture isVerified isPrivate"
      );

      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      // Vérifier les permissions de visualisation avec les nouveaux paramètres
      if (
        currentUserId &&
        currentUserId.toString() !== thread.author._id.toString()
      ) {
        const canView = await settingsService.canViewContent(
          currentUserId,
          thread.author._id
        );
        if (!canView) {
          throw new Error("Ce thread est privé");
        }
      }

      const threadData = thread.toObject();

      // Vérifier si l'utilisateur a liké
      if (currentUserId) {
        const isLiked = await Like.exists({
          user: currentUserId,
          thread: threadId,
        });
        threadData.isLiked = !!isLiked;
      }

      // Récupérer les réponses
      const replies = await Reply.find({ thread: threadId })
        .sort({ createdAt: -1 })
        .populate("author", "username name profilePicture isVerified");

      threadData.replies = replies;
      threadData.repliesCount = replies.length;

      return threadData;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtenir les threads d'un utilisateur avec vérification de confidentialité
   */
  async getUserThreads(userId, page = 1, limit = 20, currentUserId = null) {
    try {
      const targetUser = await User.findById(userId);
      if (!targetUser) {
        throw new Error("Utilisateur non trouvé");
      }

      // Vérifier les permissions de visualisation avec les nouveaux paramètres
      if (currentUserId && currentUserId.toString() !== userId.toString()) {
        const canView = await settingsService.canViewContent(
          currentUserId,
          userId
        );
        if (!canView) {
          throw new Error("Ce compte est privé");
        }
      }

      const skip = (page - 1) * limit;

      const threads = await Thread.find({ author: userId })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "author",
          "username name profilePicture isVerified isPrivate"
        );

      const total = await Thread.countDocuments({ author: userId });

      // Ajouter isLiked et isFollowing pour chaque thread
      let threadsWithLikes = threads;
      if (currentUserId) {
        // Pré-charger les status de suivi
        const followedUsers = await Follow.find({
          follower: currentUserId,
          status: { $in: ["accepte", "en_attente"] }
        }).select("following status");

        threadsWithLikes = await Promise.all(
          threads.map(async (thread) => {
            const isLiked = await Like.exists({
              user: currentUserId,
              thread: thread._id,
            });

            const authorId = thread.author._id.toString();
            const followStatus = followedUsers.find(f => f.following.toString() === authorId);

            return {
              ...thread.toObject(),
              isLiked: !!isLiked,
              repliesCount: thread.replies ? thread.replies.length : 0,
              author: {
                ...thread.author.toObject(),
                isFollowing: !!followStatus,
                followStatus: followStatus ? followStatus.status : null
              }
            };
          })
        );
      } else {
        threadsWithLikes = threads.map(thread => ({
          ...thread.toObject(),
          repliesCount: thread.replies ? thread.replies.length : 0,
        }));
      }

      return {
        threads: threadsWithLikes,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          totalThreads: total,
          hasMore: skip + threads.length < total,
        },
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un thread
   */
  async deleteThread(threadId, userId) {
    try {
      const thread = await Thread.findById(threadId);

      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      // Vérifier que l'utilisateur est l'auteur
      if (thread.author.toString() !== userId.toString()) {
        throw new Error("Non autorisé à supprimer ce thread");
      }

      // Supprimer le thread
      await Thread.findByIdAndDelete(threadId);

      // Supprimer les likes et replies associés
      await Like.deleteMany({ thread: threadId });
      await Reply.deleteMany({ thread: threadId });

      // Décrémenter le compteur
      await userService.decrementThreadsCount(userId);

      return { message: "Thread supprimé avec succès" };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour un thread
   */
  async updateThread(threadId, userId, content, media = null) {
    try {
      const thread = await Thread.findById(threadId);

      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      // Vérifier que l'utilisateur est l'auteur
      if (thread.author.toString() !== userId.toString()) {
        throw new Error("Non autorisé à modifier ce thread");
      }

      // Mettre à jour le contenu si fourni
      if (content !== undefined && content !== null) {
        if (content.trim().length === 0) {
          throw new Error("Le contenu ne peut pas être vide");
        }
        if (content.length > 500) {
          throw new Error("Le contenu ne peut pas dépasser 500 caractères");
        }
        thread.content = content;
      }

      // Mettre à jour le media si fourni
      if (media !== null) {
        thread.media = media;
      }

      // Détecter et créer les notifications de mention si le contenu est mis à jour
      if (content && content !== thread.content) {
        await notificationService.createMentionNotifications(
          content,
          userId,
          threadId
        );
      }

      await thread.save();

      // Populate l'auteur pour le retourner
      await thread.populate(
        "author",
        "username name profilePicture isVerified"
      );

      return thread;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Liker un thread
   */
  async likeThread(threadId, userId) {
    try {
      const thread = await Thread.findById(threadId);

      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      // Vérifier si déjà liké
      const existingLike = await Like.findOne({
        user: userId,
        thread: threadId,
      });

      if (existingLike) {
        throw new Error("Vous avez déjà liké ce thread");
      }

      // Créer le like
      await Like.create({ user: userId, thread: threadId });

      // Ajouter l'utilisateur au tableau likes du thread
      thread.likes.push(userId);
      await thread.save();

      // Créer une notification si l'auteur accepte ce type de notification
      if (thread.author.toString() !== userId.toString()) {
        const canReceiveNotification =
          await settingsService.canReceiveNotification(
            thread.author,
            "thread_like",
            "inApp"
          );

        if (canReceiveNotification) {
          await Notification.create({
            type: "thread_like",
            recipient: thread.author,
            sender: userId,
            thread: threadId,
          });
        }
      }

      return { message: "Thread liké", likesCount: thread.likes.length };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Rechercher des threads par contenu
   */
  async searchThreads(query, page = 1, limit = 20, currentUserId = null) {
    try {
      const skip = (page - 1) * limit;

      // Pipeline de recherche avec respect de la confidentialité
      const searchPipeline = [
        {
          $match: {
            content: { $regex: query, $options: "i" }
          }
        },
        {
          $lookup: {
            from: "users",
            localField: "author",
            foreignField: "_id",
            as: "authorInfo"
          }
        },
        {
          $unwind: "$authorInfo"
        },
        // Filtrer les threads privés si l'utilisateur n'est pas autorisé
        {
          $addFields: {
            canView: {
              $or: [
                { $eq: ["$authorInfo.isPrivate", false] }, // Thread public
                { $eq: ["$authorInfo._id", currentUserId] }, // Propriétaire
                // Si l'utilisateur est un follower accepté (requiert une jointure supplémentaire)
              ]
            }
          }
        },
        {
          $match: { canView: true }
        },
        {
          $sort: { createdAt: -1 }
        },
        {
          $skip: skip
        },
        {
          $limit: limit
        },
        {
          $lookup: {
            from: "likes",
            localField: "_id",
            foreignField: "thread",
            as: "likes"
          }
        },
        {
          $lookup: {
            from: "replies",
            localField: "_id",
            foreignField: "thread",
            as: "replies"
          }
        },
        {
          $project: {
            content: 1,
            media: 1,
            createdAt: 1,
            updatedAt: 1,
            likesCount: 1,
            repliesCount: 1,
            author: {
              _id: "$authorInfo._id",
              username: "$authorInfo.username",
              name: "$authorInfo.name",
              profilePicture: "$authorInfo.profilePicture",
              isVerified: "$authorInfo.isVerified",
              isPrivate: "$authorInfo.isPrivate"
            },
            isLiked: {
              $in: [currentUserId, "$likes.user"]
            },
            likes: 1,
            replies: 1
          }
        }
      ];

      const threads = await Thread.aggregate(searchPipeline);

      // Ajouter les informations de like et reply si connecté
      if (currentUserId) {
        for (const thread of threads) {
          // Vérifier si l'utilisateur actuel a liké
          thread.isLiked = thread.likes.some(like =>
            like.user && like.user.toString() === currentUserId.toString()
          );
        }
      }

      return {
        threads,
        pagination: {
          page,
          limit,
          hasMore: threads.length === limit
        }
      };
    } catch (error) {
      throw new Error("Erreur lors de la recherche des threads");
    }
  }

  /**
   * Unliker un thread
   */
  async unlikeThread(threadId, userId) {
    try {
      const thread = await Thread.findById(threadId);

      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      // Supprimer le like
      const result = await Like.findOneAndDelete({
        user: userId,
        thread: threadId,
      });

      if (!result) {
        throw new Error("Like non trouvé");
      }

      // Retirer l'utilisateur du tableau likes du thread
      thread.likes = thread.likes.filter(like => like.toString() !== userId.toString());
      await thread.save();

      return { message: "Like retiré", likesCount: thread.likes.length };
    } catch (error) {
      throw error;
    }
  }
}

export default new ThreadService();