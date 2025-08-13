// Email service for sending notifications to photographers
// This is a client-side service that generates email content and provides email options

export interface EmailConfig {
  photographerEmail: string;
  photographerName?: string;
  fromName?: string;
  subject?: string;
  replyTo?: string;
  enableNotifications: boolean;
}

export interface SelectionNotification {
  galleryId: string;
  galleryName: string;
  selectionCount: number;
  clientInfo?: {
    name?: string;
    email?: string;
    phone?: string;
  };
  downloadUrl: string;
  fileName: string;
  exportDate: string;
}

class EmailService {
  private readonly EMAIL_CONFIG_KEY = 'email-config';
  
  // Get stored email configuration
  getEmailConfig(): EmailConfig | null {
    try {
      const stored = localStorage.getItem(this.EMAIL_CONFIG_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading email config:', error);
      return null;
    }
  }

  // Save email configuration
  saveEmailConfig(config: EmailConfig): boolean {
    try {
      localStorage.setItem(this.EMAIL_CONFIG_KEY, JSON.stringify(config));
      console.log('✅ Email configuration saved');
      return true;
    } catch (error) {
      console.error('Error saving email config:', error);
      return false;
    }
  }

  // Validate email configuration
  validateEmailConfig(config: Partial<EmailConfig>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!config.photographerEmail || !config.photographerEmail.trim()) {
      errors.push('Email du photographe requis');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.photographerEmail.trim())) {
        errors.push('Format d\'email du photographe invalide');
      }
    }

    if (config.replyTo && config.replyTo.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.replyTo.trim())) {
        errors.push('Format d\'email de réponse invalide');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Generate email content for notification
  generateEmailContent(notification: SelectionNotification): {
    subject: string;
    body: string;
    bodyHtml: string;
  } {
    const config = this.getEmailConfig();
    const photographerName = config?.photographerName || 'Photographe';
    const fromName = config?.fromName || 'Galerie Photo';
    
    // Subject - handle the template safely
    let subject: string;
    if (config?.subject && config.subject.trim()) {
      subject = config.subject.replace('{{galleryName}}', notification.galleryName);
    } else {
      subject = `Nouvelle sélection client - ${notification.galleryName}`;
    }

    // Plain text body
    const bodyLines: string[] = [];
    bodyLines.push(`Bonjour ${photographerName},`);
    bodyLines.push('');
    bodyLines.push('Vous avez reçu une nouvelle sélection client !');
    bodyLines.push('');
    bodyLines.push('='.repeat(50));
    bodyLines.push('DÉTAILS DE LA SÉLECTION');
    bodyLines.push('='.repeat(50));
    bodyLines.push(`Galerie: ${notification.galleryName}`);
    bodyLines.push(`Nombre de photos sélectionnées: ${notification.selectionCount}`);
    bodyLines.push(`Date de soumission: ${notification.exportDate}`);
    bodyLines.push('');

    if (notification.clientInfo && (notification.clientInfo.name || notification.clientInfo.email)) {
      bodyLines.push('INFORMATIONS CLIENT:');
      bodyLines.push('-'.repeat(20));
      if (notification.clientInfo.name) bodyLines.push(`Nom: ${notification.clientInfo.name}`);
      if (notification.clientInfo.email) bodyLines.push(`Email: ${notification.clientInfo.email}`);
      if (notification.clientInfo.phone) bodyLines.push(`Téléphone: ${notification.clientInfo.phone}`);
      bodyLines.push('');
    }

    bodyLines.push('FICHIER DE SÉLECTION:');
    bodyLines.push('-'.repeat(20));
    bodyLines.push(`Nom du fichier: ${notification.fileName}`);
    bodyLines.push(`Lien de téléchargement: ${notification.downloadUrl}`);
    bodyLines.push('');
    bodyLines.push('Vous pouvez télécharger le fichier de sélection pour voir le détail des photos choisies et les commentaires du client.');
    bodyLines.push('');
    bodyLines.push('Cordialement,');
    bodyLines.push(`${fromName}`);
    bodyLines.push('');
    bodyLines.push('---');
    bodyLines.push('Cet email a été généré automatiquement par votre système de galerie photo.');

    const body = bodyLines.join('\n');

    // HTML body for better email clients
    const bodyHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">📸 Nouvelle Sélection Client</h1>
        </div>
        
        <div style="padding: 20px; background: #f9f9f9;">
          <p>Bonjour <strong>${photographerName}</strong>,</p>
          <p>Vous avez reçu une nouvelle sélection client !</p>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #667eea;">
            <h2 style="color: #667eea; margin-top: 0;">📋 Détails de la sélection</h2>
            <p><strong>Galerie:</strong> ${notification.galleryName}</p>
            <p><strong>Photos sélectionnées:</strong> ${notification.selectionCount}</p>
            <p><strong>Date de soumission:</strong> ${notification.exportDate}</p>
          </div>

          ${notification.clientInfo && (notification.clientInfo.name || notification.clientInfo.email) ? `
          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #52c41a;">
            <h3 style="color: #52c41a; margin-top: 0;">👤 Informations client</h3>
            ${notification.clientInfo.name ? `<p><strong>Nom:</strong> ${notification.clientInfo.name}</p>` : ''}
            ${notification.clientInfo.email ? `<p><strong>Email:</strong> ${notification.clientInfo.email}</p>` : ''}
            ${notification.clientInfo.phone ? `<p><strong>Téléphone:</strong> ${notification.clientInfo.phone}</p>` : ''}
          </div>
          ` : ''}

          <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #fa8c16;">
            <h3 style="color: #fa8c16; margin-top: 0;">📁 Fichier de sélection</h3>
            <p><strong>Nom du fichier:</strong> ${notification.fileName}</p>
            <div style="text-align: center; margin: 20px 0;">
              <a href="${notification.downloadUrl}" 
                 style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">
                📥 Télécharger la sélection
              </a>
            </div>
          </div>

          <div style="background: #e6f3ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <p style="margin: 0; font-style: italic; color: #1890ff;">
              💡 Le fichier contient la liste détaillée des photos sélectionnées avec les commentaires du client.
            </p>
          </div>

          <p>Cordialement,<br><strong>${fromName}</strong></p>
        </div>
        
        <div style="background: #666; color: #ccc; padding: 15px; text-align: center; font-size: 12px;">
          Cet email a été généré automatiquement par votre système de galerie photo.
        </div>
      </div>
    `;

    return {
      subject,
      body,
      bodyHtml
    };
  }

  // Generate mailto link for client-side email
  generateMailtoLink(notification: SelectionNotification): string {
    const config = this.getEmailConfig();
    
    if (!config || !config.photographerEmail || !config.enableNotifications) {
      return '';
    }

    const emailContent = this.generateEmailContent(notification);
    
    const params = new URLSearchParams({
      to: config.photographerEmail,
      subject: emailContent.subject,
      body: emailContent.body
    });

    if (config.replyTo) {
      params.set('cc', config.replyTo);
    }

    return `mailto:?${params.toString()}`;
  }

  // Send notification (client-side approach using mailto)
  async sendNotification(notification: SelectionNotification): Promise<{
    success: boolean;
    error?: string;
    mailtoLink?: string;
  }> {
    try {
      const config = this.getEmailConfig();
      
      if (!config) {
        return {
          success: false,
          error: 'Configuration email non trouvée. Veuillez configurer les notifications email dans l\'admin panel.'
        };
      }

      if (!config.enableNotifications) {
        console.log('📧 Email notifications are disabled');
        return {
          success: true
        };
      }

      if (!config.photographerEmail) {
        return {
          success: false,
          error: 'Email du photographe non configuré'
        };
      }

      // Generate mailto link for client-side email
      const mailtoLink = this.generateMailtoLink(notification);
      
      if (!mailtoLink) {
        return {
          success: false,
          error: 'Impossible de générer le lien email'
        };
      }

      console.log('📧 Email notification prepared:', {
        to: config.photographerEmail,
        subject: this.generateEmailContent(notification).subject,
        galleryName: notification.galleryName,
        selectionCount: notification.selectionCount
      });

      return {
        success: true,
        mailtoLink
      };

    } catch (error) {
      console.error('❌ Error sending email notification:', error);
      return {
        success: false,
        error: 'Erreur lors de l\'envoi de la notification'
      };
    }
  }

  // Get default email configuration
  getDefaultConfig(): EmailConfig {
    return {
      photographerEmail: '',
      photographerName: 'Photographe',
      fromName: 'Galerie Photo',
      subject: '',  // Empty by default to avoid template issues
      replyTo: '',
      enableNotifications: true
    };
  }

  // Check if email notifications are configured and enabled
  isConfigured(): boolean {
    const config = this.getEmailConfig();
    return !!(config && config.photographerEmail && config.enableNotifications);
  }
}

export const emailService = new EmailService();
export type { EmailConfig, SelectionNotification };