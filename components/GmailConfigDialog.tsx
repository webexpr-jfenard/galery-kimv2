import React, { useState } from "react";
import { Mail, Send, X, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "./ui/button";
import { gmailService } from "../services/gmailService";

interface GmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Notifications e-mail. Depuis l'audit de septembre 2026, le destinataire et le contenu
 * sont fixés côté serveur (variables NOTIFY_TO / GMAIL_USER sur Vercel) : rien n'est
 * configurable depuis le navigateur, ce dialogue sert à vérifier que l'envoi fonctionne.
 */
export function GmailConfigDialog({ isOpen, onClose }: GmailConfigDialogProps) {
  const [isTesting, setIsTesting] = useState(false);

  if (!isOpen) return null;

  const handleTestEmail = async () => {
    setIsTesting(true);
    try {
      const result = await gmailService.sendTestEmail();
      if (result.success) {
        toast.success("E-mail de test envoyé à l'adresse configurée sur le serveur");
      } else {
        toast.error(result.error || "L'e-mail de test n'a pas pu être envoyé");
      }
    } finally {
      setIsTesting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 font-['DM_Sans',sans-serif]"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-xl border border-gray-100 p-6 max-w-md w-full" role="dialog" aria-modal="true" aria-labelledby="email-config-title">
        <div className="flex items-center justify-between mb-4">
          <h2 id="email-config-title" className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5 text-gray-900" />
            Notifications e-mail
          </h2>
          <Button variant="outline" size="sm" onClick={onClose} aria-label="Fermer" className="text-gray-400 hover:text-gray-600 hover:bg-gray-50">
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="space-y-3 text-[14px] text-gray-600">
          <p>
            À chaque sélection validée, un e-mail part vers l'adresse configurée sur le serveur,
            avec la liste des photos en pièce jointe.
          </p>
          <div className="flex items-start gap-2 rounded-lg bg-gray-50 border border-gray-100 p-3 text-[13px]">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Le destinataire et le contenu sont fixés côté serveur (variables <code className="font-mono">NOTIFY_TO</code> et <code className="font-mono">GMAIL_USER</code> sur Vercel).
              Rien n'est modifiable depuis le navigateur, ce qui empêche tout détournement.
            </span>
          </div>
        </div>

        <div className="flex gap-2 mt-6">
          <Button variant="outline" className="flex-1" onClick={onClose}>Fermer</Button>
          <Button className="flex-1" onClick={handleTestEmail} disabled={isTesting}>
            <Send className="h-4 w-4 mr-2" />
            {isTesting ? "Envoi…" : "Envoyer un e-mail de test"}
          </Button>
        </div>
      </div>
    </div>
  );
}
