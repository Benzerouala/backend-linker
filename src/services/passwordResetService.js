import jwt from "jsonwebtoken";
import User from "../models/User.js";
import emailService from "./emailService.js";

class PasswordResetService {
  /**
   * Générer un token de réinitialisation (valide 1 heure)
   */
  generateResetToken(userId) {
    return jwt.sign({ id: userId, type: "reset" }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
  }

  /**
   * Vérifier un token de réinitialisation
   */
  verifyResetToken(token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      if (decoded.type !== "reset") {
        throw new Error("Type de token invalide");
      }

      return decoded;
    } catch (error) {
      if (error.name === "TokenExpiredError") {
        throw new Error("Le lien de réinitialisation a expiré");
      }
      if (error.name === "JsonWebTokenError") {
        throw new Error("Token de réinitialisation invalide");
      }
      throw new Error("Token de réinitialisation invalide ou expiré");
    }
  }

  /**
   * Demander réinitialisation (envoyer email)
   */
  async forgotPassword(email) {
    try {
      // Rechercher l'utilisateur
      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        throw new Error("Cet email n'est pas enregistré");
      }

      // Générer le token de réinitialisation
      const resetToken = this.generateResetToken(user._id);

      // Construire l'URL de réinitialisation
      const resetUrl = `${
        process.env.FRONTEND_URL || "http://localhost:5173"
      }/reset-password?token=${resetToken}`;

      // Envoyer l'email de réinitialisation
      await emailService.sendResetPasswordEmail(
        user.email,
        user.name || user.username,
        resetUrl
      );

      return {
        message: "Email de réinitialisation envoyé avec succès",
        token: resetToken, // ⚠️ À retirer en production
      };
    } catch (error) {
      throw error;
    }
  }

  /**
   * Réinitialiser le mot de passe
   */
  async resetPassword(token, newPassword) {
    try {
      // Vérifier et décoder le token
      const decoded = this.verifyResetToken(token);

      // Rechercher l'utilisateur
      const user = await User.findById(decoded.id).select("+password");

      if (!user) {
        throw new Error("Utilisateur non trouvé");
      }

      // Validation du nouveau mot de passe
      if (!newPassword || newPassword.length < 8) {
        throw new Error("Le mot de passe doit contenir au moins 8 caractères");
      }

      // Mettre à jour le mot de passe (sera hashé automatiquement par le hook)
      user.password = newPassword;
      await user.save();

      return {
        message: "Mot de passe réinitialisé avec succès",
      };
    } catch (error) {
      throw error;
    }
  }
}

export default new PasswordResetService();
