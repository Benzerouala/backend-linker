// backend/src/services/validationService.js
import Thread from "../models/Thread.js";
import Reply from "../models/Reply.js";
import User from "../models/User.js";
import notificationService from "./notificationService.js";

class ValidationService {
  /**
   * Valider un thread (par un modérateur ou automatiquement)
   */
  async validateThread(threadId, validatorId, reason = null) {
    try {
      const thread = await Thread.findById(threadId);
      if (!thread) {
        throw new Error("Thread non trouvé");
      }

      // Marquer comme validé (vous pourriez ajouter un champ isValidated au modèle)
      thread.isValidated = true;
      thread.validatedAt = new Date();
      thread.validatedBy = validatorId;
      await thread.save();

      // Notifier l'auteur du thread
      await notificationService.createNotification({
        recipient: thread.author,
        sender: validatorId,
        type: "content_validated",
        thread: threadId,
      });

      return thread;
    } catch (error) {
      throw new Error("Erreur lors de la validation du thread");
    }
  }

  /**
   * Signaler un contenu inapproprié
   */
  async flagContent(contentId, contentType, reporterId, reason) {
    try {
      let content;
      
      if (contentType === "thread") {
        content = await Thread.findById(contentId);
      } else if (contentType === "reply") {
        content = await Reply.findById(contentId);
      }

      if (!content) {
        throw new Error("Contenu non trouvé");
      }

      // Ajouter le signalement (vous pourriez ajouter un tableau de flags au modèle)
      if (!content.flags) {
        content.flags = [];
      }

      content.flags.push({
        reporter: reporterId,
        reason,
        createdAt: new Date(),
      });

      content.isFlagged = true;
      await content.save();

      // Notifier l'auteur du contenu
      await notificationService.createNotification({
        recipient: content.author,
        sender: reporterId,
        type: "content_flagged",
        thread: contentType === "thread" ? contentId : null,
      });

      return content;
    } catch (error) {
      throw new Error("Erreur lors du signalement du contenu");
    }
  }

  /**
   * Vérifier automatiquement le contenu (détecter mots inappropriés, spam, etc.)
   */
  async autoValidateContent(content, authorId) {
    try {
      const inappropriateWords = ["spam", "inappropriate", "offensive"]; // À compléter
      const containsInappropriate = inappropriateWords.some(word => 
        content.toLowerCase().includes(word.toLowerCase())
      );

      if (containsInappropriate) {
        // Signaler automatiquement
        return {
          isValid: false,
          reason: "Contenu inapproprié détecté automatiquement",
          requiresModeration: true,
        };
      }

      // Vérifications supplémentaires
      const hasExcessiveCaps = content === content.toUpperCase() && content.length > 20;
      const hasExcessivePunctuation = /[!?]{3,}/.test(content);
      const isSpamLike = /(.)\1{4,}/.test(content); // Caractères répétés

      if (hasExcessiveCaps || hasExcessivePunctuation || isSpamLike) {
        return {
          isValid: false,
          reason: "Format suspect détecté",
          requiresModeration: true,
        };
      }

      return {
        isValid: true,
        reason: "Contenu validé automatiquement",
        requiresModeration: false,
      };
    } catch (error) {
      throw new Error("Erreur lors de la validation automatique");
    }
  }

  /**
   * Obtenir les contenus signalés en attente de modération
   */
  async getFlaggedContent(page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      // Threads signalés
      const flaggedThreads = await Thread.find({ isFlagged: true })
        .populate("author", "username name profilePicture")
        .populate("flags.reporter", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      // Réponses signalées
      const flaggedReplies = await Reply.find({ isFlagged: true })
        .populate("author", "username name profilePicture")
        .populate("thread", "content")
        .populate("flags.reporter", "username")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      return {
        threads: flaggedThreads,
        replies: flaggedReplies,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(
            (await Thread.countDocuments({ isFlagged: true }) + 
             await Reply.countDocuments({ isFlagged: true })) / limit
          ),
        },
      };
    } catch (error) {
      throw new Error("Erreur lors de la récupération des contenus signalés");
    }
  }

  /**
   * Modérer un contenu signalé
   */
  async moderateContent(contentId, contentType, moderatorId, action, reason) {
    try {
      let content;
      
      if (contentType === "thread") {
        content = await Thread.findById(contentId);
      } else if (contentType === "reply") {
        content = await Reply.findById(contentId);
      }

      if (!content) {
        throw new Error("Contenu non trouvé");
      }

      switch (action) {
        case "approve":
          content.isFlagged = false;
          content.isValidated = true;
          content.validatedBy = moderatorId;
          content.validatedAt = new Date();
          
          // Notifier l'auteur que le contenu a été approuvé
          await notificationService.createNotification({
            recipient: content.author,
            sender: moderatorId,
            type: "content_validated",
            thread: contentType === "thread" ? contentId : null,
          });
          break;

        case "remove":
          // Supprimer le contenu
          if (contentType === "thread") {
            await Thread.findByIdAndDelete(contentId);
          } else {
            // Si c'est une réponse, décrémenter le compteur du thread parent
            const reply = await Reply.findById(contentId);
            if (reply && reply.thread) {
              await Thread.findByIdAndUpdate(reply.thread, { $inc: { repliesCount: -1 } });
            }
            await Reply.findByIdAndDelete(contentId);
          }
          
          // Notifier l'auteur que le contenu a été supprimé
          await notificationService.createNotification({
            recipient: content.author,
            sender: moderatorId,
            type: "content_flagged",
            thread: contentType === "thread" ? contentId : null,
          });
          return { message: "Contenu supprimé" };

        case "ignore":
          content.isFlagged = false;
          break;

        default:
          throw new Error("Action de modération invalide");
      }

      await content.save();
      return content;
    } catch (error) {
      throw new Error("Erreur lors de la modération du contenu");
    }
  }

  /**
   * Obtenir les statistiques de modération
   */
  async getModerationStats() {
    try {
      const stats = {
        totalThreads: await Thread.countDocuments(),
        flaggedThreads: await Thread.countDocuments({ isFlagged: true }),
        validatedThreads: await Thread.countDocuments({ isValidated: true }),
        totalReplies: await Reply.countDocuments(),
        flaggedReplies: await Reply.countDocuments({ isFlagged: true }),
        validatedReplies: await Reply.countDocuments({ isValidated: true }),
      };

      return stats;
    } catch (error) {
      throw new Error("Erreur lors de la récupération des statistiques");
    }
  }
}

export default new ValidationService();
