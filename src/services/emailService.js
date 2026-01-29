
import nodemailer from "nodemailer";

class EmailService {
  constructor() {
    this.transporter = null;
  }

  getTransporter() {
    if (this.transporter) return this.transporter;

    console.log("📧 Création du transporter email avec SendGrid...");

    const emailService = process.env.EMAIL_SERVICE;
    const emailUser = process.env.EMAIL_USER;
    const emailPass = process.env.EMAIL_PASSWORD;

    console.log("Service:", emailService);
    console.log("User:", emailUser);
    console.log("Pass exists:", !!emailPass);

    if (!emailUser || !emailPass) {
      throw new Error("Variables d'environnement EMAIL non configurées!");
    }

    // Configuration pour SendGrid
    if (emailService === "sendgrid") {
      this.transporter = nodemailer.createTransport({
        host: "smtp.sendgrid.net",
        port: 587,
        secure: false, // true pour le port 465, false pour les autres ports
        auth: {
          user: emailUser, // Devrait être 'apikey'
          pass: emailPass, // Votre clé API SendGrid
        },
      });
    }
    // Configuration pour Ethereal (pour les tests)
    else if (emailService === "ethereal") {
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
      const transporter = this.getTransporter();
      await transporter.verify();
      console.log("✅ Connexion au serveur email vérifiée");
      return true;
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
      const mailOptions = {
        from: {
          name: "Nexus",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: userEmail,
        subject: "🔐 Réinitialisation de votre mot de passe",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 24px;">🔐 Réinitialisation de mot de passe</h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 14px;">Nexus</p>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px; background-color: white;">
                  <p style="font-size: 18px; color: #333; margin-bottom: 20px;">Bonjour <strong>${userName}</strong> 👋</p>
                  
                  <p style="color: #555; line-height: 1.8; margin-bottom: 30px;">
                    Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte. 
                    Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
                  </p>
                  
                  <!-- Button -->
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${resetUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">
                      Réinitialiser mon mot de passe
                    </a>
                  </div>
                  
                  <!-- Warning Box -->
                  <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 25px 0; border-radius: 4px;">
                    <p style="color: #856404; font-size: 14px; margin: 5px 0;"><strong>⏱️ Important :</strong></p>
                    <p style="color: #856404; font-size: 14px; margin: 5px 0;">• Ce lien est valable pendant <strong>1 heure</strong></p>
                    <p style="color: #856404; font-size: 14px; margin: 5px 0;">• Il ne peut être utilisé qu'une seule fois</p>
                  </div>
                  
                  <!-- Link Box -->
                  <div style="background-color: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
                    <p style="font-size: 12px; color: #666; margin-bottom: 8px;">Si le bouton ne fonctionne pas, copiez et collez ce lien :</p>
                    <p style="color: #667eea; font-size: 13px; word-break: break-all; margin: 0;">${resetUrl}</p>
                  </div>
                  
                  <p style="color: #555; line-height: 1.8; margin-top: 30px;">
                    <strong>Vous n'avez pas demandé cette réinitialisation ?</strong><br>
                    Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email. 
                    Votre mot de passe actuel reste inchangé et votre compte est en sécurité.
                  </p>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 13px; margin: 8px 0;"><strong>Nexus</strong></p>
                  <p style="color: #6c757d; font-size: 13px; margin: 8px 0;">Besoin d'aide ? Contactez notre support</p>
                  <p style="color: #6c757d; font-size: 12px; margin: 20px 0 0 0;">© 2025 Nexus. Tous droits réservés.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Bonjour ${userName},

Nous avons reçu une demande de réinitialisation du mot de passe pour votre compte.

Cliquez sur ce lien pour créer un nouveau mot de passe :
${resetUrl}

⏱️ Important :
- Ce lien est valable pendant 1 heure
- Il ne peut être utilisé qu'une seule fois

Vous n'avez pas demandé cette réinitialisation ?
Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email. Votre mot de passe actuel reste inchangé.

Cordialement,
L'équipe Nexus

© 2025 Nexus. Tous droits réservés.
        `,
      };

      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);

      console.log("✅ Email de réinitialisation envoyé avec succès");
      console.log("📬 Message ID:", info.messageId);
      console.log("📧 Destinataire:", userEmail);

      return { success: true, messageId: info.messageId };
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
      const mailOptions = {
        from: {
          name: "Nexus",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: userEmail,
        subject: "🎉 Bienvenue dans notre communauté !",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                <!-- Header -->
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 24px;">Bienvenue ${userName} ! 🎉</h1>
                </div>
                
                <!-- Content -->
                <div style="padding: 40px 30px; background-color: white;">
                  <p style="color: #555; line-height: 1.8; margin-bottom: 20px;">
                    Merci de vous être inscrit sur notre plateforme !
                  </p>
                  
                  <p style="color: #555; line-height: 1.8; margin-bottom: 30px;">
                    Vous pouvez maintenant accéder à votre compte et commencer à explorer notre communauté. 
                    Nous sommes ravis de vous avoir parmi nous ! 🚀
                  </p>
                  
                  <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="color: #333; margin-top: 0;">Prochaines étapes :</h3>
                    <ul style="color: #555; line-height: 2;">
                      <li>Complétez votre profil</li>
                      <li>Ajoutez des amis</li>
                      <li>Partagez votre premier post</li>
                    </ul>
                  </div>
                  
                  <div style="text-align: center; margin: 35px 0;">
                    <a href="${
                      process.env.FRONTEND_URL || "http://localhost:3000"
                    }" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Commencer maintenant
                    </a>
                  </div>
                </div>
                
                <!-- Footer -->
                <div style="background-color: #f8f9fa; padding: 30px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 13px; margin: 8px 0;"><strong>Nexus</strong></p>
                  <p style="color: #6c757d; font-size: 13px; margin: 8px 0;">Besoin d'aide ? Contactez notre support</p>
                  <p style="color: #6c757d; font-size: 12px; margin: 20px 0 0 0;">© 2025 Nexus. Tous droits réservés.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `
Bienvenue ${userName} ! 🎉

Merci de vous être inscrit sur notre plateforme !

Vous pouvez maintenant accéder à votre compte et commencer à explorer notre communauté. Nous sommes ravis de vous avoir parmi nous !

Prochaines étapes :
- Complétez votre profil
- Ajoutez des amis
- Partagez votre premier post

Cordialement,
L'équipe Nexus

© 2025 Nexus. Tous droits réservés.
        `,
      };

      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);

      console.log("✅ Email de bienvenue envoyé avec succès");
      console.log("📬 Message ID:", info.messageId);
      console.log("📧 Destinataire:", userEmail);

      return { success: true, messageId: info.messageId };
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
      const mailOptions = {
        from: {
          name: "Nexus",
          address: process.env.EMAIL_FROM || process.env.EMAIL_USER,
        },
        to: userEmail,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="margin: 0; padding: 0; font-family: Arial, sans-serif; background-color: #f5f5f5;">
              <div style="max-width: 600px; margin: 0 auto; background-color: white;">
                <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
                  <h1 style="margin: 0; color: white; font-size: 20px;">Nexus</h1>
                </div>
                
                <div style="padding: 40px 30px; background-color: white;">
                  <p style="color: #333; margin-bottom: 20px;">Bonjour <strong>${userName}</strong>,</p>
                  <div style="color: #555; line-height: 1.8;">${message}</div>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 20px; text-align: center; border-top: 1px solid #e9ecef;">
                  <p style="color: #6c757d; font-size: 12px; margin: 0;">© 2025 Nexus. Tous droits réservés.</p>
                </div>
              </div>
            </body>
          </html>
        `,
        text: `Bonjour ${userName},\n\n${message}\n\n© 2025 Nexus`,
      };

      const transporter = this.getTransporter();
      const info = await transporter.sendMail(mailOptions);

      console.log("✅ Email de notification envoyé avec succès");
      return { success: true, messageId: info.messageId };
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