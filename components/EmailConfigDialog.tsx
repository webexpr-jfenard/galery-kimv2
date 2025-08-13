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
  TestTube,
  Eye
} from "lucide-react";
import { toast } from "sonner";
import { emailService } from "../services/emailService";
import type { EmailConfig } from "../services/emailService";

interface EmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function EmailConfigDialog({ isOpen, onClose }: EmailConfigDialogProps) {
  const [config, setConfig] = useState<EmailConfig>(emailService.getDefaultConfig());
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Load existing configuration when dialog opens
  useEffect(() => {
    if (isOpen) {
      const existingConfig = emailService.getEmailConfig();
      if (existingConfig) {
        setConfig(existingConfig);
      } else {
        setConfig(emailService.getDefaultConfig());
      }
      setErrors([]);
      setShowPreview(false);
    }
  }, [isOpen]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      setErrors([]);

      // Validate configuration
      const validation = emailService.validateEmailConfig(config);
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      // Save configuration
      const success = emailService.saveEmailConfig(config);
      
      if (success) {
        toast.success('Configuration email sauvegardée !');
        onClose();
      } else {
        toast.error('Erreur lors de la sauvegarde');
      }
    } catch (error) {
      console.error('Error saving email config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = () => {
    const testNotification = {
      galleryId: 'test-gallery',
      galleryName: 'Galerie de Test',
      selectionCount: 3,
      clientInfo: {
        name: 'Client Test',
        email: 'client@example.com',
        phone: '06 12 34 56 78'
      },
      downloadUrl: 'https://example.com/selection-test.txt',
      fileName: 'selection-test-gallery-2024-01-15.txt',
      exportDate: new Date().toLocaleDateString('fr-FR')
    };

    const emailContent = emailService.generateEmailContent(testNotification);
    const mailtoLink = emailService.generateMailtoLink(testNotification);
    
    if (mailtoLink) {
      window.open(mailtoLink);
      toast.success('Email de test ouvert dans votre client email');
    } else {
      toast.error('Impossible de générer l\'email de test');
    }
  };

  const generatePreview = () => {
    const testNotification = {
      galleryId: 'test-gallery',
      galleryName: 'Galerie de Test',
      selectionCount: 3,
      clientInfo: {
        name: 'Client Test',
        email: 'client@example.com'
      },
      downloadUrl: 'https://example.com/selection-test.txt',
      fileName: 'selection-test-gallery-2024-01-15.txt',
      exportDate: new Date().toLocaleDateString('fr-FR')
    };

    return emailService.generateEmailContent(testNotification);
  };

  const previewContent = showPreview ? generatePreview() : null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration des notifications email
          </DialogTitle>
          <DialogDescription>
            Configurez les notifications automatiques pour recevoir les sélections clients par email.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable notifications */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Notifications activées</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir automatiquement les sélections clients par email
              </p>
            </div>
            <Switch
              checked={config.enableNotifications}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableNotifications: checked }))}
            />
          </div>

          {config.enableNotifications && (
            <>
              {/* Email Configuration */}
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
                  placeholder="Nouvelle sélection client - {{galleryName}}"
                  value={config.subject || ''}
                  onChange={(e) => setConfig(prev => ({ ...prev, subject: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground">
                  Utilisez <Badge variant="outline" className="text-xs mx-1">{{galleryName}}</Badge> pour inclure le nom de la galerie
                </p>
              </div>

              {/* Configuration Status */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {emailService.validateEmailConfig(config).isValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="font-medium">
                    {emailService.validateEmailConfig(config).isValid ? 'Configuration valide' : 'Configuration incomplète'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {emailService.validateEmailConfig(config).isValid 
                    ? 'Les notifications email sont prêtes à être envoyées.'
                    : 'Veuillez corriger les erreurs ci-dessous.'}
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

          {/* Email Preview */}
          {config.enableNotifications && config.photographerEmail && (
            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium">Aperçu de l'email</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowPreview(!showPreview)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? 'Masquer' : 'Afficher'} l'aperçu
                </Button>
              </div>

              {showPreview && previewContent && (
                <div className="bg-muted/30 p-4 rounded-lg space-y-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Destinataire:</p>
                    <p className="text-sm">{config.photographerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Sujet:</p>
                    <p className="text-sm">{previewContent.subject}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-2">Contenu:</p>
                    <div className="bg-white p-3 rounded border text-xs font-mono whitespace-pre-wrap max-h-40 overflow-y-auto">
                      {previewContent.body.substring(0, 500)}...
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {config.enableNotifications && emailService.validateEmailConfig(config).isValid && (
              <Button
                variant="outline"
                onClick={handleTestEmail}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                Tester l'email
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
            Quand un client soumet sa sélection, votre client email par défaut s'ouvrira automatiquement 
            avec un email pré-rempli contenant tous les détails et le lien de téléchargement. 
            Vous n'avez qu'à cliquer "Envoyer" !
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}