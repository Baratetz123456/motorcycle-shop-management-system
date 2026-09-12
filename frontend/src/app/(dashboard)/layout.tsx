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

    window.addEventListener("system_settings_updated", handleSettingsUpdated);
    window.addEventListener("user_profile_updated", handleProfileUpdated);

    return () => {
      window.removeEventListener("system_settings_updated", handleSettingsUpdated);
      window.removeEventListener("user_profile_updated", handleProfileUpdated);
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
        {/* Full-Width Colored Top Navbar (Kawasaki Racing Lime Green) */}
        <header className="fixed top-0 left-0 right-0 h-16 bg-lime-500 z-40 px-4 sm:px-6 flex items-center justify-between border-b border-lime-600/30 shadow-xs select-none">
          {/* Left: Branding & Shop Metadata */}
          <Link href="/reports" className="flex items-center gap-3 group">
            <BrandLogo size="md" variant="lime-on-dark" />
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg sm:text-xl text-zinc-950 tracking-tight leading-none">
                  {appName}
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full bg-lime-400/50 text-[10px] font-bold text-zinc-950 border border-lime-600/20">
                  {shopDescription}
                </span>
              </div>
              <span className="text-[10px] font-mono text-lime-950 font-bold uppercase tracking-wider mt-0.5">
                Precision Workshop OS
              </span>
            </div>
          </Link>

          {/* Right: User Profile Button with Popover Trigger */}
          <div className="relative">
            <button
              ref={profileButtonRef}
              type="button"
              onClick={() => setIsProfileOpen((prev) => !prev)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-lime-400/40 hover:bg-lime-400/70 text-zinc-950 border border-lime-600/30 transition-all active:scale-95 shadow-xs"
              aria-expanded={isProfileOpen}
              aria-haspopup="true"
              aria-label="User profile and settings menu"
            >
              <UserAvatar avatarId={userAvatar} className="w-8 h-8 rounded-full border border-zinc-950/20 shadow-xs" />
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-xs font-black text-zinc-950 leading-tight truncate max-w-[120px]">
                  {userName}
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-lime-950">
                  {userRole}
                </span>
              </div>
              <ChevronDown
                className={`w-4 h-4 text-zinc-950 transition-transform duration-200 ${
                  isProfileOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {/* Profile Popover Card */}
            {isProfileOpen && (
              <div
                ref={popoverRef}
                className="absolute right-0 top-full mt-2 w-72 bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200 dark:border-zinc-800 shadow-2xl p-4 space-y-4 z-50 animate-in fade-in zoom-in-95 duration-150"
              >
                {/* User Identity Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-slate-100 dark:border-zinc-800">
                  <UserAvatar avatarId={userAvatar} className="w-11 h-11 rounded-full border border-slate-200 dark:border-zinc-700 shadow-xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-slate-900 dark:text-zinc-100 truncate">{userName}</p>
                    <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate font-mono">{userEmail}</p>
                    <span className="inline-block mt-1 px-2 py-0.5 rounded-md bg-lime-50 dark:bg-lime-950/40 border border-lime-200 dark:border-lime-700/50 text-[10px] font-bold text-lime-800 dark:text-lime-400 uppercase tracking-wider">
                      {userRole}
                    </span>
                  </div>
                </div>

                {/* Quick Action Navigation */}
                <div className="space-y-1">
                  <Link
                    href="/settings?tab=profile"
                    onClick={() => setIsProfileOpen(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <User className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                    <span>My Profile</span>
                  </Link>

                  {(userRole === "admin" || userRole === "manager") && (
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                      <span>Shop Settings</span>
                    </Link>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsProfileOpen(false);
                      setIsPasswordModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-zinc-800/60 transition-colors text-left"
                  >
                    <Lock className="w-4 h-4 text-slate-500 dark:text-zinc-400" />
                    <span>Change Password</span>
                  </button>
                </div>

                {/* Sign Out Button (High Contrast) */}
                <div className="pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-all shadow-xs active:scale-95"
                  >
                    <LogOut className="w-4 h-4 text-rose-600" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
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
