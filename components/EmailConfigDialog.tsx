import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { 
  Mail, 
  User, 
  MessageSquare, 
  Send, 
  CheckCircle,
  AlertCircle,
  Settings,
  Save,
  TestTube
} from "lucide-react";
import { toast } from "sonner";
import { emailService } from "../services/emailService";
import { resendEmailService } from "../services/resendEmailService";
import type { EmailConfig } from "../services/emailService";
import type { ResendConfig } from "../services/resendEmailService";

interface EmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailConfigDialog({ isOpen, onClose }: EmailConfigDialogProps) {
  const [config, setConfig] = useState<EmailConfig>(emailService.getDefaultConfig());
  const [resendConfig, setResendConfig] = useState<ResendConfig>({
    fromEmail: '',
    photographerEmail: '',
    photographerName: '',
    enableNotifications: true
  });
  const [useResend, setUseResend] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load existing configuration when dialog opens
  useEffect(() => {
    if (isOpen) {
      // Load traditional email config
      const existingConfig = emailService.getEmailConfig();
      if (existingConfig) {
        setConfig(existingConfig);
      } else {
        setConfig(emailService.getDefaultConfig());
      }
      
      // Load Resend config
      const existingResendConfig = resendEmailService.getConfig();
      if (existingResendConfig) {
        setResendConfig(existingResendConfig);
        setUseResend(true);
      } else {
        setResendConfig({
          fromEmail: '',
          photographerEmail: '',
          photographerName: '',
          enableNotifications: true
        });
        setUseResend(false);
      }
      
      setErrors([]);
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrors([]);

      if (useResend) {
        // Validate Resend configuration
        if (!resendConfig.fromEmail || !resendConfig.photographerEmail) {
          setErrors(['Email expéditeur et destinataire requis pour Resend']);
          return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(resendConfig.fromEmail) || !emailRegex.test(resendConfig.photographerEmail)) {
          setErrors(['Format d\'email invalide']);
          return;
        }

        // Save Resend configuration
        const success = resendEmailService.saveConfig(resendConfig);
        
        if (success) {
          toast.success('Configuration Resend sauvegardée !');
          onClose();
        } else {
          toast.error('Erreur lors de la sauvegarde');
        }
      } else {
        // Validate traditional email configuration
        const validation = emailService.validateEmailConfig(config);
        if (!validation.isValid) {
          setErrors(validation.errors);
          return;
        }

        // Save traditional configuration
        const success = emailService.saveEmailConfig(config);
        
        if (success) {
          toast.success('Configuration email sauvegardée !');
          onClose();
        } else {
          toast.error('Erreur lors de la sauvegarde');
        }
      }
    } catch (error) {
      console.error('Error saving email config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (useResend) {
      // Test Resend configuration
      if (!resendConfig.fromEmail || !resendConfig.photographerEmail) {
        toast.error('Veuillez configurer les emails expéditeur et destinataire');
        return;
      }

      setIsTesting(true);
      try {
        const result = await resendEmailService.sendTestEmail();
        
        if (result.success) {
          toast.success('Email de test envoyé automatiquement !');
        } else {
          toast.error(`Erreur envoi: ${result.error}`);
        }
      } catch (error) {
        console.error('Erreur test Resend:', error);
        toast.error('Erreur lors du test Resend');
      } finally {
        setIsTesting(false);
      }
    } else {
      // Test traditional email (mailto)
      if (!config.photographerEmail || !config.photographerEmail.trim()) {
        toast.error('Veuillez entrer un email de photographe');
        return;
      }

      try {
        // Générer l'email de test directement sans utiliser le service
        const photographerName = config.photographerName || 'Photographe';
        const fromName = config.fromName || 'Galerie Photo';
        const galleryNameExample = 'Galerie de Test';
        
        // Subject - safe handling
        let subject = `Nouvelle sélection client - ${galleryNameExample}`;
        if (config.subject && config.subject.trim()) {
          // Try to replace template if present, otherwise use as-is
          if (config.subject.includes('{{') && config.subject.includes('}}')) {
            try {
              subject = config.subject.replace(/\{\{galleryName\}\}/g, galleryNameExample);
            } catch (e) {
              subject = config.subject; // Use as-is if replacement fails
            }
          } else {
            subject = config.subject; // Use custom subject as-is
          }
        }

        // Body
        const bodyLines = [
          `Bonjour ${photographerName},`,
          '',
          'Vous avez reçu une nouvelle sélection client !',
          '',
          'DÉTAILS DE LA SÉLECTION',
          '========================================',
          'Galerie: Galerie de Test',
          'Photos sélectionnées: 3',
          'Date de soumission: ' + new Date().toLocaleDateString('fr-FR'),
          '',
          'INFORMATIONS CLIENT:',
          'Nom: Client Test',
          'Email: client@example.com',
          'Téléphone: 06 12 34 56 78',
          '',
          'FICHIER DE SÉLECTION:',
          'Nom: selection-test-gallery-' + new Date().toISOString().split('T')[0] + '.txt',
          'Téléchargement: https://example.com/selection-test.txt',
          '',
          'Vous pouvez télécharger le fichier de sélection pour voir le détail des photos choisies.',
          '',
          `Cordialement,`,
          `${fromName}`,
          '',
          '---',
          'Cet email a été généré automatiquement par votre système de galerie photo.'
        ];

        const body = bodyLines.join('\n');

        // Créer le lien mailto
        const params = new URLSearchParams({
          to: config.photographerEmail,
          subject: subject,
          body: body
        });

        if (config.replyTo && config.replyTo.trim()) {
          params.set('cc', config.replyTo);
        }

        const mailtoLink = `mailto:?${params.toString()}`;
        
        window.open(mailtoLink);
        toast.success('Email de test ouvert dans votre client email');
        
      } catch (error) {
        console.error('Erreur test email:', error);
        toast.error('Erreur lors du test email');
      }
    }
  };


  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration des notifications email
          </DialogTitle>
          <DialogDescription>
            Configurez l'email qui recevra toutes les notifications de sélections clients, peu importe la galerie.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Method Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
              <div className="space-y-1">
                <Label className="text-base font-medium">Méthode d'envoi</Label>
                <p className="text-sm text-muted-foreground">
                  Choisissez comment envoyer les notifications email
                </p>
              </div>
              <Switch
                checked={useResend}
                onCheckedChange={setUseResend}
              />
            </div>
            
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {useResend ? (
                <>
                  <Send className="h-4 w-4 text-green-600" />
                  <span>Envoi automatique via Resend (recommandé)</span>
                </>
              ) : (
                <>
                  <Mail className="h-4 w-4 text-blue-600" />
                  <span>Ouverture du client email local (mailto)</span>
                </>
              )}
            </div>
          </div>

          {/* Enable/Disable notifications */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Notifications activées</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir automatiquement toutes les sélections clients par email (toutes galeries)
              </p>
            </div>
            <Switch
              checked={useResend ? resendConfig.enableNotifications : config.enableNotifications}
              onCheckedChange={(checked) => {
                if (useResend) {
                  setResendConfig(prev => ({ ...prev, enableNotifications: checked }));
                } else {
                  setConfig(prev => ({ ...prev, enableNotifications: checked }));
                }
              }}
            />
          </div>

          {(useResend ? resendConfig.enableNotifications : config.enableNotifications) && (
            <>
              {useResend && (
                <>
                  {/* Resend Configuration */}
                  <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <h3 className="text-sm font-medium text-green-800 mb-3">Configuration Resend (Envoi Automatique)</h3>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="from-email" className="flex items-center gap-2">
                          <Send className="h-4 w-4" />
                          Email expéditeur * 
                        </Label>
                        <Input
                          id="from-email"
                          type="email"
                          placeholder="noreply@votre-domaine.com"
                          value={resendConfig.fromEmail}
                          onChange={(e) => setResendConfig(prev => ({ ...prev, fromEmail: e.target.value }))}
                        />
                        <p className="text-xs text-muted-foreground">
                          Doit être un domaine vérifié dans Resend
                        </p>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resend-photographer-email" className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Email du photographe *
                        </Label>
                        <Input
                          id="resend-photographer-email"
                          type="email"
                          placeholder="photographe@example.com"
                          value={resendConfig.photographerEmail}
                          onChange={(e) => setResendConfig(prev => ({ ...prev, photographerEmail: e.target.value }))}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="resend-photographer-name" className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Nom du photographe
                        </Label>
                        <Input
                          id="resend-photographer-name"
                          placeholder="Votre nom"
                          value={resendConfig.photographerName || ''}
                          onChange={(e) => setResendConfig(prev => ({ ...prev, photographerName: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="mt-4 bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-xs text-blue-700">
                        <strong>⚠️ Configuration Resend requise:</strong><br/>
                        1. Créez un compte sur resend.com<br/>
                        2. Ajoutez votre domaine et vérifiez-le<br/>
                        3. Créez une API key<br/>
                        4. Ajoutez RESEND_API_KEY dans vos variables d'environnement
                      </p>
                    </div>
                  </div>
                </>
              )}

              {!useResend && (
                <>
                  {/* Traditional Email Configuration */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="photographer-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email du photographe *
                  </Label>
                  <Input
                    id="photographer-email"
                    type="email"
                    placeholder="photographe@example.com"
                    value={config.photographerEmail}
                    onChange={(e) => setConfig(prev => ({ ...prev, photographerEmail: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    L'email qui recevra les notifications de sélection
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="photographer-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom du photographe
                  </Label>
                  <Input
                    id="photographer-name"
                    placeholder="Votre nom"
                    value={config.photographerName || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, photographerName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="from-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom de l'expéditeur
                  </Label>
                  <Input
                    id="from-name"
                    placeholder="Galerie Photo"
                    value={config.fromName || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, fromName: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reply-to" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email de réponse (optionnel)
                  </Label>
                  <Input
                    id="reply-to"
                    type="email"
                    placeholder="contact@example.com"
                    value={config.replyTo || ''}
                    onChange={(e) => setConfig(prev => ({ ...prev, replyTo: e.target.value }))}
                  />
                </div>
              </div>

                  {/* Subject Template */}
                  <div className="space-y-2">
                    <Label htmlFor="subject" className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4" />
                      Modèle de sujet
                    </Label>
                    <Input
                      id="subject"
                      placeholder={'Nouvelle sélection client - [Nom de la galerie]'}
                      value={config.subject || ''}
                      onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Le nom de la galerie sera automatiquement ajouté au sujet de l'email
                    </p>
                  </div>
                </>
              )}

              {/* Configuration Status */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {useResend ? (
                    resendConfig.fromEmail && resendConfig.photographerEmail ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    )
                  ) : (
                    emailService.validateEmailConfig(config).isValid ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <AlertCircle className="h-4 w-4 text-orange-600" />
                    )
                  )}
                  <span className="font-medium">
                    {useResend ? (
                      resendConfig.fromEmail && resendConfig.photographerEmail ? 'Configuration valide' : 'Configuration incomplète'
                    ) : (
                      emailService.validateEmailConfig(config).isValid ? 'Configuration valide' : 'Configuration incomplète'
                    )}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {useResend ? (
                    resendConfig.fromEmail && resendConfig.photographerEmail
                      ? 'Les notifications email automatiques sont prêtes.'
                      : 'Veuillez remplir les champs requis pour Resend.'
                  ) : (
                    emailService.validateEmailConfig(config).isValid 
                      ? 'Les notifications email sont prêtes à être envoyées.'
                      : 'Veuillez corriger les erreurs ci-dessous.'
                  )}
                </p>
              </div>
            </>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                <ul className="list-disc list-inside space-y-1">
                  {errors.map((error, index) => (
                    <li key={index}>{error}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Email Preview - Version Simplifiée */}
          {(useResend ? resendConfig.enableNotifications && resendConfig.photographerEmail : config.enableNotifications && config.photographerEmail) && (
            <div className="border-t pt-4">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">
                  ✅ Configuration {useResend ? 'Resend' : 'Email'} Prête
                </h3>
                <div className="text-sm text-blue-700 space-y-1">
                  <p><strong>Destinataire:</strong> {useResend ? resendConfig.photographerEmail : config.photographerEmail}</p>
                  <p><strong>Nom:</strong> {(useResend ? resendConfig.photographerName : config.photographerName) || 'Photographe'}</p>
                  {useResend ? (
                    <p><strong>Expéditeur:</strong> {resendConfig.fromEmail}</p>
                  ) : (
                    <p><strong>Expéditeur:</strong> {config.fromName || 'Galerie Photo'}</p>
                  )}
                </div>
                <p className="text-xs text-blue-600 mt-2">
                  💡 {useResend 
                    ? 'Utilisez le bouton "Tester l\'email" pour envoyer un test automatiquement'
                    : 'Utilisez le bouton "Tester l\'email" pour voir l\'aperçu complet dans votre client email'
                  }
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {(useResend ? 
              resendConfig.enableNotifications && resendConfig.fromEmail && resendConfig.photographerEmail :
              config.enableNotifications && emailService.validateEmailConfig(config).isValid
            ) && (
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={isTesting}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Test en cours...' : 'Tester l\'email'}
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Sauvegarde...' : 'Sauvegarder'}
            </Button>
          </div>

          <div className="text-xs text-muted-foreground bg-blue-50 p-3 rounded-lg">
            <strong>ℹ️ Comment ça marche :</strong><br/>
            {useResend ? (
              <>
                Quand un client soumet sa sélection (de n'importe quelle galerie), l'email est automatiquement envoyé 
                à l'adresse configurée via Resend. Aucune action manuelle requise ! 
                L'email contient tous les détails et le lien de téléchargement.
              </>
            ) : (
              <>
                Quand un client soumet sa sélection (de n'importe quelle galerie), votre client email par défaut s'ouvrira automatiquement 
                avec un email pré-rempli contenant tous les détails et le lien de téléchargement. 
                Vous n'avez qu'à cliquer "Envoyer" ! L'email indiquera de quelle galerie provient la sélection.
              </>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}