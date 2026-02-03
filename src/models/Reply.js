import mongoose from "mongoose";

const replySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    thread: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      required: true,
    },
    // ✅ NOUVEAU : Référence au parent (pour les réponses imbriquées)
    parentReply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reply",
      default: null,
    },
    content: {
      type: String,
      required: [true, "Le contenu est requis"],
      maxlength: [500, "Le contenu ne peut pas dépasser 500 caractères"],
      trim: true,
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  },
);

// Index pour améliorer les performances
replySchema.index({ thread: 1, createdAt: -1 });
replySchema.index({ author: 1 });
replySchema.index({ likes: 1 });
// ✅ NOUVEAU : Index pour les réponses enfants
replySchema.index({ parentReply: 1, createdAt: -1 });

// Virtual pour compter les likes
replySchema.virtual("likesCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// ✅ NOUVEAU : Virtual pour compter les réponses enfants
replySchema.virtual("repliesCount").get(function () {
  return this._childCount || 0;
});

const Reply = mongoose.model("Reply", replySchema);

export default Reply;
