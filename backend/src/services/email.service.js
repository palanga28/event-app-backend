const nodemailer = require('nodemailer');

/**
 * Service d'envoi d'emails
 * Configure Nodemailer pour envoyer des emails via SMTP
 */
class EmailService {
  constructor() {
    this.transporter = null;
    this.initialized = false;
  }

  /**
   * Initialise le transporteur email
   */
  initialize() {
    if (this.initialized) return;

    const emailConfig = {
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT || '587'),
      secure: process.env.EMAIL_SECURE === 'true', // true pour port 465, false pour autres ports
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    };

    // Vérifier que les credentials sont configurés
    if (!emailConfig.auth.user || !emailConfig.auth.pass) {
      console.warn('⚠️  Email non configuré - Les emails ne seront pas envoyés');
      console.warn('   Configurez EMAIL_USER et EMAIL_PASSWORD dans .env.local');
      return;
    }

    this.transporter = nodemailer.createTransport(emailConfig);
    this.initialized = true;

    // Vérifier la connexion
    this.transporter.verify((error, success) => {
      if (error) {
        console.error('❌ Erreur configuration email:', error.message);
      } else {
        console.log('✅ Service email prêt');
      }
    });
  }

  /**
   * Envoie un email de réinitialisation de mot de passe
   * @param {string} email - Email du destinataire
   * @param {string} resetToken - Token de réinitialisation
   * @param {string} userName - Nom de l'utilisateur
   */
  async sendPasswordResetEmail(email, resetToken, userName) {
    if (!this.initialized || !this.transporter) {
      console.warn('⚠️  Email non configuré - Token affiché en console (DEV ONLY)');
      console.log(`🔑 Token de réinitialisation pour ${email}: ${resetToken}`);
      
      // En développement, retourner le token pour tests
      if (process.env.NODE_ENV === 'development') {
        return { 
          success: true, 
          token: resetToken,
          message: 'Email non configuré - Token retourné pour développement'
        };
      }
      
      throw new Error('Service email non configuré');
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"Event App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Réinitialisation de votre mot de passe',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
            .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔐 Réinitialisation de mot de passe</h1>
            </div>
            <div class="content">
              <p>Bonjour ${userName || 'Utilisateur'},</p>
              
              <p>Vous avez demandé à réinitialiser votre mot de passe pour votre compte Event App.</p>
              
              <p>Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe :</p>
              
              <div style="text-align: center;">
                <a href="${resetUrl}" class="button">Réinitialiser mon mot de passe</a>
              </div>
              
              <p>Ou copiez ce lien dans votre navigateur :</p>
              <p style="word-break: break-all; background: white; padding: 10px; border-radius: 5px;">
                ${resetUrl}
              </p>
              
              <div class="warning">
                <strong>⚠️ Important :</strong>
                <ul>
                  <li>Ce lien est valide pendant <strong>1 heure</strong></li>
                  <li>Si vous n'avez pas demandé cette réinitialisation, ignorez cet email</li>
                  <li>Ne partagez jamais ce lien avec personne</li>
                </ul>
              </div>
              
              <p>Cordialement,<br>L'équipe Event App</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: `
Bonjour ${userName || 'Utilisateur'},

Vous avez demandé à réinitialiser votre mot de passe pour votre compte Event App.

Cliquez sur ce lien pour créer un nouveau mot de passe :
${resetUrl}

⚠️ Important :
- Ce lien est valide pendant 1 heure
- Si vous n'avez pas demandé cette réinitialisation, ignorez cet email
- Ne partagez jamais ce lien avec personne

Cordialement,
L'équipe Event App
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email envoyé:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erreur envoi email:', error.message);
      throw error;
    }
  }

  /**
   * Envoie un email de bienvenue
   * @param {string} email - Email du destinataire
   * @param {string} userName - Nom de l'utilisateur
   */
  async sendWelcomeEmail(email, userName) {
    if (!this.initialized || !this.transporter) {
      console.warn('⚠️  Email non configuré - Email de bienvenue non envoyé');
      return { success: false, message: 'Email non configuré' };
    }

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';

    const mailOptions = {
      from: `"Event App" <${process.env.EMAIL_USER}>`,
      to: email,
      subject: 'Bienvenue sur Event App ! 🎉',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🎉 Bienvenue sur Event App !</h1>
            </div>
            <div class="content">
              <p>Bonjour ${userName},</p>
              
              <p>Merci de vous être inscrit sur Event App ! Nous sommes ravis de vous compter parmi nous.</p>
              
              <p>Avec Event App, vous pouvez :</p>
              <ul>
                <li>📅 Découvrir des événements près de chez vous</li>
                <li>🎫 Acheter des billets en ligne</li>
                <li>🎪 Créer et gérer vos propres événements</li>
                <li>❤️ Suivre vos organisateurs préférés</li>
              </ul>
              
              <div style="text-align: center;">
                <a href="${frontendUrl}" class="button">Découvrir les événements</a>
              </div>
              
              <p>À très bientôt,<br>L'équipe Event App</p>
            </div>
            <div class="footer">
              <p>Cet email a été envoyé automatiquement, merci de ne pas y répondre.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    try {
      const info = await this.transporter.sendMail(mailOptions);
      console.log('✅ Email de bienvenue envoyé:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      console.error('❌ Erreur envoi email de bienvenue:', error.message);
      // Ne pas bloquer l'inscription si l'email échoue
      return { success: false, error: error.message };
    }
  }
}

// Créer une instance unique (singleton)
const emailService = new EmailService();
emailService.initialize();

module.exports = emailService;
