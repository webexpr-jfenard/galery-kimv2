import React, { useState } from "react";
import { X, Plus, ChevronDown, Folder, Lock, RefreshCw } from "lucide-react";
import { CategorySelector } from "../CategorySelector";

interface CreateGalleryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (data: {
    name: string;
    description: string;
    bucketFolder: string;
    bucketName: string;
    password: string;
    isPublic: boolean;
    allowComments: boolean;
    allowFavorites: boolean;
    category: string;
  }) => Promise<void>;
  isCreating: boolean;
}

export function CreateGalleryDialog({
  isOpen,
  onClose,
  onCreate,
  isCreating,
}: CreateGalleryDialogProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    bucketFolder: "",
    bucketName: "photos",
    password: "",
    isPublic: true,
    allowComments: true,
    allowFavorites: true,
    category: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    await onCreate(form);
    setForm({
      name: "",
      description: "",
      bucketFolder: "",
      bucketName: "photos",
      password: "",
      isPublic: true,
      allowComments: true,
      allowFavorites: true,
      category: "",
    });
    setShowAdvanced(false);
  };

  const updateField = <K extends keyof typeof form>(
    key: K,
    value: (typeof form)[K]
  ) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-['DM_Sans',sans-serif]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[480px] mx-4 bg-white rounded-2xl shadow-xl shadow-gray-200/50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <h2 className="text-[16px] font-semibold text-gray-900">
            Nouvelle galerie
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="gallery-name"
              className="block text-[13px] font-medium text-gray-700 mb-1.5"
            >
              Nom *
            </label>
            <input
              id="gallery-name"
              type="text"
              placeholder="ex: Mariage - Jean & Marie"
              value={form.name}
              onChange={(e) => updateField("name", e.target.value)}
              autoFocus
              className="w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-[13px] font-medium text-gray-700 mb-1.5">
              Catégorie
            </label>
            <CategorySelector
              value={form.category || undefined}
              onChange={(cat) => updateField("category", cat || "")}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="gallery-desc"
              className="block text-[13px] font-medium text-gray-700 mb-1.5"
            >
              Description
            </label>
            <textarea
              id="gallery-desc"
              placeholder="Description optionnelle..."
              value={form.description}
              onChange={(e) => updateField("description", e.target.value)}
              rows={2}
              className="w-full px-3.5 py-2.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors resize-none"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="gallery-password"
              className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5"
            >
              <Lock className="h-3 w-3" />
              Mot de passe
            </label>
            <input
              id="gallery-password"
              type="password"
              placeholder="Laisser vide = galerie publique"
              value={form.password}
              onChange={(e) => updateField("password", e.target.value)}
              className="w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
            />
          </div>

          {/* Advanced toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center gap-1.5 text-[13px] text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          >
            <ChevronDown
              className={`h-3 w-3 transition-transform duration-150 ${
                showAdvanced ? "rotate-180" : ""
              }`}
            />
            Options avancées
          </button>

          {showAdvanced && (
            <div className="space-y-4 pt-1">
              {/* Bucket folder + name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label
                    htmlFor="gallery-folder"
                    className="flex items-center gap-1.5 text-[12px] font-medium text-gray-500 mb-1.5"
                  >
                    <Folder className="h-3 w-3" />
                    Dossier Bucket
                  </label>
                  <input
                    id="gallery-folder"
                    type="text"
                    placeholder="Auto-généré"
                    value={form.bucketFolder}
                    onChange={(e) => updateField("bucketFolder", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-300 transition-colors"
                  />
                </div>
                <div>
                  <label
                    htmlFor="gallery-bucket"
                    className="block text-[12px] font-medium text-gray-500 mb-1.5"
                  >
                    Nom du Bucket
                  </label>
                  <input
                    id="gallery-bucket"
                    type="text"
                    placeholder="photos"
                    value={form.bucketName}
                    onChange={(e) => updateField("bucketName", e.target.value)}
                    className="w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-gray-300 transition-colors"
                  />
                </div>
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                {[
                  {
                    key: "isPublic" as const,
                    label: "Galerie publique",
                  },
                  {
                    key: "allowComments" as const,
                    label: "Commentaires",
                  },
                  {
                    key: "allowFavorites" as const,
                    label: "Favoris",
                  },
                ].map(({ key, label }) => (
                  <div
                    key={key}
                    className="flex items-center justify-between"
                  >
                    <span className="text-[13px] text-gray-600">{label}</span>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={form[key]}
                      onClick={() => updateField(key, !form[key])}
                      className={`
                        w-9 h-5 rounded-full transition-colors duration-150 cursor-pointer relative
                        ${form[key] ? "bg-orange-500" : "bg-gray-200"}
                      `}
                    >
                      <span
                        className={`
                          absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150
                          ${form[key] ? "translate-x-4" : "translate-x-0.5"}
                        `}
                      />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Submit */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isCreating || !form.name.trim()}
              className={`
                w-full h-10 rounded-lg font-medium text-[14px] flex items-center justify-center gap-2
                transition-all duration-150 cursor-pointer
                ${
                  isCreating || !form.name.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
                }
              `}
            >
              {isCreating ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Créer la galerie
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
