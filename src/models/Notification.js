// backend/src/models/Notification.js
import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    type: {
      type: String,
      enum: [
        "new_follower",
        "follow_request",
        "follow_accepted",
        "thread_like",
        "thread_reply",
        "thread_repost",
        "reply_like", // ✅ AJOUTER CELUI-CI pour les likes sur réponses
        "mention",
        "content_validated",
        "content_flagged",
      ],
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      default: null,
    },
    reply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reply",
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

// Index pour améliorer les performances
notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

const Notification = mongoose.model("Notification", notificationSchema);

export default Notification;
