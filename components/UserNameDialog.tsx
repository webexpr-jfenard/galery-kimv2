import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Alert } from './ui/alert';
import { User, Heart } from 'lucide-react';

interface UserNameDialogProps {
  open: boolean;
  onConfirm: (userName: string) => void;
  onCancel: () => void;
}

export const UserNameDialog: React.FC<UserNameDialogProps> = ({
  open,
  onConfirm,
  onCancel
}) => {
  const [userName, setUserName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validateName = (name: string): { valid: boolean; message?: string } => {
    if (!name || name.trim().length === 0) {
      return { valid: false, message: 'Le nom ne peut pas être vide' };
    }

    if (name.trim().length < 2) {
      return { valid: false, message: 'Le nom doit contenir au moins 2 caractères' };
    }

    if (name.trim().length > 50) {
      return { valid: false, message: 'Le nom ne peut pas dépasser 50 caractères' };
    }

    // Vérifier les caractères autorisés (lettres, chiffres, espaces, tirets, apostrophes)
    const validNamePattern = /^[a-zA-ZÀ-ÿ0-9\s\-']+$/;
    if (!validNamePattern.test(name.trim())) {
      return { valid: false, message: 'Le nom contient des caractères non autorisés' };
    }

    return { valid: true };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const validation = validateName(userName);
      if (!validation.valid) {
        setError(validation.message || 'Nom invalide');
        return;
      }

      // Confirmer avec le nom nettoyé
      onConfirm(userName.trim());
      
      // Reset du formulaire
      setUserName('');
      setError(null);
    } catch (err) {
      setError('Une erreur est survenue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    setUserName('');
    setError(null);
    onCancel();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUserName(e.target.value);
    if (error) {
      setError(null); // Clear error when user starts typing
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="text-center">
          <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <Heart className="w-6 h-6 text-red-600" />
          </div>
          <DialogTitle className="text-xl font-semibold">
            Première sélection de favori
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Pour suivre qui a sélectionné quoi, nous avons besoin de votre nom. 
            Ce nom sera associé à vos sélections de favoris.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-6">
          <div className="space-y-2">
            <Label htmlFor="userName" className="text-sm font-medium">
              Votre nom
            </Label>
            <div className="relative">
              <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                id="userName"
                type="text"
                placeholder="Entrez votre nom..."
                value={userName}
                onChange={handleInputChange}
                className="pl-10"
                autoFocus
                disabled={isSubmitting}
                maxLength={50}
              />
            </div>
          </div>

          {error && (
            <Alert className="border-red-200 bg-red-50">
              <div className="text-red-800 text-sm">
                {error}
              </div>
            </Alert>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="flex-1"
              disabled={isSubmitting}
            >
              Annuler
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={isSubmitting || !userName.trim()}
            >
              {isSubmitting ? 'Enregistrement...' : 'Confirmer'}
            </Button>
          </div>

          <div className="text-xs text-gray-500 text-center pt-2">
            Votre nom sera stocké localement sur cet appareil uniquement
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};