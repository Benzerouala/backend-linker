// backend/src/services/settingsService.js
import Settings from "../models/Settings.js";
import User from "../models/User.js";

class SettingsService {
  /**
   * Obtenir les paramètres d'un utilisateur
   */
  async getUserSettings(userId) {
    try {
      let settings = await Settings.findOne({ user: userId });

      // Si les paramètres n'existent pas, créer les paramètres par défaut
      if (!settings) {
        settings = await this.createDefaultSettings(userId);
      }

      return settings;
    } catch (error) {
      throw new Error("Erreur lors de la récupération des paramètres");
    }
  }

  /**
   * Créer les paramètres par défaut pour un nouvel utilisateur
   */
  async createDefaultSettings(userId) {
    try {
      const defaultSettings = {
        user: userId,
        notifications: {
          email: {
            newFollower: true,
            followRequest: true,
            followAccepted: true,
            threadLike: true,
            threadReply: true,
            mention: true,
          },
          push: {
            newFollower: true,
            followRequest: true,
            followAccepted: true,
            threadLike: true,
            threadReply: true,
            mention: true,
          },
          inApp: {
            newFollower: true,
            followRequest: true,
            followAccepted: true,
            threadLike: true,
            threadReply: true,
            mention: true,
          },
        },
        privacy: {
          whoCanFollowMe: "everyone",
          whoCanSeeMyPosts: "everyone",
          whoCanMentionMe: "everyone",
          showOnlineStatus: true,
          showActivityStatus: true,
          allowDirectMessages: "everyone",
        },
        display: {
          theme: "light",
          language: "fr",
          fontSize: "medium",
          showSensitiveContent: false,
        },
        content: {
          autoplayVideos: true,
          showMediaPreviews: true,
          enableMentions: true,
        },
      };

      return await Settings.create(defaultSettings);
    } catch (error) {
      throw new Error("Erreur lors de la création des paramètres par défaut");
    }
  }

  /**
   * Mettre à jour les paramètres de notifications
   */
  async updateNotificationSettings(userId, notificationData) {
    try {
      const settings = await this.getUserSettings(userId);

      // Mettre à jour uniquement les champs fournis
      if (notificationData.email) {
        settings.notifications.email = {
          ...settings.notifications.email,
          ...notificationData.email,
        };
      }

      if (notificationData.push) {
        settings.notifications.push = {
          ...settings.notifications.push,
          ...notificationData.push,
        };
      }

      if (notificationData.inApp) {
        settings.notifications.inApp = {
          ...settings.notifications.inApp,
          ...notificationData.inApp,
        };
      }

      await settings.save();
      return settings;
    } catch (error) {
      throw new Error("Erreur lors de la mise à jour des notifications");
    }
  }

  /**
   * Mettre à jour les paramètres de confidentialité
   */
  async updatePrivacySettings(userId, privacyData) {
    try {
      const settings = await this.getUserSettings(userId);

      // Mettre à jour les paramètres de confidentialité
      settings.privacy = {
        ...settings.privacy,
        ...privacyData,
      };

      await settings.save();

      // Synchroniser avec le modèle User pour la rétrocompatibilité
      if (
        privacyData.whoCanSeeMyPosts === "followers" ||
        privacyData.whoCanSeeMyPosts === "only_me"
      ) {
        await User.findByIdAndUpdate(userId, { isPrivate: true });
      } else if (privacyData.whoCanSeeMyPosts === "everyone") {
        await User.findByIdAndUpdate(userId, { isPrivate: false });
      }

      return settings;
    } catch (error) {
      throw new Error("Erreur lors de la mise à jour de la confidentialité");
    }
  }

  /**
   * Mettre à jour les préférences d'affichage
   */
  async updateDisplaySettings(userId, displayData) {
    try {
      const settings = await this.getUserSettings(userId);

      settings.display = {
        ...settings.display,
        ...displayData,
      };

      await settings.save();

      // Synchroniser la langue avec le modèle User
      if (displayData.language) {
        await User.findByIdAndUpdate(userId, {
          language: displayData.language,
        });
      }

      return settings;
    } catch (error) {
      throw new Error("Erreur lors de la mise à jour de l'affichage");
    }
  }

  /**
   * Mettre à jour les préférences de contenu
   */
  async updateContentSettings(userId, contentData) {
    try {
      const settings = await this.getUserSettings(userId);

      settings.content = {
        ...settings.content,
        ...contentData,
      };

      await settings.save();
      return settings;
    } catch (error) {
      throw new Error("Erreur lors de la mise à jour du contenu");
    }
  }

  /**
   * Vérifier si un utilisateur peut recevoir un certain type de notification
   */
  async canReceiveNotification(userId, notificationType, channel = "inApp") {
    try {
      const settings = await this.getUserSettings(userId);

      switch (notificationType) {
        case "new_follower":
          return settings.notifications[channel]?.newFollower ?? true;
        case "follow_request":
          return settings.notifications[channel]?.followRequest ?? true;
        case "follow_accepted":
          return settings.notifications[channel]?.followAccepted ?? true;
        case "thread_like":
        case "reply_like":
          return settings.notifications[channel]?.threadLike ?? true;
        case "thread_reply":
          return settings.notifications[channel]?.threadReply ?? true;
        case "mention":
          return settings.notifications[channel]?.mention ?? true;
        default:
          return true;
      }
    } catch (error) {
      // En cas d'erreur, autoriser la notification par défaut
      return true;
    }
  }

  /**
   * Vérifier si un utilisateur peut voir le contenu d'un autre utilisateur
   */
  async canViewContent(viewerId, targetUserId) {
    try {
      const targetSettings = await this.getUserSettings(targetUserId);
      const privacy = targetSettings.privacy;

      switch (privacy.whoCanSeeMyPosts) {
        case "everyone":
          return true;
        case "followers":
          // Vérifier si le viewer suit l'utilisateur cible
          const Follow = (await import("../models/Follow.js")).default;
          const followRelation = await Follow.findOne({
            follower: viewerId,
            following: targetUserId,
            status: "accepte",
          });
          return (
            !!followRelation || viewerId.toString() === targetUserId.toString()
          );
        case "only_me":
          return viewerId.toString() === targetUserId.toString();
        default:
          return true;
      }
    } catch (error) {
      // En cas d'erreur, autoriser la consultation par défaut
      return true;
    }
  }

  /**
   * Vérifier si un utilisateur peut mentionner un autre utilisateur
   */
  async canMentionUser(mentionerId, targetUserId) {
    try {
      const targetSettings = await this.getUserSettings(targetUserId);
      const privacy = targetSettings.privacy;

      switch (privacy.whoCanMentionMe) {
        case "everyone":
          return true;
        case "followers":
          // Vérifier si le mentionneur suit l'utilisateur cible
          const Follow = (await import("../models/Follow.js")).default;
          const followRelation = await Follow.findOne({
            follower: mentionerId,
            following: targetUserId,
            status: "accepte",
          });
          return !!followRelation;
        case "nobody":
          return false;
        default:
          return true;
      }
    } catch (error) {
      // En cas d'erreur, autoriser la mention par défaut
      return true;
    }
  }

  /**
   * Supprimer les paramètres d'un utilisateur (lors de la suppression du compte)
   */
  async deleteUserSettings(userId) {
    try {
      await Settings.deleteOne({ user: userId });
      return true;
    } catch (error) {
      throw new Error("Erreur lors de la suppression des paramètres");
    }
  }

  /**
   * Réinitialiser les paramètres d'un utilisateur aux valeurs par défaut
   */
  async resetToDefault(userId) {
    try {
      await Settings.deleteOne({ user: userId });
      return await this.createDefaultSettings(userId);
    } catch (error) {
      throw new Error("Erreur lors de la réinitialisation des paramètres");
    }
  }
}

export default new SettingsService();
