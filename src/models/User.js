//backend/src/models/User.js
import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, "Le nom d'utilisateur est requis"],
      unique: true,
      trim: true,
      minlength: [
        3,
        "Le nom d'utilisateur doit contenir au moins 3 caractères",
      ],
      maxlength: [
        30,
        "Le nom d'utilisateur ne peut pas dépasser 30 caractères",
      ],
      match: [
        /^[a-zA-Z0-9_]+$/,
        "Le nom d'utilisateur ne peut contenir que des lettres, chiffres et underscores",
      ],
    },

    email: {
      type: String,
      required: [true, "L'email est requis"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/, "Veuillez fournir un email valide"],
    },

    password: {
      type: String,
      required: [true, "Le mot de passe est requis"],
      minlength: [8, "Le mot de passe doit contenir au moins 8 caractères"],
      select: false, // Ne pas retourner le password par défaut
    },

    name: {
      type: String,
      trim: true,
      maxlength: [50, "Le nom ne peut pas dépasser 50 caractères"],
    },

    bio: {
      type: String,
      maxlength: [200, "La biographie ne peut pas dépasser 200 caractères"],
      default: "",
    },

    profilePicture: {
      type: String,
      default: function () {
        return `https://ui-avatars.com/api/?name=${this.username}&size=200&background=4FD04C&color=fff&bold=true`;
      },
    },

    coverImage: {
      type: String,
      default: "",
    },

    location: {
      type: String,
      maxlength: [100, "La localisation ne peut pas dépasser 100 caractères"],
      default: "",
    },

    website: {
      type: String,
      maxlength: [200, "L'URL du site web ne peut pas dépasser 200 caractères"],
      default: "",
    },

    hobbies: {
      type: [String],
      default: [],
      validate: {
        validator: function(hobbies) {
          return hobbies.length <= 10;
        },
        message: "Vous ne pouvez pas avoir plus de 10 hobbies",
      },
    },

    birthDate: {
      type: Date,
      validate: {
        validator: function(birthDate) {
          if (!birthDate) return true; // Optional
          const today = new Date();
          const birth = new Date(birthDate);
          let age = today.getFullYear() - birth.getFullYear();
          const monthDiff = today.getMonth() - birth.getMonth();
          // Ajuster l'âge si l'anniversaire n'est pas encore passé cette année
          if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
            age--;
          }
          return age >= 13 && age <= 120;
        },
        message: "Vous devez avoir entre 13 et 120 ans",
      },
    },

    isPrivate: {
      type: Boolean,
      default: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    // Options de confidentialité avancées (rétrocompatibilité)
    showOnlineStatus: {
      type: Boolean,
      default: true,
    },

    showActivityStatus: {
      type: Boolean,
      default: true,
    },

    allowDirectMessages: {
      type: String,
      enum: ["everyone", "followers", "people_i_follow", "nobody"],
      default: "everyone",
    },

    language: {
      type: String,
      enum: ["ar", "fr", "en"],
      default: "fr",
    },

    // Ces champs sont optionnels si tu utilises JWT uniquement
    resetPasswordToken: {
      type: String,
      select: false, // Ne pas retourner ce champ par défaut
    },

    resetPasswordExpires: {
      type: Date,
      select: false, // Ne pas retourner ce champ par défaut
    },

    // Statistiques
    followersCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    followingCount: {
      type: Number,
      default: 0,
      min: 0,
    },

    threadsCount: {
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

// ============= HOOKS (MIDDLEWARE) =============

// Hasher le mot de passe avant sauvegarde
userSchema.pre("save", async function () {
  // Ne hasher que si le mot de passe a été modifié
  if (!this.isModified("password")) {
    return;
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
  } catch (error) {
    throw error;
  }
});

// ============= MÉTHODES D'INSTANCE =============

// Comparer les mots de passe
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw new Error("Erreur lors de la comparaison du mot de passe");
  }
};

// Obtenir le profil public (sans données sensibles)
userSchema.methods.getPublicProfile = function () {
  return {
    id: this._id,
    username: this.username,
    name: this.name || this.username,
    bio: this.bio,
    profilePicture: this.profilePicture,
    coverImage: this.coverImage,
    location: this.location,
    website: this.website,
    hobbies: this.hobbies,
    birthDate: this.birthDate,
    isPrivate: this.isPrivate,
    isVerified: this.isVerified,
    language: this.language,
    followersCount: this.followersCount,
    followingCount: this.followingCount,
    threadsCount: this.threadsCount,
    createdAt: this.createdAt,
  };
};

// Obtenir le profil minimal (pour les listes)
userSchema.methods.getMinimalProfile = function () {
  return {
    id: this._id,
    username: this.username,
    name: this.name || this.username,
    profilePicture: this.profilePicture,
    isVerified: this.isVerified,
  };
};

// ============= MÉTHODES STATIQUES =============

// Rechercher des utilisateurs par nom/username
userSchema.statics.searchUsers = async function (query, limit = 10) {
  try {
    return await this.find(
      { $text: { $search: query } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(limit)
      .select("username name profilePicture bio isVerified isPrivate");
  } catch (error) {
    // Si pas d'index texte, utiliser regex
    return await this.find({
      $or: [
        { username: { $regex: query, $options: "i" } },
        { name: { $regex: query, $options: "i" } },
      ],
    })
      .limit(limit)
      .select("username name profilePicture bio isVerified isPrivate");
  }
};

// Vérifier si un username est disponible
userSchema.statics.isUsernameAvailable = async function (username) {
  const user = await this.findOne({ username });
  return !user;
};

// Vérifier si un email est disponible
userSchema.statics.isEmailAvailable = async function (email) {
  const user = await this.findOne({ email: email.toLowerCase() });
  return !user;
};

const User = mongoose.model("User", userSchema);

export default User;
