"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { Menu, Bike } from "lucide-react";
import { getSystemSettings } from "@/lib/settings";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [appName, setAppName] = useState("Versiklo");
  const [shopDescription, setShopDescription] = useState("Shop Floor");

  useEffect(() => {
    const saved = localStorage.getItem("sidebar_collapsed") === "true";
    setIsCollapsed(saved);

    const sys = getSystemSettings();
    if (sys?.appName) setAppName(sys.appName);
    if (sys?.shopDescription) setShopDescription(sys.shopDescription);

    const handleSidebarChange = (e: any) => {
      if (typeof e.detail?.isCollapsed === "boolean") {
        setIsCollapsed(e.detail.isCollapsed);
      } else {
        setIsCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
      }
    };

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.appName) {
        setAppName(e.detail.appName);
      }
      if (e.detail?.shopDescription) {
        setShopDescription(e.detail.shopDescription);
      }
    };

    window.addEventListener("sidebar_state_changed", handleSidebarChange);
    window.addEventListener("storage", handleSidebarChange);
    window.addEventListener("system_settings_updated", handleSettingsUpdated);

    return () => {
      window.removeEventListener("sidebar_state_changed", handleSidebarChange);
      window.removeEventListener("storage", handleSidebarChange);
      window.removeEventListener("system_settings_updated", handleSettingsUpdated);
    };
  }, []);

  const openSidebar = () => {
    setIsCollapsed(false);
    localStorage.setItem("sidebar_collapsed", "false");
    window.dispatchEvent(new CustomEvent("sidebar_state_changed", { detail: { isCollapsed: false } }));
  };

  return (
    <ProtectedRoute>
      <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden font-sans relative">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 w-full overflow-hidden">
          {/* Dedicated Slim Top Bar when Sidebar is Hidden */}
          {isCollapsed && (
            <header className="h-14 border-b border-white/10 bg-zinc-950/95 backdrop-blur-md flex items-center justify-between px-4 sm:px-6 shrink-0 z-30 shadow-md">
              <div className="flex items-center gap-3">
                <button
                  onClick={openSidebar}
                  className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-white/10 shadow-sm transition-all flex items-center gap-2 group"
                  title="Open navigation menu"
                  aria-label="Open navigation menu"
                >
                  <Menu className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-semibold tracking-wide text-zinc-300 group-hover:text-white">
                    Menu
                  </span>
                </button>

                <div className="flex items-center gap-2 border-l border-white/10 pl-3">
                  <div className="w-6 h-6 rounded-lg bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-sm">
                    <div className="w-full h-full bg-zinc-950 rounded-[6px] flex items-center justify-center">
                      <Bike className="w-3.5 h-3.5 text-cyan-400" />
                    </div>
                  </div>
                  <span className="text-xs font-bold text-zinc-200">{appName}</span>
                  <span className="text-[10px] text-zinc-500 hidden sm:inline">• {shopDescription}</span>
                </div>
              </div>
            </header>
          )}

          <main className="flex-1 overflow-y-auto bg-zinc-950 flex flex-col min-w-0 w-full">
            <div key={pathname} className="flex-1 flex flex-col min-w-0 w-full animate-page-enter">
              {children}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
