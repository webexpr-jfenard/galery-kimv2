import React, { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Textarea } from "./ui/textarea";
import { Switch } from "./ui/switch";
import { CategorySelector } from "./CategorySelector";
import { Edit, Key, Folder, Eye, EyeOff, Save, X } from "lucide-react";
import type { Gallery } from "../services/galleryService";

interface GalleryEditDialogProps {
  gallery: Gallery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (galleryId: string, data: Partial<Gallery>) => Promise<void>;
}

export function GalleryEditDialog({ gallery, isOpen, onClose, onSave }: GalleryEditDialogProps) {
  const [editForm, setEditForm] = useState<Partial<Gallery>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (gallery) {
      setEditForm({
        name: gallery.name,
        description: gallery.description || '',
        bucketFolder: gallery.bucketFolder || '',
        bucketName: gallery.bucketName || 'photos',
        password: gallery.password || '',
        isPublic: gallery.isPublic,
        allowComments: gallery.allowComments,
        allowFavorites: gallery.allowFavorites,
        category: gallery.category || ''
      });
      setShowPassword(false);
    }
  }, [gallery]);

  const handleSave = async () => {
    if (!gallery) return;
    setIsSaving(true);
    try {
      await onSave(gallery.id, editForm);
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (!gallery) return null;

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Edit className="h-5 w-5" />
            Modifier la galerie
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="edit-dialog-name" className="text-sm font-medium">
              Nom de la galerie *
            </Label>
            <Input
              id="edit-dialog-name"
              value={editForm.name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nom de la galerie"
            />
          </div>

          {/* Bucket Folder */}
          <div className="space-y-2">
            <Label htmlFor="edit-dialog-bucket" className="flex items-center gap-2 text-sm font-medium">
              <Folder className="h-4 w-4" />
              Dossier Bucket
            </Label>
            <Input
              id="edit-dialog-bucket"
              value={editForm.bucketFolder || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, bucketFolder: e.target.value }))}
              placeholder="ex: mariage-jean-marie-2024"
            />
          </div>

          {/* Password */}
          <div className="space-y-2">
            <Label htmlFor="edit-dialog-password" className="flex items-center gap-2 text-sm font-medium">
              <Key className="h-4 w-4" />
              Mot de passe (laisser vide pour supprimer la protection)
            </Label>
            <div className="relative">
              <Input
                id="edit-dialog-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nouveau mot de passe..."
                value={editForm.password || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="edit-dialog-description" className="text-sm font-medium">Description</Label>
            <Textarea
              id="edit-dialog-description"
              value={editForm.description || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Description optionnelle de la galerie..."
            />
          </div>

          {/* Category */}
          <CategorySelector
            value={editForm.category || undefined}
            onChange={(category) => setEditForm(prev => ({ ...prev, category: category || '' }))}
          />

          {/* Switches */}
          <div className="space-y-3 pt-1">
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-dialog-public" className="text-sm font-medium">Galerie Publique</Label>
              <Switch
                id="edit-dialog-public"
                checked={editForm.isPublic ?? true}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isPublic: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-dialog-comments" className="text-sm font-medium">Autoriser les commentaires</Label>
              <Switch
                id="edit-dialog-comments"
                checked={editForm.allowComments ?? true}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowComments: checked }))}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="edit-dialog-favorites" className="text-sm font-medium">Autoriser les favoris</Label>
              <Switch
                id="edit-dialog-favorites"
                checked={editForm.allowFavorites ?? true}
                onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, allowFavorites: checked }))}
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t">
            <Button onClick={handleSave} disabled={isSaving} className="flex-1">
              <Save className="h-4 w-4 mr-2" />
              {isSaving ? 'Enregistrement...' : 'Enregistrer'}
            </Button>
            <Button variant="outline" onClick={onClose} disabled={isSaving}>
              <X className="h-4 w-4 mr-2" />
              Annuler
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
