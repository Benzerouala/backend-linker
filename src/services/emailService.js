
import { Resend } from "resend";
import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
    this.resendClient = null;
  }

  /**
   * Initialiser Resend
   */
  initResend() {
    if (this.resendClient) return this.resendClient;

    const emailService = process.env.EMAIL_SERVICE;
    const emailPass = process.env.EMAIL_PASSWORD;

    if (emailService === "resend" && emailPass) {
      this.resendClient = new Resend(emailPass);
      console.log("✅ Resend initialisé");
      return this.resendClient;
    }
    return null;
  }

  /**
   * Obtenir transporter pour services SMTP
   */
  getTransporter() {
    if (this.transporter) return this.transporter;

    const emailService = process.env.EMAIL_SERVICE;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;

    // Si Resend, on utilise l'API, pas SMTP
    if (emailService === "resend") {
      this.initResend();
      return null; // Pas de transporter pour Resend API
    }

    if (!emailUser || !emailPass) {
      throw new Error("Variables d'environnement EMAIL non configurées!");
    }

    // Configuration pour Ethereal (pour les tests)
    if (emailService === "ethereal") {
      this.transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    }
    // Configuration standard pour autres services (Gmail, etc.)
    else {
      this.transporter = nodemailer.createTransport({
        service: emailService || "gmail",
        auth: {
          user: emailUser,
          pass: emailPass,
        },
      });
    }

    console.log("✅ Transporter créé avec succès");
    return this.transporter;
  }

  /**
   * Vérifier la connexion au serveur email
   */
  async verifyConnection() {
    try {
      const emailService = process.env.EMAIL_SERVICE;
      
      if (emailService === "resend") {
        this.initResend();
        console.log("✅ Resend API configurée");
        return true;
      }

      const transporter = this.getTransporter();
      if (transporter) {
        await transporter.verify();
        console.log("✅ Connexion au serveur email vérifiée");
        return true;
      }
      return false;
    } catch (error) {
      console.error("❌ Erreur de connexion au serveur email:", error.message);
      return false;
    }
  }

  /**
   * Envoyer un email de réinitialisation de mot de passe
   */
  async sendResetPasswordEmail(userEmail, userName, resetUrl) {
    try {
      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        throw new Error("Adresse email invalide");
      }

      const mailOptions = {
        from: {
          name: "Linker",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: userEmail,
        replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        subject: "Réinitialisation de votre mot de passe - Linker",
        // En-têtes pour améliorer la délivrabilité
        headers: {
          "X-Mailer": "Linker",
          "List-Unsubscribe": `<${process.env.FRONTEND_URL || "http://localhost:5173"}/unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333333; font-size: 20px; margin-bottom: 20px;">Reinitialisation de mot de passe</h2>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Bonjour ${userName},
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte Linker.
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Pour réinitialiser votre mot de passe, copiez et collez le lien ci-dessous dans votre navigateur :
                </p>
                
                <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0; word-break: break-all;">
                  <p style="color: #0066cc; font-size: 14px; margin: 0; font-family: monospace;">${resetUrl}</p>
                </div>
                
                <p style="margin: 20px 0;">
                  <a href="${resetUrl}" style="color: #0066cc; font-size: 16px; text-decoration: underline;">Cliquez ici pour réinitialiser votre mot de passe</a>
                </p>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 30px; margin-bottom: 10px;">
                  <strong>Important :</strong> Ce lien est valable pendant 1 heure et ne peut être utilisé qu'une seule fois.
                </p>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                  Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.
                </p>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 40px;">
                  Cordialement,<br>
                  L'équipe Linker
                </p>
              </div>
            </body>
          </html>
        `,
        text: `Bonjour ${userName},

Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte Linker.

Pour réinitialiser votre mot de passe, copiez et collez ce lien dans votre navigateur :
${resetUrl}

Important : Ce lien est valable pendant 1 heure et ne peut être utilisé qu'une seule fois.

Si vous n'avez pas demandé cette réinitialisation, ignorez cet email. Votre mot de passe actuel reste inchangé.

Cordialement,
L'équipe Linker`,
      };

      // Utiliser Resend API ou SMTP selon la config
      const emailService = process.env.EMAIL_SERVICE;
      
      if (emailService === "resend") {
        const resend = this.initResend();
        if (!resend) {
          throw new Error("Resend non initialisé");
        }

        const { data, error } = await resend.emails.send({
          from: `Linker <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: userEmail,
          replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          subject: "Réinitialisation de votre mot de passe - Linker",
          html: mailOptions.html,
          text: mailOptions.text,
          headers: mailOptions.headers,
        });

        if (error) {
          throw new Error(`Resend error: ${error.message}`);
        }

        console.log("✅ Email de réinitialisation envoyé avec succès (Resend)");
        console.log("📬 Message ID:", data?.id);
        console.log("📧 Destinataire:", userEmail);

        return { success: true, messageId: data?.id || `resend-${Date.now()}` };
      } else {
        const transporter = this.getTransporter();
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Email de réinitialisation envoyé avec succès");
        console.log("📬 Message ID:", info.messageId);
        console.log("📧 Destinataire:", userEmail);

        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email de réinitialisation");
      console.error("Message:", error.message);
      console.error("Code:", error.code);
      console.error("Réponse:", error.response);
      throw new Error(`Erreur email: ${error.message}`);
    }
  }

  /**
   * Envoyer un email de bienvenue
   */
  async sendWelcomeEmail(userEmail, userName) {
    try {
      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        console.warn(`⚠️ Email invalide ignoré: ${userEmail}`);
        return { success: false, error: "Email invalide" };
      }

      const mailOptions = {
        from: {
          name: "Linker",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: userEmail,
        replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        subject: "Bienvenue sur Linker !",
        // En-têtes pour améliorer la délivrabilité
        headers: {
          "X-Mailer": "Linker",
          "List-Unsubscribe": `<${process.env.FRONTEND_URL || "http://localhost:5173"}/unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333333; font-size: 20px; margin-bottom: 20px;">Bienvenue sur Linker</h2>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Bonjour ${userName},
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Merci de vous être inscrit sur Linker !
                </p>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  Vous pouvez maintenant accéder à votre compte et commencer à explorer Linker.
                </p>
                
                <p style="margin: 30px 0;">
                  <a href="${process.env.FRONTEND_URL || "http://localhost:5173"}" style="color: #0066cc; font-size: 16px; text-decoration: underline;">Accéder à mon compte</a>
                </p>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 40px;">
                  Cordialement,<br>
                  L'équipe Linker
                </p>
              </div>
            </body>
          </html>
        `,
        text: `Bonjour ${userName},

Merci de vous être inscrit sur Linker !

Vous pouvez maintenant accéder à votre compte et commencer à explorer Linker.

Accéder à mon compte : ${process.env.FRONTEND_URL || "http://localhost:5173"}

Cordialement,
L'équipe Linker`,
      };

      // Utiliser Resend API ou SMTP selon la config
      const emailService = process.env.EMAIL_SERVICE;
      
      if (emailService === "resend") {
        const resend = this.initResend();
        if (!resend) {
          return { success: false, error: "Resend non initialisé" };
        }

        const { data, error } = await resend.emails.send({
          from: `Linker <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: userEmail,
          replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          subject: "Bienvenue sur Linker !",
          html: mailOptions.html,
          text: mailOptions.text,
          headers: mailOptions.headers,
        });

        if (error) {
          console.error("❌ Erreur Resend:", error);
          return { success: false, error: error.message };
        }

        console.log("✅ Email de bienvenue envoyé avec succès (Resend)");
        console.log("📬 Message ID:", data?.id);
        console.log("📧 Destinataire:", userEmail);

        return { success: true, messageId: data?.id || `resend-${Date.now()}` };
      } else {
        const transporter = this.getTransporter();
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Email de bienvenue envoyé avec succès");
        console.log("📬 Message ID:", info.messageId);
        console.log("📧 Destinataire:", userEmail);

        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      console.error("❌ Erreur lors de l'envoi de l'email de bienvenue");
      console.error("Message:", error.message);

      // Ne pas lever d'erreur pour ne pas bloquer l'inscription
      return { success: false, error: error.message };
    }
  }

  /**
   * Envoyer un email de notification
   */
  async sendNotificationEmail(userEmail, userName, subject, message) {
    try {
      // Validation de l'email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(userEmail)) {
        console.warn(`⚠️ Email invalide ignoré: ${userEmail}`);
        return { success: false, error: "Email invalide" };
      }

      const appUrl = process.env.FRONTEND_URL || "http://localhost:3000";
      const mailOptions = {
        from: {
          name: "Linker",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: userEmail,
        replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        subject: subject,
        // En-têtes pour améliorer la délivrabilité
        headers: {
          "X-Mailer": "Linker",
          "List-Unsubscribe": `<${appUrl}/unsubscribe>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 20px; font-family: Arial, sans-serif; background-color: #ffffff;">
              <div style="max-width: 600px; margin: 0 auto;">
                <h2 style="color: #333333; font-size: 20px; margin-bottom: 20px;">Linker</h2>
                
                <p style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
                  Bonjour ${userName},
                </p>
                
                <div style="color: #333333; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
                  ${message}
                </div>
                
                <p style="margin: 30px 0;">
                  <a href="${appUrl}" style="color: #0066cc; font-size: 16px; text-decoration: underline;">Ouvrir Linker</a>
                </p>
                
                <p style="color: #666666; font-size: 14px; line-height: 1.6; margin-top: 40px;">
                  Cordialement,<br>
                  L'équipe Linker
                </p>
              </div>
            </body>
          </html>
        `,
        text: `Bonjour ${userName},\n\n${message}\n\nOuvrir Linker: ${appUrl}\n\nCordialement,\nL'équipe Linker`,
      };

      // Utiliser Resend API ou SMTP selon la config
      const emailService = process.env.EMAIL_SERVICE;
      
      if (emailService === "resend") {
        const resend = this.initResend();
        if (!resend) {
          return { success: false, error: "Resend non initialisé" };
        }

        const { data, error } = await resend.emails.send({
          from: `Linker <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
          to: userEmail,
          replyTo: process.env.EMAIL_FROM || process.env.EMAIL_USER,
          subject: subject,
          html: mailOptions.html,
          text: mailOptions.text,
          headers: mailOptions.headers,
        });

        if (error) {
          console.error("❌ Erreur Resend:", error);
          return { success: false, error: error.message };
        }

        console.log("✅ Email de notification envoyé avec succès (Resend)");
        console.log("📬 Message ID:", data?.id);

        return { success: true, messageId: data?.id || `resend-${Date.now()}` };
      } else {
        const transporter = this.getTransporter();
        const info = await transporter.sendMail(mailOptions);

        console.log("✅ Email de notification envoyé avec succès");
        return { success: true, messageId: info.messageId };
      }
    } catch (error) {
      console.error(
        "❌ Erreur lors de l'envoi de l'email de notification:",
        error.message
      );
      return { success: false, error: error.message };
    }
  }
}

export default new EmailService();