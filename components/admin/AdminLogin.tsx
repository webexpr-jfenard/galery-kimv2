import React, { useState } from "react";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";
import { authService } from "../../services/authService";

interface AdminLoginProps {
  onAuthenticate: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
}

type Mode = "login" | "forgot" | "recovery";

const inputClass = (hasError: boolean) => `
  w-full h-11 px-4 rounded-lg border text-[14px] text-gray-900
  placeholder:text-gray-300 outline-none transition-colors duration-150
  ${hasError
    ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
    : "border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"}
`;

const buttonClass = (disabled: boolean) => `
  w-full h-11 mt-4 rounded-lg font-medium text-[14px] flex items-center justify-center gap-2
  transition-all duration-150 cursor-pointer
  ${disabled ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"}
`;

export function AdminLogin({ onAuthenticate }: AdminLoginProps) {
  const [mode, setMode] = useState<Mode>(authService.isPasswordRecoveryPending() ? "recovery" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const canSubmit = mode === "forgot"
    ? email.trim().length > 3
    : mode === "recovery"
      ? password.length >= 8
      : email.trim().length > 3 && password.length > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || isLoading) return;
    setIsLoading(true);
    setError("");
    setNotice("");
    try {
      if (mode === "login") {
        const result = await onAuthenticate(email, password);
        if (!result.ok) {
          setError(result.error || "Connexion impossible");
          setPassword("");
        }
      } else if (mode === "forgot") {
        const result = await authService.resetPassword(email);
        if (result.ok) {
          setNotice("Si cette adresse est connue, un e-mail de réinitialisation vient de partir.");
        } else {
          setError(result.error || "Envoi impossible");
        }
      } else {
        const result = await authService.updatePassword(password);
        if (result.ok) {
          setNotice("Mot de passe enregistré. Vous pouvez vous connecter.");
          setPassword("");
          setMode("login");
        } else {
          setError(result.error || "Enregistrement impossible");
        }
      }
    } finally {
      setIsLoading(false);
    }
  };

  const titles: Record<Mode, { title: string; hint: string; cta: string }> = {
    login: { title: "Gallery Admin", hint: "Connectez-vous pour continuer", cta: "Connexion" },
    forgot: { title: "Mot de passe oublié", hint: "Indiquez votre adresse e-mail", cta: "Envoyer le lien" },
    recovery: { title: "Nouveau mot de passe", hint: "Choisissez un mot de passe d'au moins 8 caractères", cta: "Enregistrer" },
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-['DM_Sans',sans-serif] px-4">
      <div className="w-full max-w-[380px]">
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">{titles[mode].title}</h1>
          <p className="text-[14px] text-gray-400 mt-1.5">{titles[mode].hint}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm space-y-4">
            {mode !== "recovery" && (
              <div>
                <label htmlFor="admin-email" className="block text-[13px] font-medium text-gray-700 mb-2">
                  Adresse e-mail
                </label>
                <input
                  id="admin-email"
                  type="email"
                  autoComplete="username"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setError(""); }}
                  placeholder="vous@exemple.fr"
                  autoFocus
                  className={inputClass(!!error)}
                />
              </div>
            )}

            {mode !== "forgot" && (
              <div>
                <label htmlFor="admin-password" className="block text-[13px] font-medium text-gray-700 mb-2">
                  {mode === "recovery" ? "Nouveau mot de passe" : "Mot de passe"}
                </label>
                <div className="relative">
                  <input
                    id="admin-password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={mode === "recovery" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(""); }}
                    placeholder="••••••••"
                    autoFocus={mode === "recovery"}
                    className={inputClass(!!error) + " pr-10"}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                    tabIndex={-1}
                    aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}

            {error && <p className="text-[13px] text-red-500">{error}</p>}
            {notice && <p className="text-[13px] text-emerald-600">{notice}</p>}

            <button type="submit" disabled={isLoading || !canSubmit} className={buttonClass(isLoading || !canSubmit)}>
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {titles[mode].cta}
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>

            {mode === "login" && (
              <button
                type="button"
                onClick={() => { setMode("forgot"); setError(""); setNotice(""); }}
                className="w-full text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                Mot de passe oublié ?
              </button>
            )}
            {mode === "forgot" && (
              <button
                type="button"
                onClick={() => { setMode("login"); setError(""); setNotice(""); }}
                className="w-full text-[13px] text-gray-400 hover:text-gray-700 transition-colors"
              >
                Retour à la connexion
              </button>
            )}
          </div>
        </form>

        <div className="mt-8 text-center">
          <p className="text-[12px] text-gray-300">Gestion de galeries · Upload · Statistiques · Configuration</p>
        </div>
      </div>
    </div>
  );
}
