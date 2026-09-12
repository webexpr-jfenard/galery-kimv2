import React, { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Copy, Trash2, Save, RefreshCw, Eye, EyeOff } from "lucide-react";
import { instructionsService, emptyInstructions, type InstructionTemplate, type Instructions } from "../../services/instructionsService";
import { InstructionsEditor } from "./InstructionsEditor";
import { InstructionsCard } from "../InstructionsPanel";

/**
 * Admin page "Consignes": the templates a gallery can start from. Editing a template
 * never changes the galleries that already copied it (each gallery keeps its own copy).
 */
export function InstructionsPage() {
  const [templates, setTemplates] = useState<InstructionTemplate[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [draft, setDraft] = useState<Instructions | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const load = async (keepSelection = true) => {
    setIsLoading(true);
    try {
      const list = await instructionsService.listTemplates();
      setTemplates(list);
      const current = keepSelection && selectedId ? list.find(t => t.id === selectedId) : list[0];
      if (current) select(current);
      else if (list.length === 0) { setSelectedId(null); setDraft(null); }
    } catch {
      toast.error("Impossible de charger les modèles de consignes");
    } finally {
      setIsLoading(false);
    }
  };

  const select = (template: InstructionTemplate) => {
    setSelectedId(template.id);
    setDraftName(template.name);
    setDraft(structuredClone(template.content));
    setConfirmDelete(false);
  };

  useEffect(() => { load(false); }, []);

  const selected = templates.find(t => t.id === selectedId) || null;
  const isDirty = !!selected && !!draft && (draftName !== selected.name || JSON.stringify(draft) !== JSON.stringify(selected.content));

  const handleSave = async () => {
    if (!selected || !draft) return;
    if (!draftName.trim()) { toast.error("Le modèle doit avoir un nom"); return; }
    if (draft.steps.length === 0) { toast.error("Ajoutez au moins une étape"); return; }
    setIsSaving(true);
    try {
      const saved = await instructionsService.saveTemplate({ id: selected.id, name: draftName, content: draft, sortOrder: selected.sortOrder });
      setTemplates(prev => prev.map(t => (t.id === saved.id ? saved : t)));
      toast.success(`Modèle « ${saved.name} » enregistré`);
    } catch {
      toast.error("Enregistrement impossible (êtes-vous bien connecté en admin ?)");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCreate = async (from?: InstructionTemplate) => {
    const name = from ? `${from.name} (copie)` : "Nouveau modèle";
    try {
      const created = await instructionsService.createTemplate(name, from ? structuredClone(from.content) : emptyInstructions(), templates.length + 1);
      setTemplates(prev => [...prev, created]);
      select(created);
      toast.success(`Modèle « ${created.name} » créé`);
    } catch {
      toast.error("Création impossible");
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    const ok = await instructionsService.deleteTemplate(selected.id);
    if (!ok) { toast.error("Suppression impossible"); return; }
    toast.success(`Modèle « ${selected.name} » supprimé`);
    const rest = templates.filter(t => t.id !== selected.id);
    setTemplates(rest);
    if (rest[0]) select(rest[0]); else { setSelectedId(null); setDraft(null); }
  };

  return (
    <div className="space-y-6 font-['DM_Sans',sans-serif]">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Consignes de sélection</h1>
          <p className="text-[14px] text-gray-500 mt-1 max-w-2xl">
            Les modèles servent de point de départ pour chaque galerie (onglet Consignes de la galerie).
            Modifier un modèle ne change pas les galeries qui l'ont déjà copié.
          </p>
        </div>
        <button
          type="button"
          onClick={() => handleCreate()}
          className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-gray-900 text-white text-[14px] font-medium hover:bg-gray-800"
        >
          <Plus className="h-4 w-4" /> Nouveau modèle
        </button>
      </div>

      {isLoading ? (
        <div className="text-[14px] text-gray-400 flex items-center gap-2"><RefreshCw className="h-4 w-4 animate-spin" /> Chargement…</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[240px_minmax(0,1fr)] gap-6">
          <aside className="space-y-1">
            {templates.map(template => (
              <button
                key={template.id}
                type="button"
                onClick={() => select(template)}
                className={`w-full text-left px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
                  template.id === selectedId ? "bg-gray-900 text-white" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <div className="font-medium truncate">{template.name}</div>
                <div className={`text-[12px] ${template.id === selectedId ? "text-gray-300" : "text-gray-400"}`}>
                  {template.content.steps.length} étape{template.content.steps.length > 1 ? "s" : ""}
                  {template.content.quota ? ` · ${template.content.quota.max} photo${template.content.quota.max > 1 ? "s" : ""}` : ""}
                </div>
              </button>
            ))}
            {templates.length === 0 && <p className="text-[13px] text-gray-400 px-3">Aucun modèle.</p>}
          </aside>

          {selected && draft ? (
            <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)] gap-6 items-start">
              <div className="bg-white rounded-xl border border-gray-100 p-5 space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  <input
                    className="flex-1 min-w-[200px] h-10 px-3 rounded-lg border border-gray-200 text-[15px] font-semibold text-gray-900 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                    value={draftName}
                    onChange={(e) => setDraftName(e.target.value)}
                    aria-label="Nom du modèle"
                  />
                  <button type="button" onClick={() => handleCreate(selected)} className="h-10 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 inline-flex items-center gap-1.5">
                    <Copy className="h-4 w-4" /> Dupliquer
                  </button>
                  <button type="button" onClick={handleDelete} className={`h-10 px-3 rounded-lg border text-[13px] inline-flex items-center gap-1.5 ${confirmDelete ? "border-red-300 bg-red-50 text-red-700" : "border-gray-200 text-gray-600 hover:bg-gray-50"}`}>
                    <Trash2 className="h-4 w-4" /> {confirmDelete ? "Confirmer la suppression" : "Supprimer"}
                  </button>
                </div>

                <InstructionsEditor value={draft} onChange={setDraft} />

                <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                  <button type="button" onClick={() => setShowPreview(v => !v)} className="text-[13px] text-gray-500 hover:text-gray-900 inline-flex items-center gap-1.5 xl:hidden">
                    {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />} Aperçu
                  </button>
                  <div className="flex-1" />
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={!isDirty || isSaving}
                    className={`h-10 px-4 rounded-lg text-[14px] font-medium inline-flex items-center gap-2 ${!isDirty || isSaving ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-800"}`}
                  >
                    {isSaving ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />} Enregistrer le modèle
                  </button>
                </div>
              </div>

              <div className={`${showPreview ? "" : "hidden xl:block"} xl:sticky xl:top-6`}>
                <p className="text-[12px] uppercase tracking-[0.08em] text-gray-400 font-semibold mb-2">Aperçu côté client</p>
                <InstructionsCard instructions={draft} compact />
              </div>
            </div>
          ) : (
            <div className="text-[14px] text-gray-400">Sélectionnez un modèle ou créez-en un.</div>
          )}
        </div>
      )}
    </div>
  );
}
