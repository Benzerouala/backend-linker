import Reply from "../models/Reply.js";
import Thread from "../models/Thread.js";
import notificationService from "../services/notificationService.js";

class ReplyController {
  /**
   * @route   POST /api/replies/:threadId
   * @desc    Créer une réponse à un thread (ou à une réponse)
   * @access  Private
   */
  async createReply(req, res) {
    try {
      const { threadId } = req.params;
      const { content, parentReplyId } = req.body; // ✅ parentReplyId optionnel
      const authorId = req.user.id;
      console.log("🔍 CREATE REPLY DEBUG:");
      console.log("threadId:", threadId);
      console.log("parentReplyId:", parentReplyId);
      console.log("content:", content);
      // Validation du contenu
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Le contenu est requis",
        });
      }

      if (content.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Le contenu ne peut pas dépasser 500 caractères",
        });
      }

      // Vérifier que le thread existe
      const thread = await Thread.findById(threadId);
      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Thread non trouvé",
        });
      }

      // Si c'est une réponse à une réponse, vérifier que la réponse parent existe
      if (parentReplyId) {
        const parentReply = await Reply.findById(parentReplyId);
        if (!parentReply) {
          return res.status(404).json({
            success: false,
            message: "Réponse parente non trouvée",
          });
        }

        if (parentReply.thread.toString() !== threadId.toString()) {
          return res.status(400).json({
            success: false,
            message: "Réponse parente invalide pour ce thread",
          });
        }
      }

      // Créer la réponse
      const reply = await Reply.create({
        author: authorId,
        thread: threadId,
        content: content.trim(),
        parentReply: parentReplyId || null, // ✅ Lier au parent si existe
      });

      // Incrémenter le compteur de réponses sur le thread (seulement si c'est une réponse directe au thread)
      if (!parentReplyId) {
        await Thread.findByIdAndUpdate(threadId, {
          $inc: { repliesCount: 1 },
        });
      }

      // Détecter et créer les notifications de mention
      await notificationService.createMentionNotifications(
        content,
        authorId,
        threadId,
      );

      // Créer une notification pour l'auteur du thread (si réponse directe)
      if (!parentReplyId && thread.author.toString() !== authorId.toString()) {
        await notificationService.createNotification({
          type: "thread_reply",
          recipient: thread.author,
          sender: authorId,
          thread: threadId,
          reply: reply._id,
        });
      }

      // Créer une notification pour l'auteur de la réponse parente
      if (parentReplyId) {
        const parentReply = await Reply.findById(parentReplyId);
        if (
          parentReply &&
          parentReply.author.toString() !== authorId.toString()
        ) {
          await notificationService.createNotification({
            type: "thread_reply",
            recipient: parentReply.author,
            sender: authorId,
            thread: threadId,
            reply: reply._id,
          });
        }
      }

      // Populate la réponse avec les infos de l'auteur
      const populatedReply = await Reply.findById(reply._id).populate(
        "author",
        "username name profilePicture isVerified",
      );

      res.status(201).json({
        success: true,
        message: "Réponse créée avec succès",
        data: populatedReply,
      });
    } catch (error) {
      console.error("Erreur createReply:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la création de la réponse",
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/replies/:threadId
   * @desc    Obtenir toutes les réponses d'un thread avec hiérarchie
   * @access  Public
   */
  async getThreadReplies(req, res) {
    try {
      const { threadId } = req.params;

      // Vérifier que le thread existe
      const thread = await Thread.findById(threadId);
      if (!thread) {
        return res.status(404).json({
          success: false,
          message: "Thread non trouvé",
        });
      }

      // ✅ Récupérer UNIQUEMENT les réponses directes au thread (parentReply: null)
      const replies = await Reply.find({
        thread: threadId,
        parentReply: null, // Seulement les réponses principales
      })
        .populate("author", "username name profilePicture isVerified")
        .sort({ createdAt: -1 });

      const buildChildren = async (parentId) => {
        const children = await Reply.find({
          thread: threadId,
          parentReply: parentId,
        })
          .populate("author", "username name profilePicture isVerified")
          .sort({ createdAt: 1 });

        const childrenWithNested = await Promise.all(
          children.map(async (child) => {
            const nestedChildren = await buildChildren(child._id);
            const childObj = child.toObject();
            return {
              ...childObj,
              children: nestedChildren,
              repliesCount: nestedChildren.length,
              likesCount: child.likes ? child.likes.length : 0,
            };
          }),
        );

        return childrenWithNested;
      };

      // ✅ Pour chaque réponse principale, récupérer ses enfants récursivement
      const repliesWithChildren = await Promise.all(
        replies.map(async (reply) => {
          const children = await buildChildren(reply._id);
          const replyObj = reply.toObject();
          return {
            ...replyObj,
            children: children,
            repliesCount: children.length,
            likesCount: reply.likes ? reply.likes.length : 0,
          };
        }),
      );

      console.log(
        "📊 Structure retournée:",
        JSON.stringify(repliesWithChildren, null, 2),
      );

      res.status(200).json({
        success: true,
        data: {
          replies: repliesWithChildren,
        },
      });
    } catch (error) {
      console.error("Erreur getThreadReplies:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des réponses",
        error: error.message,
      });
    }
  }

  /**
   * @route   POST /api/replies/:id/repost
   * @desc    Reposter un commentaire comme nouveau post
   * @access  Private
   */
  async repostReply(req, res) {
    try {
      const { id } = req.params;
      const authorId = req.user.id;

      const originalReply = await Reply.findById(id).populate(
        "author",
        "username name profilePicture isVerified",
      );
      if (!originalReply) {
        return res.status(404).json({
          success: false,
          message: "Réponse non trouvée",
        });
      }

      if (originalReply.author?._id?.toString() === authorId.toString()) {
        return res.status(400).json({
          success: false,
          message: "Vous ne pouvez pas reposter votre propre commentaire",
        });
      }

      const existingRepost = await Thread.exists({
        author: authorId,
        repostedFromReply: originalReply._id,
      });
      if (existingRepost) {
        return res.status(400).json({
          success: false,
          message: "Vous avez déjà reposté ce commentaire",
        });
      }

      const authorName =
        originalReply.author?.username ||
        originalReply.author?.name ||
        "utilisateur";

      const newThread = await Thread.create({
        author: authorId,
        content: `Repost de @${authorName}: ${originalReply.content}`,
        repostedFromReply: originalReply._id,
      });

      const copyReplyTree = async (sourceReply, parentReplyId = null) => {
        const createdReply = await Reply.create({
          author: sourceReply.author,
          thread: newThread._id,
          content: sourceReply.content,
          parentReply: parentReplyId,
        });

        const children = await Reply.find({
          thread: sourceReply.thread,
          parentReply: sourceReply._id,
        }).sort({ createdAt: 1 });

        for (const child of children) {
          await copyReplyTree(child, createdReply._id);
        }
      };

      const topLevelChildren = await Reply.find({
        thread: originalReply.thread,
        parentReply: originalReply._id,
      }).sort({ createdAt: 1 });

      for (const child of topLevelChildren) {
        await copyReplyTree(child, null);
      }

      await Thread.findByIdAndUpdate(newThread._id, {
        $set: { repliesCount: topLevelChildren.length },
      });

      await newThread.populate(
        "author",
        "username name profilePicture isVerified",
      );

      res.status(201).json({
        success: true,
        message: "Commentaire reposté avec succès",
        data: newThread,
      });
    } catch (error) {
      console.error("Erreur repostReply:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du repost du commentaire",
        error: error.message,
      });
    }
  }

  /**
   * @route   GET /api/replies/:id/likes
   * @desc    Obtenir la liste des likes d'une réponse
   * @access  Public
   */
  async getReplyLikes(req, res) {
    try {
      const { id } = req.params;
      const reply = await Reply.findById(id).populate(
        "likes",
        "username name profilePicture isVerified",
      );

      if (!reply) {
        return res.status(404).json({
          success: false,
          message: "Réponse non trouvée",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          users: reply.likes || [],
        },
      });
    } catch (error) {
      console.error("Erreur getReplyLikes:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des likes",
      });
    }
  }

  /**
   * @route   PUT /api/replies/:id
   * @desc    Modifier une réponse
   * @access  Private
   */
  async updateReply(req, res) {
    try {
      const { id } = req.params;
      const { content } = req.body;
      const userId = req.user.id;

      // Validation
      if (!content || content.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Le contenu est requis",
        });
      }

      if (content.length > 500) {
        return res.status(400).json({
          success: false,
          message: "Le contenu ne peut pas dépasser 500 caractères",
        });
      }

      // Trouver la réponse
      const reply = await Reply.findById(id);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: "Réponse non trouvée",
        });
      }

      // Vérifier l'autorisation
      if (reply.author.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Non autorisé à modifier cette réponse",
        });
      }

      // Mettre à jour
      reply.content = content.trim();
      await reply.save();

      // Populate avant de retourner
      await reply.populate("author", "username name profilePicture isVerified");

      res.status(200).json({
        success: true,
        message: "Réponse modifiée avec succès",
        data: reply,
      });
    } catch (error) {
      console.error("Erreur updateReply:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la modification de la réponse",
        error: error.message,
      });
    }
  }

  /**
   * @route   DELETE /api/replies/:id
   * @desc    Supprimer une réponse
   * @access  Private
   */
  async deleteReply(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const reply = await Reply.findById(id);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: "Réponse non trouvée",
        });
      }

      // Vérifier l'autorisation
      if (reply.author.toString() !== userId.toString()) {
        return res.status(403).json({
          success: false,
          message: "Non autorisé à supprimer cette réponse",
        });
      }

      // Supprimer la réponse
      await Reply.findByIdAndDelete(id);

      // Décrémenter le compteur (seulement si c'est une réponse directe)
      if (!reply.parentReply) {
        await Thread.findByIdAndUpdate(reply.thread, {
          $inc: { repliesCount: -1 },
        });
      }

      res.status(200).json({
        success: true,
        message: "Réponse supprimée avec succès",
      });
    } catch (error) {
      console.error("Erreur deleteReply:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression de la réponse",
        error: error.message,
      });
    }
  }

  /**
   * @route   POST /api/replies/:id/like
   * @desc    Liker une réponse
   * @access  Private
   */
  async likeReply(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const reply = await Reply.findById(id);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: "Réponse non trouvée",
        });
      }

      // Vérifier si déjà liké
      if (reply.likes && reply.likes.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "Vous avez déjà aimé cette réponse",
        });
      }

      // Ajouter le like
      if (!reply.likes) reply.likes = [];
      reply.likes.push(userId);
      await reply.save();

      console.log(
        `✅ Like ajouté à la réponse ${id}. Total: ${reply.likes.length}`,
      );

      // Créer une notification SEULEMENT si ce n'est pas le propre auteur
      if (reply.author.toString() !== userId.toString()) {
        await notificationService.createNotification({
          type: "reply_like",
          recipient: reply.author,
          sender: userId,
          reply: id,
          thread: reply.thread,
        });
      }

      res.status(200).json({
        success: true,
        message: "Réponse aimée",
        data: {
          likesCount: reply.likes.length, // ✅ Retourner le nouveau compteur
          isLiked: true,
        },
      });
    } catch (error) {
      console.error("Erreur likeReply:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du like",
        error: error.message,
      });
    }
  }

  /**
   * @route   DELETE /api/replies/:id/unlike
   * @desc    Retirer le like d'une réponse
   * @access  Private
   */
  async unlikeReply(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const reply = await Reply.findById(id);
      if (!reply) {
        return res.status(404).json({
          success: false,
          message: "Réponse non trouvée",
        });
      }

      // Vérifier si liké
      if (!reply.likes || !reply.likes.includes(userId)) {
        return res.status(400).json({
          success: false,
          message: "Vous n'avez pas aimé cette réponse",
        });
      }

      // Retirer le like
      reply.likes = reply.likes.filter(
        (like) => like.toString() !== userId.toString(),
      );
      await reply.save();

      console.log(
        `✅ Like retiré de la réponse ${id}. Total: ${reply.likes.length}`,
      );

      res.status(200).json({
        success: true,
        message: "Like retiré",
        data: {
          likesCount: reply.likes.length, // ✅ Retourner le nouveau compteur
          isLiked: false,
        },
      });
    } catch (error) {
      console.error("Erreur unlikeReply:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors du unlike",
        error: error.message,
      });
    }
  }
}

export default new ReplyController();
