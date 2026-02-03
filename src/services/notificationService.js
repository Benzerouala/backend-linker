import Notification from "../models/Notification.js";
import settingsService from "./settingsService.js";
import socketService from "./socketService.js";
import emailService from "./emailService.js";
import User from "../models/User.js";

class NotificationService {
  buildEmailMessage(type, senderName, threadContent) {
    const safeSender = senderName || "Quelqu'un";
    const snippet = threadContent ? `\n\nPost: "${threadContent}"` : "";

    switch (type) {
      case "new_follower":
        return {
          subject: "Nouveau abonné",
          message: `${safeSender} a commencé à vous suivre.${snippet}`,
        };
      case "follow_request":
        return {
          subject: "Nouvelle demande d'abonnement",
          message: `${safeSender} souhaite s'abonner à votre compte.${snippet}`,
        };
      case "follow_accepted":
        return {
          subject: "Demande acceptée",
          message: `${safeSender} a accepté votre demande d'abonnement.${snippet}`,
        };
      case "thread_like":
        return {
          subject: "Nouveau j'aime",
          message: `${safeSender} a aimé votre post.${snippet}`,
        };
      case "reply_like":
        return {
          subject: "Nouveau j'aime",
          message: `${safeSender} a aimé votre commentaire.${snippet}`,
        };
      case "thread_reply":
        return {
          subject: "Nouveau commentaire",
          message: `${safeSender} a commenté votre post.${snippet}`,
        };
      case "mention":
        return {
          subject: "Nouvelle mention",
          message: `${safeSender} vous a mentionné.${snippet}`,
        };
      default:
        return {
          subject: "Nouvelle notification",
          message: `Vous avez une nouvelle notification.${snippet}`,
        };
    }
  }
  /**
   * Créer une notification avec vérification des préférences
   * @param {Object} notificationData - Données de la notification
   * @param {string} notificationData.recipient - ID du destinataire
   * @param {string} notificationData.sender - ID de l'expéditeur
   * @param {string} notificationData.type - Type de notification
   * @param {string} [notificationData.thread] - ID du thread concerné (optionnel)
   * @param {string} [notificationData.reply] - ID de la réponse concernée (optionnel)
   * @returns {Promise<Object|null>} La notification créée ou null en cas d'erreur
   */
  async createNotification(notificationData) {
    const { recipient, sender, type, thread, reply } = notificationData;
    
    // Validation des paramètres obligatoires
    if (!recipient || !sender || !type) {
      console.warn('Paramètres manquants pour la création de notification', { recipient, sender, type });
      return null;
    }

    try {
      console.log(`Tentative de création d'une notification de type ${type} pour l'utilisateur ${recipient}`);

      // Vérifier si le destinataire accepte ce type de notification
      let canReceive = true;
      try {
        canReceive = await settingsService.canReceiveNotification(
          recipient,
          type,
          "inApp"
        );
      } catch (error) {
        console.error('Erreur lors de la vérification des préférences de notification', {
          error: error.message,
          userId: recipient,
          notificationType: type
        });
        // On continue quand même dans ce cas
      }

      if (!canReceive) {
        console.log(`Notification non créée: l'utilisateur ${recipient} ne souhaite pas recevoir ce type de notification (${type})`);
        return null;
      }

      // Éviter les doublons
      const existingNotification = await Notification.findOne({
        recipient,
        sender,
        type,
        thread: thread || null,
        reply: reply || null,
        createdAt: { $gte: new Date(Date.now() - 60000) } // Dernière minute
      }).lean();

      if (existingNotification) {
        console.log('Notification en doublon détectée, utilisation de la notification existante', {
          notificationId: existingNotification._id
        });
        return existingNotification;
      }

      // Création de la notification
      const notification = await Notification.create({
        recipient,
        sender,
        type,
        thread: thread || null,
        reply: reply || null,
      });

      console.log(`Nouvelle notification créée`, {
        notificationId: notification._id,
        type,
        recipient,
        sender
      });

      // Populate pour le retour
      try {
        await notification.populate([
          { path: "sender", select: "username name profilePicture isVerified" },
          { path: "thread", select: "content" }
        ]);
      } catch (populateError) {
        console.error('Erreur lors du populate de la notification', {
          error: populateError.message,
          notificationId: notification._id
        });
        // On continue même en cas d'erreur de populate
      }

      // Envoyer la notification en temps réel
      try {
        if (socketService && typeof socketService.sendNotification === 'function') {
          await socketService.sendNotification(recipient, notification);
          await socketService.sendUnreadCount(recipient);
          console.log('Notification envoyée via WebSocket', { recipient });
        } else {
          console.warn('Le service de socket n\'est pas correctement initialisé');
        }
      } catch (socketError) {
        console.error('Erreur lors de l\'envoi de la notification par socket', {
          error: socketError.message,
          notificationId: notification._id,
          recipient
        });
        // On continue même en cas d'erreur de socket
      }

      // Envoyer la notification par email si activé
      try {
        const canEmail = await settingsService.canReceiveNotification(
          recipient,
          type,
          "email"
        );
        if (canEmail) {
          const [recipientUser, senderUser] = await Promise.all([
            User.findById(recipient).select("email name username"),
            User.findById(sender).select("name username"),
          ]);

          if (recipientUser?.email) {
            const senderName = senderUser?.name || senderUser?.username;
            const threadContent = notification?.thread?.content || null;
            const { subject, message } = this.buildEmailMessage(
              type,
              senderName,
              threadContent
            );

            await emailService.sendNotificationEmail(
              recipientUser.email,
              recipientUser.name || recipientUser.username,
              subject,
              message
            );
          }
        }
      } catch (emailError) {
        console.error("Erreur lors de l'envoi de l'email de notification", {
          error: emailError.message,
          recipient,
          type,
        });
      }

      return notification;
    } catch (error) {
      console.error('Erreur lors de la création de la notification', {
        error: error.message,
        stack: error.stack,
        notificationData: { recipient, sender, type, thread }
      });
      return null; // Ne pas propager l'erreur pour ne pas interrompre le flux principal
    }
  }

  /**
   * Détecter les mentions dans un texte
   * @param {string} text - Texte à analyser
   * @returns {Array<string>} Liste des noms d'utilisateur mentionnés
   */
  detectMentions(text) {
    if (!text || typeof text !== 'string') return [];
    
    const mentionRegex = /@(\w+)/g;
    const mentions = [];
    let match;

    while ((match = mentionRegex.exec(text)) !== null) {
      // Éviter les doublons
      if (!mentions.includes(match[1])) {
        mentions.push(match[1]);
      }
    }

    return mentions;
  }

  /**
   * Créer des notifications pour les mentions
   * @param {string} content - Contenu du message contenant les mentions
   * @param {string} authorId - ID de l'auteur du message
   * @param {string} [threadId=null] - ID du thread concerné
   * @returns {Promise<Array>} Liste des notifications créées
   */
  async createMentionNotifications(content, authorId, threadId = null) {
    if (!content || !authorId) {
      console.warn('Paramètres manquants pour la création de notifications de mention', { content, authorId });
      return [];
    }

    try {
      const mentions = this.detectMentions(content);
      if (mentions.length === 0) return [];

      console.log(`Détection de ${mentions.length} mention(s) dans le contenu`, {
        mentions,
        authorId,
        threadId
      });

      const User = (await import("../models/User.js")).default;
      const notifications = [];
      
      for (const username of mentions) {
        try {
          // Trouver l'utilisateur mentionné (insensible à la casse)
          const mentionedUser = await User.findOne({ 
            username: { $regex: new RegExp(`^${username}$`, 'i') } 
          });
          
          if (!mentionedUser) {
            console.log(`Utilisateur mentionné non trouvé: @${username}`);
            continue;
          }

          // Ne pas notifier l'auteur s'il se mentionne lui-même
          if (mentionedUser._id.toString() === authorId.toString()) {
            continue;
          }
          
          // Vérifier si l'auteur peut mentionner cet utilisateur
          let canMention = true;
          try {
            canMention = await settingsService.canMentionUser(authorId, mentionedUser._id);
          } catch (error) {
            console.error('Erreur lors de la vérification des permissions de mention', {
              error: error.message,
              fromUser: authorId,
              toUser: mentionedUser._id
            });
            // On continue même en cas d'erreur
          }
          
          if (canMention) {
            const notification = await this.createNotification({
              recipient: mentionedUser._id,
              sender: authorId,
              type: "mention",
              thread: threadId,
            });

            if (notification) {
              notifications.push(notification);
            }
          }
        } catch (error) {
          console.error(`Erreur lors du traitement de la mention @${username}`, {
            error: error.message,
            username,
            authorId,
            threadId
          });
          // Continuer avec les mentions suivantes malgré l'erreur
        }
      }

      console.log(`${notifications.length} notification(s) de mention créée(s)`, {
        totalMentions: mentions.length,
        notificationsCreated: notifications.length,
        authorId,
        threadId
      });

      return notifications;
    } catch (error) {
      console.error('Erreur lors de la création des notifications de mention', {
        error: error.message,
        stack: error.stack,
        authorId,
        threadId
      });
      return [];
    }
  }

  /**
   * Récupérer les statistiques des notifications
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Statistiques des notifications
   */
  async getNotificationStats(userId) {
    if (!userId) {
      console.warn('ID utilisateur manquant pour la récupération des statistiques');
      return [];
    }

    try {
      console.log(`Récupération des statistiques de notification pour l'utilisateur ${userId}`);
      
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

      console.log(`Statistiques récupérées pour l'utilisateur ${userId}`, {
        statsCount: stats.length
      });

      return stats;
    } catch (error) {
      console.error('Erreur lors de la récupération des statistiques de notification', {
        error: error.message,
        userId,
        stack: error.stack
      });
      throw new Error("Erreur lors de la récupération des statistiques");
    }
  }

  /**
   * Marquer toutes les notifications comme lues
   * @param {string} userId - ID de l'utilisateur
   * @returns {Promise<Object>} Résultat de la mise à jour
   */
  async markAllAsRead(userId) {
    if (!userId) {
      console.warn('ID utilisateur manquant pour le marquage des notifications comme lues');
      return { modifiedCount: 0 };
    }

    try {
      console.log(`Marquage de toutes les notifications comme lues pour l'utilisateur ${userId}`);
      
      const result = await Notification.updateMany(
        { recipient: userId, isRead: false },
        { $set: { isRead: true } }
      );

      // Mettre à jour le compteur en temps réel
      try {
        if (socketService && typeof socketService.sendUnreadCount === 'function') {
          await socketService.sendUnreadCount(userId);
        }
      } catch (socketError) {
        console.error('Erreur lors de la mise à jour du compteur via WebSocket', {
          error: socketError.message,
          userId
        });
      }

      console.log(`Toutes les notifications marquées comme lues pour l'utilisateur ${userId}`, {
        modifiedCount: result.modifiedCount
      });

      return result;
    } catch (error) {
      console.error('Erreur lors du marquage des notifications comme lues', {
        error: error.message,
        userId,
        stack: error.stack
      });
      throw new Error("Erreur lors du marquage des notifications comme lues");
    }
  }
}

export default new NotificationService();