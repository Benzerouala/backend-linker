// backend/src/services/socketService.js
import { Server } from "socket.io";
import jwt from "jsonwebtoken";

class SocketService {
  constructor() {
    this.io = null;
    this.connectedUsers = new Map(); // userId -> socket.id
  }

  /**
   * Initialiser Socket.IO
   */
  initialize(server) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5173",
        methods: ["GET", "POST"],
        credentials: true,
      },
    });

    // Middleware d'authentification
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        if (!token) {
          return next(new Error("Token non fourni"));
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        socket.userId = decoded.id;
        next();
      } catch (error) {
        next(new Error("Token invalide"));
      }
    });

    // Gestion des connexions
    this.io.on("connection", (socket) => {
      console.log(`✅ Utilisateur connecté: ${socket.userId}`);
      
      // Ajouter l'utilisateur à la liste des connectés
      this.connectedUsers.set(socket.userId, socket.id);

      // Rejoindre la room personnelle de l'utilisateur
      socket.join(`user_${socket.userId}`);

      // Envoyer le compteur de notifications non lues
      this.sendUnreadCount(socket.userId);

      // Gérer la déconnexion
      socket.on("disconnect", () => {
        console.log(`❌ Utilisateur déconnecté: ${socket.userId}`);
        this.connectedUsers.delete(socket.userId);
      });

      // Marquer les notifications comme lues
      socket.on("mark_notifications_read", async () => {
        try {
          const Notification = (await import("../models/Notification.js")).default;
          await Notification.updateMany(
            { recipient: socket.userId, isRead: false },
            { isRead: true }
          );
          
          // Envoyer le nouveau compteur
          this.sendUnreadCount(socket.userId);
        } catch (error) {
          console.error("Erreur mark_notifications_read:", error);
        }
      });

      // Rejoindre une room de thread pour les notifications en temps réel
      socket.on("join_thread", (threadId) => {
        socket.join(`thread_${threadId}`);
      });

      // Quitter une room de thread
      socket.on("leave_thread", (threadId) => {
        socket.leave(`thread_${threadId}`);
      });
    });

    console.log("🔌 Socket.IO initialisé");
  }

  /**
   * Envoyer une notification en temps réel à un utilisateur
   */
  sendNotification(userId, notification) {
    if (this.io && this.connectedUsers.has(userId)) {
      this.io.to(`user_${userId}`).emit("new_notification", {
        type: "new_notification",
        data: notification,
        timestamp: new Date().toISOString(),
      });
    }
  }

  /**
   * Envoyer le compteur de notifications non lues
   */
  async sendUnreadCount(userId) {
    try {
      const Notification = (await import("../models/Notification.js")).default;
      const count = await Notification.countDocuments({
        recipient: userId,
        isRead: false,
      });

      if (this.io && this.connectedUsers.has(userId)) {
        this.io.to(`user_${userId}`).emit("unread_count", {
          type: "unread_count",
          data: { count },
          timestamp: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error("Erreur sendUnreadCount:", error);
    }
  }

  /**
   * Notifier les abonnés d'un nouveau thread
   */
  notifyFollowers(authorId, thread) {
    // Envoyer aux followers de l'auteur
    this.io.to(`followers_${authorId}`).emit("new_thread", {
      type: "new_thread",
      data: thread,
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notifier une mise à jour de thread en temps réel
   */
  notifyThreadUpdate(threadId, update) {
    this.io.to(`thread_${threadId}`).emit("thread_update", {
      type: "thread_update",
      data: { threadId, ...update },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notifier une nouvelle réponse
   */
  notifyNewReply(threadId, reply) {
    this.io.to(`thread_${threadId}`).emit("new_reply", {
      type: "new_reply",
      data: { threadId, reply },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Notifier un nouveau like
   */
  notifyNewLike(threadId, likeData) {
    this.io.to(`thread_${threadId}`).emit("new_like", {
      type: "new_like",
      data: { threadId, ...likeData },
      timestamp: new Date().toISOString(),
    });
  }

  /**
   * Vérifier si un utilisateur est connecté
   */
  isUserConnected(userId) {
    return this.connectedUsers.has(userId);
  }

  /**
   * Obtenir le nombre d'utilisateurs connectés
   */
  getConnectedUsersCount() {
    return this.connectedUsers.size;
  }

  /**
   * Envoyer une notification système à tous les utilisateurs connectés
   */
  broadcastSystemNotification(message) {
    if (this.io) {
      this.io.emit("system_notification", {
        type: "system_notification",
        data: { message },
        timestamp: new Date().toISOString(),
      });
    }
  }
}

export default new SocketService();
