"use client";

import { useEffect, useState, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { 
  Settings, 
  ShieldCheck, 
  Globe, 
  Clock, 
  Sliders, 
  User, 
  FileText, 
  Save, 
  RotateCcw, 
  CheckCircle2, 
  ShieldAlert, 
  ArrowRight, 
  Lock, 
  Mail, 
  Sparkles, 
  Building, 
  ExternalLink,
  Users,
  KeyRound,
  Activity,
  Palette,
  Check,
  UserPlus,
  Search,
  ChevronLeft,
  ChevronRight,
  Filter,
  Wrench,
  Sun,
  Moon
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { Skeleton } from "@/components/ui/Skeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { 
  getSystemSettings, 
  saveSystemSettings, 
  TIMEZONE_OPTIONS, 
  COUNTRY_OPTIONS, 
  BOARD_RETENTION_OPTIONS,
  DEFAULT_SETTINGS,
  SystemSettings 
} from "@/lib/settings";
import { 
  CONFIGURABLE_MODULES, 
  UserRole, 
  getEffectiveRoutePermissions, 
  saveCustomPermissions, 
  resetCustomPermissions 
} from "@/lib/permissions";
import { ChangePasswordModal } from "@/components/auth/ChangePasswordModal";
import { 
  THEME_OPTIONS, 
  getAppTheme, 
  saveAppTheme, 
  applyThemeToDocument, 
  AppTheme,
  getAppMode,
  saveAppMode,
  applyModeToDocument,
  AppMode,
  getThemesForMode,
  getDefaultThemeForMode
} from "@/lib/theme";
import { AVATAR_PRESETS, UserAvatar } from "@/lib/avatars";
import { recordUserAuditLog } from "@/lib/audit";

type SettingsTab = "general" | "roles" | "users" | "profile" | "logs";

interface UserProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar?: string | null;
  theme?: string | null;
  display_mode?: string | null;
}

interface RecentAuditItem {
  id: string;
  timestamp: string;
  action: string;
  resource: string;
  user_role: string | null;
  user_name?: string | null;
  user_id: string | null;
}

interface StaffUserItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar?: string | null;
  created_at: string | null;
}

const STAFF_ROLE_OPTIONS = [
  { label: "All Roles", value: "ALL" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Cashier", value: "cashier" },
  { label: "Mechanic", value: "mechanic" },
];

function SettingsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Role State
  const [currentUserRole, setCurrentUserRole] = useState<string>("");
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<SettingsTab>("general");
  const [isReady, setIsReady] = useState(false);

  // Tab 1: General Preferences State (Admin only)
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);

  // Tab 2: Role Accessibility State (Admin only)
  const [modulePermissions, setModulePermissions] = useState<Record<string, UserRole[]>>({});
  const [rolesSuccess, setRolesSuccess] = useState<string | null>(null);

  // Tab 3: Staff & Users State (Admin only)
  const [staffUsers, setStaffUsers] = useState<StaffUserItem[]>([]);
  const [staffTotal, setStaffTotal] = useState(0);
  const [staffPage, setStaffPage] = useState(1);
  const [staffTotalPages, setStaffTotalPages] = useState(1);
  const [staffLoading, setStaffLoading] = useState(false);
  const [staffSearch, setStaffSearch] = useState("");
  const [staffRoleFilter, setStaffRoleFilter] = useState("ALL");
  const [staffError, setStaffError] = useState<string | null>(null);

  // Tab 4: Profile State (All users)
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [profile, setProfile] = useState<UserProfileData>({
    id: "",
    first_name: "",
    last_name: "",
    email: "",
    role: "cashier",
  });
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);

  // Tab 5: System Logs Snapshot State (Admin only)
  const [recentLogs, setRecentLogs] = useState<RecentAuditItem[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  // Theme State (All users)
  const [activeTheme, setActiveTheme] = useState<AppTheme>("cyan");
  const [savedTheme, setSavedTheme] = useState<AppTheme>("cyan");
  const savedThemeRef = useRef<AppTheme>("cyan");
  const [themeSuccess, setThemeSuccess] = useState<string | null>(null);

  // Appearance Mode State (All users: Dark vs Light)
  const [activeMode, setActiveMode] = useState<AppMode>("dark");
  const [savedMode, setSavedMode] = useState<AppMode>("dark");
  const savedModeRef = useRef<AppMode>("dark");

  // Avatar State (All users)
  const [selectedAvatar, setSelectedAvatar] = useState<string>("avatar-1");
  const [savedAvatar, setSavedAvatar] = useState<string>("avatar-1");
  const savedAvatarRef = useRef<string>("avatar-1");

  // Dirty Flags
  const isThemeDirty = activeTheme !== savedTheme;
  const isModeDirty = activeMode !== savedMode;
  const isAvatarDirty = selectedAvatar !== savedAvatar;
  const isGeneralAppearanceDirty = isThemeDirty || isModeDirty;
  const isProfileDirty = isAvatarDirty || isThemeDirty || isModeDirty;

  useEffect(() => {
    savedThemeRef.current = savedTheme;
  }, [savedTheme]);

  useEffect(() => {
    savedModeRef.current = savedMode;
  }, [savedMode]);

  useEffect(() => {
    savedAvatarRef.current = savedAvatar;
  }, [savedAvatar]);

  // Cleanup on unmount: if leaving the settings page with an unsaved theme or mode preview, revert to saved states!
  useEffect(() => {
    return () => {
      applyThemeToDocument(savedThemeRef.current);
      applyModeToDocument(savedModeRef.current);
    };
  }, []);

  useEffect(() => {
    const role = (localStorage.getItem("user_role") || "").toLowerCase();
    const userId = localStorage.getItem("user_id") || "";
    const userEmail = localStorage.getItem("user_email") || "";
    const storedAvatar = localStorage.getItem("user_avatar") || "avatar-1";

    setCurrentUserRole(role);
    setCurrentUserId(userId);
    setSelectedAvatar(storedAvatar);
    setSavedAvatar(storedAvatar);
    savedAvatarRef.current = storedAvatar;

    const adminCheck = role === "admin";
    setIsAdmin(adminCheck);

    // Initialize Theme & Appearance Mode
    const storedTheme = getAppTheme();
    setActiveTheme(storedTheme);
    setSavedTheme(storedTheme);
    savedThemeRef.current = storedTheme;

    const storedMode = getAppMode();
    setActiveMode(storedMode);
    setSavedMode(storedMode);
    savedModeRef.current = storedMode;

    // Check tab from query param
    const tabParam = searchParams.get("tab") as SettingsTab;
    if (adminCheck && tabParam && ["general", "roles", "users", "profile", "logs"].includes(tabParam)) {
      setActiveTab(tabParam);
    } else if (!adminCheck) {
      // Non-admins only have access to their profile tab
      setActiveTab("profile");
    }

    // 1. Load User Profile (for all roles)
    if (userId) {
      loadUserProfile(userId, userEmail, role);
    }

    // 2. Load Admin-specific Configurations if admin
    if (adminCheck) {
      const sysSettings = getSystemSettings();
      setSettings(sysSettings);

      const effective = getEffectiveRoutePermissions();
      const initialModuleMap: Record<string, UserRole[]> = {};
      CONFIGURABLE_MODULES.forEach((mod) => {
        const primaryRoute = mod.routes[0];
        initialModuleMap[mod.id] = effective[primaryRoute] || ["admin"];
      });
      setModulePermissions(initialModuleMap);

      loadAuditOverview();
      fetchStaffUsers(1, "ALL", "");
    }

    setIsReady(true);
  }, [searchParams]);

  // Refetch staff users when search/role filter changes
  useEffect(() => {
    if (isAdmin && activeTab === "users") {
      fetchStaffUsers(1, staffRoleFilter, staffSearch);
      setStaffPage(1);
    }
  }, [staffRoleFilter, staffSearch, activeTab, isAdmin]);

  // Sync activeTheme if updated globally or via broadcast
  useEffect(() => {
    const handleThemeSync = (e: any) => {
      if (e.detail?.theme) {
        setActiveTheme(e.detail.theme);
        setSavedTheme(e.detail.theme);
        savedThemeRef.current = e.detail.theme;
      }
    };
    window.addEventListener("theme_updated", handleThemeSync);
    return () => window.removeEventListener("theme_updated", handleThemeSync);
  }, []);

  const loadUserProfile = async (id: string, fallbackEmail: string, currentRole: string) => {
    try {
      const res = await apiClient.get<UserProfileData>(`/auth/users/${id}`);
      if (res.data) {
        setProfile({
          id: res.data.id || id,
          first_name: res.data.first_name || "",
          last_name: res.data.last_name || "",
          email: res.data.email || fallbackEmail,
          role: res.data.role || currentRole,
          avatar: res.data.avatar || "avatar-1",
          theme: res.data.theme || null,
          display_mode: res.data.display_mode || null,
        });
        const activeAvatar = res.data.avatar || localStorage.getItem("user_avatar") || "avatar-1";
        setSelectedAvatar(activeAvatar);
        setSavedAvatar(activeAvatar);
        savedAvatarRef.current = activeAvatar;
        localStorage.setItem("user_avatar", activeAvatar);

        if (res.data.theme) {
          setActiveTheme(res.data.theme as AppTheme);
          setSavedTheme(res.data.theme as AppTheme);
          savedThemeRef.current = res.data.theme as AppTheme;
          saveAppTheme(res.data.theme as AppTheme, id);
        }
        if (res.data.display_mode) {
          setActiveMode(res.data.display_mode as AppMode);
          setSavedMode(res.data.display_mode as AppMode);
          savedModeRef.current = res.data.display_mode as AppMode;
          saveAppMode(res.data.display_mode as AppMode, id);
        }
      }
    } catch (e) {
      setProfile({
        id,
        first_name: "Staff",
        last_name: "Member",
        email: fallbackEmail,
        role: currentRole,
      });
    }
  };

  const loadAuditOverview = async () => {
    setIsLoadingLogs(true);
    try {
      const res = await apiClient.get<any>("/audit-logs?page=1&page_size=5&mutations_only=true");
      if (res.data) {
        setRecentLogs(res.data.items || []);
        setTotalLogsCount(res.data.total || 0);
      }
    } catch (e) {
      console.warn("Failed to load audit overview", e);
    } finally {
      setIsLoadingLogs(false);
    }
  };

  const fetchStaffUsers = async (page = staffPage, roleFilter = staffRoleFilter, search = staffSearch) => {
    setStaffLoading(true);
    setStaffError(null);
    try {
      const params: any = { page, page_size: 10, search };
      if (roleFilter && roleFilter !== "ALL") {
        params.role = roleFilter;
      }
      const response = await apiClient.get("/auth/users", { params });
      setStaffUsers(response.data.items || []);
      setStaffTotal(response.data.total || 0);
      setStaffTotalPages(response.data.total_pages || 1);
    } catch (err: any) {
      console.error("Failed to fetch staff users:", err);
      setStaffError("Failed to load staff user accounts.");
    } finally {
      setStaffLoading(false);
    }
  };

  const handleStaffPageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= staffTotalPages) {
      setStaffPage(newPage);
      fetchStaffUsers(newPage, staffRoleFilter, staffSearch);
    }
  };

  // Switch settings tab and revert unsaved changes if discarding
  const handleTabChange = (newTab: SettingsTab) => {
    if (activeTab === newTab) return;

    // Revert temporary unsaved theme preview back to saved state
    if (activeTheme !== savedThemeRef.current) {
      setActiveTheme(savedThemeRef.current);
      applyThemeToDocument(savedThemeRef.current);
    }

    // Revert temporary unsaved mode preview back to saved state
    if (activeMode !== savedModeRef.current) {
      setActiveMode(savedModeRef.current);
      applyModeToDocument(savedModeRef.current);
    }

    // Revert temporary unsaved avatar preview back to saved state
    if (selectedAvatar !== savedAvatarRef.current) {
      setSelectedAvatar(savedAvatarRef.current);
    }

    setActiveTab(newTab);
    if (newTab === "users") {
      fetchStaffUsers(1, staffRoleFilter, staffSearch);
    }
  };

  // --- Theme Selection Handler (Temporary in-page preview until Save is clicked) ---
  const handleSelectTheme = (themeId: AppTheme) => {
    setActiveTheme(themeId);
    applyThemeToDocument(themeId); // Temporary DOM preview
  };

  // --- Appearance Mode Selection Handler (Temporary in-page preview until Save is clicked) ---
  const handleSelectMode = (mode: AppMode) => {
    setActiveMode(mode);
    applyModeToDocument(mode); // Temporary DOM preview

    // If current theme is not in the newly selected mode's palette, select default for that mode
    const availableThemes = getThemesForMode(mode);
    const isThemeValid = availableThemes.some((t) => t.id === activeTheme);
    if (!isThemeValid) {
      const fallbackTheme = getDefaultThemeForMode(mode);
      setActiveTheme(fallbackTheme);
      applyThemeToDocument(fallbackTheme);
    }
  };

  // --- Avatar Selection Handler (In-page preview until Save is clicked) ---
  const handleSelectAvatar = (avatarId: string) => {
    setSelectedAvatar(avatarId);
  };

  // --- Handlers: Tab 1 General Preferences ---
  const handleCountryChange = (countryName: string) => {
    const found = COUNTRY_OPTIONS.find((c) => c.country === countryName);
    if (found) {
      setSettings((prev) => ({
        ...prev,
        country: found.country,
        currency: found.currency,
        currencySymbol: found.symbol,
      }));
    } else {
      setSettings((prev) => ({
        ...prev,
        country: countryName,
      }));
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) return;
    saveSystemSettings(settings);

    recordUserAuditLog("SETTINGS_UPDATED", "/settings", {
      appName: settings.appName,
      shopDescription: settings.shopDescription,
      currency: settings.currency,
      timezone: settings.timezone,
      boardPendingTitle: settings.boardPendingTitle,
      boardOngoingTitle: settings.boardOngoingTitle,
      boardCompletedTitle: settings.boardCompletedTitle,
      boardReleasedTitle: settings.boardReleasedTitle,
      boardRetentionDays: settings.boardRetentionDays,
    });

    setGeneralSuccess("Store preferences, currency, and workshop boards updated successfully.");
    setTimeout(() => setGeneralSuccess(null), 4000);
  };

  const handleResetGeneral = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSystemSettings(DEFAULT_SETTINGS);

    recordUserAuditLog("SETTINGS_RESTORED_DEFAULTS", "/settings", {
      reason: "Restored factory defaults",
    });

    setGeneralSuccess("Preferences restored to factory defaults.");
    setTimeout(() => setGeneralSuccess(null), 4000);
  };

  const handleResetBoardDefaults = () => {
    setSettings((prev) => ({
      ...prev,
      boardPendingTitle: "New",
      boardOngoingTitle: "In Progress",
      boardCompletedTitle: "Completed",
      boardReleasedTitle: "Invoiced",
      boardRetentionDays: "7",
    }));
    setGeneralSuccess("Board stage names and retention reset to defaults (click Save Store Settings to apply).");
    setTimeout(() => setGeneralSuccess(null), 4000);
  };

  // --- Handlers: Tab 2 Role Accessibility ---
  const handleToggleModuleRole = (moduleId: string, targetRole: "manager" | "cashier" | "mechanic") => {
    setModulePermissions((prev) => {
      const currentRoles = prev[moduleId] || ["admin"];
      const hasRole = currentRoles.includes(targetRole);
      const newRoles = hasRole
        ? currentRoles.filter((r) => r !== targetRole)
        : [...currentRoles, targetRole];

      if (!newRoles.includes("admin")) {
        newRoles.push("admin");
      }

      return {
        ...prev,
        [moduleId]: newRoles,
      };
    });
  };

  const handleSaveRoles = () => {
    const updatedRoutes: Record<string, UserRole[]> = {};
    CONFIGURABLE_MODULES.forEach((mod) => {
      const rolesForMod = modulePermissions[mod.id] || ["admin"];
      mod.routes.forEach((route) => {
        updatedRoutes[route] = rolesForMod;
      });
    });

    saveCustomPermissions(updatedRoutes);

    recordUserAuditLog("ROLE_PERMISSIONS_UPDATED", "/settings", {
      moduleCount: CONFIGURABLE_MODULES.length,
      updatedRoutes,
    });

    setRolesSuccess("Role accessibility matrix saved. Updated navigation permissions are now active across all store sessions.");
    setTimeout(() => setRolesSuccess(null), 4000);
  };

  const handleResetRoles = () => {
    resetCustomPermissions();
    const effective = getEffectiveRoutePermissions();
    const resetModuleMap: Record<string, UserRole[]> = {};
    CONFIGURABLE_MODULES.forEach((mod) => {
      const primaryRoute = mod.routes[0];
      resetModuleMap[mod.id] = effective[primaryRoute] || ["admin"];
    });
    setModulePermissions(resetModuleMap);

    recordUserAuditLog("ROLE_PERMISSIONS_RESET", "/settings", {
      reason: "Standard default assignments restored",
    });

    setRolesSuccess("Role accessibility restored to standard default assignments.");
    setTimeout(() => setRolesSuccess(null), 4000);
  };

  // --- Handlers: Profile Update ---
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUserId) return;

    setIsUpdatingProfile(true);
    setProfileSuccess(null);
    setProfileError(null);

    try {
      const res = await apiClient.put(`/auth/users/${currentUserId}`, {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        role: profile.role,
        avatar: selectedAvatar,
        theme: activeTheme,
        display_mode: activeMode,
      });

      if (res.data) {
        setProfile({
          id: res.data.id || currentUserId,
          first_name: res.data.first_name || profile.first_name,
          last_name: res.data.last_name || profile.last_name,
          email: res.data.email || profile.email,
          role: res.data.role || profile.role,
          avatar: res.data.avatar || selectedAvatar,
          theme: res.data.theme || activeTheme,
          display_mode: res.data.display_mode || activeMode,
        });
        localStorage.setItem("user_email", res.data.email || profile.email);
        const updatedName = [res.data.first_name || profile.first_name, res.data.last_name || profile.last_name].filter(Boolean).join(" ");
        if (updatedName) {
          localStorage.setItem("user_name", updatedName);
          window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: { userName: updatedName } }));
        }
      }

      // Commit Avatar selection to localStorage and broadcast to sidebar
      localStorage.setItem("user_avatar", selectedAvatar);
      window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: { avatarId: selectedAvatar } }));
      setSavedAvatar(selectedAvatar);
      savedAvatarRef.current = selectedAvatar;

      // Commit Theme & Appearance Mode to User-Scoped Storage
      if (activeTheme !== savedTheme) {
        saveAppTheme(activeTheme, currentUserId);
        setSavedTheme(activeTheme);
        savedThemeRef.current = activeTheme;
      }

      if (activeMode !== savedMode) {
        saveAppMode(activeMode, currentUserId);
        setSavedMode(activeMode);
        savedModeRef.current = activeMode;
      }

      setProfileSuccess("Your personal profile, avatar, and appearance preferences have been saved successfully.");
      setTimeout(() => setProfileSuccess(null), 4000);
    } catch (err: any) {
      console.error("Failed to update profile", err);
      const detail = err.response?.data?.detail;
      setProfileError(typeof detail === "string" ? detail : "Failed to update profile details.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const getRoleBadgeStyle = (r: string) => {
    switch ((r || "").toLowerCase()) {
      case "admin": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "manager": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "cashier": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "mechanic": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  // Reusable Appearance Mode Selector (Dark vs Light)
  const renderModeSelector = () => (
    <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            {activeMode === "dark" ? (
              <Moon className="w-4 h-4 text-cyan-400" />
            ) : (
              <Sun className="w-4 h-4 text-amber-400" />
            )}
            Display Appearance Mode
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Switch between deep high-contrast dark mode and crisp modern light slate canvas.
          </p>
        </div>
        {isModeDirty ? (
          <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-medium animate-in fade-in flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            Unsaved Mode Preview (Click Save to apply)
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
        {/* Dark Mode Card */}
        <button
          type="button"
          onClick={() => handleSelectMode("dark")}
          className={clsx(
            "p-5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-32",
            activeMode === "dark"
              ? isModeDirty
                ? "bg-zinc-900 border-amber-500/50 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40"
                : "bg-zinc-900 border-white/30 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/40"
              : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/70"
          )}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-zinc-950 border border-white/10 flex items-center justify-center text-cyan-400 shadow-md">
                <Moon className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  Dark Mode
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Deep charcoal canvas with vibrant neon contrast
                </div>
              </div>
            </div>
            {activeMode === "dark" && (
              <div className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-md",
                isModeDirty ? "bg-amber-400 text-zinc-950" : "bg-cyan-500 text-zinc-950"
              )}>
                {isModeDirty ? (
                  <Sparkles className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <Check className="w-3 h-3 stroke-[3]" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-zinc-950 border border-zinc-700 inline-block" />
              <span className="w-3 h-3 rounded-full bg-zinc-900 border border-zinc-700 inline-block" />
              <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
              <span className="text-[11px] text-zinc-400 ml-1 font-mono">Zinc 950 Base</span>
            </div>
            {savedMode === "dark" && (
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Active Default
              </span>
            )}
          </div>
        </button>

        {/* Light Mode Card */}
        <button
          type="button"
          onClick={() => handleSelectMode("light")}
          className={clsx(
            "p-5 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-32",
            activeMode === "light"
              ? isModeDirty
                ? "bg-zinc-900 border-amber-500/50 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40"
                : "bg-zinc-900 border-white/30 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/40"
              : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/70"
          )}
        >
          <div className="flex items-start justify-between w-full">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
                <Sun className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm text-white flex items-center gap-1.5">
                  Light Mode
                </div>
                <div className="text-[11px] text-zinc-400 mt-0.5">
                  Crisp white canvas with high-contrast slate text
                </div>
              </div>
            </div>
            {activeMode === "light" && (
              <div className={clsx(
                "w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-md",
                isModeDirty ? "bg-amber-400 text-zinc-950" : "bg-cyan-500 text-zinc-950"
              )}>
                {isModeDirty ? (
                  <Sparkles className="w-3 h-3 stroke-[2.5]" />
                ) : (
                  <Check className="w-3 h-3 stroke-[3]" />
                )}
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-white border border-zinc-300 inline-block" />
              <span className="w-3 h-3 rounded-full bg-zinc-200 border border-zinc-300 inline-block" />
              <span className="w-3 h-3 rounded-full bg-cyan-500 inline-block" />
              <span className="text-[11px] text-zinc-400 ml-1 font-mono">Clean Slate Base</span>
            </div>
            {savedMode === "light" && (
              <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                Active Default
              </span>
            )}
          </div>
        </button>
      </div>
    </div>
  );

  // Reusable Theme Preference Selector
  const renderThemeSelector = () => {
    const currentThemes = getThemesForMode(activeMode);

    return (
      <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-400" />
              App Theme & Visual Identity ({activeMode === "light" ? "Daylight Themes" : "Neon Dark Themes"})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              {activeMode === "light"
                ? "Choose from 4 high-contrast daylight palettes tailored for crisp daytime clarity."
                : "Choose from 4 vibrant electric palettes tailored for deep dark mode aesthetics."}
            </p>
          </div>
          {isThemeDirty ? (
            <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-medium animate-in fade-in flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
              Unsaved Theme Preview (Click Save to apply)
            </span>
          ) : themeSuccess ? (
            <span className="text-xs text-emerald-400 font-medium animate-in fade-in flex items-center gap-1.5 self-start sm:self-auto">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {themeSuccess}
            </span>
          ) : null}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-1">
          {currentThemes.map((theme) => {
            const isSelected = activeTheme === theme.id;
            const isCurrentSaved = savedTheme === theme.id;

            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => handleSelectTheme(theme.id)}
                className={clsx(
                  "p-4 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col justify-between h-32",
                  isSelected
                    ? isThemeDirty
                      ? "bg-zinc-900 border-amber-500/50 shadow-xl shadow-amber-500/10 ring-2 ring-amber-500/40"
                      : "bg-zinc-900 border-white/30 shadow-xl shadow-cyan-500/10 ring-2 ring-cyan-500/40"
                    : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/70"
                )}
              >
                <div className="flex items-start justify-between w-full">
                  <div>
                    <div className="font-bold text-sm text-white flex items-center gap-1.5">
                      <span>{theme.name}</span>
                    </div>
                    <div className="text-[11px] text-zinc-400 mt-0.5">{theme.tagline}</div>
                  </div>
                  {isSelected && (
                    <div className={clsx(
                      "w-5 h-5 rounded-full flex items-center justify-center shrink-0 shadow-md",
                      isThemeDirty ? "bg-amber-400 text-zinc-950" : "bg-cyan-500 text-zinc-950"
                    )}>
                      {isThemeDirty ? (
                        <Sparkles className="w-3 h-3 stroke-[2.5]" />
                      ) : (
                        <Check className="w-3 h-3 stroke-[3]" />
                      )}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-3 border-t border-white/5">
                  <div className="flex items-center -space-x-1.5">
                    {theme.previewSwatches.map((color, i) => (
                      <div
                        key={i}
                        className="w-5 h-5 rounded-full border border-zinc-900 shadow-sm"
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="ml-auto flex items-center gap-1.5">
                    {isCurrentSaved && (
                      <span className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                        Saved
                      </span>
                    )}
                    <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-500 font-bold">
                      {theme.id}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="w-full h-full flex-1 min-h-0 bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden">
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      {/* Top Header & Navigation Tabs */}
      <div className="px-6 pt-6 pb-2 shrink-0">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-white/10">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-2.5">
              <Settings className="w-7 h-7 text-cyan-400" />
              {isAdmin ? "Shop Settings" : "My Profile"}
            </h1>
            <p className="text-zinc-400 mt-0.5 text-xs">
              {isAdmin 
                ? "Configure store currency, timezone, staff access, and appearance."
                : "Manage your staff account details, appearance theme, and password."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-3.5 py-1.5 rounded-xl self-start md:self-auto shadow-inner">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className={clsx("text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg border", getRoleBadgeStyle(currentUserRole))}>
              {currentUserRole || "USER"}
            </span>
          </div>
        </div>

        {/* Segmented Navigation Tabs (Rendered for Admin Only) */}
        {isAdmin && (
          <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 shadow-inner flex-wrap gap-1.5 mt-3">
            <button
              onClick={() => handleTabChange("general")}
              className={clsx(
                "flex-1 min-w-[130px] px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "general"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Globe className="w-4 h-4" />
              <span>General</span>
            </button>

            <button
              onClick={() => handleTabChange("roles")}
              className={clsx(
                "flex-1 min-w-[130px] px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "roles"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Sliders className="w-4 h-4" />
              <span>Role Access</span>
            </button>

            <button
              onClick={() => handleTabChange("users")}
              className={clsx(
                "flex-1 min-w-[130px] px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "users"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Users className="w-4 h-4" />
              <span>Staff & Users</span>
            </button>

            <button
              onClick={() => handleTabChange("profile")}
              className={clsx(
                "flex-1 min-w-[130px] px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "profile"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <User className="w-4 h-4" />
              <span>My Profile</span>
            </button>

            <button
              onClick={() => handleTabChange("logs")}
              className={clsx(
                "flex-1 min-w-[130px] px-4 py-2 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "logs"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>Audit Log</span>
            </button>
          </div>
        )}
      </div>

      <div className="w-full flex-1 min-h-0 flex flex-col overflow-hidden">
        {/* TAB 1: GENERAL APP CONFIGURATION (Admin Only) */}
        {isAdmin && activeTab === "general" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <form onSubmit={handleSaveGeneral} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
                {/* Store Preferences Card */}
                <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Building className="w-5 h-5 text-cyan-400" />
                        Store Preferences
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Shop branding, timezone, currency, and appearance.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResetGeneral}
                      className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow-sm self-start sm:self-auto"
                      title="Reset store preferences to factory defaults"
                    >
                      <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Reset Store Defaults</span>
                    </button>
                  </div>

                  <div className="space-y-6 relative z-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Application Name */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Application Name <span className="text-cyan-400">*</span>
                        </label>
                        <div className="relative">
                          <Sparkles className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            required
                            value={settings.appName}
                            onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                            placeholder="e.g. Versiklo"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1.5 block">
                          Displays in browser title tags, navigation header, and invoice documents.
                        </span>
                      </div>

                      {/* Description / Subtitle */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Description / Subtitle
                        </label>
                        <div className="relative">
                          <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <input
                            type="text"
                            value={settings.shopDescription ?? ""}
                            onChange={(e) => setSettings({ ...settings, shopDescription: e.target.value })}
                            placeholder="e.g. Shop Floor or Speed Workshop"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1.5 block">
                          Displays below the shop name in the navigation drawer and top header bar.
                        </span>
                      </div>

                      {/* Operating Timezone */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Operating Timezone <span className="text-cyan-400">*</span>
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <select
                            value={settings.timezone}
                            onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          >
                            {TIMEZONE_OPTIONS.map((tz) => (
                              <option key={tz.value} value={tz.value} className="bg-zinc-900 text-zinc-100">
                                {tz.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1.5 block">
                          Standardizes timestamps for sales records, repair stages, and audit events.
                        </span>
                      </div>

                      {/* Country Standard */}
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Country of Operation <span className="text-cyan-400">*</span>
                        </label>
                        <div className="relative">
                          <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <select
                            value={settings.country}
                            onChange={(e) => handleCountryChange(e.target.value)}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          >
                            {COUNTRY_OPTIONS.map((c) => (
                              <option key={c.country} value={c.country} className="bg-zinc-900 text-zinc-100">
                                {c.country} ({c.currency} - {c.symbol})
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1.5 block">
                          Determines legal tax defaults and monetary currency symbol.
                        </span>
                      </div>

                      {/* Currency Symbol Display */}
                      <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4 flex flex-col justify-between">
                        <div>
                          <span className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Active Currency Symbol & Code
                          </span>
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-10 rounded-xl bg-zinc-900 border border-white/10 flex items-center justify-center font-bold text-lg text-emerald-400">
                              {settings.currencySymbol}
                            </div>
                            <div className="flex-1">
                              <div className="font-mono text-sm font-bold text-zinc-200">{settings.currency}</div>
                              <div className="text-[11px] text-zinc-500">Formatted for all POS terminals and invoices.</div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-zinc-500">
                          Automatically mapped from the selected country.
                        </p>
                      </div>
                    </div>

                  </div>
                </div>

                {/* Workshop & Repair Boards Configuration */}
                <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                    <div>
                      <h2 className="text-xl font-bold text-white flex items-center gap-2">
                        <Wrench className="w-5 h-5 text-cyan-400" />
                        Workshop & Repair Boards
                      </h2>
                      <p className="text-xs text-zinc-400 mt-1">
                        Customize the 4 stage board names and configure job card display retention for released/invoiced orders.
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleResetBoardDefaults}
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors flex items-center gap-1.5 shadow-sm"
                        title="Reset stage titles to New, In Progress, Completed, Invoiced and retention to 7 days"
                      >
                        <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Reset Defaults</span>
                      </button>
                      <div className="flex items-center gap-2 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-xl text-xs text-zinc-400">
                        <ShieldCheck className="w-4 h-4 text-cyan-400" />
                        <span>Admin Configurable</span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6 relative z-10">
                    {/* Board Stage Names */}
                    <div>
                      <h3 className="text-sm font-bold text-white mb-1 flex items-center gap-2">
                        <span>Board Stage Display Names</span>
                        <span className="text-[10px] text-zinc-400 font-normal">(4 standard workshop stages)</span>
                      </h3>
                      <p className="text-xs text-zinc-400 mb-4">
                        Rename columns to match your shop terminology. The underlying repair workflows remain consistent.
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Stage 1: PENDING */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Stage 1 (Pending)
                          </label>
                          <input
                            type="text"
                            value={settings.boardPendingTitle ?? "New"}
                            onChange={(e) => setSettings({ ...settings, boardPendingTitle: e.target.value })}
                            placeholder="New"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                          <span className="text-[10px] text-zinc-500 mt-1 block">Default: New</span>
                        </div>

                        {/* Stage 2: ONGOING */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Stage 2 (Ongoing)
                          </label>
                          <input
                            type="text"
                            value={settings.boardOngoingTitle ?? "In Progress"}
                            onChange={(e) => setSettings({ ...settings, boardOngoingTitle: e.target.value })}
                            placeholder="In Progress"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                          <span className="text-[10px] text-zinc-500 mt-1 block">Default: In Progress</span>
                        </div>

                        {/* Stage 3: COMPLETED */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Stage 3 (Completed)
                          </label>
                          <input
                            type="text"
                            value={settings.boardCompletedTitle ?? "Completed"}
                            onChange={(e) => setSettings({ ...settings, boardCompletedTitle: e.target.value })}
                            placeholder="Completed"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                          <span className="text-[10px] text-zinc-500 mt-1 block">Default: Completed</span>
                        </div>

                        {/* Stage 4: RELEASED */}
                        <div>
                          <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                            Stage 4 (Invoiced / Released)
                          </label>
                          <input
                            type="text"
                            value={settings.boardReleasedTitle ?? "Invoiced"}
                            onChange={(e) => setSettings({ ...settings, boardReleasedTitle: e.target.value })}
                            placeholder="Invoiced"
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          />
                          <span className="text-[10px] text-zinc-500 mt-1 block">Default: Invoiced</span>
                        </div>
                      </div>
                    </div>

                    {/* Record Retention for Released Jobs */}
                    <div className="pt-4 border-t border-white/10">
                      <div className="max-w-md">
                        <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                          Invoiced / Released Card Retention on Board
                        </label>
                        <div className="relative">
                          <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                          <select
                            value={settings.boardRetentionDays || "7"}
                            onChange={(e) => setSettings({ ...settings, boardRetentionDays: e.target.value })}
                            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          >
                            {BOARD_RETENTION_OPTIONS.map((opt) => (
                              <option key={opt.value} value={opt.value} className="bg-zinc-900 text-zinc-100">
                                {opt.label}
                              </option>
                            ))}
                          </select>
                        </div>
                        <span className="text-[11px] text-zinc-500 mt-1.5 block">
                          Determines how long finished, invoiced repair cards remain visible on the active Kanban board before being archived to Customer Records & Reports.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Unified Sticky Bottom Footer */}
              <div className="shrink-0 px-6 py-3.5 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30 shadow-2xl">
                <div className="flex items-center gap-3">
                  {generalSuccess ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {generalSuccess}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      Store preferences, currency symbol, and workshop board stages
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 font-semibold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Store Settings</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: ROLE ACCESSIBILITY MATRIX (Admin Only) */}
        {isAdmin && activeTab === "roles" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
              <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                  <div>
                    <h2 className="text-xl font-bold text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-cyan-400" />
                      Role Access Matrix
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Control which operational sections each staff role is authorized to visit and operate.
                    </p>
                  </div>
                </div>

                {/* Matrix Table */}
                <div className="relative z-10 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/60 shadow-xl">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-zinc-950 border-b border-white/10 text-xs uppercase text-zinc-400 font-semibold tracking-wider">
                      <tr>
                        <th className="py-4 px-6">Store Operational Module</th>
                        <th className="py-4 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            Admin
                          </span>
                        </th>
                        <th className="py-4 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/30">
                            Manager
                          </span>
                        </th>
                        <th className="py-4 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                            Cashier
                          </span>
                        </th>
                        <th className="py-4 px-4 text-center">
                          <span className="px-2.5 py-1 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/30">
                            Mechanic
                          </span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {CONFIGURABLE_MODULES.map((mod) => {
                        const currentRoles = modulePermissions[mod.id] || ["admin"];
                        const isManager = currentRoles.includes("manager");
                        const isCashier = currentRoles.includes("cashier");
                        const isMechanic = currentRoles.includes("mechanic");

                        return (
                          <tr key={mod.id} className="hover:bg-white/[0.02] transition-colors group">
                            <td className="py-4 px-6">
                              <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {mod.name}
                              </div>
                              <div className="text-xs text-zinc-400 mt-0.5">
                                {mod.description}
                              </div>
                            </td>

                            {/* Admin (Always Locked Active) */}
                            <td className="py-4 px-4 text-center">
                              <div className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 cursor-not-allowed">
                                <Lock className="w-4 h-4" />
                              </div>
                            </td>

                            {/* Manager Toggle Switch */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex justify-center items-center">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isManager}
                                  onClick={() => handleToggleModuleRole(mod.id, "manager")}
                                  className={clsx(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",
                                    isManager ? "bg-purple-600 shadow-lg shadow-purple-600/30" : "bg-zinc-800 border-white/10"
                                  )}
                                  title={`Toggle ${mod.name} for Manager`}
                                >
                                  <span className="sr-only">Toggle {mod.name} for Manager</span>
                                  <span
                                    aria-hidden="true"
                                    className={clsx(
                                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                      isManager ? "translate-x-5" : "translate-x-0"
                                    )}
                                  />
                                </button>
                              </div>
                            </td>

                            {/* Cashier Toggle Switch */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex justify-center items-center">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isCashier}
                                  onClick={() => handleToggleModuleRole(mod.id, "cashier")}
                                  className={clsx(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",
                                    isCashier ? "bg-emerald-600 shadow-lg shadow-emerald-600/30" : "bg-zinc-800 border-white/10"
                                  )}
                                  title={`Toggle ${mod.name} for Cashier`}
                                >
                                  <span className="sr-only">Toggle {mod.name} for Cashier</span>
                                  <span
                                    aria-hidden="true"
                                    className={clsx(
                                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                      isCashier ? "translate-x-5" : "translate-x-0"
                                    )}
                                  />
                                </button>
                              </div>
                            </td>

                            {/* Mechanic Toggle Switch */}
                            <td className="py-4 px-4 text-center">
                              <div className="flex justify-center items-center">
                                <button
                                  type="button"
                                  role="switch"
                                  aria-checked={isMechanic}
                                  onClick={() => handleToggleModuleRole(mod.id, "mechanic")}
                                  className={clsx(
                                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:ring-offset-2 focus:ring-offset-zinc-950",
                                    isMechanic ? "bg-amber-600 shadow-lg shadow-amber-600/30" : "bg-zinc-800 border-white/10"
                                  )}
                                  title={`Toggle ${mod.name} for Mechanic`}
                                >
                                  <span className="sr-only">Toggle {mod.name} for Mechanic</span>
                                  <span
                                    aria-hidden="true"
                                    className={clsx(
                                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out",
                                      isMechanic ? "translate-x-5" : "translate-x-0"
                                    )}
                                  />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Unified Sticky Bottom Footer */}
            <div className="shrink-0 px-6 py-3.5 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30 shadow-2xl">
              <button
                type="button"
                onClick={handleResetRoles}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                {rolesSuccess && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {rolesSuccess}
                  </span>
                )}
                <button
                  type="button"
                  onClick={handleSaveRoles}
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Permissions</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF & USER MANAGEMENT (Admin Only) */}
        {isAdmin && activeTab === "users" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden px-6 pb-6 animate-in fade-in">
            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Staff Accounts
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Provision staff accounts, assign operational roles, and review individual user profiles.
                </p>
              </div>

              <Link
                href="/users/register"
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all text-xs self-start sm:self-auto shrink-0"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Staff</span>
              </Link>
            </div>

            {staffError && (
              <div className="mb-3 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 shrink-0">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{staffError}</div>
              </div>
            )}

            {/* Search and Role Filter Pills Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl mb-4 shrink-0">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search staff name or email..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-white/10">
                <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1.5 mr-0.5 hidden sm:block" />
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStaffRoleFilter(option.value)}
                    className={clsx(
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border",
                      staffRoleFilter === option.value
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                        : "text-zinc-400 border-transparent hover:text-white hover:bg-zinc-800/60"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Users Data Table Container (Fixed Viewport, Scrollable Body, Pinned Footer) */}
            <div className="flex-1 min-h-0 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
              <div className="overflow-auto flex-1 min-h-0">
                <table className="w-full text-left text-xs text-zinc-300">
                  <thead className="bg-zinc-950/90 border-b border-white/10 uppercase text-[11px] text-zinc-400 font-semibold tracking-wider sticky top-0 z-10 backdrop-blur-md">
                    <tr>
                      <th className="py-3.5 px-6">Staff Member</th>
                      <th className="py-3.5 px-6">Email Address</th>
                      <th className="py-3.5 px-6">Assigned Role</th>
                      <th className="py-3.5 px-6 text-right w-12"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-sans">
                    {staffLoading ? (
                      Array.from({ length: 5 }).map((_, idx) => (
                        <tr key={idx} className="hover:bg-white/[0.01]">
                          <td className="py-3.5 px-6">
                            <div className="flex items-center gap-3">
                              <Skeleton className="w-8 h-8 rounded-full shrink-0" />
                              <Skeleton className="h-4 w-32 rounded" />
                            </div>
                          </td>
                          <td className="py-3.5 px-6">
                            <Skeleton className="h-4 w-40 rounded" />
                          </td>
                          <td className="py-3.5 px-6">
                            <Skeleton className="h-5 w-20 rounded-full" />
                          </td>
                          <td className="py-3.5 px-6 text-right">
                            <Skeleton className="h-4 w-4 rounded ml-auto" />
                          </td>
                        </tr>
                      ))
                    ) : staffUsers.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-16 text-center text-zinc-500 text-xs">
                          No staff accounts found matching your criteria.
                        </td>
                      </tr>
                    ) : (
                      staffUsers.map((user) => {
                        const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Staff Member";
                        const initials = `${user.first_name ? user.first_name[0] : ""}${user.last_name ? user.last_name[0] : ""}`.toUpperCase() || "U";
                        return (
                          <tr
                            key={user.id}
                            onClick={() => router.push(`/users/${user.id}`)}
                            className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                          >
                            <td className="py-3.5 px-6">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-xl border border-white/10 flex items-center justify-center shrink-0 overflow-hidden bg-zinc-900 shadow-sm">
                                  {user.avatar ? (
                                    <UserAvatar avatarId={user.avatar} className="w-9 h-9" />
                                  ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center font-bold text-cyan-400 text-xs">
                                      {initials}
                                    </div>
                                  )}
                                </div>
                                <div>
                                  <div className="font-bold text-white group-hover:text-cyan-300 transition-colors">
                                    {fullName}
                                  </div>
                                  <div className="text-[10px] text-zinc-500 font-mono">
                                    ID: {user.id.slice(0, 8)}
                                  </div>
                                </div>
                              </div>
                            </td>

                            <td className="py-3.5 px-6 text-zinc-300 font-mono text-[11px]">
                              {user.email}
                            </td>

                            <td className="py-3.5 px-6">
                              <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", getRoleBadgeStyle(user.role))}>
                                {user.role}
                              </span>
                            </td>

                            <td className="py-3.5 px-6 text-right">
                              <ChevronRight className="w-4 h-4 text-zinc-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all ml-auto" />
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pinned Pagination Controls */}
              <div className="p-3.5 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400 shrink-0">
                <div>
                  Showing <span className="font-bold text-white">{staffUsers.length}</span> of{" "}
                  <span className="font-bold text-white">{staffTotal}</span> registered staff members (Page{" "}
                  <span className="font-bold text-white">{staffPage}</span> of{" "}
                  <span className="font-bold text-white">{staffTotalPages || 1}</span>)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStaffPageChange(staffPage - 1)}
                    disabled={staffPage <= 1 || staffLoading}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStaffPageChange(staffPage + 1)}
                    disabled={staffPage >= staffTotalPages || staffLoading}
                    className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & SECURITY (All Roles) */}
        {activeTab === "profile" && (
          <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
            <form onSubmit={handleUpdateProfile} className="flex-1 min-h-0 flex flex-col overflow-hidden">
              <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 space-y-6">
                <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xl shadow-inner">
                        {profile.first_name ? profile.first_name[0] : "U"}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-white">Staff Member Profile</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Configure your display identity, avatar persona, and login credentials.
                        </p>
                      </div>
                    </div>
                  </div>

                  {profileError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5 relative z-10">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{profileError}</div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
                    {/* First Name */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        First Name <span className="text-cyan-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          required
                          value={profile.first_name}
                          onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Last Name <span className="text-cyan-400">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          required
                          value={profile.last_name}
                          onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>

                    {/* Email Address */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Email Address <span className="text-cyan-400">*</span>
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="email"
                          required
                          value={profile.email}
                          onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                          className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                        />
                      </div>
                    </div>

                    {/* Role (Read Only) */}
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                        Assigned Role
                      </label>
                      <div className="relative">
                        <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                        <input
                          type="text"
                          disabled
                          value={profile.role.toUpperCase()}
                          className="w-full bg-zinc-950 border border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-400 cursor-not-allowed"
                        />
                      </div>
                      <span className="text-[11px] text-zinc-500 mt-1.5 block">
                        Roles can only be adjusted by a store Administrator in the Role Accessibility tab.
                      </span>
                    </div>
                  </div>

                  {/* Personal Appearance Mode & Theme Selectors */}
                  {renderModeSelector()}
                  {renderThemeSelector()}

                  {/* Profile Face Avatar Presets & Live Persona Identity Preview */}
                  <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm relative z-10">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-white/5">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Sparkles className="w-4 h-4 text-cyan-400" />
                          Workshop Staff Avatar & Flat Identity
                        </h3>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Choose from 12 flat vector workshop personas. Selected avatars sync live across the sidebar, customer receipts, and store activity logs.
                        </p>
                      </div>
                      <div className="flex items-center gap-2 self-start sm:self-auto">
                        <span className="text-[11px] font-mono text-zinc-400 px-2.5 py-1 rounded-lg bg-zinc-900 border border-white/5">
                          12 Personas Available
                        </span>
                        <span className={clsx(
                          "text-xs font-mono font-bold px-2.5 py-1 rounded-lg border transition-all",
                          isAvatarDirty
                            ? "text-amber-400 bg-amber-500/10 border-amber-500/30 shadow-sm"
                            : "text-cyan-400 bg-cyan-500/10 border-cyan-500/20"
                        )}>
                          {isAvatarDirty ? "Previewing: " : "Active: "}
                          {AVATAR_PRESETS.find((p) => p.id === selectedAvatar)?.name || "Alex"}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Left Column: Live Profile & Sidebar Preview Card */}
                      {(() => {
                        const activePreset = AVATAR_PRESETS.find((p) => p.id === selectedAvatar) || AVATAR_PRESETS[0];
                        const fullName = [profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Staff Member";

                        return (
                          <div className="lg:col-span-4 xl:col-span-4 space-y-4">
                            {/* Live Persona Card */}
                            <div className={clsx(
                              "p-5 rounded-2xl bg-zinc-900/90 border shadow-lg relative overflow-hidden group transition-all",
                              isAvatarDirty ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-white/10"
                            )}>
                              <div className="flex items-center justify-between mb-4">
                                <span className="text-[10px] uppercase font-mono tracking-wider font-bold text-zinc-400 flex items-center gap-1.5">
                                  <User className="w-3.5 h-3.5 text-cyan-400" />
                                  Live Identity Card
                                </span>
                                {isAvatarDirty ? (
                                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1 animate-pulse">
                                    <Sparkles className="w-3 h-3" />
                                    Unsaved Preview
                                  </span>
                                ) : (
                                  <span className={clsx("text-[10px] font-bold px-2 py-0.5 rounded-full", activePreset.badgeColor)}>
                                    {activePreset.department}
                                  </span>
                                )}
                              </div>

                              <div className="flex flex-col items-center text-center p-2">
                                {/* Large 80px Avatar */}
                                <div className="relative mb-3">
                                  <div className={clsx(
                                    "w-20 h-20 rounded-full p-1 bg-gradient-to-tr transition-all duration-300 shadow-xl",
                                    activePreset.bgGradient
                                  )}>
                                    <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center p-1 overflow-hidden">
                                      {activePreset.renderFace()}
                                    </div>
                                  </div>
                                  {isAvatarDirty ? (
                                    <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 border-2 border-zinc-950 flex items-center justify-center text-[8px] font-bold text-zinc-950 shadow-md animate-pulse" title="Previewing (Click Save below to commit)">
                                      Preview
                                    </span>
                                  ) : (
                                    <span className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 border-2 border-zinc-950 flex items-center justify-center text-zinc-950 shadow-md" title="Active Saved Avatar">
                                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                                    </span>
                                  )}
                                </div>

                                <h4 className="text-base font-bold text-white tracking-tight">{fullName}</h4>
                                <p className="text-xs text-zinc-400 truncate max-w-full font-mono mt-0.5">{profile.email || "staff@motoshop.com"}</p>

                                <div className="mt-3 flex items-center gap-2 flex-wrap justify-center">
                                  <span className={clsx("px-2.5 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wider", getRoleBadgeStyle(profile.role))}>
                                    {profile.role}
                                  </span>
                                  <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700">
                                    Persona: {activePreset.name} ({activePreset.roleHint})
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Right Column: 12 Vector Personas Grid */}
                      <div className="lg:col-span-8 xl:col-span-8">
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {AVATAR_PRESETS.map((preset) => {
                            const isSelected = selectedAvatar === preset.id;
                            const isCurrentSaved = savedAvatar === preset.id;

                            return (
                              <button
                                key={preset.id}
                                type="button"
                                onClick={() => handleSelectAvatar(preset.id)}
                                className={clsx(
                                  "p-3 rounded-2xl border text-left transition-all relative overflow-hidden group flex flex-col items-center gap-2.5",
                                  isSelected
                                    ? isAvatarDirty
                                      ? "bg-zinc-900 border-amber-500/60 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/30"
                                      : "bg-zinc-900 border-white/30 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/30"
                                    : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/70"
                                )}
                              >
                                {isSelected && (
                                  <div className="absolute top-2 right-2">
                                    <div className={clsx(
                                      "w-4 h-4 rounded-full flex items-center justify-center shadow-md",
                                      isAvatarDirty ? "bg-amber-400 text-zinc-950" : "bg-cyan-500 text-zinc-950"
                                    )}>
                                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                                    </div>
                                  </div>
                                )}

                                {/* Flat Avatar Graphic */}
                                <div className={clsx(
                                  "w-14 h-14 rounded-full p-0.5 bg-gradient-to-tr transition-transform group-hover:scale-105 shadow-md shrink-0 mt-0.5",
                                  preset.bgGradient
                                )}>
                                  <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center p-0.5 overflow-hidden">
                                    {preset.renderFace()}
                                  </div>
                                </div>

                                {/* Persona Metadata */}
                                <div className="w-full text-center min-w-0">
                                  <span className={clsx(
                                    "block text-xs font-bold truncate transition-colors",
                                    isSelected 
                                      ? isSelected ? (isAvatarDirty ? "text-amber-300" : "text-cyan-300") : "text-zinc-200"
                                      : "text-zinc-200 group-hover:text-white"
                                  )}>
                                    {preset.name}
                                  </span>
                                  <span className="block text-[10px] text-zinc-400 font-medium truncate mt-0.5">
                                    {preset.roleHint}
                                  </span>
                                  <div className="flex items-center justify-center gap-1 mt-1">
                                    {isCurrentSaved && (
                                      <span className="text-[8px] uppercase tracking-wider text-emerald-400 font-mono font-bold bg-emerald-500/10 px-1 py-0.2 rounded border border-emerald-500/20">
                                        Saved
                                      </span>
                                    )}
                                    <span className="inline-block text-[9px] text-zinc-500 font-mono truncate px-1.5 py-0.5 rounded bg-white/5">
                                      {preset.department.split(" ")[0]}
                                    </span>
                                  </div>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Password Change Card */}
                  <div className="p-6 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
                    <div className="space-y-1">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-cyan-400" />
                        Account Authentication Password
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Keep your account secure with regular password updates.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setIsPasswordModalOpen(true)}
                      className="px-4 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>Change Password</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Unified Sticky Bottom Footer */}
              <div className="shrink-0 px-6 py-3.5 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30 shadow-2xl">
                <div className="flex items-center gap-3">
                  {isProfileDirty ? (
                    <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Unsaved changes ({[
                        isAvatarDirty ? "Avatar" : null,
                        isModeDirty ? "Appearance Mode" : null,
                        isThemeDirty ? "Theme Palette" : null,
                      ].filter(Boolean).join(" & ")}). Click Save to persist.
                    </span>
                  ) : profileSuccess ? (
                    <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      {profileSuccess}
                    </span>
                  ) : (
                    <span className="text-xs text-zinc-500">
                      All profile preferences are currently saved.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className={clsx(
                    "w-full sm:w-auto px-6 py-2.5 font-semibold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50",
                    isProfileDirty
                      ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white ring-2 ring-cyan-400/50 shadow-cyan-500/30 scale-105"
                      : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20"
                  )}
                >
                  {isUpdatingProfile ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Save Profile Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 5: SYSTEM LOGS SNAPSHOT (Admin Only) */}
        {isAdmin && activeTab === "logs" && (
          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-4 pb-6 space-y-6 animate-in fade-in">
            <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/10 relative z-10">
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    <Activity className="w-5 h-5 text-cyan-400" />
                    Audit Log Snapshot
                  </h2>
                  <p className="text-xs text-zinc-400 mt-1">
                    Live snapshot of business actions and changes across all shop sections.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/5 font-mono text-xs text-zinc-300">
                  <span>Total Recorded Changes:</span>
                  <span className="font-bold text-cyan-400">{totalLogsCount}</span>
                </div>
              </div>

              {/* Dedicated Page Hero Banner */}
              <div className="relative z-10 p-6 md:p-8 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-zinc-900 border border-cyan-500/30 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-xl">
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Dedicated History Logs Page
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-white">
                    Access Dedicated Audit Logs
                  </h3>
                  <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
                    Inspect user-friendly change histories across all store sections, filter by page, view staff members who made changes, inspect details, and export clean audit reports.
                  </p>
                </div>

                <Link
                  href="/audit-logs"
                  className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center justify-center gap-2 shrink-0"
                >
                  <span>View Full Log</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Recent 5 Logs Preview */}
              <div className="space-y-3 relative z-10">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Recent 5 Database Changes
                  </h4>
                  <Link
                    href="/audit-logs"
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition-colors"
                  >
                    <span>View All Change Logs</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/60">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-950 border-b border-white/10 text-zinc-400 font-semibold uppercase tracking-wider">
                      <tr>
                        <th className="py-3 px-4">Timestamp</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4">Action</th>
                        <th className="py-3 px-4">Originating Target</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-sans">
                      {isLoadingLogs ? (
                        Array.from({ length: 4 }).map((_, idx) => (
                          <tr key={idx} className="hover:bg-white/[0.01]">
                            <td className="py-3 px-4"><Skeleton className="h-4 w-28 rounded" /></td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                <Skeleton className="h-4 w-20 rounded" />
                                <Skeleton className="h-4 w-12 rounded-full" />
                              </div>
                            </td>
                            <td className="py-3 px-4"><Skeleton className="h-4 w-28 rounded" /></td>
                            <td className="py-3 px-4"><Skeleton className="h-4 w-36 rounded" /></td>
                          </tr>
                        ))
                      ) : recentLogs.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                            No database modification records available yet.
                          </td>
                        </tr>
                      ) : (
                        recentLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-4 text-zinc-400 font-mono text-[11px]">
                              {log.timestamp ? new Date(log.timestamp).toLocaleString() : "—"}
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-bold text-white">{log.user_name || "System"}</span>
                              <span className={clsx("ml-2 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase border", getRoleBadgeStyle(log.user_role || "admin"))}>
                                {log.user_role || "SYSTEM"}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-semibold text-cyan-300">
                              {log.action}
                            </td>
                            <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] truncate max-w-xs">
                              {log.resource}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1.5">
            <div className="h-8 w-60 bg-zinc-800/50 rounded-xl animate-shimmer" />
            <div className="h-4 w-80 bg-zinc-800/50 rounded animate-shimmer" />
          </div>
          <TableSkeleton columns={4} rows={6} />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
