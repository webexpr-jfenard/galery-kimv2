import React, { useState } from "react";
import { Shield, Eye, EyeOff, ArrowRight } from "lucide-react";

interface AdminLoginProps {
  onAuthenticate: (password: string) => Promise<boolean>;
}

export function AdminLogin({ onAuthenticate }: AdminLoginProps) {
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) return;

    setIsLoading(true);
    setError("");

    const isValid = await onAuthenticate(password);
    if (!isValid) {
      setError("Mot de passe incorrect");
      setPassword("");
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex items-center justify-center font-['DM_Sans',sans-serif] px-4">
      <div className="w-full max-w-[380px]">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mx-auto mb-5 shadow-lg shadow-orange-500/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">
            Gallery Admin
          </h1>
          <p className="text-[14px] text-gray-400 mt-1.5">
            Entrez votre mot de passe pour continuer
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm">
            <label
              htmlFor="admin-password"
              className="block text-[13px] font-medium text-gray-700 mb-2"
            >
              Mot de passe
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                placeholder="••••••••"
                autoFocus
                className={`
                  w-full h-11 px-4 pr-10 rounded-lg border text-[14px] text-gray-900
                  placeholder:text-gray-300 outline-none transition-colors duration-150
                  ${
                    error
                      ? "border-red-300 focus:border-red-400 focus:ring-2 focus:ring-red-100"
                      : "border-gray-200 focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
                  }
                `}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors cursor-pointer"
                tabIndex={-1}
                aria-label={showPassword ? "Masquer" : "Afficher"}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {error && (
              <p className="text-[13px] text-red-500 mt-2">{error}</p>
            )}

            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className={`
                w-full h-11 mt-4 rounded-lg font-medium text-[14px] flex items-center justify-center gap-2
                transition-all duration-150 cursor-pointer
                ${
                  isLoading || !password.trim()
                    ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                    : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
                }
              `}
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-gray-300 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Connexion
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </button>
          </div>
        </form>

        {/* Features hint */}
        <div className="mt-8 text-center">
          <p className="text-[12px] text-gray-300">
            Gestion de galeries · Upload · Statistiques · Configuration
          </p>
        </div>
      </div>
    </div>
  );
}
