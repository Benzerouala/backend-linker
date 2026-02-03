import Follow from "../models/Follow.js";
import User from "../models/User.js";
import Notification from "../models/Notification.js";
import userService from "./userService.js";
import settingsService from "./settingsService.js";
import notificationService from "./notificationService.js";

class FollowService {
  /**
   * Suivre un utilisateur
   */
  async followUser(followerId, followingId) {
    if (followerId.toString() === followingId.toString()) {
      throw new Error("Vous ne pouvez pas vous suivre vous-même");
    }

    // Vérifier si la relation existe déjà
    const existingFollow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (existingFollow) {
      if (
        existingFollow.status === "requested" ||
        existingFollow.status === "en_attente"
      ) {
        throw new Error("Demande déjà envoyée");
      }
      throw new Error("Vous suivez déjà cet utilisateur");
    }

    // Obtenir l'utilisateur cible pour vérifier les paramètres de confidentialité
    const targetUser = await User.findById(followingId);
    if (!targetUser) {
      throw new Error("Utilisateur non trouvé");
    }

    // Utiliser les nouveaux paramètres de confidentialité
    const userSettings = await settingsService.getUserSettings(followingId);
    let status = "accepte";

    // Vérifier qui peut suivre l'utilisateur
    switch (userSettings.privacy.whoCanFollowMe) {
      case "nobody":
        throw new Error("Cet utilisateur n'accepte pas de nouveaux abonnés");
      case "friends_of_friends":
        // Logique complexe à implémenter plus tard
        status = "en_attente";
        break;
      case "everyone":
      default:
        // Utiliser le paramètre isPrivate pour la rétrocompatibilité
        status = targetUser.isPrivate ? "en_attente" : "accepte";
        break;
    }

    // Créer le suivi
    const follow = await Follow.create({
      follower: followerId,
      following: followingId,
      status: status,
    });

    // Mettre à jour les compteurs seulement si le statut est accepté
    if (status === "accepte") {
      await userService.incrementFollowingCount(followerId);
      await userService.incrementFollowersCount(followingId);

      // Notification de nouveau follower
      await notificationService.createNotification({
        recipient: followingId,
        sender: followerId,
        type: "new_follower",
      });
    } else {
      // Notification de demande de suivi (pour comptes privés)
      await notificationService.createNotification({
        recipient: followingId,
        sender: followerId,
        type: "follow_request",
      });
    }

    return follow;
  }

  /**
   * Accepter une demande de suivi
   */
  async acceptFollowRequest(followerId, followingId) {
    const follow = await Follow.findOneAndUpdate(
      {
        follower: followerId,
        following: followingId,
        status: { $in: ["en_attente", "requested"] },
      },
      { status: "accepte" },
      { new: true },
    );

    if (!follow) {
      throw new Error("Demande de suivi non trouvée ou déjà traitée");
    }

    await userService.incrementFollowingCount(followerId);
    await userService.incrementFollowersCount(followingId);

    // Notification de suivi accepté
    await notificationService.createNotification({
      recipient: followerId,
      sender: followingId,
      type: "follow_accepted",
    });

    return follow;
  }

  /**
   * Refuser une demande de suivi
   */
  async rejectFollowRequest(followerId, followingId) {
    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
      status: { $in: ["en_attente", "requested"] },
    });

    if (!follow) {
      throw new Error("Demande de suivi non trouvée ou déjà traitée");
    }

    return { message: "Demande refusée" };
  }

  /**
   * Obtenir les demandes en attente
   */
  async getPendingRequests(userId) {
    return await Follow.find({
      following: userId,
      status: { $in: ["en_attente", "requested"] },
    })
      .populate("follower", "username name profilePicture bio isVerified")
      .sort({ createdAt: -1 });
  }

  /**
   * Obtenir les demandes envoyees (en attente)
   */
  async getSentRequests(userId) {
    return await Follow.find({
      follower: userId,
      status: { $in: ["en_attente", "requested"] },
    })
      .populate("following", "username name profilePicture bio isVerified isPrivate")
      .sort({ createdAt: -1 });
  }

  /**
   * Obtenir la liste des abonnés
   */
  async getFollowers(userId, currentUserId = null) {
    // Vérifier si le profil est privé
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new Error("Utilisateur non trouvé");
    }

    // Si le compte est privé, vérifier les permissions
    if (targetUser.isPrivate) {
      // Le propriétaire peut voir ses propres abonnés
      if (currentUserId && currentUserId.toString() === userId.toString()) {
        // Autorisé - c'est le propriétaire
      } else {
        // Vérifier si l'utilisateur actuel suit ce compte
        const isFollowing = await Follow.findOne({
          follower: currentUserId,
          following: userId,
          status: "accepte"
        });
        
        if (!isFollowing) {
          throw new Error("Ce profil est privé. Vous devez suivre cet utilisateur pour voir ses abonnés.");
        }
      }
    }

    const followers = await Follow.find({
      following: userId,
      status: "accepte",
    })
      .populate(
        "follower",
        "username name profilePicture bio isVerified isPrivate",
      )
      .sort({ createdAt: -1 });

    return followers.map((f) => f.follower);
  }

  /**
   * Obtenir la liste des abonnements
   */
  async getFollowing(userId, currentUserId = null) {
    // Vérifier si le profil est privé
    const targetUser = await User.findById(userId);
    if (!targetUser) {
      throw new Error("Utilisateur non trouvé");
    }

    // Si le compte est privé, vérifier les permissions
    if (targetUser.isPrivate) {
      // Le propriétaire peut voir ses propres abonnements
      if (currentUserId && currentUserId.toString() === userId.toString()) {
        // Autorisé - c'est le propriétaire
      } else {
        // Vérifier si l'utilisateur actuel suit ce compte
        const isFollowing = await Follow.findOne({
          follower: currentUserId,
          following: userId,
          status: "accepte"
        });
        
        if (!isFollowing) {
          throw new Error("Ce profil est privé. Vous devez suivre cet utilisateur pour voir ses abonnements.");
        }
      }
    }

    const following = await Follow.find({
      follower: userId,
      status: "accepte",
    })
      .populate(
        "following",
        "username name profilePicture bio isVerified isPrivate",
      )
      .sort({ createdAt: -1 });

    return following.map((f) => f.following);
  }

  /**
   * Ne plus suivre un utilisateur
   */
  async unfollowUser(followerId, followingId) {
    const follow = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!follow) {
      throw new Error("Vous ne suivez pas cet utilisateur");
    }

    // Mettre à jour les compteurs
    await userService.decrementFollowingCount(followerId);
    await userService.decrementFollowersCount(followingId);

    return { message: "Désabonnement réussi" };
  }

  /**
   * Supprimer un abonné (remove follower)
   */
  async removeFollower(followingId, followerId) {
    // Vérifier que l'abonné existe bien
    const follow = await Follow.findOne({
      follower: followerId,
      following: followingId,
    });

    if (!follow) {
      throw new Error("Cet utilisateur ne vous suit pas");
    }

    // Supprimer la relation de suivi
    const result = await Follow.findOneAndDelete({
      follower: followerId,
      following: followingId,
    });

    if (!result) {
      throw new Error("Impossible de supprimer cet abonné");
    }

    // Mettre à jour les compteurs
    await userService.decrementFollowersCount(followingId);
    await userService.decrementFollowingCount(followerId);

    return { message: "Abonné supprimé avec succès" };
  }
}

export default new FollowService();
