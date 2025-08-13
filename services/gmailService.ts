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

export class GmailService {
  private config: GmailConfig;

  constructor(config: GmailConfig) {
    this.config = config;
  }

  // Generate HTML email for selection notification
  generateSelectionEmail(galleryId: string, clientName: string, selectedPhotos: any[], downloadUrl: string): EmailData {
    const photoCount = selectedPhotos.length;
    const uniquePhotos = [...new Set(selectedPhotos.map(p => p.name))];
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color: #333; border-bottom: 2px solid #007bff; padding-bottom: 10px;">
          📸 Nouvelle sélection de photos
        </h2>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0; color: #007bff;">Détails de la sélection</h3>
          <p><strong>Galerie :</strong> ${galleryId}</p>
          <p><strong>Client :</strong> ${clientName || 'Non renseigné'}</p>
          <p><strong>Nombre de photos :</strong> ${photoCount} sélection${photoCount > 1 ? 's' : ''} (${uniquePhotos.length} photo${uniquePhotos.length > 1 ? 's' : ''} unique${uniquePhotos.length > 1 ? 's' : ''})</p>
        </div>

        <div style="background: #e8f5e8; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <h4 style="margin-top: 0; color: #28a745;">📥 Téléchargement</h4>
          <p>La sélection est disponible au téléchargement :</p>
          <a href="${downloadUrl}" 
             style="display: inline-block; background: #007bff; color: white; padding: 12px 24px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold;">
            Télécharger la sélection
          </a>
        </div>

        <div style="margin: 30px 0; padding: 15px; border-left: 4px solid #007bff; background: #f8f9fa;">
          <h4 style="margin-top: 0;">📋 Photos sélectionnées :</h4>
          <ul style="margin: 10px 0; padding-left: 20px;">
            ${uniquePhotos.map(photo => `<li style="margin: 5px 0;">${photo}</li>`).join('')}
          </ul>
        </div>

        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #dee2e6; 
                    font-size: 14px; color: #6c757d; text-align: center;">
          <p>Email envoyé automatiquement depuis votre galerie photo</p>
          <p>📧 ${this.config.photographerName || 'Photographe'}</p>
        </div>
      </div>
    `;

    const text = `
🔔 Nouvelle sélection de photos

Galerie : ${galleryId}
Client : ${clientName || 'Non renseigné'}
Photos : ${photoCount} sélection(s) - ${uniquePhotos.length} photo(s) unique(s)

Téléchargement : ${downloadUrl}

Photos sélectionnées :
${uniquePhotos.map(photo => `- ${photo}`).join('\n')}

---
${this.config.photographerName || 'Photographe'}
    `;

    return {
      to: this.config.photographerEmail,
      subject: `📸 Nouvelle sélection - ${galleryId} (${photoCount} photo${photoCount > 1 ? 's' : ''})`,
      html,
      text
    };
  }

  // Send email via Gmail API
  async sendEmail(emailData: EmailData): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      const response = await fetch('/api/send-gmail', {
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
  async sendSelectionNotification(galleryId: string, clientName: string, selectedPhotos: any[], downloadUrl: string) {
    if (!this.config.enableNotifications) {
      return { success: false, error: 'Email notifications disabled' };
    }

    const emailData = this.generateSelectionEmail(galleryId, clientName, selectedPhotos, downloadUrl);
    return await this.sendEmail(emailData);
  }

  // Test email configuration
  async sendTestEmail(): Promise<{ success: boolean; error?: string }> {
    const testEmailData: EmailData = {
      to: this.config.photographerEmail,
      subject: '✅ Test Gmail Configuration',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #28a745;">✅ Configuration Gmail réussie !</h2>
          <p>Ce test confirme que votre configuration Gmail SMTP fonctionne correctement.</p>
          <div style="background: #d4edda; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Photographe :</strong> ${this.config.photographerName || 'Non renseigné'}</p>
            <p><strong>Email :</strong> ${this.config.photographerEmail}</p>
            <p><strong>Notifications :</strong> ${this.config.enableNotifications ? 'Activées' : 'Désactivées'}</p>
          </div>
          <p>Votre galerie photo peut maintenant envoyer des notifications automatiques ! 📧</p>
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