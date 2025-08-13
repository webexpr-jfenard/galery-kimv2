// Resend Email Service for automatic email sending
// This service sends emails through a backend API to protect the API key

export interface ResendConfig {
  apiKey?: string; // Only for server-side/environment variable
  fromEmail: string;
  photographerEmail: string;
  photographerName?: string;
  enableNotifications: boolean;
}

export interface EmailPayload {
  to: string;
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}

class ResendEmailService {
  private readonly CONFIG_KEY = 'resend-email-config';
  private readonly API_ENDPOINT = '/api/send-email'; // You'll need to create this endpoint
  
  // Get stored configuration
  getConfig(): ResendConfig | null {
    try {
      const stored = localStorage.getItem(this.CONFIG_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (error) {
      console.error('Error loading Resend config:', error);
      return null;
    }
  }

  // Save configuration
  saveConfig(config: ResendConfig): boolean {
    try {
      // Don't store API key in localStorage for security
      const configToStore = { ...config };
      delete configToStore.apiKey;
      
      localStorage.setItem(this.CONFIG_KEY, JSON.stringify(configToStore));
      console.log('✅ Resend configuration saved');
      return true;
    } catch (error) {
      console.error('Error saving Resend config:', error);
      return false;
    }
  }

  // Send email via Resend (through backend API)
  async sendEmail(payload: EmailPayload): Promise<{ success: boolean; error?: string; messageId?: string }> {
    try {
      console.log('📧 Sending email via Resend...', {
        to: payload.to,
        subject: payload.subject
      });

      // For Vercel deployment, use the API route
      const response = await fetch(this.API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      const result = await response.json();

      if (!response.ok) {
        console.error('❌ Email send failed:', result.error);
        return {
          success: false,
          error: result.error || 'Erreur lors de l\'envoi de l\'email'
        };
      }

      console.log('✅ Email sent successfully:', result.messageId);
      return {
        success: true,
        messageId: result.messageId
      };

    } catch (error) {
      console.error('❌ Email send error:', error);
      return {
        success: false,
        error: 'Erreur réseau lors de l\'envoi de l\'email'
      };
    }
  }

  // Send selection notification
  async sendSelectionNotification(
    galleryName: string,
    selectionCount: number,
    downloadUrl: string,
    fileName: string,
    clientInfo?: { name?: string; email?: string; phone?: string }
  ): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig();
    
    if (!config || !config.enableNotifications) {
      return { success: true }; // Silent success if disabled
    }

    if (!config.photographerEmail || !config.fromEmail) {
      return {
        success: false,
        error: 'Configuration email incomplète'
      };
    }

    const photographerName = config.photographerName || 'Photographe';
    const subject = `Nouvelle sélection client - ${galleryName}`;

    // Generate HTML email content
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>${subject}</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f5f5f5;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 20px;">
            <tr>
              <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  <!-- Header -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                        📸 Nouvelle Sélection Client
                      </h1>
                    </td>
                  </tr>
                  
                  <!-- Content -->
                  <tr>
                    <td style="padding: 30px;">
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                        Bonjour <strong>${photographerName}</strong>,
                      </p>
                      
                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0;">
                        Vous avez reçu une nouvelle sélection client !
                      </p>
                      
                      <!-- Selection Details -->
                      <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #f8f9fa; border-radius: 6px; margin-bottom: 20px;">
                        <tr>
                          <td>
                            <h2 style="color: #667eea; font-size: 18px; margin: 0 0 15px 0;">
                              📋 Détails de la sélection
                            </h2>
                            <p style="color: #555; font-size: 14px; margin: 5px 0;">
                              <strong>Galerie:</strong> ${galleryName}
                            </p>
                            <p style="color: #555; font-size: 14px; margin: 5px 0;">
                              <strong>Photos sélectionnées:</strong> ${selectionCount}
                            </p>
                            <p style="color: #555; font-size: 14px; margin: 5px 0;">
                              <strong>Date:</strong> ${new Date().toLocaleDateString('fr-FR')}
                            </p>
                          </td>
                        </tr>
                      </table>

                      ${clientInfo && (clientInfo.name || clientInfo.email) ? `
                      <!-- Client Info -->
                      <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #e8f5e9; border-radius: 6px; margin-bottom: 20px;">
                        <tr>
                          <td>
                            <h2 style="color: #4caf50; font-size: 18px; margin: 0 0 15px 0;">
                              👤 Informations client
                            </h2>
                            ${clientInfo.name ? `<p style="color: #555; font-size: 14px; margin: 5px 0;"><strong>Nom:</strong> ${clientInfo.name}</p>` : ''}
                            ${clientInfo.email ? `<p style="color: #555; font-size: 14px; margin: 5px 0;"><strong>Email:</strong> <a href="mailto:${clientInfo.email}" style="color: #667eea;">${clientInfo.email}</a></p>` : ''}
                            ${clientInfo.phone ? `<p style="color: #555; font-size: 14px; margin: 5px 0;"><strong>Téléphone:</strong> ${clientInfo.phone}</p>` : ''}
                          </td>
                        </tr>
                      </table>
                      ` : ''}

                      <!-- Download Section -->
                      <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #fff3e0; border-radius: 6px; margin-bottom: 30px;">
                        <tr>
                          <td>
                            <h2 style="color: #ff9800; font-size: 18px; margin: 0 0 15px 0;">
                              📁 Fichier de sélection
                            </h2>
                            <p style="color: #555; font-size: 14px; margin: 5px 0 15px 0;">
                              <strong>Nom:</strong> ${fileName}
                            </p>
                            <div style="text-align: center;">
                              <a href="${downloadUrl}" 
                                 style="display: inline-block; background-color: #667eea; color: #ffffff; text-decoration: none; padding: 12px 30px; border-radius: 6px; font-weight: bold; font-size: 16px;">
                                📥 Télécharger la sélection
                              </a>
                            </div>
                          </td>
                        </tr>
                      </table>

                      <!-- Info Box -->
                      <table width="100%" cellpadding="15" cellspacing="0" style="background-color: #e3f2fd; border-radius: 6px; margin-bottom: 20px;">
                        <tr>
                          <td>
                            <p style="color: #1976d2; font-size: 14px; margin: 0; font-style: italic;">
                              💡 Le fichier contient la liste détaillée des photos sélectionnées avec tous les commentaires du client.
                            </p>
                          </td>
                        </tr>
                      </table>

                      <p style="color: #333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                        Cordialement,<br>
                        <strong>Galerie Photo</strong>
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td style="background-color: #f5f5f5; padding: 20px; text-align: center;">
                      <p style="color: #999; font-size: 12px; margin: 0;">
                        Cet email a été généré automatiquement par votre système de galerie photo.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    // Generate plain text version
    const text = `
Bonjour ${photographerName},

Vous avez reçu une nouvelle sélection client !

DÉTAILS DE LA SÉLECTION
========================
Galerie: ${galleryName}
Photos sélectionnées: ${selectionCount}
Date: ${new Date().toLocaleDateString('fr-FR')}

${clientInfo && (clientInfo.name || clientInfo.email) ? `
INFORMATIONS CLIENT
========================
${clientInfo.name ? `Nom: ${clientInfo.name}` : ''}
${clientInfo.email ? `Email: ${clientInfo.email}` : ''}
${clientInfo.phone ? `Téléphone: ${clientInfo.phone}` : ''}
` : ''}

FICHIER DE SÉLECTION
========================
Nom: ${fileName}
Téléchargement: ${downloadUrl}

Le fichier contient la liste détaillée des photos sélectionnées avec tous les commentaires du client.

Cordialement,
Galerie Photo

---
Cet email a été généré automatiquement par votre système de galerie photo.
    `.trim();

    // Send email
    const result = await this.sendEmail({
      to: config.photographerEmail,
      from: config.fromEmail,
      subject,
      html,
      text,
      replyTo: clientInfo?.email
    });

    return result;
  }

  // Test email sending
  async sendTestEmail(): Promise<{ success: boolean; error?: string }> {
    const config = this.getConfig();
    
    if (!config || !config.photographerEmail || !config.fromEmail) {
      return {
        success: false,
        error: 'Configuration incomplète'
      };
    }

    return this.sendSelectionNotification(
      'Galerie de Test',
      3,
      'https://example.com/selection-test.txt',
      'selection-test-2024.txt',
      {
        name: 'Client Test',
        email: 'test@example.com',
        phone: '06 12 34 56 78'
      }
    );
  }

  // Check if service is configured
  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config && config.photographerEmail && config.fromEmail && config.enableNotifications);
  }
}

export const resendEmailService = new ResendEmailService();