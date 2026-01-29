// backend/src/services/notificationService.js
import Notification from "../models/Notification.js";
import settingsService from "./settingsService.js";
import socketService from "./socketService.js";

class NotificationService {
  /**
   * Créer une notification avec vérification des préférences
   */
  async createNotification(notificationData) {
    try {
      const { recipient, sender, type, thread } = notificationData;

      // Vérifier si le destinataire accepte ce type de notification
      const canReceive = await settingsService.canReceiveNotification(
        recipient,
        type,
        "inApp"
      );

      if (!canReceive) {
        return null; // Ne pas créer la notification
      }

      // Éviter les doublons
      const existingNotification = await Notification.findOne({
        recipient,
        sender,
        type,
        thread: thread || null,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Dernière minute
      });

      if (existingNotification) {
        return existingNotification;
      }

      const notification = await Notification.create({
        recipient,
        sender,
        type,
        thread: thread || null,
      });

      // Populate pour le retour
      await notification.populate([
        { path: "sender", select: "username name profilePicture isVerified" },
        { path: "thread", select: "content" }
      ]);

      // Envoyer la notification en temps réel
      socketService.sendNotification(recipient, notification);
      socketService.sendUnreadCount(recipient);

      return notification;
    } catch (error) {
      console.error("Erreur createNotification:", error);
      throw error;
    }
  }

  /**
   * Détecter les mentions dans un texte
   */
  detectMentions(text) {
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }

    return mentions;
  }

  /**
   * Créer des notifications pour les mentions
   */
  async createMentionNotifications(content, authorId, threadId = null) {
    try {
      const mentions = this.detectMentions(content);
      const User = (await import("../models/User.js")).default;
      
      for (const username of mentions) {
        // Trouver l'utilisateur mentionné
        const mentionedUser = await User.findOne({ username });
        
        if (mentionedUser && mentionedUser._id.toString() !== authorId.toString()) {
          // Vérifier si l'auteur peut mentionner cet utilisateur
          const canMention = await settingsService.canMentionUser(authorId, mentionedUser._id);
          
          if (canMention) {
            await this.createNotification({
              recipient: mentionedUser._id,
              sender: authorId,
              type: "mention",
              thread: threadId,
            });
          }
        }
      }
    } catch (error) {
      console.error("Erreur createMentionNotifications:", error);
    }
  }

  /**
   * Obtenir les notifications non lues avec pagination
   */
  async getUnreadNotifications(userId, page = 1, limit = 20) {
    try {
      const skip = (page - 1) * limit;

      const notifications = await Notification.find({
        recipient: userId,
        isRead: false,
      })
        .populate("sender", "username name profilePicture isVerified")
        .populate("thread", "content")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

      const total = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      return {
        notifications,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(total / limit),
          total,
          unreadCount: total,
        },
      };
    } catch (error) {
      throw new Error("Erreur lors de la récupération des notifications non lues");
    }
  }

  /**
   * Marquer une notification spécifique comme lue
   */
  async markAsRead(notificationId, userId) {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: userId },
        { isRead: true },
        { new: true }
      );

      if (!notification) {
        throw new Error("Notification non trouvée");
      }

      return notification;
    } catch (error) {
      throw new Error("Erreur lors du marquage comme lu");
    }
  }

  /**
   * Supprimer les anciennes notifications (plus de 30 jours)
   */
  async cleanupOldNotifications() {
    try {
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      
      const result = await Notification.deleteMany({
        createdAt: { $lt: thirtyDaysAgo },
        isRead: true,
      });

      console.log(`Nettoyage: ${result.deletedCount} anciennes notifications supprimées`);
      return result.deletedCount;
    } catch (error) {
      console.error("Erreur cleanupOldNotifications:", error);
    }
  }

  /**
   * Obtenir les statistiques de notifications pour un utilisateur
   */
  async getNotificationStats(userId) {
    try {
      const stats = await Notification.aggregate([
        { $match: { recipient: userId } },
        {
          $group: {
            _id: "$type",
            total: { $sum: 1 },
            unread: {
              $sum: { $cond: [{ $eq: ["$isRead", false] }, 1, 0] },
            },
          },
        },
      ]);

      return stats;
    } catch (error) {
      throw new Error("Erreur lors de la récupération des statistiques");
    }
  }
}

export default new NotificationService();