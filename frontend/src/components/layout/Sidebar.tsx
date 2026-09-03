"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { isRouteAllowed, UserRole } from "@/lib/permissions";
import { apiClient } from "@/lib/api-client";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { 
  ShoppingBag, 
  Package, 
  Wrench, 
  BarChart3, 
  ShieldCheck, 
  LogOut, 
  User, 
  Bike,
  Users,
  KeyRound,
  ChevronLeft,
  ChevronRight,
  Receipt,
  History
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard & Reports", href: "/reports", icon: BarChart3 },
  { label: "POS Checkout", href: "/pos", icon: ShoppingBag },
  { label: "Sales Management", href: "/sales", icon: Receipt },
  { label: "Products & Services", href: "/inventory", icon: Package },
  { label: "Motorcycle Profiles", href: "/motorcycles", icon: Bike },
  { label: "Repair Board", href: "/repairs/board", icon: Wrench },
  { label: "Customer Repair History", href: "/repairs/history", icon: History },
  { label: "User Management", href: "/users", icon: Users },
  { label: "Audit Logs", href: "/audit-logs", icon: ShieldCheck },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [role, setRole] = useState<UserRole | null>(null);
  const [email, setEmail] = useState<string>("");
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem("user_role") as UserRole;
    const userEmail = localStorage.getItem("user_email") || "user@motoshop.com";
    const collapsedState = localStorage.getItem("sidebar_collapsed") === "true";
    
    if (userRole) {
      setRole(userRole);
      setEmail(userEmail);
    }
    setIsCollapsed(collapsedState);
  }, []);

  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar_collapsed", String(nextState));
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
      router.push("/login");
    }
  };

  if (!role) return null;

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) => isRouteAllowed(item.href, role));

  const roleColors: Record<UserRole, string> = {
    admin: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30",
    manager: "bg-purple-500/10 text-purple-400 border-purple-500/30",
    cashier: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    mechanic: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  };

  return (
    <>
      <aside
        className={`${
          isCollapsed ? "w-20" : "w-64"
        } bg-zinc-950 border-r border-white/10 flex flex-col justify-between h-screen font-sans shrink-0 transition-all duration-300 relative z-20`}
      >
        <div>
          {/* Brand Header & Toggle */}
          <div className="h-16 border-b border-white/10 flex items-center justify-between px-4">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 flex items-center justify-center shadow-lg shadow-cyan-500/20 shrink-0">
                <div className="w-full h-full bg-zinc-950 rounded-[10px] flex items-center justify-center">
                  <Bike className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              {!isCollapsed && (
                <div className="truncate">
                  <h1 className="font-bold text-sm text-zinc-100 tracking-wide">MotoShop</h1>
                  <p className="text-[10px] text-zinc-400">Enterprise System</p>
                </div>
              )}
            </div>

            {/* Collapse Toggle Button */}
            <button
              onClick={toggleCollapse}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors shrink-0"
              title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Dynamic Nav Items */}
          <nav className="p-3 space-y-1.5">
            {allowedNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  title={isCollapsed ? item.label : undefined}
                  className={`flex items-center ${
                    isCollapsed ? "justify-center px-0 py-3" : "gap-3 px-3.5 py-2.5"
                  } rounded-xl text-sm font-medium transition-all ${
                    isActive
                      ? "bg-gradient-to-r from-cyan-500/20 to-blue-500/10 text-cyan-400 border border-cyan-500/30 shadow-md shadow-cyan-500/5"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900/60"
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? "text-cyan-400" : "text-zinc-400"}`} />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* User Profile & Footer Controls */}
        <div className="p-3 border-t border-white/10 space-y-3">
          <div className={`flex items-center ${isCollapsed ? "justify-center" : "gap-3 px-1"}`}>
            <div className="w-8 h-8 rounded-full bg-zinc-900 border border-white/10 flex items-center justify-center text-zinc-400 shrink-0">
              <User className="w-4 h-4" />
            </div>
            {!isCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-zinc-200 truncate">{email}</p>
                <span
                  className={`inline-block px-2 py-0.5 text-[10px] font-semibold border rounded-md uppercase tracking-wider ${
                    roleColors[role] || "bg-zinc-800 text-zinc-300"
                  }`}
                >
                  {role}
                </span>
              </div>
            )}
          </div>

          <div className={isCollapsed ? "flex flex-col gap-2" : "grid grid-cols-2 gap-2"}>
            <button
              onClick={() => setIsPasswordModalOpen(true)}
              className={`flex items-center justify-center gap-1.5 ${
                isCollapsed ? "p-2" : "px-2.5 py-2"
              } rounded-xl text-[11px] font-medium text-zinc-300 bg-zinc-900 hover:bg-zinc-800 border border-white/10 transition-colors`}
              title="Change Password"
            >
              <KeyRound className="w-3.5 h-3.5 text-cyan-400" />
              {!isCollapsed && <span>Password</span>}
            </button>

            <button
              onClick={handleLogout}
              className={`flex items-center justify-center gap-1.5 ${
                isCollapsed ? "p-2" : "px-2.5 py-2"
              } rounded-xl text-[11px] font-medium text-red-400 hover:bg-red-500/10 border border-red-500/20 transition-colors`}
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
              {!isCollapsed && <span>Sign Out</span>}
            </button>
          </div>
        </div>
      </aside>

      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />
    </>
  );
}
