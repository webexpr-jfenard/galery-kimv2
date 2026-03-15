import React, { useState, useEffect } from "react";
import {
  Mail,
  User,
  CheckCircle,
  AlertCircle,
  Save,
  TestTube,
  X,
  RefreshCw,
  Info,
  Lock,
} from "lucide-react";
import { toast } from "sonner";
import { GmailService, type GmailConfig } from "../services/gmailService";

interface GmailConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GmailConfigDialog({ isOpen, onClose }: GmailConfigDialogProps) {
  const [config, setConfig] = useState<GmailConfig>({
    photographerEmail: "",
    photographerName: "",
    enableNotifications: true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);

  // Load existing configuration
  useEffect(() => {
    if (isOpen) {
      const saved = localStorage.getItem("gmail-config");
      if (saved) {
        try {
          const parsedConfig = JSON.parse(saved);
          setConfig(parsedConfig);
        } catch (error) {
          console.error("Failed to load Gmail config:", error);
        }
      }
      setErrors([]);
    }
  }, [isOpen]);

  const validateConfig = (): boolean => {
    const newErrors: string[] = [];

    if (!config.photographerEmail) {
      newErrors.push("L'email du photographe est requis");
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(config.photographerEmail)) {
        newErrors.push("Format d'email invalide");
      }
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleSave = async () => {
    if (!validateConfig()) return;

    try {
      setIsSaving(true);

      // Save to localStorage
      localStorage.setItem("gmail-config", JSON.stringify(config));

      toast.success("Configuration Gmail sauvegardée !");
      onClose();
    } catch (error) {
      console.error("Error saving Gmail config:", error);
      toast.error("Erreur lors de la sauvegarde");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestEmail = async () => {
    if (!validateConfig()) {
      toast.error("Veuillez corriger la configuration avant de tester");
      return;
    }

    setIsTesting(true);
    try {
      const gmailService = new GmailService(config);
      const result = await gmailService.sendTestEmail();

      if (result.success) {
        toast.success("Email de test envoyé via Gmail !");
      } else {
        toast.error(`Erreur Gmail: ${result.error}`);
      }
    } catch (error) {
      console.error("Erreur test Gmail:", error);
      toast.error("Erreur lors du test Gmail");
    } finally {
      setIsTesting(false);
    }
  };

  const isConfigValid =
    config.photographerEmail &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.photographerEmail);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center font-['DM_Sans',sans-serif]">
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/20 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Dialog */}
      <div className="relative w-full max-w-[520px] mx-4 bg-white rounded-2xl shadow-xl shadow-gray-200/50 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 pb-0">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-gray-500" />
            <h2 className="text-[16px] font-semibold text-gray-900">
              Configuration Gmail SMTP
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label="Fermer"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <p className="px-5 pt-1.5 text-[13px] text-gray-400">
          Configurez l'envoi automatique d'emails via Gmail pour les
          notifications de sélection.
        </p>

        <div className="p-5 space-y-5">
          {/* Enable/Disable notifications toggle */}
          <div className="flex items-center justify-between py-3 px-4 bg-gray-50 rounded-xl">
            <div>
              <p className="text-[14px] font-medium text-gray-800">
                Notifications activées
              </p>
              <p className="text-[12px] text-gray-400 mt-0.5">
                Recevoir automatiquement les sélections clients par Gmail
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={config.enableNotifications}
              onClick={() =>
                setConfig((prev) => ({
                  ...prev,
                  enableNotifications: !prev.enableNotifications,
                }))
              }
              className={`
                w-9 h-5 rounded-full transition-colors duration-150 cursor-pointer relative flex-shrink-0 ml-4
                ${config.enableNotifications ? "bg-orange-500" : "bg-gray-200"}
              `}
            >
              <span
                className={`
                  absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform duration-150
                  ${config.enableNotifications ? "translate-x-4" : "translate-x-0.5"}
                `}
              />
            </button>
          </div>

          {config.enableNotifications && (
            <>
              {/* Email field */}
              <div>
                <label
                  htmlFor="photographer-email"
                  className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  <Mail className="h-3 w-3" />
                  Email du photographe *
                </label>
                <input
                  id="photographer-email"
                  type="email"
                  placeholder="photographe@gmail.com"
                  value={config.photographerEmail}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      photographerEmail: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
                />
                <p className="text-[12px] text-gray-400 mt-1">
                  L'email Gmail qui recevra les notifications
                </p>
              </div>

              {/* Name field */}
              <div>
                <label
                  htmlFor="photographer-name"
                  className="flex items-center gap-1.5 text-[13px] font-medium text-gray-700 mb-1.5"
                >
                  <User className="h-3 w-3" />
                  Nom du photographe
                </label>
                <input
                  id="photographer-name"
                  type="text"
                  placeholder="Votre nom"
                  value={config.photographerName || ""}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      photographerName: e.target.value,
                    }))
                  }
                  className="w-full h-10 px-3.5 rounded-lg border border-gray-200 text-[14px] text-gray-900 placeholder:text-gray-300 outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100 transition-colors"
                />
              </div>

              {/* Configuration status */}
              <div className="flex items-start gap-2.5 py-3 px-4 bg-gray-50 rounded-xl">
                {isConfigValid ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                ) : (
                  <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
                )}
                <div>
                  <p
                    className={`text-[13px] font-medium ${isConfigValid ? "text-emerald-600" : "text-amber-600"}`}
                  >
                    {isConfigValid
                      ? "Configuration valide"
                      : "Configuration incomplète"}
                  </p>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {isConfigValid
                      ? "Les notifications email automatiques via Gmail sont prêtes."
                      : "Veuillez remplir l'email du photographe."}
                  </p>
                </div>
              </div>

              {/* Gmail setup instructions */}
              <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Lock className="h-3.5 w-3.5 text-blue-600" />
                  <h3 className="text-[12px] font-semibold text-blue-800">
                    Configuration Gmail requise
                  </h3>
                </div>
                <div className="text-[12px] text-blue-700 space-y-1">
                  <p>
                    <strong>1.</strong> Activez la validation en 2 étapes sur
                    votre compte Google
                  </p>
                  <p>
                    <strong>2.</strong> Générez un mot de passe d'application
                    Gmail
                  </p>
                  <p>
                    <strong>3.</strong> Ajoutez ces variables d'environnement
                    sur Vercel :
                  </p>
                  <div className="bg-blue-100/70 px-3 py-2 rounded-md mt-2 font-mono text-[11px] text-blue-800 leading-relaxed">
                    GMAIL_USER=votre@gmail.com
                    <br />
                    GMAIL_APP_PASSWORD=xxxx-xxxx-xxxx-xxxx
                  </div>
                </div>
              </div>

              {/* Valid config summary */}
              {isConfigValid && (
                <div className="bg-emerald-50 border border-emerald-100 rounded-lg p-4">
                  <div className="flex items-center gap-1.5 mb-2">
                    <CheckCircle className="h-3.5 w-3.5 text-emerald-600" />
                    <h3 className="text-[12px] font-semibold text-emerald-800">
                      Configuration Gmail prête
                    </h3>
                  </div>
                  <div className="text-[12px] text-emerald-700 space-y-0.5">
                    <p>
                      <strong>Destinataire :</strong>{" "}
                      {config.photographerEmail}
                    </p>
                    <p>
                      <strong>Nom :</strong>{" "}
                      {config.photographerName || "Photographe"}
                    </p>
                  </div>
                  <p className="text-[11px] text-emerald-500 mt-2">
                    Utilisez le bouton "Tester" pour vérifier l'envoi
                    automatique.
                  </p>
                </div>
              )}
            </>
          )}

          {/* Errors */}
          {errors.length > 0 && (
            <div className="flex items-start gap-2">
              <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
              <ul className="space-y-0.5">
                {errors.map((error, index) => (
                  <li key={index} className="text-[13px] text-red-500">
                    {error}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* How it works */}
          <div className="bg-blue-50/80 border border-blue-100 rounded-lg p-4 flex items-start gap-2">
            <Info className="h-3.5 w-3.5 text-blue-600 flex-shrink-0 mt-0.5" />
            <p className="text-[12px] text-blue-700 leading-relaxed">
              <strong>Comment ca marche :</strong> Quand un client soumet sa
              selection, un email est automatiquement envoye via Gmail SMTP
              avec tous les details et le lien de telechargement. Aucune action
              manuelle requise.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-1">
            {config.enableNotifications && isConfigValid && (
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={isTesting}
                className="flex-1 h-10 rounded-lg border border-gray-200 text-[14px] text-gray-600 hover:bg-gray-50 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isTesting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <TestTube className="h-4 w-4" />
                )}
                {isTesting ? "Test en cours..." : "Tester Gmail"}
              </button>
            )}
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving}
              className={`
                flex-1 h-10 rounded-lg text-[14px] font-medium flex items-center justify-center gap-2
                transition-all duration-150 cursor-pointer
                ${
                  isSaving
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
                }
              `}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              {isSaving ? "Sauvegarde..." : "Sauvegarder"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
