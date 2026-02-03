import mongoose from "mongoose";

const threadSchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    content: {
      type: String,
      required: [true, "Le contenu est requis"],
      maxlength: [500, "Le contenu ne peut pas dépasser 500 caractères"],
      trim: true,
    },
    media: {
      url: {
        type: String,
        default: null,
      },
      type: {
        type: String,
        enum: ["image", "video"],
        default: null,
      },
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    replies: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Thread",
      },
    ],
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      default: null,
    },
    // Compteur de réponses (incrémenté à chaque ajout de réponse)
    repliesCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // Repost : référence au thread original si ce thread est un repost
    repostedFrom: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Thread",
      default: null,
    },
    // Repost : référence à la réponse originale si ce post vient d'un commentaire
    repostedFromReply: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Reply",
      default: null,
    },
    // Compteur de reposts (nombre de fois que ce thread a été reposté)
    repostsCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Index pour améliorer les performances
threadSchema.index({ author: 1, createdAt: -1 });
threadSchema.index({ createdAt: -1 });
threadSchema.index({ likes: 1 });
threadSchema.index({ repostedFromReply: 1 });

// Virtual pour compter les likes
threadSchema.virtual("likesCount").get(function () {
  return this.likes ? this.likes.length : 0;
});

// Note: repliesCount est maintenant un champ réel dans le schéma
// Le virtual est supprimé car il causerait une récursion infinie
// Le champ réel repliesCount sera automatiquement inclus dans toJSON() et toObject()

const Thread = mongoose.model("Thread", threadSchema);

export default Thread;
