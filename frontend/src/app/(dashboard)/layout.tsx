"use client";

import { useEffect, useState, useRef } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { ProtectedRoute } from "@/components/auth/ProtectedRoute";
import { Sidebar } from "@/components/layout/Sidebar";
import { MobileBottomNav } from "@/components/layout/MobileBottomNav";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { ChevronDown, LogOut, User, Lock, Settings } from "lucide-react";
import { getSystemSettings } from "@/lib/settings";
import { UserAvatar } from "@/lib/avatars";
import { tokenStore } from "@/lib/auth-token";
import { apiClient } from "@/lib/api-client";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const [appName, setAppName] = useState("MotoShop Pro");
  const [shopDescription, setShopDescription] = useState("Workshop & POS");
  const [userName, setUserName] = useState("User");
  const [userEmail, setUserEmail] = useState("user@motoshop.com");
  const [userRole, setUserRole] = useState("cashier");
  const [userAvatar, setUserAvatar] = useState("avatar-1");

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  const popoverRef = useRef<HTMLDivElement>(null);
  const profileButtonRef = useRef<HTMLButtonElement>(null);

  // Sync user details and system settings
  useEffect(() => {
    const sys = getSystemSettings();
    if (sys?.appName) setAppName(sys.appName);
    if (sys?.shopDescription) setShopDescription(sys.shopDescription);

    const storedRole = localStorage.getItem("user_role") || "cashier";
    const storedEmail = localStorage.getItem("user_email") || "user@motoshop.com";
    const storedName = localStorage.getItem("user_name") || storedEmail.split("@")[0];
    const storedAvatar = localStorage.getItem("user_avatar") || "avatar-1";

    setUserRole(storedRole);
    setUserEmail(storedEmail);
    setUserName(storedName);
    setUserAvatar(storedAvatar);

    const handleSettingsUpdated = (e: any) => {
      if (e.detail?.appName) setAppName(e.detail.appName);
      if (e.detail?.shopDescription) setShopDescription(e.detail.shopDescription);
    };

    const handleProfileUpdated = (e: any) => {
      if (e.detail?.userName) setUserName(e.detail.userName);
      if (e.detail?.avatarId) setUserAvatar(e.detail.avatarId);
    };

    const handleOpenPasswordModal = () => {
      setIsPasswordModalOpen(true);
    };

    window.addEventListener("system_settings_updated", handleSettingsUpdated);
    window.addEventListener("user_profile_updated", handleProfileUpdated);
    window.addEventListener("open_change_password_modal", handleOpenPasswordModal);

    return () => {
      window.removeEventListener("system_settings_updated", handleSettingsUpdated);
      window.removeEventListener("user_profile_updated", handleProfileUpdated);
      window.removeEventListener("open_change_password_modal", handleOpenPasswordModal);
    };
  }, []);

  // Close popover on outside click or escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        profileButtonRef.current &&
        !profileButtonRef.current.contains(e.target as Node)
      ) {
        setIsProfileOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsProfileOpen(false);
      }
    };

    if (isProfileOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isProfileOpen]);

  // Close popover upon page navigation
  useEffect(() => {
    setIsProfileOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (e) {
      // Ignore logout errors
    } finally {
      tokenStore.clearToken();
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_name");
      router.push("/login");
    }
  };

  return (
    <ProtectedRoute>
      <div className="min-h-screen w-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans relative flex flex-col">
        {/* Full-Width Top Navbar (Dark Canvas with Emerald Accent) */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-zinc-900 border-b border-zinc-800 z-40 px-4 sm:px-6 flex items-center justify-between shadow-xs select-none">
          {/* Left: Branding & Shop Metadata */}
          <Link href="/reports" className="flex items-center gap-3 group">
            <BrandLogo size="md" variant="lime-on-dark" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl text-white tracking-tight leading-none">
                  {appName}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-300 border border-zinc-700">
                  {shopDescription}
                </span>
              </div>
              <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider mt-0.5">
                Precision Workshop OS
              </span>
            </div>
          </Link>

          {/* Right: User Profile Button */}
          <div className="flex items-center gap-2">
            <div className="relative">
              <button
                ref={profileButtonRef}
                type="button"
                onClick={() => setIsProfileOpen((prev) => !prev)}
                className="flex items-center gap-1.5 p-0 bg-transparent border-0 ring-0 outline-none focus:outline-none focus:ring-0 shadow-none text-zinc-100 hover:opacity-85 transition-all active:scale-95 cursor-pointer"
                aria-expanded={isProfileOpen}
                aria-haspopup="true"
                aria-label="User profile and settings menu"
              >
                <UserAvatar avatarId={userAvatar} className="w-8 h-8" />
                <ChevronDown
                  className={`w-3.5 h-3.5 text-zinc-400 transition-transform duration-200 ${
                    isProfileOpen ? "rotate-180" : ""
                  }`}
                />
              </button>

              {/* Profile Popover Card - Ultra-Minimalist Borderless Design with Emerald Accents */}
              {isProfileOpen && (
                <div
                  ref={popoverRef}
                  className="profile-popover absolute right-0 top-full mt-2 w-64 bg-zinc-900 rounded-2xl border-0 shadow-2xl shadow-black/95 p-3.5 space-y-3 z-50 animate-in fade-in zoom-in-95 duration-150"
                >
                  {/* User Identity Header */}
                  <div className="flex items-center gap-3 pb-3 border-b border-zinc-800/70">
                    <UserAvatar avatarId={userAvatar} className="w-10 h-10" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-zinc-100 truncate leading-tight">{userName}</p>
                      <p className="text-[10px] text-zinc-400 truncate font-mono mt-0.5">{userEmail}</p>
                      <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-emerald-500/10 text-[9px] font-mono font-bold text-emerald-400 uppercase tracking-wider">
                        {userRole}
                      </span>
                    </div>
                  </div>

                  {/* Quick Action Navigation */}
                  <div className="space-y-0.5">
                    <Link
                      href="/settings?tab=profile"
                      onClick={() => setIsProfileOpen(false)}
                      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                    >
                      <User className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="group flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Settings className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      <span>{userRole === "admin" || userRole === "manager" ? "Shop Settings" : "Appearance & Settings"}</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setIsProfileOpen(false);
                        setIsPasswordModalOpen(true);
                      }}
                      className="group w-full flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-xs font-medium text-zinc-300 hover:text-emerald-300 hover:bg-emerald-500/10 transition-colors text-left cursor-pointer"
                    >
                      <Lock className="w-3.5 h-3.5 text-zinc-400 group-hover:text-emerald-400 transition-colors" />
                      <span>Change Password</span>
                    </button>
                  </div>

                  {/* Sign Out Button (Minimalist Danger) */}
                  <div className="pt-2 border-t border-zinc-800/70">
                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/30 transition-all cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5 text-rose-400" />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Fixed Desktop Sidebar (Hidden on mobile < md) */}
        <Sidebar />

        {/* Mobile Sticky Bottom Navigation (Icons Only, Hidden on desktop >= md) */}
        <MobileBottomNav />

        {/* Main Content Area (Proper offsets for fixed top navbar and mobile bottom nav) */}
        <main className="flex-1 min-h-screen pt-16 md:pl-64 pb-20 md:pb-0 overflow-y-auto bg-slate-50 dark:bg-zinc-950 flex flex-col min-w-0 w-full max-w-full">
          <div key={pathname} className="flex-1 min-h-0 flex flex-col min-w-0 w-full max-w-full animate-page-enter">
            {children}
          </div>
        </main>

        {/* Change Password Modal */}
        <ChangePasswordModal
          isOpen={isPasswordModalOpen}
          onClose={() => setIsPasswordModalOpen(false)}
        />
      </div>
    </ProtectedRoute>
  );
}
