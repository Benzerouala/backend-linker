// backend/src/controllers/userController.js
import userService from "../services/userService.js";

class UserController {
  /**
   * GET /api/users/me
   */
  async getCurrentUser(req, res) {
    try {
      const userId = req.user.id;
      const user = await userService.findById(userId);

      if (!user) {
        return res.status(404).json({
          success: false,
          message: "Utilisateur non trouvé",
        });
      }

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          username: user.username,
          email: user.email,
          name: user.name,
          bio: user.bio,
          location: user.location,
          website: user.website,
          hobbies: user.hobbies,
          birthDate: user.birthDate,
          profilePicture: user.profilePicture,
          coverImage: user.coverImage,
          isPrivate: user.isPrivate,
          isVerified: user.isVerified,
          followersCount: user.followersCount,
          followingCount: user.followingCount,
          createdAt: user.createdAt,
        },
      });
    } catch (error) {
      console.error("Erreur getCurrentUser:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des informations utilisateur",
      });
    }
  }

  /**
   * GET /api/users/:id
   */
  async getUserProfile(req, res) {
    try {
      const { id } = req.params;
      const currentUserId = req.user?.id;

      const profile = await userService.getUserProfile(id, currentUserId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Erreur getUserProfile:", error);
      res.status(404).json({
        success: false,
        message: error.message || "Utilisateur non trouvé",
      });
    }
  }

  /**
   * GET /api/users/username/:username
   */
  async getUserByUsername(req, res) {
    try {
      const { username } = req.params;
      const currentUserId = req.user?.id;

      const user = await userService.findByUsername(username);
      const profile = await userService.getUserProfile(user._id, currentUserId);

      res.status(200).json({
        success: true,
        data: profile,
      });
    } catch (error) {
      console.error("Erreur getUserByUsername:", error);
      res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }
  }

  /**
   * PUT /api/users/me
   */
  async updateProfile(req, res) {
    try {
      const userId = req.user.id;
      const updateData = req.body;

      const updatedProfile = await userService.updateProfile(
        userId,
        updateData
      );

      res.status(200).json({
        success: true,
        message: "Profil mis à jour avec succès",
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Erreur updateProfile:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de la mise à jour du profil",
      });
    }
  }

  /**
   * PUT /api/users/me/profile-picture
   */
  async updateProfilePicture(req, res) {
    try {
      const userId = req.user.id;
      let imageUrl = req.body.imageUrl;

      // ✅ AJOUT upload fichier
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image requise",
        });
      }

      const updatedProfile = await userService.updateProfilePicture(
        userId,
        imageUrl
      );

      res.status(200).json({
        success: true,
        message: "Photo de profil mise à jour",
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Erreur updateProfilePicture:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de la mise à jour de la photo",
      });
    }
  }

  /**
   * PUT /api/users/me/cover-image
   */
  async updateCoverImage(req, res) {
    try {
      const userId = req.user.id;
      let imageUrl = req.body.imageUrl;

      // ✅ AJOUT upload fichier
      if (req.file) {
        imageUrl = `/uploads/${req.file.filename}`;
      }

      if (!imageUrl) {
        return res.status(400).json({
          success: false,
          message: "Image requise",
        });
      }

      const updatedProfile = await userService.updateCoverImage(
        userId,
        imageUrl
      );

      res.status(200).json({
        success: true,
        message: "Photo de couverture mise à jour",
        data: updatedProfile,
      });
    } catch (error) {
      console.error("Erreur updateCoverImage:", error);
      res.status(400).json({
        success: false,
        message:
          error.message || "Erreur lors de la mise à jour de la couverture",
      });
    }
  }

  /**
   * PUT /api/users/me/password
   */
  async changePassword(req, res) {
    try {
      const userId = req.user.id;
      const { currentPassword, newPassword } = req.body;

      if (!currentPassword || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Mot de passe actuel et nouveau mot de passe requis",
        });
      }

      if (newPassword.length < 8) {
        return res.status(400).json({
          success: false,
          message:
            "Le nouveau mot de passe doit contenir au moins 8 caractères",
        });
      }

      const result = await userService.changePassword(
        userId,
        currentPassword,
        newPassword
      );

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Erreur changePassword:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Erreur lors du changement de mot de passe",
      });
    }
  }

  /**
   * GET /api/users/search
   */
  async searchUsers(req, res) {
    try {
      const { q, limit = 20 } = req.query;
      const currentUserId = req.user?.id;

      if (!q || q.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Terme de recherche requis",
        });
      }

      const users = await userService.searchUsers(
        q,
        parseInt(limit),
        currentUserId
      );

      res.status(200).json({
        success: true,
        data: users,
      });
    } catch (error) {
      console.error("Erreur searchUsers:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la recherche",
      });
    }
  }

  /**
   * GET /api/users/suggestions
   */
  async getSuggestedUsers(req, res) {
    try {
      const userId = req.user.id;
      const { limit = 10 } = req.query;

      const suggestions = await userService.getSuggestedUsers(
        userId,
        parseInt(limit)
      );

      res.status(200).json({
        success: true,
        data: suggestions,
      });
    } catch (error) {
      console.error("Erreur getSuggestedUsers:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la récupération des suggestions",
      });
    }
  }

  /**
   * GET /api/users/:id/stats
   */
  async getUserStats(req, res) {
    try {
      const { id } = req.params;

      const stats = await userService.getUserStats(id);

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error) {
      console.error("Erreur getUserStats:", error);
      res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }
  }

  /**
   * DELETE /api/users/me
   */
  async deleteAccount(req, res) {
    try {
      const userId = req.user.id;

      const result = await userService.deleteUser(userId);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("Erreur deleteAccount:", error);
      res.status(500).json({
        success: false,
        message: "Erreur lors de la suppression du compte",
      });
    }
  }
}

export default new UserController();
