import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Switch } from "./ui/switch";
import { Alert, AlertDescription } from "./ui/alert";
import { 
  Mail, 
  User, 
  CheckCircle,
  AlertCircle,
  Save,
  TestTube
} from "lucide-react";
import { toast } from "sonner";
import { GmailService, type GmailConfig } from "../services/gmailService";

interface GmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GmailConfigDialog({ isOpen, onClose }: GmailConfigDialogProps) {
  const [config, setConfig] = useState<GmailConfig>({
    photographerEmail: '',
    photographerName: '',
    enableNotifications: true
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load existing configuration
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem('gmail-config');
      if (saved) {
        try {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
        } catch (error) {
          console.error('Failed to load Gmail config:', error);
        }
      }
      setErrors([]);
    }
  }, [isOpen]);

  const validateConfig = (): boolean => {
    const newErrors: string[] = [];

    if (!config.photographerEmail) {
      newErrors.push('L\'email du photographe est requis');
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.photographerEmail)) {
        newErrors.push('Format d\'email invalide');
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) return;

    try {
      setIsSaving(true);
      
      // Save to localStorage
      localStorage.setItem('gmail-config', JSON.stringify(config));
      
      toast.success('Configuration Gmail sauvegardée !');
      onClose();
    } catch (error) {
      console.error('Error saving Gmail config:', error);
      toast.error('Erreur lors de la sauvegarde');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!validateConfig()) {
      toast.error('Veuillez corriger la configuration avant de tester');
      return;
    }

    setIsTesting(true);
    try {
      const gmailService = new GmailService(config);
      const result = await gmailService.sendTestEmail();
      
      if (result.success) {
        toast.success('Email de test envoyé via Gmail !');
      } else {
        toast.error(`Erreur Gmail: ${result.error}`);
      }
    } catch (error) {
      console.error('Erreur test Gmail:', error);
      toast.error('Erreur lors du test Gmail');
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigValid = config.photographerEmail && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.photographerEmail);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Configuration Gmail SMTP
          </DialogTitle>
          <DialogDescription>
            Configurez l'envoi automatique d'emails via Gmail pour les notifications de sélection.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Enable/Disable notifications */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
            <div className="space-y-1">
              <Label className="text-base font-medium">Notifications activées</Label>
              <p className="text-sm text-muted-foreground">
                Recevoir automatiquement les sélections clients par Gmail
              </p>
            </div>
            <Switch
              checked={config.enableNotifications}
              onCheckedChange={(checked) => setConfig(prev => ({ ...prev, enableNotifications: checked }))}
            />
          </div>

          {config.enableNotifications && (
            <>
              {/* Gmail Configuration */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="photographer-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email du photographe *
                  </Label>
                  <Input
                    id="photographer-email"
                    type="email"
                    placeholder="photographe@gmail.com"
                    value={config.photographerEmail}
                    onChange={(e) => setConfig(prev => ({ ...prev, photographerEmail: e.target.value }))}
                  />
                  <p className="text-xs text-muted-foreground">
                    L'email Gmail qui recevra les notifications
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
              </div>

              {/* Configuration Status */}
              <div className="bg-muted/30 p-4 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {isConfigValid ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  )}
                  <span className="font-medium">
                    {isConfigValid ? 'Configuration valide' : 'Configuration incomplète'}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  {isConfigValid 
                    ? 'Les notifications email automatiques via Gmail sont prêtes.'
                    : 'Veuillez remplir l\'email du photographe.'
                  }
                </p>
              </div>

              {/* Gmail Setup Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                <h3 className="text-sm font-medium text-blue-800 mb-2">🔐 Configuration Gmail requise</h3>
                <div className="text-xs text-blue-700 space-y-1">
                  <p><strong>1.</strong> Activez la validation en 2 étapes sur votre compte Google</p>
                  <p><strong>2.</strong> Générez un mot de passe d'application Gmail</p>
                  <p><strong>3.</strong> Ajoutez ces variables d'environnement sur Vercel :</p>
                  <div className="bg-blue-100 p-2 rounded mt-2 font-mono text-xs">
                    GMAIL_USER=votre@gmail.com<br/>
                    GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
                  </div>
                </div>
              </div>

              {/* Preview */}
              {isConfigValid && (
                <div className="bg-green-50 p-4 rounded-lg">
                  <h3 className="text-sm font-medium text-green-800 mb-2">
                    ✅ Configuration Gmail prête
                  </h3>
                  <div className="text-sm text-green-700 space-y-1">
                    <p><strong>Destinataire:</strong> {config.photographerEmail}</p>
                    <p><strong>Nom:</strong> {config.photographerName || 'Photographe'}</p>
                  </div>
                  <p className="text-xs text-green-600 mt-2">
                    💡 Utilisez le bouton "Tester" pour vérifier l'envoi automatique
                  </p>
                </div>
              )}
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

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3">
            {config.enableNotifications && isConfigValid && (
              <Button
                variant="outline"
                onClick={handleTestEmail}
                disabled={isTesting}
                className="flex-1"
              >
                <TestTube className="h-4 w-4 mr-2" />
                {isTesting ? 'Test en cours...' : 'Tester Gmail'}
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
            Quand un client soumet sa sélection, un email est automatiquement envoyé 
            via Gmail SMTP avec tous les détails et le lien de téléchargement. 
            Aucune action manuelle requise !
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}