// Gmail Email Service - Simple and clean Gmail SMTP integration

export interface GmailConfig {
  photographerEmail: string;
  photographerName?: string;
  enableNotifications: boolean;
}

export interface EmailData {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export interface PhotoSelection {
  photoId: string;
  photoName: string;
  originalName: string;
  url: string;
  comments: string[];
}

export class GmailService {
  private config: GmailConfig;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  // Generate HTML email for selection notification
  generateSelectionEmail(
    galleryId: string, 
    galleryName: string,
    clientName: string, 
    selectedPhotos: PhotoSelection[], 
    downloadUrl: string,
    isCompleteSelection: boolean = false
  ): EmailData {
    const photoCount = selectedPhotos.length;
    const uniquePhotoNames = [...new Set(selectedPhotos.map(p => p.photoName))];
    const baseUrl = window.location.origin;
    const galleryUrl = `${baseUrl}/?gallery=${encodeURIComponent(galleryId)}`;
    
    // Logo SVG as base64
    const logoSvg = `<svg width="40" height="40" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <rect width="100" height="100" rx="20" fill="url(#gradient)"/>
      <path d="M30 40 L50 30 L70 40 L70 60 L50 70 L30 60 Z" fill="white" opacity="0.9"/>
      <circle cx="50" cy="50" r="10" fill="url(#gradient)"/>
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:#667eea;stop-opacity:1" />
          <stop offset="100%" style="stop-color:#764ba2;stop-opacity:1" />
        </linearGradient>
      </defs>
    </svg>`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
      </head>
      <body style="margin: 0; padding: 0; background-color: #f7f7f7;">
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: white; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
          
          <!-- Header with logo -->
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px 20px; text-align: center;">
            <div style="display: inline-block; vertical-align: middle; margin-right: 15px;">
              ${logoSvg}
            </div>
            <h1 style="display: inline-block; vertical-align: middle; color: white; margin: 0; font-size: 24px; font-weight: 600;">
              Galerie Photo
            </h1>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px 20px;">
            <h2 style="color: #2d3748; margin-top: 0; margin-bottom: 20px; font-size: 22px;">
              📸 Nouvelle sélection ${isCompleteSelection ? 'complète' : 'client'}
            </h2>
            
            <!-- Selection details card -->
            <div style="background: #f8f9fa; padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #667eea;">
              <h3 style="margin-top: 0; margin-bottom: 15px; color: #667eea; font-size: 18px;">
                Détails de la sélection
              </h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px 0; color: #718096;">
                    <strong>Galerie :</strong>
                  </td>
                  <td style="padding: 8px 0; color: #2d3748;">
                    ${galleryName}
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; color: #718096;">
                    <strong>Type :</strong>
                  </td>
                  <td style="padding: 8px 0; color: #2d3748;">
                    ${isCompleteSelection ? 'Sélection complète (tous les utilisateurs)' : 'Sélection individuelle'}
                  </td>
                </tr>
                ${clientName ? `
                <tr>
                  <td style="padding: 8px 0; color: #718096;">
                    <strong>Client :</strong>
                  </td>
                  <td style="padding: 8px 0; color: #2d3748;">
                    ${clientName}
                  </td>
                </tr>
                ` : ''}
                <tr>
                  <td style="padding: 8px 0; color: #718096;">
                    <strong>Photos :</strong>
                  </td>
                  <td style="padding: 8px 0; color: #2d3748;">
                    <span style="background: #667eea; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ${photoCount} photo${photoCount > 1 ? 's' : ''}
                    </span>
                  </td>
                </tr>
              </table>
            </div>

            <!-- Action buttons -->
            <div style="text-align: center; margin-bottom: 30px;">
              <a href="${galleryUrl}" 
                 style="display: inline-block; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; font-weight: 600; margin-right: 10px; margin-bottom: 10px;">
                📸 Voir la galerie
              </a>
              <a href="${downloadUrl}" 
                 style="display: inline-block; background: #48bb78; color: white; padding: 14px 28px; 
                        text-decoration: none; border-radius: 8px; font-weight: 600; margin-bottom: 10px;">
                📥 Télécharger la sélection
              </a>
            </div>

            <!-- Photos list -->
            <div style="background: #fafafa; padding: 20px; border-radius: 12px; margin-bottom: 25px;">
              <h4 style="margin-top: 0; margin-bottom: 15px; color: #2d3748; font-size: 16px;">
                📋 Photos sélectionnées
              </h4>
              <div style="max-height: 300px; overflow-y: auto;">
                ${uniquePhotoNames.slice(0, 20).map(photo => `
                  <div style="padding: 8px 12px; margin-bottom: 6px; background: white; border-radius: 6px; color: #4a5568; font-size: 14px;">
                    • ${photo}
                  </div>
                `).join('')}
                ${uniquePhotoNames.length > 20 ? `
                  <div style="padding: 8px 12px; color: #718096; font-style: italic; font-size: 14px;">
                    ... et ${uniquePhotoNames.length - 20} autres photos
                  </div>
                ` : ''}
              </div>
            </div>

            <!-- Comments if any -->
            ${selectedPhotos.some(p => p.comments && p.comments.length > 0) ? `
              <div style="background: #fff5f5; padding: 20px; border-radius: 12px; margin-bottom: 25px; border-left: 4px solid #f56565;">
                <h4 style="margin-top: 0; margin-bottom: 15px; color: #c53030; font-size: 16px;">
                  💬 Commentaires inclus
                </h4>
                <p style="color: #742a2a; font-size: 14px; margin: 0;">
                  Des commentaires ont été ajoutés sur certaines photos. 
                  Consultez le fichier de sélection pour les détails.
                </p>
              </div>
            ` : ''}
          </div>

          <!-- Footer -->
          <div style="background: #f7f7f7; padding: 20px; text-align: center; border-top: 1px solid #e2e8f0;">
            <p style="margin: 0 0 10px 0; color: #718096; font-size: 14px;">
              Email envoyé automatiquement depuis votre galerie photo
            </p>
            <p style="margin: 0; color: #a0aec0; font-size: 12px;">
              ${this.config.photographerName ? `📧 ${this.config.photographerName}` : '© Galerie Photo'}
            </p>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
🔔 Nouvelle sélection ${isCompleteSelection ? 'complète' : 'client'}

Galerie : ${galleryName}
Type : ${isCompleteSelection ? 'Sélection complète (tous les utilisateurs)' : 'Sélection individuelle'}
${clientName ? `Client : ${clientName}` : ''}
Photos : ${photoCount} photo(s)

📸 Voir la galerie : ${galleryUrl}
📥 Télécharger : ${downloadUrl}

Photos sélectionnées :
${uniquePhotoNames.slice(0, 50).map(photo => `- ${photo}`).join('\n')}
${uniquePhotoNames.length > 50 ? `\n... et ${uniquePhotoNames.length - 50} autres photos` : ''}

---
${this.config.photographerName || 'Galerie Photo'}
    `;

    return {
      to: this.config.photographerEmail,
      subject: `📸 ${isCompleteSelection ? 'Sélection complète' : 'Nouvelle sélection'} - ${galleryName} (${photoCount} photo${photoCount > 1 ? 's' : ''})`,
      html,
      text
    };
  }

  // Send email via Gmail API
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('/api/send-gmail-final', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(emailData)
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to send email');
      }

      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('Gmail send error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  // Send selection notification
  async sendSelectionNotification(
    galleryId: string, 
    galleryName: string,
    clientName: string, 
    selectedPhotos: PhotoSelection[], 
    downloadUrl: string,
    isCompleteSelection: boolean = false
  ) {
    if (!this.config.enableNotifications) {
      return { success: false, error: 'Email notifications disabled' };
    }

    const emailData = this.generateSelectionEmail(
      galleryId, 
      galleryName,
      clientName, 
      selectedPhotos, 
      downloadUrl,
      isCompleteSelection
    );
    return await this.sendEmail(emailData);
  }

  // Test email configuration
  async sendTestEmail(): Promise<{ success: boolean; error?: string }> {
    const testEmailData: EmailData = {
      to: this.config.photographerEmail,
      subject: '✅ Test Gmail Configuration',
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #48bb78 0%, #38a169 100%); color: white; padding: 30px; border-radius: 12px; text-align: center;">
            <h2 style="margin: 0;">✅ Configuration Gmail réussie !</h2>
          </div>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-top: 20px;">
            <p style="color: #2d3748; margin-bottom: 10px;">
              Ce test confirme que votre configuration Gmail SMTP fonctionne correctement.
            </p>
            <table style="width: 100%; margin-top: 20px;">
              <tr>
                <td style="padding: 8px 0; color: #718096;"><strong>Photographe :</strong></td>
                <td style="padding: 8px 0; color: #2d3748;">${this.config.photographerName || 'Non renseigné'}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096;"><strong>Email :</strong></td>
                <td style="padding: 8px 0; color: #2d3748;">${this.config.photographerEmail}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #718096;"><strong>Notifications :</strong></td>
                <td style="padding: 8px 0; color: #2d3748;">
                  <span style="background: #48bb78; color: white; padding: 4px 12px; border-radius: 20px; font-size: 14px;">
                    ${this.config.enableNotifications ? 'Activées' : 'Désactivées'}
                  </span>
                </td>
              </tr>
            </table>
          </div>
          <p style="text-align: center; color: #718096; margin-top: 30px; font-size: 14px;">
            Votre galerie photo peut maintenant envoyer des notifications automatiques ! 📧
          </p>
        </div>
      `,
      text: `✅ Configuration Gmail réussie !

Votre configuration Gmail SMTP fonctionne correctement.

Photographe : ${this.config.photographerName || 'Non renseigné'}
Email : ${this.config.photographerEmail}
Notifications : ${this.config.enableNotifications ? 'Activées' : 'Désactivées'}

Votre galerie photo peut maintenant envoyer des notifications automatiques !`
    };

    return await this.sendEmail(testEmailData);
  }
}