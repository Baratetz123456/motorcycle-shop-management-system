"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isRouteAllowed, UserRole } from "@/lib/permissions";
import { apiClient } from "@/lib/api-client";
import { canNavigate } from "@/lib/navigation-throttle";
import { 
  ShoppingBag, 
  Package, 
  Wrench, 
  BarChart3, 
  LogOut, 
  User, 
  Bike, 
  Receipt, 
  History, 
  DollarSign, 
  FileSpreadsheet, 
  Settings,
  X
} from "lucide-react";
import { getSystemSettings } from "@/lib/settings";

import { UserAvatar } from "@/lib/avatars";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  group: string;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/reports", icon: BarChart3, group: "DASHBOARD" },
  { label: "Showroom Counter", href: "/pos", icon: ShoppingBag, group: "SHOWROOM" },
  { label: "Job Cards", href: "/repairs/board", icon: Wrench, group: "WORKSHOP" },
  { label: "Parts & Stock", href: "/inventory", icon: Package, group: "PARTS" },
  { label: "Customer Records", href: "/repairs/history", icon: History, group: "CUSTOMERS" },
  { label: "Bike Registry", href: "/motorcycles", icon: Bike, group: "CUSTOMERS" },
  { label: "Invoices & Receipts", href: "/sales", icon: Receipt, group: "BACK OFFICE" },
  { label: "Shop Reports", href: "/reports/extract", icon: FileSpreadsheet, group: "BACK OFFICE" },
  { label: "Payroll", href: "/payroll", icon: DollarSign, group: "BACK OFFICE" },
  { label: "Shop Settings", href: "/settings", icon: Settings, group: "BACK OFFICE" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [userAvatar, setUserAvatar] = useState<string>("avatar-1");
  const [appName, setAppName] = useState<string>("Versiklo");
  const [shopDescription, setShopDescription] = useState<string>("Shop Floor");
  const [permissionsVersion, setPermissionsVersion] = useState<number>(0);
  const [isCollapsed, setIsCollapsed] = useState(false);

  const syncStateFromStorage = useCallback(() => {
    const userRole = localStorage.getItem("user_role") as UserRole;
    const userEmail = localStorage.getItem("user_email") || "user@motoshop.com";
    const storedName = localStorage.getItem("user_name");
    const storedAvatar = localStorage.getItem("user_avatar");
    const collapsedState = localStorage.getItem("sidebar_collapsed") === "true";
    
    if (userRole) {
      setRole(userRole);
    }
    setUserName(storedName || userEmail.split("@")[0]);
    if (storedAvatar) setUserAvatar(storedAvatar);
    setIsCollapsed(collapsedState);

    const sysSettings = getSystemSettings();
    setAppName(sysSettings.appName);
    if (sysSettings.shopDescription) setShopDescription(sysSettings.shopDescription);
  }, []);

  // Sync on mount and on every pathname navigation
  useEffect(() => {
    syncStateFromStorage();
  }, [pathname, syncStateFromStorage]);

  // Global listeners for storage and custom broadcast events
  useEffect(() => {
    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.appName) {
        setAppName(e.detail.appName);
      }
      if (e.detail?.shopDescription) {
        setShopDescription(e.detail.shopDescription);
      }
    };

    const handlePermissionsUpdated = () => {
      setPermissionsVersion((v) => v + 1);
    };

    const handleStorageChange = () => {
      syncStateFromStorage();
      setPermissionsVersion((v) => v + 1);
    };

    const handleSidebarChange = (e: any) => {
      if (typeof e.detail?.isCollapsed === "boolean") {
        setIsCollapsed(e.detail.isCollapsed);
      } else {
        setIsCollapsed(localStorage.getItem("sidebar_collapsed") === "true");
      }
    };

    const handleUserProfileUpdated = (e: any) => {
      if (e.detail?.userName) {
        setUserName(e.detail.userName);
      }
      if (e.detail?.avatarId) {
        setUserAvatar(e.detail.avatarId);
      }
      syncStateFromStorage();
    };

    window.addEventListener("system_settings_updated", handleSettingsUpdated);
    window.addEventListener("permissions_updated", handlePermissionsUpdated);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleStorageChange);
    window.addEventListener("sidebar_state_changed", handleSidebarChange);
    window.addEventListener("user_profile_updated", handleUserProfileUpdated);

    return () => {
      window.removeEventListener("system_settings_updated", handleSettingsUpdated);
      window.removeEventListener("permissions_updated", handlePermissionsUpdated);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
      window.removeEventListener("sidebar_state_changed", handleSidebarChange);
      window.removeEventListener("user_profile_updated", handleUserProfileUpdated);
    };
  }, [syncStateFromStorage]);

  const closeSidebar = () => {
    setIsCollapsed(true);
    localStorage.setItem("sidebar_collapsed", "true");
    window.dispatchEvent(new CustomEvent("sidebar_state_changed", { detail: { isCollapsed: true } }));
  };

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // Ignore logout API errors
    } finally {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_name");
      router.push("/login");
    }
  };

  const allowedNavItems = useMemo(() => {
    if (!role) return [];
    return ALL_NAV_ITEMS.filter((item) => isRouteAllowed(item.href, role));
  }, [role, permissionsVersion]);

  if (!role) return null;

  const roleColors: Record<UserRole, string> = {
    admin: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    manager: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    cashier: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    mechanic: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };

  return (
    <>
      {/* Dimmed Backdrop when Sidebar is Open as Overlay */}
      {!isCollapsed && (
        <div
          onClick={closeSidebar}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300 animate-in fade-in"
          aria-hidden="true"
        />
      )}

      {/* Sliding Sidebar Drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950 border-r border-white/10 flex flex-col justify-between h-screen font-sans shadow-2xl transition-transform duration-300 ease-in-out ${
          isCollapsed ? "-translate-x-full pointer-events-none" : "translate-x-0"
        }`}
      >
        <div>
          {/* Brand Header & Close Button */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <Bike className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div className="truncate">
                <h1 className="font-bold text-sm text-zinc-100 tracking-wide">{appName}</h1>
                <p className="text-[10px] text-zinc-400">{shopDescription}</p>
              </div>
            </div>

            {/* Close Drawer Button */}
            <button
              onClick={closeSidebar}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
              title="Close menu"
              aria-label="Close menu"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Dynamic Nav Items */}
          <nav className="p-3 space-y-1 overflow-y-auto max-h-[calc(100vh-140px)]">
            {allowedNavItems.map((item, idx) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
              const prevItem = allowedNavItems[idx - 1];
              const showGroupHeader = !prevItem || prevItem.group !== item.group;

              return (
                <div key={item.href} className="space-y-1">
                  {showGroupHeader && (
                    <div className="pt-2 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-zinc-400">
                      {item.group}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    onClick={(e) => {
                      if (!canNavigate(item.href, pathname)) {
                        e.preventDefault();
                        return;
                      }
                      closeSidebar();
                    }}
                    className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5"
                        : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                    <span className="truncate">{item.label}</span>
                  </Link>
                </div>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Footer Controls */}
        <div className="p-3 border-t border-white/10 space-y-3">
          <div className="flex items-center gap-3 px-1">
            <UserAvatar avatarId={userAvatar} className="w-8 h-8" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-zinc-100 truncate">{userName}</p>
              <span
                className={`inline-block px-2 py-0.5 text-[10px] font-semibold border rounded-md uppercase tracking-wider ${
                  roleColors[role] || "bg-zinc-800 text-zinc-300"
                }`}
              >
                {role}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition-all shadow-sm"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
