import React, { useState, useEffect } from "react";
import { CategorySelector } from "./CategorySelector";
import { Edit, Key, Folder, Eye, EyeOff, Save, X, RefreshCw } from "lucide-react";
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

  if (!gallery || !isOpen) return null;

  const toggles = [
    { key: "isPublic" as const, label: "Galerie publique" },
    { key: "allowComments" as const, label: "Autoriser les commentaires" },
    { key: "allowFavorites" as const, label: "Autoriser les favoris" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-['DM_Sans',sans-serif]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={() => handleOpenChange(false)}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[560px] mx-4 bg-white rounded-2xl shadow-xl shadow-gray-200/50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-[16px] font-semibold text-gray-900 flex items-center gap-2">
            <Edit className="h-4 w-4" />
            Modifier la galerie
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="edit-dialog-name"
              className="block text-[13px] font-medium text-gray-700 mb-1.5"
            >
              Nom de la galerie *
            </label>
            <input
              id="edit-dialog-name"
              type="text"
              value={editForm.name || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Nom de la galerie"
              className="w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
            />
          </div>

          {/* Bucket Folder */}
          <div>
            <label
              htmlFor="edit-dialog-bucket"
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5"
            >
              <Folder className="h-3 w-3" />
              Dossier Bucket
            </label>
            <input
              id="edit-dialog-bucket"
              type="text"
              value={editForm.bucketFolder || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, bucketFolder: e.target.value }))}
              placeholder="ex: mariage-jean-marie-2024"
              className="w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="edit-dialog-password"
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5"
            >
              <Key className="h-3 w-3" />
              Mot de passe (laisser vide pour supprimer la protection)
            </label>
            <div className="relative">
              <input
                id="edit-dialog-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Nouveau mot de passe..."
                value={editForm.password || ''}
                onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                className="w-full h-10 px-3.5 pr-10 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword(prev => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                tabIndex={-1}
                aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
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
          <div>
            <label
              htmlFor="edit-dialog-description"
              className="block text-[13px] font-medium text-gray-700 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="edit-dialog-description"
              value={editForm.description || ''}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              rows={3}
              placeholder="Description optionnelle de la galerie..."
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors resize-none"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Catégorie
            </label>
            <CategorySelector
              value={editForm.category || undefined}
              onChange={(category) => setEditForm(prev => ({ ...prev, category: category || '' }))}
            />
          </div>

          {/* Toggles */}
          <div className="space-y-3 pt-1">
            {toggles.map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-[13px] text-gray-600">{label}</span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={editForm[key] ?? true}
                  onClick={() => setEditForm(prev => ({ ...prev, [key]: !(prev[key] ?? true) }))}
                  className={(editForm[key] ?? true) ? "w-9 h-5 rounded-full bg-orange-500 relative cursor-pointer transition-colors duration-150" : "w-9 h-5 rounded-full bg-gray-200 relative cursor-pointer transition-colors duration-150"}
                >
                  <span className={(editForm[key] ?? true) ? "absolute top-0.5 left-4 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-150" : "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-150"} />
                </button>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="flex gap-2 pt-2 border-t border-gray-100">
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || !editForm.name?.trim()}
              className={`
                flex-1 h-10 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2
                transition-all duration-150 cursor-pointer
                ${isSaving || !editForm.name?.trim()
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
                }
              `}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Enregistrer
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="h-10 px-4 rounded-lg text-[14px] text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
