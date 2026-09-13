import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Contact, Save, RefreshCw } from "lucide-react";
import { siteSettingsService, type Photographer } from "../../services/siteSettingsService";

const input = "w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors";
const label = "block text-[13px] font-medium text-gray-700 mb-1.5";

/** Admin form for the contact details shown in every gallery header. */
export function PhotographerSettings() {
  const [form, setForm] = useState<Photographer | null>(null);
  const [saved, setSaved] = useState<Photographer | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    siteSettingsService.getPhotographer(true).then(p => { setForm(p); setSaved(p); });
  }, []);

  const isDirty = !!form && !!saved && JSON.stringify(form) !== JSON.stringify(saved);
  const set = (patch: Partial<Photographer>) => setForm(prev => (prev ? { ...prev, ...patch } : prev));

  const handleSave = async () => {
    if (!form) return;
    if (!form.name.trim() || !form.email.trim()) {
      toast.error("Le nom et l'e-mail sont obligatoires");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      toast.error("Adresse e-mail invalide");
      return;
    }
    setIsSaving(true);
    try {
      const ok = await siteSettingsService.savePhotographer(form);
      if (ok) {
        setSaved(form);
        toast.success("Coordonnées enregistrées, visibles sur toutes les galeries");
      } else {
        toast.error("Enregistrement impossible");
      }
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-50">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
            <Contact className="h-4 w-4 text-blue-700" />
          </div>
          <div>
            <h3 className="text-[14px] font-medium text-gray-900">Coordonnées de la photographe</h3>
            <p className="text-[12px] text-gray-400">Affichées en bas à droite du bandeau de chaque galerie</p>
          </div>
        </div>
      </div>

      {!form ? (
        <div className="p-5 text-[13px] text-gray-400 flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : (
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={label} htmlFor="ph-name">Nom affiché</label>
              <input id="ph-name" className={input} value={form.name} onChange={(e) => set({ name: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="ph-email">E-mail</label>
              <input id="ph-email" type="email" className={input} value={form.email} onChange={(e) => set({ email: e.target.value })} />
            </div>
            <div>
              <label className={label} htmlFor="ph-phone">Téléphone</label>
              <input id="ph-phone" className={input} value={form.phone} onChange={(e) => set({ phone: e.target.value })} placeholder="06 12 34 56 78" />
            </div>
            <div>
              <label className={label} htmlFor="ph-instagram">Instagram (URL)</label>
              <input id="ph-instagram" className={input} value={form.instagram} onChange={(e) => set({ instagram: e.target.value })} placeholder="https://www.instagram.com/..." />
            </div>
            <div className="sm:col-span-2">
              <label className={label} htmlFor="ph-website">Site web</label>
              <input id="ph-website" className={input} value={form.website} onChange={(e) => set({ website: e.target.value })} placeholder="https://" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              disabled={!isDirty || isSaving}
              className={`h-10 px-4 rounded-lg text-[14px] font-medium inline-flex items-center gap-2 ${!isDirty || isSaving ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-[#1F2A44] text-white hover:bg-[#2B3A5C]"}`}
            >
              {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer
            </button>
            {isDirty && <span className="text-[12px] text-gray-400">Modifications non enregistrées</span>}
          </div>
        </div>
      )}
    </div>
  );
}
