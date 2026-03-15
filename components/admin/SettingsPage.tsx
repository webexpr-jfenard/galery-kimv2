import React from "react";
import {
  Database,
  Mail,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Cloud,
  HardDrive,
} from "lucide-react";

interface SettingsPageProps {
  connectionStatus: {
    isConnected: boolean;
    isTableReady: boolean;
    localGalleries: number;
    remoteGalleries: number;
  };
  isSyncing: boolean;
  onSync: () => void;
  onRefreshStatus: () => void;
  onOpenEmailConfig: () => void;
}

export function SettingsPage({
  connectionStatus,
  isSyncing,
  onSync,
  onRefreshStatus,
  onOpenEmailConfig,
}: SettingsPageProps) {
  return (
    <div className="space-y-6 max-w-[640px]">
      <div>
        <h2 className="text-[18px] font-semibold text-gray-900 tracking-tight">
          Réglages
        </h2>
        <p className="text-[13px] text-gray-400 mt-0.5">
          Configuration du stockage et des services
        </p>
      </div>

      {/* Supabase section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
              <Database className="h-4 w-4 text-emerald-600" />
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-gray-900">Supabase</h3>
              <p className="text-[12px] text-gray-400">Stockage cloud et base de données</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Status indicators */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50/80">
              {connectionStatus.isConnected ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <div>
                <p className="text-[12px] font-medium text-gray-700">Connexion</p>
                <p className="text-[11px] text-gray-400">
                  {connectionStatus.isConnected ? "Connecté" : "Déconnecté"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50/80">
              {connectionStatus.isTableReady ? (
                <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              ) : (
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
              )}
              <div>
                <p className="text-[12px] font-medium text-gray-700">Base de données</p>
                <p className="text-[11px] text-gray-400">
                  {connectionStatus.isTableReady ? "Prête" : "Configuration requise"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50/80">
              <HardDrive className="h-4 w-4 text-blue-500 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-gray-700">Local</p>
                <p className="text-[11px] text-gray-400">
                  {connectionStatus.localGalleries} galeries
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 p-3 rounded-lg bg-gray-50/80">
              <Cloud className="h-4 w-4 text-emerald-500 shrink-0" />
              <div>
                <p className="text-[12px] font-medium text-gray-700">Cloud</p>
                <p className="text-[11px] text-gray-400">
                  {connectionStatus.remoteGalleries} galeries
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-1">
            <button
              onClick={onSync}
              disabled={isSyncing}
              className={`
                h-9 px-4 rounded-lg text-[13px] font-medium flex items-center gap-2 transition-all cursor-pointer
                ${isSyncing
                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                  : "bg-gray-900 text-white hover:bg-gray-800 active:scale-[0.98]"
                }
              `}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              {isSyncing ? "Synchronisation..." : "Synchroniser"}
            </button>
            <button
              onClick={onRefreshStatus}
              className="h-9 px-3 rounded-lg border border-gray-200 text-[13px] text-gray-600 hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Rafraîchir
            </button>
          </div>
        </div>
      </div>

      {/* Gmail section */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-red-50 flex items-center justify-center">
              <Mail className="h-4 w-4 text-red-500" />
            </div>
            <div>
              <h3 className="text-[14px] font-medium text-gray-900">Gmail</h3>
              <p className="text-[12px] text-gray-400">Configuration de l'envoi d'emails</p>
            </div>
          </div>
        </div>

        <div className="p-5">
          <button
            onClick={onOpenEmailConfig}
            className="h-9 px-4 rounded-lg border border-gray-200 text-[13px] text-gray-600 font-medium hover:bg-gray-50 transition-colors cursor-pointer flex items-center gap-2"
          >
            <Mail className="h-3.5 w-3.5" />
            Configurer Gmail
          </button>
        </div>
      </div>
    </div>
  );
}
