import React, { useEffect } from "react";
import { Camera, Eye, Heart, Check, SlidersHorizontal, Star, Info, Sparkles, X } from "lucide-react";
import { applyQuota, type Instructions, type InstructionIcon } from "../services/instructionsService";

const ICONS: Record<InstructionIcon, React.ComponentType<{ className?: string }>> = {
  camera: Camera,
  eye: Eye,
  heart: Heart,
  check: Check,
  sliders: SlidersHorizontal,
  star: Star,
  info: Info,
};

interface CardProps {
  instructions: Instructions;
  compact?: boolean;
}

/**
 * The instructions card, in the photographer's own visual language (cream ground,
 * brass rule, night-blue text). Used by the client panel and by the admin previews.
 */
export function InstructionsCard({ instructions, compact = false }: CardProps) {
  const q = instructions.quota;
  return (
    <div className={`bg-[#FBF9F5] text-[#1F2A44] rounded-2xl border border-[#EDE7DA] ${compact ? "p-5" : "p-6 sm:p-8"}`}>
      <h2 className={`text-center font-serif ${compact ? "text-xl" : "text-2xl sm:text-[28px]"} leading-tight tracking-tight`}>
        {applyQuota(instructions.title, q)}
      </h2>
      <div className="w-10 h-0.5 bg-[#B8965A] mx-auto mt-3 mb-5" aria-hidden="true" />

      {instructions.intro && (
        <div className="flex gap-3 bg-[#F3EEE4] rounded-xl p-4 mb-5">
          <div className="w-10 h-10 rounded-full bg-white border border-[#EDE7DA] shadow-sm flex items-center justify-center shrink-0">
            <Camera className="h-5 w-5 text-[#A2823F]" />
          </div>
          <div className="text-[14px] leading-relaxed">
            <div className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[#A2823F] mb-1">
              {applyQuota(instructions.intro.title, q)}
            </div>
            <p className="whitespace-pre-line">{applyQuota(instructions.intro.text, q)}</p>
          </div>
        </div>
      )}

      <ol className="space-y-4">
        {instructions.steps.map((step, index) => {
          const Icon = ICONS[step.icon] || Info;
          return (
            <li key={index} className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-white border border-[#EDE7DA] shadow-sm flex items-center justify-center shrink-0">
                <Icon className="h-5 w-5 text-[#1F2A44]" />
              </div>
              <div className="text-[14px] leading-relaxed min-w-0">
                <div className="text-[12px] font-semibold tracking-[0.08em] uppercase">
                  {index + 1}. {applyQuota(step.title, q)}
                </div>
                <p className="whitespace-pre-line mt-1">{applyQuota(step.text, q)}</p>
                {step.highlight && (
                  <p className="mt-1 font-semibold text-[#A2823F]">{applyQuota(step.highlight, q)}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>

      {instructions.help && (
        <div className="flex gap-3 border border-dashed border-[#D3C09A] rounded-xl p-4 mt-5">
          <div className="w-10 h-10 rounded-full bg-[#B8965A] flex items-center justify-center shrink-0">
            <Sparkles className="h-5 w-5 text-white" />
          </div>
          <div className="text-[14px] leading-relaxed">
            <div className="text-[12px] font-semibold tracking-[0.08em] uppercase text-[#A2823F] mb-1">
              {instructions.help.title}
            </div>
            <p className="whitespace-pre-line">{instructions.help.text}</p>
          </div>
        </div>
      )}
    </div>
  );
}

interface PanelProps {
  instructions: Instructions;
  open: boolean;
  onClose: () => void;
}

/** Modal shown to visitors on their first visit of a gallery, and from the "Consignes" button. */
export function InstructionsPanel({ instructions, open, onClose }: PanelProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[70] bg-[#1F2A44]/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      role="dialog"
      aria-modal="true"
      aria-label={instructions.title}
    >
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-2xl shadow-2xl">
        <button
          type="button"
          onClick={onClose}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/80 hover:bg-white text-[#1F2A44] flex items-center justify-center"
          aria-label="Fermer les consignes"
        >
          <X className="h-4 w-4" />
        </button>
        <InstructionsCard instructions={instructions} />
        <div className="bg-[#FBF9F5] border-t border-[#EDE7DA] rounded-b-2xl -mt-4 pt-6 pb-6 px-6 flex justify-center">
          <button
            type="button"
            onClick={onClose}
            autoFocus
            className="bg-[#1F2A44] text-white rounded-full px-6 py-2.5 text-[14px] font-semibold hover:bg-[#2b3a5c] transition-colors"
          >
            J'ai compris, voir les photos
          </button>
        </div>
      </div>
    </div>
  );
}
