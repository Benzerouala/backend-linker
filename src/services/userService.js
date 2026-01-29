//backend/src/services/userService.js
import User from "../models/User.js";
import Follow from "../models/Follow.js";
import Thread from "../models/Thread.js";
import Reply from "../models/Reply.js";
import Notification from "../models/Notification.js";
import Settings from "../models/Settings.js";
import Like from "../models/Like.js";

class UserService {
  /**
   * Créer un nouvel utilisateur
   */
  async createUser(userData) {
    try {
      const { username, email, password, name } = userData;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await User.findOne({
        $or: [{ email: email.toLowerCase() }, { username }],
      });

      if (existingUser) {
        if (existingUser.email === email.toLowerCase()) {
          throw new Error("Cet email est déjà utilisé");
        }
        if (existingUser.username === username) {
          throw new Error("Ce nom d'utilisateur est déjà pris");
        }
      }

      // Créer l'utilisateur (le password sera hashé automatiquement)
      const user = await User.create({
        username,
        email,
        password,
        name: name || username,
      });

      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Trouver un utilisateur par email
   */
  async findByEmail(email) {
    try {
      return await User.findOne({ email: email.toLowerCase() }).select(
        "+password"
      );
    } catch (error) {
      throw new Error("Erreur lors de la recherche de l'utilisateur");
    }
  }

  /**
   * Trouver un utilisateur par ID
   */
  async findById(userId) {
    try {
      const user = await User.findById(userId);
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Trouver un utilisateur par username
   */
  async findByUsername(username) {
    try {
      const user = await User.findOne({ username });
      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }
      return user;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Obtenir le profil public avec statut de suivi
   */
  async getUserProfile(userId, currentUserId = null) {
    try {
      const user = await this.findById(userId);
      const profile = user.getPublicProfile();

      // Si le compte est privé et que ce n'est pas le propriétaire
      if (user.isPrivate && currentUserId && currentUserId.toString() !== userId.toString()) {
        // Vérifier si l'utilisateur actuel suit ce compte
        const followRelation = await Follow.findOne({
          follower: currentUserId,
          following: userId,
          status: "accepte"
        });

        if (!followRelation) {
          // Profil privé non accessible - retourner informations minimales
          return {
            id: user._id,
            username: user.username,
            name: user.name || user.username,
            profilePicture: user.profilePicture,
            isPrivate: user.isPrivate,
            isVerified: user.isVerified,
            followersCount: user.followersCount,
            followingCount: user.followingCount,
            isFollowing: false,
            followStatus: null,
            message: "Ce profil est privé"
          };
        }

        profile.isFollowing = true;
        profile.followStatus = "accepte";
      } else if (currentUserId && currentUserId.toString() !== userId.toString()) {
        // Compte public - vérifier la relation de suivi
        const followRelation = await Follow.findOne({
          follower: currentUserId,
          following: userId,
        });

        profile.isFollowing = !!followRelation;
        profile.followStatus = followRelation ? followRelation.status : null;
      } else if (currentUserId && currentUserId.toString() === userId.toString()) {
        // Propriétaire du compte - pas de restriction
        profile.isFollowing = true;
        profile.followStatus = "accepte";
      }

      return profile;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour le profil
   */
  async updateProfile(userId, updateData) {
    try {
      // Champs autorisés à être mis à jour
      const allowedUpdates = [
        "name",
        "bio",
        "location",
        "website",
        "profilePicture",
        "coverImage",
        "hobbies",
        "birthDate",
        "isPrivate",
        "language",
      ];

      // Filtrer uniquement les champs autorisés
      const filteredData = {};
      Object.keys(updateData).forEach((key) => {
        if (allowedUpdates.includes(key)) {
          filteredData[key] = updateData[key];
        }
      });

      const user = await User.findByIdAndUpdate(userId, filteredData, {
        new: true,
        runValidators: true,
      });

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      return user.getPublicProfile();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour la photo de profil
   */
  async updateProfilePicture(userId, imageUrl) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { profilePicture: imageUrl },
        { new: true }
      );

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      return user.getPublicProfile();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Mettre à jour la photo de couverture
   */
  async updateCoverImage(userId, imageUrl) {
    try {
      const user = await User.findByIdAndUpdate(
        userId,
        { coverImage: imageUrl },
        { new: true }
      );

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      return user.getPublicProfile();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Changer le mot de passe
   */
  async changePassword(userId, currentPassword, newPassword) {
    try {
      const user = await User.findById(userId).select("+password");

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      // Vérifier l'ancien mot de passe
      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        throw new Error("Mot de passe actuel incorrect");
      }

      // Mettre à jour le mot de passe (sera hashé automatiquement)
      user.password = newPassword;
      await user.save();

      return { message: "Mot de passe modifié avec succès" };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Rechercher des utilisateurs
   */
  async searchUsers(query, limit = 20, currentUserId = null) {
    try {
      const users = await User.find({
        $or: [
          { username: { $regex: query, $options: "i" } },
          { name: { $regex: query, $options: "i" } },
        ],
      })
        .select("_id username name profilePicture bio isVerified isPrivate")
        .limit(limit);

      // Ajouter le statut de suivi
      if (currentUserId) {
        const usersWithFollowStatus = await Promise.all(
          users.map(async (user) => {
            const followRelation = await Follow.findOne({
              follower: currentUserId,
              following: user._id,
            });

            return {
              ...user.toObject(),
              isFollowing: !!followRelation,
              followStatus: followRelation ? followRelation.status : null,
            };
          })
        );

        return usersWithFollowStatus;
      }

      return users;
    } catch (error) {
      throw new Error("Erreur lors de la recherche d'utilisateurs");
    }
  }

  /**
   * Obtenir des suggestions d'utilisateurs
   */
  async getSuggestedUsers(userId, limit = 10) {
    try {
      // Récupérer les IDs des utilisateurs déjà suivis
      const following = await Follow.find({
        follower: userId,
        status: "accepte",
      }).distinct("following");

      // Trouver des utilisateurs non suivis
      const suggestedUsers = await User.find({
        _id: {
          $nin: [...following, userId],
        },
      })
        .select("username name profilePicture bio isVerified")
        .sort({ followersCount: -1 })
        .limit(limit);

      return suggestedUsers;
    } catch (error) {
      throw new Error("Erreur lors de la récupération des suggestions");
    }
  }

  /**
   * Obtenir les statistiques d'un utilisateur
   */
  async getUserStats(userId) {
    try {
      const user = await this.findById(userId);

      return {
        followers: user.followersCount,
        following: user.followingCount,
        threads: user.threadsCount,
        joinedAt: user.createdAt,
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de threads
   */
  async incrementThreadsCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { threadsCount: 1 } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Décrémenter le compteur de threads
   */
  async decrementThreadsCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { threadsCount: -1 } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de followers
   */
  async incrementFollowersCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { followersCount: 1 } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Décrémenter le compteur de followers
   */
  async decrementFollowersCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { followersCount: -1 } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Incrémenter le compteur de following
   */
  async incrementFollowingCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { followingCount: 1 } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Décrémenter le compteur de following
   */
  async decrementFollowingCount(userId) {
    try {
      await User.findByIdAndUpdate(userId, { $inc: { followingCount: -1 } });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vérifier la disponibilité d'un username
   */
  async checkUsernameAvailability(username) {
    try {
      const isAvailable = await User.isUsernameAvailable(username);
      return { available: isAvailable };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Vérifier la disponibilité d'un email
   */
  async checkEmailAvailability(email) {
    try {
      const isAvailable = await User.isEmailAvailable(email);
      return { available: isAvailable };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Supprimer un utilisateur et toutes ses données associées
   */
  async deleteUser(userId) {
    try {
      console.log("Début de la suppression de l'utilisateur:", userId);
      
      // 1. Supprimer toutes les notifications envoyées/reçues par l'utilisateur
      console.log("Suppression des notifications...");
      const notificationsDeleted = await Notification.deleteMany({
        $or: [{ recipient: userId }, { sender: userId }]
      });
      console.log("Notifications supprimées:", notificationsDeleted);

      // 2. Supprimer tous les threads de l'utilisateur
      console.log("Suppression des threads...");
      const threadsDeleted = await Thread.deleteMany({ author: userId });
      console.log("Threads supprimés:", threadsDeleted);

      // 3. Supprimer toutes les réponses de l'utilisateur
      console.log("Suppression des réponses...");
      const repliesDeleted = await Reply.deleteMany({ author: userId });
      console.log("Réponses supprimées:", repliesDeleted);

      // 4. Supprimer tous les likes de l'utilisateur
      console.log("Suppression des likes...");
      const likesDeleted = await Like.deleteMany({ user: userId });
      console.log("Likes supprimés:", likesDeleted);

      // 5. Supprimer les paramètres de l'utilisateur
      console.log("Suppression des paramètres...");
      const settingsDeleted = await Settings.deleteMany({ user: userId });
      console.log("Paramètres supprimés:", settingsDeleted);

      // 6. Nettoyer les relations de suivi (follower et following)
      console.log("Suppression des relations de suivi...");
      const followsDeleted = await Follow.deleteMany({
        $or: [{ follower: userId }, { following: userId }],
      });
      console.log("Relations de suivi supprimées:", followsDeleted);

      // 7. Supprimer l'utilisateur lui-même
      console.log("Suppression de l'utilisateur...");
      const userDeleted = await User.findByIdAndDelete(userId);
      console.log("Utilisateur supprimé:", userDeleted);

      return {
        message: "Utilisateur et toutes ses données supprimés avec succès",
        details: {
          notifications: notificationsDeleted.deletedCount,
          threads: threadsDeleted.deletedCount,
          replies: repliesDeleted.deletedCount,
          likes: likesDeleted.deletedCount,
          settings: settingsDeleted.deletedCount,
          follows: followsDeleted.deletedCount,
          user: userDeleted ? 1 : 0
        }
      };
    } catch (error) {
      console.error("Erreur détaillée lors de la suppression:", error);
      throw error;
    }
  }
}

export default new UserService();
