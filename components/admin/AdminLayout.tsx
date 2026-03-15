import React, { useState } from "react";
import {
  Image,
  Calculator,
  Settings,
  LogOut,
  ChevronLeft,
  Menu,
} from "lucide-react";

interface AdminLayoutProps {
  children: React.ReactNode;
  currentPage: string;
  onNavigate: (page: string) => void;
  onLogout: () => void;
  sessionTimeRemaining?: number;
}

const NAV_ITEMS = [
  { id: "galleries", label: "Galeries", icon: Image },
  { id: "quotes", label: "Devis", icon: Calculator },
  { id: "settings", label: "Réglages", icon: Settings },
];

function formatTimeRemaining(ms: number) {
  const hours = Math.floor(ms / (1000 * 60 * 60));
  const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
  return hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;
}

export function AdminLayout({
  children,
  currentPage,
  onNavigate,
  onLogout,
  sessionTimeRemaining,
}: AdminLayoutProps) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#FAFAFA] flex font-['DM_Sans',sans-serif]">
      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed top-0 left-0 h-full bg-white border-r border-gray-100 z-50
          flex flex-col transition-all duration-200 ease-out
          ${sidebarCollapsed ? "w-[72px]" : "w-[240px]"}
          ${mobileMenuOpen ? "translate-x-0" : "-translate-x-full"}
          lg:translate-x-0 lg:sticky lg:top-0 lg:h-screen lg:shrink-0
        `}
      >
        {/* Logo area */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-50">
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
                <Image className="h-4 w-4 text-white" />
              </div>
              <span className="font-semibold text-[15px] text-gray-900 tracking-tight">
                Gallery Admin
              </span>
            </div>
          )}
          {sidebarCollapsed && (
            <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center mx-auto">
              <Image className="h-4 w-4 text-white" />
            </div>
          )}
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-md hover:bg-gray-50 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            aria-label={sidebarCollapsed ? "Ouvrir le menu" : "Réduire le menu"}
          >
            <ChevronLeft
              className={`h-4 w-4 transition-transform duration-200 ${
                sidebarCollapsed ? "rotate-180" : ""
              }`}
            />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-3 space-y-1">
          {NAV_ITEMS.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onNavigate(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 rounded-lg transition-colors duration-150 cursor-pointer
                  ${sidebarCollapsed ? "justify-center px-2 py-2.5" : "px-3 py-2.5"}
                  ${
                    isActive
                      ? "bg-gray-900 text-white"
                      : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
                  }
                `}
                title={sidebarCollapsed ? item.label : undefined}
              >
                <Icon className="h-[18px] w-[18px] shrink-0" />
                {!sidebarCollapsed && (
                  <span className="text-[14px] font-medium">{item.label}</span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 border-t border-gray-50 space-y-2">
          {!sidebarCollapsed && sessionTimeRemaining != null && (
            <div className="px-3 py-2 text-[11px] text-gray-400">
              Session · {formatTimeRemaining(sessionTimeRemaining)}
            </div>
          )}
          <button
            onClick={onLogout}
            className={`
              w-full flex items-center gap-3 rounded-lg py-2.5 text-gray-400
              hover:bg-red-50 hover:text-red-600 transition-colors duration-150 cursor-pointer
              ${sidebarCollapsed ? "justify-center px-2" : "px-3"}
            `}
            title="Déconnexion"
          >
            <LogOut className="h-[18px] w-[18px] shrink-0" />
            {!sidebarCollapsed && (
              <span className="text-[14px] font-medium">Déconnexion</span>
            )}
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 min-w-0">
        {/* Mobile header */}
        <div className="h-14 flex items-center px-4 border-b border-gray-100 bg-white lg:hidden">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-md hover:bg-gray-50 text-gray-600 cursor-pointer"
            aria-label="Menu"
          >
            <Menu className="h-5 w-5" />
          </button>
          <div className="flex items-center gap-2 ml-3">
            <div className="w-6 h-6 rounded-md bg-orange-500 flex items-center justify-center">
              <Image className="h-3 w-3 text-white" />
            </div>
            <span className="font-semibold text-[14px] text-gray-900">
              Gallery Admin
            </span>
          </div>
        </div>

        <div className="p-6 lg:p-8 max-w-[1200px]">{children}</div>
      </main>
    </div>
  );
}
