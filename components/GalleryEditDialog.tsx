import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { CategorySelector } from "./CategorySelector";
import {
  Key, Folder, Eye, EyeOff, Save, X, RefreshCw, ListChecks, Link2, Copy, Lock, Unlock,
  SlidersHorizontal, ExternalLink, Images
} from "lucide-react";
import type { Gallery } from "../services/galleryService";
import { instructionsService, emptyInstructions, type InstructionTemplate, type Instructions } from "../services/instructionsService";
import { InstructionsEditor } from "./admin/InstructionsEditor";
import { InstructionsCard } from "./InstructionsPanel";

interface GalleryEditDialogProps {
  gallery: Gallery | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (galleryId: string, data: Partial<Gallery>) => Promise<void>;
  /** Optional shortcuts shown in the panel header */
  onManagePhotos?: (galleryId: string) => void;
  onView?: (galleryId: string) => void;
}

type Tab = "general" | "access" | "instructions";

const TABS: { id: Tab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: "general", label: "Général", icon: SlidersHorizontal },
  { id: "access", label: "Accès", icon: Lock },
  { id: "instructions", label: "Consignes", icon: ListChecks },
];

const inputClass = "w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors";
const labelClass = "block text-[13px] font-medium text-gray-700 mb-1.5";

function Toggle({ checked, onChange, label, description }: { checked: boolean; onChange: (v: boolean) => void; label: string; description?: string }) {
  return (
    <div className="flex items-center justify-between gap-4 py-2">
      <div>
        <div className="text-[13px] text-gray-800">{label}</div>
        {description && <div className="text-[12px] text-gray-400">{description}</div>}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={checked ? "w-9 h-5 rounded-full bg-orange-500 relative cursor-pointer transition-colors duration-150 shrink-0" : "w-9 h-5 rounded-full bg-gray-200 relative cursor-pointer transition-colors duration-150 shrink-0"}
      >
        <span className={checked ? "absolute top-0.5 left-4 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-150" : "absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-all duration-150"} />
      </button>
    </div>
  );
}

/**
 * Gallery settings, as a panel sliding in from the right (the form grew too long for a
 * centered modal). Three tabs: general information, access (link + password), selection
 * instructions. Header and footer stay fixed, only the tab content scrolls.
 */
export function GalleryEditDialog({ gallery, isOpen, onClose, onSave, onManagePhotos, onView }: GalleryEditDialogProps) {
  const [editForm, setEditForm] = useState<Partial<Gallery>>({});
  const [tab, setTab] = useState<Tab>("general");
  const [showPassword, setShowPassword] = useState(false);
  const [removePassword, setRemovePassword] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [showInstructionsPreview, setShowInstructionsPreview] = useState(false);

  // Slide-in / slide-out: stay mounted for the exit transition
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    if (isOpen) {
      setMounted(true);
      const raf = requestAnimationFrame(() => requestAnimationFrame(() => setVisible(true)));
      return () => cancelAnimationFrame(raf);
    }
    setVisible(false);
    const timer = setTimeout(() => setMounted(false), 300);
    return () => clearTimeout(timer);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [isOpen, onClose]);

  useEffect(() => {
    if (gallery && isOpen) {
      setEditForm({
        name: gallery.name,
        description: gallery.description || '',
        bucketFolder: gallery.bucketFolder || '',
        bucketName: gallery.bucketName || 'photos',
        password: '', // never read back: the stored password is a hash
        allowComments: gallery.allowComments,
        allowFavorites: gallery.allowFavorites,
        category: gallery.category || '',
        instructions: gallery.instructions ?? null
      });
      setTab("general");
      setShowPassword(false);
      setRemovePassword(false);
      setShowInstructionsPreview(false);
      instructionsService.listTemplates().then(setTemplates).catch(() => setTemplates([]));
    }
  }, [gallery, isOpen]);

  const handleSave = async () => {
    if (!gallery) return;
    setIsSaving(true);
    try {
      // '' removes the protection, undefined keeps the current password, a value replaces it
      await onSave(gallery.id, {
        ...editForm,
        password: removePassword ? '' : (editForm.password || undefined)
      });
      onClose();
    } finally {
      setIsSaving(false);
    }
  };

  if (!mounted || !gallery) return null;

  const shareUrl = `${window.location.origin}/#/gallery/${gallery.id}`;
  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Lien copié");
    } catch {
      toast.error("Copie impossible, sélectionnez le lien à la main");
    }
  };

  return (
    <div className="fixed inset-0 z-50 font-['DM_Sans',sans-serif]" role="dialog" aria-modal="true" aria-labelledby="gallery-panel-title">
      {/* Overlay */}
      <div
        className={`absolute inset-0 bg-black/25 backdrop-blur-[2px] transition-opacity duration-200 ${visible ? "opacity-100" : "opacity-0"}`}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={`absolute inset-y-0 right-0 w-full sm:w-[720px] bg-white shadow-2xl flex flex-col transform transition-transform duration-300 ease-out ${visible ? "translate-x-0" : "translate-x-full"}`}
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-0 border-b border-gray-100 shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <h2 id="gallery-panel-title" className="text-[17px] font-semibold text-gray-900 truncate">{gallery.name}</h2>
              <p className="text-[12px] text-gray-400 mt-0.5">
                {gallery.photoCount ?? 0} photo{(gallery.photoCount ?? 0) > 1 ? "s" : ""}
                {gallery.category ? ` · ${gallery.category}` : ""}
                {gallery.hasPassword ? " · protégée" : ""}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {onManagePhotos && (
                <button type="button" onClick={() => onManagePhotos(gallery.id)} className="h-9 px-3 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100 inline-flex items-center gap-1.5" title="Gérer les photos">
                  <Images className="h-4 w-4" /> Photos
                </button>
              )}
              {onView && (
                <button type="button" onClick={() => onView(gallery.id)} className="h-9 px-3 rounded-lg text-[13px] text-gray-600 hover:bg-gray-100 inline-flex items-center gap-1.5" title="Ouvrir la galerie comme un visiteur">
                  <ExternalLink className="h-4 w-4" /> Voir
                </button>
              )}
              <button
                onClick={onClose}
                className="w-9 h-9 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mt-4 -mb-px">
            {TABS.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => setTab(id)}
                className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-[13px] font-medium border-b-2 transition-colors ${
                  tab === id ? "border-gray-900 text-gray-900" : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
                {id === "instructions" && editForm.instructions && <span className="w-1.5 h-1.5 rounded-full bg-orange-500" aria-label="activées" />}
                {id === "access" && gallery.hasPassword && <Key className="h-3 w-3 text-orange-500" aria-label="protégée" />}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {tab === "general" && (
            <div className="space-y-5">
              <div>
                <label htmlFor="edit-dialog-name" className={labelClass}>Nom de la galerie *</label>
                <input
                  id="edit-dialog-name"
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nom de la galerie"
                  className={inputClass}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Catégorie</label>
                  <CategorySelector
                    value={editForm.category || undefined}
                    onChange={(category) => setEditForm(prev => ({ ...prev, category: category || '' }))}
                  />
                </div>
                <div>
                  <label htmlFor="edit-dialog-bucket" className={`${labelClass} flex items-center gap-1.5`}>
                    <Folder className="h-3 w-3" /> Dossier de stockage
                  </label>
                  <input
                    id="edit-dialog-bucket"
                    type="text"
                    value={editForm.bucketFolder || ''}
                    readOnly
                    disabled
                    className="w-full h-10 px-3.5 rounded-lg border border-gray-100 text-[14px] text-gray-400 bg-gray-50 cursor-not-allowed"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Fixé à la création</p>
                </div>
              </div>

              <div>
                <label htmlFor="edit-dialog-description" className={labelClass}>Description</label>
                <textarea
                  id="edit-dialog-description"
                  value={editForm.description || ''}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Quelques mots sur cette galerie (facultatif)"
                  rows={3}
                  className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors resize-y"
                />
              </div>

              <div className="border border-gray-200 rounded-xl px-4 py-1 divide-y divide-gray-100">
                <Toggle
                  checked={editForm.allowFavorites ?? true}
                  onChange={(v) => setEditForm(prev => ({ ...prev, allowFavorites: v }))}
                  label="Favoris"
                  description="Les visiteurs peuvent marquer des photos et envoyer une sélection"
                />
                <Toggle
                  checked={editForm.allowComments ?? true}
                  onChange={(v) => setEditForm(prev => ({ ...prev, allowComments: v }))}
                  label="Commentaires"
                  description="Les visiteurs peuvent commenter chaque photo"
                />
              </div>
            </div>
          )}

          {tab === "access" && (
            <div className="space-y-6">
              <div>
                <label className={`${labelClass} flex items-center gap-1.5`}><Link2 className="h-3 w-3" /> Lien à partager</label>
                <div className="flex gap-2">
                  <input type="text" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} className={inputClass + " font-mono text-[13px] text-gray-600"} />
                  <button type="button" onClick={copyLink} className="h-10 px-3.5 rounded-lg border border-gray-200 text-[13px] text-gray-700 hover:bg-gray-50 inline-flex items-center gap-1.5 shrink-0">
                    <Copy className="h-4 w-4" /> Copier
                  </button>
                </div>
                <p className="text-[12px] text-gray-400 mt-1.5">Toute personne qui a ce lien peut ouvrir la galerie{gallery.hasPassword ? ", après avoir saisi le mot de passe" : ""}.</p>
              </div>

              <div className="border border-gray-200 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-[13px] font-medium text-gray-800">
                    {gallery.hasPassword ? <Lock className="h-4 w-4 text-orange-500" /> : <Unlock className="h-4 w-4 text-gray-400" />}
                    {gallery.hasPassword ? "Galerie protégée par mot de passe" : "Galerie sans mot de passe"}
                  </div>
                  {gallery.hasPassword && (
                    <label className="flex items-center gap-2 text-[13px] text-gray-600 cursor-pointer">
                      <input type="checkbox" checked={removePassword} onChange={(e) => setRemovePassword(e.target.checked)} className="rounded" />
                      Retirer la protection
                    </label>
                  )}
                </div>
                <div>
                  <label htmlFor="edit-dialog-password" className={`${labelClass} flex items-center gap-1.5`}>
                    <Key className="h-3 w-3" />
                    {gallery.hasPassword ? "Nouveau mot de passe (laisser vide pour conserver l’actuel)" : "Définir un mot de passe (optionnel)"}
                  </label>
                  <div className="relative">
                    <input
                      id="edit-dialog-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder={gallery.hasPassword ? '••••••••' : 'Mot de passe...'}
                      disabled={removePassword}
                      value={editForm.password || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                      autoComplete="new-password"
                      className={inputClass + " pr-10 disabled:bg-gray-50 disabled:text-gray-400"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors"
                      tabIndex={-1}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="text-[12px] text-gray-400 mt-1.5">Le mot de passe est stocké haché : il ne peut pas être relu, seulement remplacé.</p>
                </div>
              </div>
            </div>
          )}

          {tab === "instructions" && (
            <div className="space-y-4">
              <div className="border border-gray-200 rounded-xl px-4 py-1">
                <Toggle
                  checked={!!editForm.instructions}
                  onChange={(on) => setEditForm(prev => ({
                    ...prev,
                    instructions: on ? (templates[0] ? structuredClone(templates[0].content) : emptyInstructions()) : null
                  }))}
                  label="Afficher des consignes aux visiteurs"
                  description="Un panneau « Comment sélectionner vos photos ? » s'ouvre à la première visite"
                />
              </div>

              {editForm.instructions && (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <label className="text-[12px] text-gray-500" htmlFor="edit-dialog-template">Repartir d'un modèle :</label>
                    <select
                      id="edit-dialog-template"
                      className="h-9 px-2 rounded-lg border border-gray-200 text-[13px] bg-white"
                      value=""
                      onChange={(e) => {
                        const template = templates.find(t => t.id === e.target.value);
                        if (template) setEditForm(prev => ({ ...prev, instructions: structuredClone(template.content) }));
                      }}
                    >
                      <option value="">Choisir…</option>
                      {templates.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                    <button type="button" onClick={() => setShowInstructionsPreview(v => !v)} className="ml-auto h-9 px-3 rounded-lg border border-gray-200 text-[12px] text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5">
                      {showInstructionsPreview ? <><EyeOff className="h-3.5 w-3.5" /> Éditer</> : <><Eye className="h-3.5 w-3.5" /> Aperçu</>}
                    </button>
                  </div>
                  {showInstructionsPreview ? (
                    <InstructionsCard instructions={editForm.instructions as Instructions} compact />
                  ) : (
                    <InstructionsEditor
                      value={editForm.instructions as Instructions}
                      onChange={(next) => setEditForm(prev => ({ ...prev, instructions: next }))}
                    />
                  )}
                  <p className="text-[11px] text-gray-400">Ces textes sont propres à cette galerie. Les modèles se gèrent dans la page Consignes.</p>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white shrink-0 flex items-center gap-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving || !editForm.name?.trim()}
            className={`h-10 px-5 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer ${
              isSaving || !editForm.name?.trim()
                ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
            }`}
          >
            {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <><Save className="h-4 w-4" /> Enregistrer</>}
          </button>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="h-10 px-4 rounded-lg text-[14px] text-gray-600 border border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Annuler
          </button>
          <span className="ml-auto text-[12px] text-gray-400 hidden sm:inline">Échap pour fermer</span>
        </div>
      </div>
    </div>
  );
}
