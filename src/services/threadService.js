import Thread from "../models/Thread.js";
import Like from "../models/Like.js";
import Reply from "../models/Reply.js";
import Follow from "../models/Follow.js";
import User from "../models/User.js";
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

      await userService.incrementThreadsCount(authorId);
      await notificationService.createMentionNotifications(
        content,
        authorId,
        thread._id,
      );

      await thread.populate(
        "author",
        "username name profilePicture isVerified",
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
          { author: { $nin: privateUserIds } },
          ...(currentUserId ? [{ author: currentUserId }] : []),
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
          "username name profilePicture isVerified isPrivate",
        );

      const total = await Thread.countDocuments(query);

      let threadsWithLikes = threads;
      if (currentUserId) {
        const followedUsers = await Follow.find({
          follower: currentUserId,
          status: { $in: ["accepte", "en_attente"] },
        }).select("following status");

        const followedMap = new Map();
        followedUsers.forEach((f) => {
          if (f.following) {
            followedMap.set(f.following.toString(), f.status);
          }
        });

        const userReposts = await Thread.find({
          author: currentUserId,
          repostedFrom: { $exists: true, $ne: null },
        }).select("repostedFrom");

        const repostedMap = new Map();
        userReposts.forEach((repost) => {
          if (repost.repostedFrom) {
            repostedMap.set(repost.repostedFrom.toString(), true);
          }
        });

        threadsWithLikes = (
          await Promise.all(
            threads.map(async (thread) => {
              if (!thread.author) {
                return null;
              }
            const isLiked = await Like.exists({
              user: currentUserId,
              thread: thread._id,
            });

            const authorId = thread.author._id.toString();
            const followStatus = followedMap.get(authorId);
            const isFollowing = !!followStatus;
            const repostSourceId =
              thread.repostedFrom?._id || thread.repostedFrom || thread._id;
            const isReposted = repostedMap.has(repostSourceId.toString());

            let threadData = thread.toObject();

            // Populate repostedFrom avec toutes les infos nécessaires
            if (thread.repostedFrom) {
              await thread.populate({
                path: "repostedFrom",
                select:
                  "author content media likes replies repliesCount repostsCount createdAt updatedAt",
                populate: {
                  path: "author",
                  select: "username name profilePicture isVerified",
                },
              });

              // Ajouter isLiked pour le post original aussi
              const originalThreadId =
                thread.repostedFrom?._id || thread.repostedFrom;
              const originalIsLiked = originalThreadId
                ? await Like.exists({
                    user: currentUserId,
                    thread: originalThreadId,
                  })
                : false;

              const originalAuthor =
                typeof thread.repostedFrom.author?.toObject === "function"
                  ? thread.repostedFrom.author.toObject()
                  : thread.repostedFrom.author;
              const originalAuthorId = originalAuthor?._id?.toString();
              const originalFollowStatus = originalAuthorId
                ? followedMap.get(originalAuthorId)
                : null;

              threadData.repostedFrom = {
                ...thread.repostedFrom.toObject(),
                isLiked: !!originalIsLiked,
                likesCount: thread.repostedFrom.likes?.length || 0,
                author: originalAuthor
                  ? {
                      ...originalAuthor,
                      isFollowing: !!originalFollowStatus,
                      followStatus: originalFollowStatus,
                    }
                  : originalAuthor,
              };
            }

            return {
              ...threadData,
              isLiked: !!isLiked,
              isReposted,
              author: {
                ...thread.author.toObject(),
                isFollowing: isFollowing,
                followStatus: followStatus,
              },
            };
          }),
        )
      ).filter(Boolean);
      } else {
        // Même sans utilisateur connecté, populate repostedFrom
        threadsWithLikes = (
          await Promise.all(
            threads.map(async (thread) => {
              if (!thread.author) {
                return null;
              }
            let threadData = thread.toObject();

            if (thread.repostedFrom) {
              await thread.populate({
                path: "repostedFrom",
                select:
                  "author content media likes replies repliesCount repostsCount createdAt updatedAt",
                populate: {
                  path: "author",
                  select: "username name profilePicture isVerified",
                },
              });

              threadData.repostedFrom = {
                ...thread.repostedFrom.toObject(),
                likesCount: thread.repostedFrom.likes?.length || 0,
              };
            }

            return threadData;
          }),
        )
      ).filter(Boolean);
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

      const follows = await Follow.find({
        follower: currentUserId,
        status: "accepte",
      }).select("following");

      const followedIds = follows.map((f) => f.following);

      const privateUsers = await User.find({ isPrivate: true }).select("_id");
      const privateUserIds = privateUsers.map((user) => user._id.toString());

      const query = {
        $or: [
          { author: { $in: followedIds } },
          { author: currentUserId },
          { author: { $nin: privateUserIds } },
        ],
      };

      const threads = await Thread.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "author",
          "username name profilePicture isVerified isPrivate",
        );

      const total = await Thread.countDocuments(query);

      const allFollows = await Follow.find({
        follower: currentUserId,
        status: { $in: ["accepte", "en_attente"] },
      }).select("following status");

      const followedMap = new Map();
      allFollows.forEach((f) => {
        if (f.following) {
          followedMap.set(f.following.toString(), f.status);
        }
      });

      const userReposts = await Thread.find({
        author: currentUserId,
        repostedFrom: { $exists: true, $ne: null },
      }).select("repostedFrom");

      const repostedMap = new Map();
      userReposts.forEach((repost) => {
        if (repost.repostedFrom) {
          repostedMap.set(repost.repostedFrom.toString(), true);
        }
      });

      const threadsWithLikes = (
        await Promise.all(
          threads.map(async (thread) => {
            if (!thread.author) {
              return null;
            }
          const isLiked = await Like.exists({
            user: currentUserId,
            thread: thread._id,
          });

          const authorId = thread.author._id.toString();
          const followStatus = followedMap.get(authorId);
          const repostSourceId =
            thread.repostedFrom?._id || thread.repostedFrom || thread._id;
          const isReposted = repostedMap.has(repostSourceId.toString());

          let threadData = thread.toObject();

          // Populate repostedFrom avec toutes les infos
          if (thread.repostedFrom) {
            await thread.populate({
              path: "repostedFrom",
              select:
                "author content media likes replies repliesCount repostsCount createdAt updatedAt",
              populate: {
                path: "author",
                select: "username name profilePicture isVerified",
              },
            });

            const originalThreadId =
              thread.repostedFrom?._id || thread.repostedFrom;
            const originalIsLiked = originalThreadId
              ? await Like.exists({
                  user: currentUserId,
                  thread: originalThreadId,
                })
              : false;

            const originalAuthor =
              typeof thread.repostedFrom.author?.toObject === "function"
                ? thread.repostedFrom.author.toObject()
                : thread.repostedFrom.author;
            const originalAuthorId = originalAuthor?._id?.toString();
            const originalFollowStatus = originalAuthorId
              ? followedMap.get(originalAuthorId)
              : null;

            threadData.repostedFrom = {
              ...thread.repostedFrom.toObject(),
              isLiked: !!originalIsLiked,
              likesCount: thread.repostedFrom.likes?.length || 0,
              author: originalAuthor
                ? {
                    ...originalAuthor,
                    isFollowing: !!originalFollowStatus,
                    followStatus: originalFollowStatus,
                  }
                : originalAuthor,
            };
          }

          return {
            ...threadData,
            isLiked: !!isLiked,
            isReposted,
            author: {
              ...thread.author.toObject(),
              isFollowing: !!followStatus,
              followStatus: followStatus,
            },
          };
        }),
      )
    ).filter(Boolean);

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
        "username name profilePicture isVerified isPrivate",
      );

      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      if (!thread.author) {
        throw new Error("Auteur du thread non trouvé");
      }

      if (
        currentUserId &&
        currentUserId.toString() !== thread.author._id.toString()
      ) {
        const canView = await settingsService.canViewContent(
          currentUserId,
          thread.author._id,
        );
        if (!canView) {
          throw new Error("Ce thread est privé");
        }
      }

      const threadData = thread.toObject();

      if (currentUserId) {
        const isLiked = await Like.exists({
          user: currentUserId,
          thread: threadId,
        });
        threadData.isLiked = !!isLiked;

        const repostSourceId =
          thread.repostedFrom?._id || thread.repostedFrom || threadId;
        const isReposted = await Thread.exists({
          author: currentUserId,
          repostedFrom: repostSourceId,
        });
        threadData.isReposted = !!isReposted;

        const followStatus = await Follow.findOne({
          follower: currentUserId,
          following: thread.author._id,
          status: { $in: ["accepte", "en_attente"] },
        }).select("status");

        if (threadData.author) {
          threadData.author = {
            ...threadData.author,
            isFollowing: !!followStatus,
            followStatus: followStatus?.status,
          };
        }
      }

      // Populate repostedFrom avec toutes les infos
      if (thread.repostedFrom) {
        await thread.populate({
          path: "repostedFrom",
          select:
            "author content media likes replies repliesCount repostsCount createdAt updatedAt",
          populate: {
            path: "author",
            select: "username name profilePicture isVerified",
          },
        });

        if (currentUserId) {
          const originalThreadId =
            thread.repostedFrom?._id || thread.repostedFrom;
          const originalIsLiked = originalThreadId
            ? await Like.exists({
                user: currentUserId,
                thread: originalThreadId,
              })
            : false;
          const originalAuthorId = thread.repostedFrom?.author?._id;
          const originalFollowStatus = originalAuthorId
            ? await Follow.findOne({
                follower: currentUserId,
                following: originalAuthorId,
                status: { $in: ["accepte", "en_attente"] },
              }).select("status")
            : null;

          threadData.repostedFrom = {
            ...thread.repostedFrom.toObject(),
            isLiked: !!originalIsLiked,
            likesCount: thread.repostedFrom.likes?.length || 0,
            author: thread.repostedFrom.author
              ? {
                  ...thread.repostedFrom.author.toObject(),
                  isFollowing: !!originalFollowStatus,
                  followStatus: originalFollowStatus?.status,
                }
              : thread.repostedFrom.author,
          };
        } else {
          threadData.repostedFrom = {
            ...thread.repostedFrom.toObject(),
            likesCount: thread.repostedFrom.likes?.length || 0,
          };
        }
      }

      const replies = await Reply.find({ thread: threadId })
        .sort({ createdAt: -1 })
        .populate("author", "username name profilePicture isVerified");

      threadData.replies = replies;

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

      if (currentUserId && currentUserId.toString() !== userId.toString()) {
        const canView = await settingsService.canViewContent(
          currentUserId,
          userId,
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
          "username name profilePicture isVerified isPrivate",
        );

      const total = await Thread.countDocuments({ author: userId });

      let threadsWithLikes = threads;
      if (currentUserId) {
        const followedUsers = await Follow.find({
          follower: currentUserId,
          status: { $in: ["accepte", "en_attente"] },
        }).select("following status");

        const followedMap = new Map();
        followedUsers.forEach((f) => {
          if (f.following) {
            followedMap.set(f.following.toString(), f.status);
          }
        });

        const userReposts = await Thread.find({
          author: currentUserId,
          repostedFrom: { $exists: true, $ne: null },
        }).select("repostedFrom");

        const repostedMap = new Map();
        userReposts.forEach((repost) => {
          if (repost.repostedFrom) {
            repostedMap.set(repost.repostedFrom.toString(), true);
          }
        });

        threadsWithLikes = (
          await Promise.all(
            threads.map(async (thread) => {
              if (!thread.author) {
                return null;
              }
            const isLiked = await Like.exists({
              user: currentUserId,
              thread: thread._id,
            });

            const authorId = thread.author._id.toString();
            const followStatus = followedMap.get(authorId);
            const repostSourceId =
              thread.repostedFrom?._id || thread.repostedFrom || thread._id;
            const isReposted = repostedMap.has(repostSourceId.toString());

            let threadData = thread.toObject();

            // Populate repostedFrom
            if (thread.repostedFrom) {
              await thread.populate({
                path: "repostedFrom",
                select:
                  "author content media likes replies repliesCount repostsCount createdAt updatedAt",
                populate: {
                  path: "author",
                  select: "username name profilePicture isVerified",
                },
              });

              const originalThreadId =
                thread.repostedFrom?._id || thread.repostedFrom;
              const originalIsLiked = originalThreadId
                ? await Like.exists({
                    user: currentUserId,
                    thread: originalThreadId,
                  })
                : false;

              const originalAuthor =
                typeof thread.repostedFrom.author?.toObject === "function"
                  ? thread.repostedFrom.author.toObject()
                  : thread.repostedFrom.author;
              const originalAuthorId = originalAuthor?._id?.toString();
              const originalFollowStatus = originalAuthorId
                ? followedMap.get(originalAuthorId)
                : null;

              threadData.repostedFrom = {
                ...thread.repostedFrom.toObject(),
                isLiked: !!originalIsLiked,
                likesCount: thread.repostedFrom.likes?.length || 0,
                author: originalAuthor
                  ? {
                      ...originalAuthor,
                      isFollowing: !!originalFollowStatus,
                      followStatus: originalFollowStatus,
                    }
                  : originalAuthor,
              };
            }

            return {
              ...threadData,
              isLiked: !!isLiked,
              isReposted,
              author: {
                ...thread.author.toObject(),
                isFollowing: !!followStatus,
                followStatus: followStatus,
              },
            };
          }),
        )
      ).filter(Boolean);
      } else {
        // Sans utilisateur connecté, populate quand même repostedFrom
        threadsWithLikes = (
          await Promise.all(
            threads.map(async (thread) => {
              if (!thread.author) {
                return null;
              }
            let threadData = thread.toObject();

            if (thread.repostedFrom) {
              await thread.populate({
                path: "repostedFrom",
                select:
                  "author content media likes replies repliesCount repostsCount createdAt updatedAt",
                populate: {
                  path: "author",
                  select: "username name profilePicture isVerified",
                },
              });

              threadData.repostedFrom = {
                ...thread.repostedFrom.toObject(),
                likesCount: thread.repostedFrom.likes?.length || 0,
              };
            }

            return threadData;
          }),
        )
      ).filter(Boolean);
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
   * Reposter un thread (repost)
   */
  async repostThread(threadId, userId) {
    try {
      const originalThread = await Thread.findById(threadId).populate(
        "author",
        "username name",
      );
      if (!originalThread) {
        throw new Error("Thread non trouvé");
      }

      const existingRepost = await Thread.findOne({
        author: userId,
        repostedFrom: threadId,
      });

      if (existingRepost) {
        throw new Error("Vous avez déjà reposté ce thread");
      }

      if (originalThread.author._id.toString() === userId.toString()) {
        throw new Error("Vous ne pouvez pas reposter votre propre thread");
      }

      const authorName =
        originalThread.author.name ||
        originalThread.author.username ||
        "utilisateur";

      const repost = await Thread.create({
        author: userId,
        content: `Repost de ${authorName}`,
        repostedFrom: threadId,
      });

      await Thread.findByIdAndUpdate(threadId, { $inc: { repostsCount: 1 } });
      await userService.incrementThreadsCount(userId);

      if (originalThread.author._id.toString() !== userId.toString()) {
        await notificationService.createNotification({
          recipient: originalThread.author._id,
          sender: userId,
          type: "thread_repost",
          thread: threadId,
        });
      }

      // Populate avec toutes les infos nécessaires
      await repost.populate([
        { path: "author", select: "username name profilePicture isVerified" },
        {
          path: "repostedFrom",
          select:
            "author content media likes replies repliesCount repostsCount createdAt updatedAt",
          populate: {
            path: "author",
            select: "username name profilePicture isVerified",
          },
        },
      ]);

      return repost;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Rechercher des threads par contenu
   */
  async searchThreads(query, page = 1, limit = 10, currentUserId = null) {
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

      const searchQuery = {
        content: { $regex: query, $options: "i" },
        $or: [
          { author: { $nin: privateUserIds } },
          ...(currentUserId ? [{ author: currentUserId }] : []),
          ...(currentUserId && followedPrivateUsers.length > 0
            ? [{ author: { $in: followedPrivateUsers } }]
            : []),
        ],
      };

      const threads = await Thread.find(searchQuery)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate(
          "author",
          "username name profilePicture isVerified isPrivate",
        );

      const total = await Thread.countDocuments(searchQuery);

      let threadsWithLikes = threads;
      if (currentUserId) {
        const followedUsers = await Follow.find({
          follower: currentUserId,
          status: { $in: ["accepte", "en_attente"] },
        }).select("following status");

        const followedMap = new Map();
        followedUsers.forEach((f) => {
          if (f.following) {
            followedMap.set(f.following.toString(), f.status);
          }
        });

        const userReposts = await Thread.find({
          author: currentUserId,
          repostedFrom: { $exists: true, $ne: null },
        }).select("repostedFrom");

        const repostedMap = new Map();
        userReposts.forEach((repost) => {
          if (repost.repostedFrom) {
            repostedMap.set(repost.repostedFrom.toString(), true);
          }
        });

        threadsWithLikes = (
          await Promise.all(
            threads.map(async (thread) => {
              if (!thread.author) {
                return null;
              }
              const isLiked = await Like.exists({
                user: currentUserId,
                thread: thread._id,
              });

              const authorId = thread.author._id.toString();
              const followStatus = followedMap.get(authorId);
            const repostSourceId =
              thread.repostedFrom?._id || thread.repostedFrom || thread._id;
              const isReposted = repostedMap.has(repostSourceId.toString());

              let threadData = thread.toObject();

              if (thread.repostedFrom) {
                await thread.populate({
                  path: "repostedFrom",
                  select:
                    "author content media likes replies repliesCount repostsCount createdAt updatedAt",
                  populate: {
                    path: "author",
                    select: "username name profilePicture isVerified",
                  },
                });

                const originalThreadId =
                  thread.repostedFrom?._id || thread.repostedFrom;
                const originalIsLiked = originalThreadId
                  ? await Like.exists({
                      user: currentUserId,
                      thread: originalThreadId,
                    })
                  : false;

                const originalAuthor =
                  typeof thread.repostedFrom.author?.toObject === "function"
                    ? thread.repostedFrom.author.toObject()
                    : thread.repostedFrom.author;
                const originalAuthorId = originalAuthor?._id?.toString();
                const originalFollowStatus = originalAuthorId
                  ? followedMap.get(originalAuthorId)
                  : null;

                threadData.repostedFrom = {
                  ...thread.repostedFrom.toObject(),
                  isLiked: !!originalIsLiked,
                  likesCount: thread.repostedFrom.likes?.length || 0,
                  author: originalAuthor
                    ? {
                        ...originalAuthor,
                        isFollowing: !!originalFollowStatus,
                        followStatus: originalFollowStatus,
                      }
                    : originalAuthor,
                };
              }

              return {
                ...threadData,
                isLiked: !!isLiked,
                isReposted,
                author: {
                  ...thread.author.toObject(),
                  isFollowing: !!followStatus,
                  followStatus: followStatus,
                },
              };
            }),
          )
        ).filter(Boolean);
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
      console.error("Error in searchThreads service:", error);
      throw new Error("Erreur lors de la recherche des threads");
    }
  }

  /**
   * Annuler un repost
   */
  async unrepostThread(threadId, userId) {
    try {
      const repost = await Thread.findOne({
        author: userId,
        repostedFrom: threadId,
      });

      if (!repost) {
        throw new Error("Repost non trouvé");
      }

      await Thread.findByIdAndDelete(repost._id);
      await Thread.findByIdAndUpdate(threadId, { $inc: { repostsCount: -1 } });
      await userService.decrementThreadsCount(userId);

      return { message: "Repost annulé avec succès" };
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

      if (thread.author.toString() !== userId.toString()) {
        throw new Error("Non autorisé à supprimer ce thread");
      }

      const reposts = await Thread.find({ repostedFrom: threadId }).select(
        "_id author",
      );
      const repostIds = reposts.map((repost) => repost._id);
      const threadIdsToDelete = [threadId, ...repostIds];

      const repostCountsByAuthor = new Map();
      reposts.forEach((repost) => {
        const authorId = repost.author.toString();
        repostCountsByAuthor.set(
          authorId,
          (repostCountsByAuthor.get(authorId) || 0) + 1,
        );
      });

      await Thread.deleteMany({ _id: { $in: threadIdsToDelete } });
      await Like.deleteMany({ thread: { $in: threadIdsToDelete } });
      await Reply.deleteMany({ thread: { $in: threadIdsToDelete } });

      await userService.decrementThreadsCount(userId);
      for (const [authorId, count] of repostCountsByAuthor.entries()) {
        await User.findByIdAndUpdate(authorId, {
          $inc: { threadsCount: -count },
        });
      }

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

      if (thread.author.toString() !== userId.toString()) {
        throw new Error("Non autorisé à modifier ce thread");
      }

      if (content !== undefined && content !== null) {
        if (content.trim().length === 0) {
          throw new Error("Le contenu ne peut pas être vide");
        }
        if (content.length > 500) {
          throw new Error("Le contenu ne peut pas dépasser 500 caractères");
        }
        thread.content = content;
      }

      if (media !== null) {
        thread.media = media;
      }

      if (content && content !== thread.content) {
        await notificationService.createMentionNotifications(
          content,
          userId,
          threadId,
        );
      }

      await thread.save();

      await thread.populate(
        "author",
        "username name profilePicture isVerified",
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

      const existingLike = await Like.findOne({
        user: userId,
        thread: threadId,
      });

      if (existingLike) {
        throw new Error("Vous avez déjà liké ce thread");
      }

      await Like.create({ user: userId, thread: threadId });

      thread.likes.push(userId);
      await thread.save();

      if (thread.author.toString() !== userId.toString()) {
        await notificationService.createNotification({
          type: "thread_like",
          recipient: thread.author,
          sender: userId,
          thread: threadId,
        });
      }

      return { message: "Thread liké", likesCount: thread.likes.length };
    } catch (error) {
      throw error;
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

      const result = await Like.findOneAndDelete({
        user: userId,
        thread: threadId,
      });

      if (!result) {
        throw new Error("Like non trouvé");
      }

      thread.likes = thread.likes.filter(
        (like) => like.toString() !== userId.toString(),
      );
      await thread.save();

      return { message: "Like retiré", likesCount: thread.likes.length };
    } catch (error) {
      throw error;
    }
  }
}

export default new ThreadService();
