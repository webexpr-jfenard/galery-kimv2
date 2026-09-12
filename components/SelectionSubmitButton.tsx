import React, { useState } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Alert, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { 
  Send, 
  Download, 
  User, 
  Mail, 
  Phone, 
  CheckCircle,
  AlertCircle,
  FileText,
  Loader
} from "lucide-react";
import { toast } from "sonner";
import { selectionService } from "../services/selectionService";
import type { SelectionResult } from "../services/selectionService";
import { favoritesService } from "../services/favoritesService";
import { userService } from "../services/userService";

interface SelectionSubmitButtonProps {
  galleryId: string;
  galleryName: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "sm" | "default" | "lg";
  children?: React.ReactNode;
  /** Number of photos the photographer asked for (warning only, never blocking) */
  quota?: number;
}

export function SelectionSubmitButton({ 
  galleryId, 
  galleryName, 
  className = "",
  variant = "default",
  size = "default",
  children,
  quota
}: SelectionSubmitButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectionCount, setSelectionCount] = useState(0);
  const [completeSelectionCount, setCompleteSelectionCount] = useState(0);
  const [step, setStep] = useState<'info' | 'submitting' | 'success'>('info');
  const [isCompleteSelection, setIsCompleteSelection] = useState(false);
  
  // Form state
  const [clientInfo, setClientInfo] = useState({
    name: '',
    email: '',
    phone: ''
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [emailError, setEmailError] = useState('');
  const [result, setResult] = useState<SelectionResult | null>(null);

  // Load selection count when opening dialog
  const handleOpenDialog = async () => {
    try {
      const favorites = await favoritesService.getFavorites(galleryId);
      const currentUserId = userService.getCurrentUserId();
      
      // Count personal and complete selections
      const personalFavorites = currentUserId 
        ? favorites.filter(f => f.userId === currentUserId)
        : favorites;
      setSelectionCount(personalFavorites.length);
      setCompleteSelectionCount(favorites.length);
      
      if (personalFavorites.length === 0 && favorites.length === 0) {
        toast.error('Aucune photo sélectionnée à soumettre');
        return;
      }
      
      setIsOpen(true);
      setStep('info');
      setResult(null);
      setErrors([]);
      setIsCompleteSelection(false);
    } catch (error) {
      console.error('Error loading selection count:', error);
      toast.error('Erreur lors du chargement de la sélection');
    }
  };


  // Submit with client information
  const handleSubmitWithInfo = async () => {
    try {
      // Validate form
      const validation = selectionService.validateClientInfo(
        clientInfo.name, 
        clientInfo.email, 
        clientInfo.phone
      );
      
      if (!validation.isValid) {
        setErrors(validation.errors);
        return;
      }

      setIsSubmitting(true);
      setStep('submitting');
      setErrors([]);
      
      const result = await selectionService.exportSelectionWithClientInfo(
        galleryId,
        galleryName,
        clientInfo.name || undefined,
        clientInfo.email || undefined,
        clientInfo.phone || undefined,
        isCompleteSelection
      );
      
      if (result.success) {
        setResult(result);
        setStep('success');
        if (result.notified) {
          toast.success('Sélection envoyée à votre photographe');
        } else {
          toast.warning("Sélection enregistrée, mais la notification n'est pas partie");
        }
      } else {
        throw new Error(result.error || 'Échec de la soumission');
      }
    } catch (error) {
      console.error('Error submitting selection:', error);
      toast.error('Erreur lors de la soumission');
      setStep('info');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateEmail = (email: string) => {
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Format d\'email invalide');
    } else {
      setEmailError('');
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setStep('info');
    setResult(null);
    setErrors([]);
    setEmailError('');
    setClientInfo({ name: '', email: '', phone: '' });
  };

  const handleDownload = () => {
    if (!result?.blobUrl) return;
    const link = document.createElement('a');
    link.href = result.blobUrl;
    link.download = result.fileName || 'selection.txt';
    link.click();
  };

  return (
    <>
      <Button
        onClick={handleOpenDialog}
        variant={variant}
        size={size}
        className={`${className} font-medium`}
      >
        <Send className="h-4 w-4 mr-2" />
        {children ?? 'Soumettre'}
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {step === 'success' ? (
                <CheckCircle className="h-5 w-5 text-green-600" />
              ) : (
                <Send className="h-5 w-5" />
              )}
              {step === 'info' && 'Soumettre ma sélection'}
              {step === 'submitting' && 'Soumission en cours...'}
              {step === 'success' && 'Sélection soumise !'}
            </DialogTitle>
            <DialogDescription>
              {step === 'info' && `Vous avez sélectionné ${selectionCount} photo${selectionCount !== 1 ? 's' : ''} dans la galerie "${galleryName}".`}
              {step === 'submitting' && 'Création du fichier de sélection en cours...'}
              {step === 'success' && 'Votre sélection a été soumise avec succès.'}
            </DialogDescription>
          </DialogHeader>

          {step === 'info' && (
            <div className="space-y-6">
              {/* Quota hint: a warning, the visitor can still submit */}
              {quota && selectionCount > quota && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 flex gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Votre photographe attend {quota} photo{quota > 1 ? 's' : ''} et vous en avez sélectionné {selectionCount}.
                    Vous pouvez envoyer quand même, ou retirer des photos avant.
                  </span>
                </div>
              )}

              {/* Selection Type Choice */}
              {completeSelectionCount > selectionCount && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="personal-selection"
                        name="selection-type"
                        checked={!isCompleteSelection}
                        onChange={() => setIsCompleteSelection(false)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="personal-selection" className="flex-1 cursor-pointer">
                        <div className="font-medium">Ma sélection personnelle</div>
                        <div className="text-sm text-muted-foreground">
                          {selectionCount} photo{selectionCount !== 1 ? 's' : ''} que vous avez sélectionnées
                        </div>
                      </label>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <input
                        type="radio"
                        id="complete-selection"
                        name="selection-type"
                        checked={isCompleteSelection}
                        onChange={() => setIsCompleteSelection(true)}
                        className="h-4 w-4"
                      />
                      <label htmlFor="complete-selection" className="flex-1 cursor-pointer">
                        <div className="font-medium">Sélection complète de la galerie</div>
                        <div className="text-sm text-muted-foreground">
                          {completeSelectionCount} photo{completeSelectionCount !== 1 ? 's' : ''} sélectionnées par tous les utilisateurs
                        </div>
                      </label>
                    </div>
                  </div>
                </div>
              )}

              {/* Selection Summary */}
              <div className="bg-muted/50 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    <span className="font-medium">
                      {isCompleteSelection ? 'Sélection complète' : 'Ma sélection'}
                    </span>
                  </div>
                  <Badge variant="secondary">
                    {isCompleteSelection ? completeSelectionCount : selectionCount} photo{(isCompleteSelection ? completeSelectionCount : selectionCount) !== 1 ? 's' : ''}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Un fichier texte sera créé avec la liste des photos sélectionnées{isCompleteSelection ? ' par tous les utilisateurs' : ''} et les commentaires.
                </p>
              </div>

              {/* Client Information (Optional) */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="client-name" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Nom (optionnel)
                  </Label>
                  <Input
                    id="client-name"
                    placeholder="Votre nom..."
                    value={clientInfo.name}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, name: e.target.value }))}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-email" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    Email (optionnel)
                  </Label>
                  <Input
                    id="client-email"
                    type="email"
                    placeholder="votre@email.com"
                    value={clientInfo.email}
                    onChange={(e) => {
                      setClientInfo(prev => ({ ...prev, email: e.target.value }));
                      if (emailError) setEmailError('');
                    }}
                    onBlur={(e) => validateEmail(e.target.value)}
                  />
                  {emailError && (
                    <p className="text-xs text-destructive">{emailError}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="client-phone" className="flex items-center gap-2">
                    <Phone className="h-4 w-4" />
                    Téléphone (optionnel)
                  </Label>
                  <Input
                    id="client-phone"
                    type="tel"
                    placeholder="06 12 34 56 78"
                    value={clientInfo.phone}
                    onChange={(e) => setClientInfo(prev => ({ ...prev, phone: e.target.value }))}
                  />
                </div>
              </div>

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
              <div className="flex gap-3">
                <Button
                  onClick={handleSubmitWithInfo}
                  disabled={isSubmitting}
                  className="flex-1"
                >
                  <Send className="h-4 w-4 mr-2" />
                  Soumettre
                </Button>
              </div>

              <p className="text-xs text-muted-foreground text-center">
                Vos informations personnelles sont optionnelles et ne seront utilisées que pour identifier votre sélection.
              </p>
            </div>
          )}

          {step === 'submitting' && (
            <div className="text-center py-8">
              <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
              <p className="text-muted-foreground">
                Création du fichier de sélection...
              </p>
            </div>
          )}

          {step === 'success' && (
            <div className="space-y-6">
              {result?.notified ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <h4 className="font-medium text-green-800">Sélection envoyée</h4>
                      <p className="text-sm text-green-600">Votre photographe vient de recevoir votre sélection par e-mail.</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium text-amber-800">Sélection enregistrée, notification non envoyée</h4>
                      <p className="text-sm text-amber-700">
                        Vos favoris sont bien sauvegardés, mais l'e-mail vers votre photographe n'est pas parti
                        {result?.notificationError ? ` (${result.notificationError})` : ''}.
                        Téléchargez la copie ci-dessous et transmettez-la, ou réessayez plus tard.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                {result?.blobUrl && (
                  <Button
                    variant="outline"
                    onClick={handleDownload}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Télécharger une copie
                  </Button>
                )}
                <Button
                  onClick={handleClose}
                  className="flex-1"
                >
                  Terminé
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}