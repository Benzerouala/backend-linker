import Notification from "../models/Notification.js";
import Follow from "../models/Follow.js";

class NotificationController {
  /**
   * @route   GET /api/notifications
   * @desc    Obtenir toutes les notifications
   * @access  Private
   */
  async getNotifications(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 20 } = req.query;
      
      const notifications = await Notification.find({ recipient: userId })
        .populate("sender", "username name profilePicture isVerified")
        .populate("thread", "content")
        .sort({ createdAt: -1 })
        .limit(parseInt(limit))
        .lean(); // Convertir en objets JS simples pour modification

      // Enrichir avec le statut réel de la demande pour les follow_request
      const enrichedNotifications = await Promise.all(
        notifications.map(async (notif) => {
          if (notif.type === "follow_request" && notif.sender) {
            const follow = await Follow.findOne({
              follower: notif.sender._id,
              following: userId,
            }).select("status");

            // Si pas de follow trouvé ou status != en_attente, on le signale
            return {
              ...notif,
              requestStatus: follow ? follow.status : "canceled",
            };
          }
          return notif;
        }),
      );

      // ✅ Calculer le nombre de notifications non lues
      const unreadCount = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      res.status(200).json({
        success: true,
        data: {
          notifications: enrichedNotifications, // ✅ Format correct
          unreadCount, // ✅ Ajout du compteur
        },
      });
    } catch (error) {
      console.error("Erreur getNotifications:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  }

  /**
   * @route   PUT /api/notifications/:id/read
   * @desc    Marquer une notification spécifique comme lue
   * @access  Private
   */
  async markOneAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndUpdate(
        { _id: id, recipient: userId },
        { isRead: true },
        { new: true },
      );

      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: "Notification non trouvée" });
      }

      res.status(200).json({ success: true, data: notification });
    } catch (error) {
      console.error("Erreur markOneAsRead:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  }

  /**
   * @route   PUT /api/notifications/read-all
   * @desc    Marquer toutes les notifications comme lues
   * @access  Private
   */
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id;
      await Notification.updateMany(
        { recipient: userId, isRead: false },
        { isRead: true },
      );

      res.status(200).json({
        success: true,
        message: "Toutes les notifications marquées comme lues",
      });
    } catch (error) {
      console.error("Erreur markAllAsRead:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  }

  /**
   * @route   GET /api/notifications/unread-count
   * @desc    Obtenir le nombre de notifications non lues
   * @access  Private
   */
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id;
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      res.status(200).json({ success: true, data: { count } });
    } catch (error) {
      console.error("Erreur getUnreadCount:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  }

  /**
   * @route   DELETE /api/notifications/:id
   * @desc    Supprimer une notification spécifique
   * @access  Private
   */
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const notification = await Notification.findOneAndDelete({
        _id: id,
        recipient: userId,
      });

      if (!notification) {
        return res
          .status(404)
          .json({ success: false, message: "Notification non trouvée" });
      }

      res
        .status(200)
        .json({ success: true, message: "Notification supprimée" });
    } catch (error) {
      console.error("Erreur deleteNotification:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  }

  /**
   * @route   DELETE /api/notifications/clear-all
   * @desc    Supprimer toutes les notifications
   * @access  Private
   */
  async deleteAllNotifications(req, res) {
    try {
      const userId = req.user.id;

      await Notification.deleteMany({ recipient: userId });

      res.status(200).json({
        success: true,
        message: "Toutes les notifications supprimées",
      });
    } catch (error) {
      console.error("Erreur deleteAllNotifications:", error);
      res.status(500).json({ success: false, message: "Erreur serveur" });
    }
  }
}

export default new NotificationController();