import authService from "../services/authService.js";
import userService from "../services/userService.js";
import passwordResetService from "../services/passwordResetService.js";

class AuthController {
  async register(req, res, next) {
    try {
      console.log("📥 Données reçues pour l'inscription:", req.body);

      const { username, email, password, confirmPassword, name } = req.body;

      console.log("✅ username:", username);
      console.log("✅ email:", email);
      console.log("✅ password:", password ? "***" : undefined);
      console.log("✅ confirmPassword:", confirmPassword ? "***" : undefined);
      console.log("✅ name:", name);

      if (!username || !email || !password || !confirmPassword) {
        console.log("❌ Champs manquants détectés");
        return res.status(400).json({
          success: false,
          message: "Veuillez fournir tous les champs requis",
        });
      }

      if (password !== confirmPassword) {
        console.log("❌ Les mots de passe ne correspondent pas");
        return res.status(400).json({
          success: false,
          message: "Les mots de passe ne correspondent pas",
        });
      }

      console.log("🔄 Tentative de création de l'utilisateur...");

      const result = await authService.register({
        username,
        email,
        password,
        name: name,
      });

      console.log("✅ Utilisateur créé avec succès:", result.user.username);

      return res.status(201).json({
        success: true,
        message: "Inscription réussie",
        data: result,
      });
    } catch (error) {
      console.error("❌ Erreur inscription:", error);
      return res.status(400).json({
        success: false,
        message: error.message || "Erreur lors de l'inscription",
      });
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: "Veuillez fournir email et mot de passe",
        });
      }

      const result = await authService.login(email, password);

      return res.status(200).json({
        success: true,
        message: "Connexion réussie",
        data: result,
      });
    } catch (error) {
      console.error("❌ Erreur connexion:", error);
      return res.status(401).json({
        success: false,
        message: error.message || "Email ou mot de passe incorrect",
      });
    }
  }

  async getMe(req, res, next) {
    try {
      const user = await userService.findById(req.user.id);

      return res.status(200).json({
        success: true,
        data: user.getPublicProfile(),
      });
    } catch (error) {
      console.error("❌ Erreur getMe:", error);
      return res.status(404).json({
        success: false,
        message: "Utilisateur non trouvé",
      });
    }
  }

  async logout(req, res, next) {
    try {
      return res.status(200).json({
        success: true,
        message: "Déconnexion réussie",
      });
    } catch (error) {
      console.error("❌ Erreur logout:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la déconnexion",
      });
    }
  }

  async checkUsername(req, res, next) {
    try {
      const { username } = req.body;

      if (!username) {
        return res.status(400).json({
          success: false,
          message: "Username requis",
        });
      }

      const result = await userService.checkUsernameAvailability(username);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Erreur check username:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la vérification",
      });
    }
  }

  async checkEmail(req, res, next) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          message: "Email requis",
        });
      }

      const result = await userService.checkEmailAvailability(email);

      return res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error("❌ Erreur check email:", error);
      return res.status(500).json({
        success: false,
        message: "Erreur lors de la vérification",
      });
    }
  }

  async forgotPassword(req, res, next) {
    try {
      const { email } = req.body;

      console.log("📧 Demande de réinitialisation pour:", email);

      const result = await passwordResetService.forgotPassword(email);

      return res.status(200).json({
        success: true,
        message: result.message,
        ...(process.env.NODE_ENV === "development" && { token: result.token }),
      });
    } catch (error) {
      console.error("❌ Erreur forgot password:", error.message);

      return res.status(200).json({
        success: true,
        message:
          "Si cet email existe, un lien de réinitialisation a été envoyé",
      });
    }
  }

  async resetPassword(req, res, next) {
    try {
      const { token, newPassword } = req.body;

      console.log("🔑 Tentative de réinitialisation de mot de passe");

      if (!token || !newPassword) {
        return res.status(400).json({
          success: false,
          message: "Token et nouveau mot de passe requis",
        });
      }

      const result = await passwordResetService.resetPassword(
        token,
        newPassword
      );

      console.log("✅ Mot de passe réinitialisé avec succès");

      return res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error("❌ Erreur reset password:", error.message);
      return res.status(400).json({
        success: false,
        message: error.message || "Token invalide ou expiré",
      });
    }
  }
}

export default new AuthController();
