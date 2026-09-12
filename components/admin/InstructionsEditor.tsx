import React from "react";
import { ArrowUp, ArrowDown, Trash2, Plus } from "lucide-react";
import { INSTRUCTION_ICONS, type Instructions, type InstructionStep, type InstructionIcon } from "../../services/instructionsService";

interface InstructionsEditorProps {
  value: Instructions;
  onChange: (next: Instructions) => void;
}

const input = "w-full h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors bg-white";
const textarea = "w-full px-3 py-2 rounded-lg border border-gray-200 text-[13px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors bg-white resize-y";
const label = "block text-[12px] font-medium text-gray-600 mb-1";

/** Form for one Instructions object: title, quota, intro block, ordered steps, help block. */
export function InstructionsEditor({ value, onChange }: InstructionsEditorProps) {
  const set = (patch: Partial<Instructions>) => onChange({ ...value, ...patch });
  const setStep = (index: number, patch: Partial<InstructionStep>) =>
    set({ steps: value.steps.map((s, i) => (i === index ? { ...s, ...patch } : s)) });
  const moveStep = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= value.steps.length) return;
    const steps = [...value.steps];
    [steps[index], steps[target]] = [steps[target], steps[index]];
    set({ steps });
  };

  return (
    <div className="space-y-4 font-['DM_Sans',sans-serif]">
      <section className="border border-gray-200 rounded-xl p-4 space-y-3">
        <h4 className="text-[13px] font-semibold text-gray-800">Titre et nombre de photos</h4>
        <div className="grid grid-cols-1 sm:grid-cols-[minmax(0,1fr)_200px] gap-3">
          <div>
            <label className={label} htmlFor="instr-title">Titre du panneau</label>
            <input id="instr-title" className={input} value={value.title} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <label className={label} htmlFor="instr-quota">Photos à choisir</label>
            <input
              id="instr-quota"
              type="number"
              min={1}
              className={input}
              placeholder="Pas de limite"
              value={value.quota?.max ?? ""}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                set({ quota: Number.isInteger(n) && n > 0 ? { max: n } : null });
              }}
            />
          </div>
        </div>
        <p className="text-[11px] text-gray-400">Le nombre attendu n'est qu'un avertissement pour le visiteur, jamais un blocage. Écrivez {"{quota}"} dans un texte pour l'y insérer.</p>
      </section>

      <Block
        title="Encart « À savoir »"
        enabled={!!value.intro}
        onToggle={(on) => set({ intro: on ? { title: "À savoir avant de commencer", text: "" } : null })}
      >
        {value.intro && (
          <>
            <input className={input} placeholder="Titre de l'encart" value={value.intro.title} onChange={(e) => set({ intro: { ...value.intro!, title: e.target.value } })} />
            <textarea className={textarea} rows={4} placeholder="Texte" value={value.intro.text} onChange={(e) => set({ intro: { ...value.intro!, text: e.target.value } })} />
          </>
        )}
      </Block>

      <section className="border border-gray-200 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-[13px] font-semibold text-gray-800">Étapes <span className="font-normal text-gray-400">({value.steps.length})</span></h4>
          <button
            type="button"
            onClick={() => set({ steps: [...value.steps, { icon: "info", title: "", text: "" }] })}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-gray-600 hover:text-gray-900"
          >
            <Plus className="h-3.5 w-3.5" /> Ajouter une étape
          </button>
        </div>
        {value.steps.length === 0 && (
          <p className="text-[12px] text-gray-400 italic">Aucune étape. Ajoutez-en au moins une.</p>
        )}
        {value.steps.map((step, index) => (
          <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
            <div className="flex items-center gap-2">
              <span className="text-[12px] font-semibold text-gray-500 w-6">{index + 1}.</span>
              <select
                className={input + " max-w-[190px] shrink-0"}
                value={step.icon}
                onChange={(e) => setStep(index, { icon: e.target.value as InstructionIcon })}
                aria-label="Icône de l'étape"
              >
                {INSTRUCTION_ICONS.map((icon) => (
                  <option key={icon.id} value={icon.id}>{icon.label}</option>
                ))}
              </select>
              <input className={input} placeholder="Titre de l'étape" value={step.title} onChange={(e) => setStep(index, { title: e.target.value })} />
              <button type="button" onClick={() => moveStep(index, -1)} disabled={index === 0} className="p-1.5 text-gray-400 hover:text-gray-900 disabled:opacity-30" aria-label="Monter"><ArrowUp className="h-4 w-4" /></button>
              <button type="button" onClick={() => moveStep(index, 1)} disabled={index === value.steps.length - 1} className="p-1.5 text-gray-400 hover:text-gray-900 disabled:opacity-30" aria-label="Descendre"><ArrowDown className="h-4 w-4" /></button>
              <button type="button" onClick={() => set({ steps: value.steps.filter((_, i) => i !== index) })} className="p-1.5 text-gray-400 hover:text-red-600" aria-label="Supprimer l'étape"><Trash2 className="h-4 w-4" /></button>
            </div>
            <textarea className={textarea} rows={3} placeholder="Texte de l'étape" value={step.text} onChange={(e) => setStep(index, { text: e.target.value })} />
            <input className={input} placeholder="Phrase mise en avant (optionnel)" value={step.highlight || ""} onChange={(e) => setStep(index, { highlight: e.target.value || undefined })} />
          </div>
        ))}
      </section>

      <Block
        title="Bloc « Besoin d'aide »"
        enabled={!!value.help}
        onToggle={(on) => set({ help: on ? { title: "Besoin d'aide ?", text: "" } : null })}
      >
        {value.help && (
          <>
            <input className={input} placeholder="Titre" value={value.help.title} onChange={(e) => set({ help: { ...value.help!, title: e.target.value } })} />
            <textarea className={textarea} rows={2} placeholder="Texte" value={value.help.text} onChange={(e) => set({ help: { ...value.help!, text: e.target.value } })} />
          </>
        )}
      </Block>
    </div>
  );
}

function Block({ title, enabled, onToggle, children }: { title: string; enabled: boolean; onToggle: (on: boolean) => void; children: React.ReactNode }) {
  return (
    <section className="border border-gray-200 rounded-xl p-4 space-y-2">
      <label className="flex items-center justify-between cursor-pointer">
        <h4 className="text-[13px] font-semibold text-gray-800">{title}</h4>
        <span className="flex items-center gap-2 text-[12px] text-gray-500">
          {enabled ? "Affiché" : "Masqué"}
          <input type="checkbox" className="rounded" checked={enabled} onChange={(e) => onToggle(e.target.checked)} />
        </span>
      </label>
      {children}
    </section>
  );
}
