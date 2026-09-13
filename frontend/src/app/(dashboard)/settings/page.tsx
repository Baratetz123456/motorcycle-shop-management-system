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
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
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
  getDefaultThemeForMode,
  useTheme
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
  const { theme: activeThemeMode, setTheme: setActiveThemeMode } = useTheme();

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
  const [isStaffFilterOpen, setIsStaffFilterOpen] = useState(false);

  const staffActiveFilterCount = (staffSearch.trim() ? 1 : 0) + (staffRoleFilter !== "ALL" ? 1 : 0);
  const handleResetStaffFilters = () => {
    setStaffSearch("");
    setStaffRoleFilter("ALL");
  };

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
  const [isAvatarPopoverOpen, setIsAvatarPopoverOpen] = useState<boolean>(false);

  // Dirty Flags
  const isThemeDirty = activeTheme !== savedTheme;
  const isModeDirty = activeMode !== savedMode;
  const isAvatarDirty = selectedAvatar !== savedAvatar;
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
      // Non-admins have access to appearance (general) and profile
      if (tabParam === "profile") {
        setActiveTab("profile");
      } else {
        setActiveTab("general");
      }
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

  // Cleanly revert any uncommitted live preview when leaving settings page
  useEffect(() => {
    return () => {
      applyModeToDocument(savedModeRef.current);
      applyThemeToDocument(savedThemeRef.current);
    };
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
          const localMode = localStorage.getItem("motoshop_app_mode") as AppMode;
          const effectiveMode = localMode || (res.data.display_mode as AppMode);
          setActiveMode(effectiveMode);
          setSavedMode(effectiveMode);
          savedModeRef.current = effectiveMode;
          saveAppMode(effectiveMode, id);
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

  // Switch settings tab and retain active selections
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
      setActiveThemeMode(savedModeRef.current);
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

  // --- Theme Selection Handler (Live preview only until Save is clicked) ---
  const handleSelectTheme = (themeId: AppTheme) => {
    setActiveTheme(themeId);
    applyThemeToDocument(themeId); // Temporary live preview
  };

  // --- Appearance Mode Selection Handler (Live preview only until Save is clicked) ---
  const handleSelectThemeMode = (mode: AppMode) => {
    setActiveMode(mode);
    setActiveThemeMode(mode);
    applyModeToDocument(mode); // Temporary live preview
  };

  const handleSelectMode = handleSelectThemeMode;

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
      timezone: settings.timezone,
      country: settings.country,
      currency: settings.currency,
      boardPendingTitle: settings.boardPendingTitle,
      boardOngoingTitle: settings.boardOngoingTitle,
      boardCompletedTitle: settings.boardCompletedTitle,
      boardReleasedTitle: settings.boardReleasedTitle,
      boardRetentionDays: settings.boardRetentionDays,
    });

    setGeneralSuccess("Store preferences, currency, and workshop boards updated successfully.");
    setTimeout(() => setGeneralSuccess(null), 4000);
  };

  const handleSaveAppearanceOnly = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    saveAppMode(activeMode, currentUserId);
    saveAppTheme(activeTheme, currentUserId);
    setSavedMode(activeMode);
    savedModeRef.current = activeMode;
    setSavedTheme(activeTheme);
    savedThemeRef.current = activeTheme;

    recordUserAuditLog("APPEARANCE_SETTINGS_UPDATED", "/settings", {
      mode: activeMode,
      theme: activeTheme,
    });

    setGeneralSuccess("Appearance preferences permanently saved across your session.");
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

  // Reusable Theme Preference Selector
  const renderThemeSelector = () => {
    const currentThemes = getThemesForMode(activeMode);

    return (
      <div className="bg-slate-50 dark:bg-zinc-950/60 border border-slate-200 dark:border-white/5 rounded-2xl p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Palette className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              App Theme & Visual Identity ({activeMode === "light" ? "Daylight Themes" : "Neon Dark Themes"})
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
              {activeMode === "light"
                ? "Choose from 4 high-contrast daylight palettes tailored for crisp daytime clarity."
                : "Choose from 4 vibrant electric palettes tailored for deep dark mode aesthetics."}
            </p>
          </div>
          {isThemeDirty ? (
            <span className="text-xs text-amber-500 dark:text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2.5 py-1 rounded-lg font-medium animate-in fade-in flex items-center gap-1.5 self-start sm:self-auto shadow-sm">
              <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400 animate-pulse" />
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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-visible md:overflow-hidden">
      {/* Top Header & Navigation Tabs */}
      <div className="px-3 sm:px-4 md:px-6 pt-4 sm:pt-5 md:pt-6 pb-2 shrink-0">
        {/* Page Header */}
        <div className="pb-3 border-b border-slate-200 dark:border-white/10">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2.5">
              <Settings className="w-7 h-7 text-cyan-500 dark:text-cyan-400" />
              {isAdmin ? "Shop Settings" : "Appearance & Settings"}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-0.5 text-xs">
              {isAdmin 
                ? "Configure store currency, timezone, staff access, and operational policies."
                : "Manage your workshop appearance mode, theme palette, and user profile."}
            </p>
          </div>
        </div>

        {/* Segmented Navigation Tabs (Accessible to all roles) */}
        <>
          {/* Mobile Tab Select Dropdown (Zero Horizontal Scroll) */}
          <div className="md:hidden mt-3">
            <label className="text-[11px] font-semibold text-zinc-400 mb-1.5 block uppercase tracking-wider">
              Settings Tab:
            </label>
            <select
              value={activeTab}
              onChange={(e) => handleTabChange(e.target.value as SettingsTab)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3.5 py-2.5 text-xs font-semibold text-white focus:outline-none focus:ring-1 focus:ring-lime-500/50 cursor-pointer"
            >
              <option value="general">{isAdmin ? "🌐 General Preferences" : "🎨 Appearance & Theme"}</option>
              {isAdmin && <option value="roles">🎛️ Role Access Matrix</option>}
              {isAdmin && <option value="users">👥 Staff & Users</option>}
              <option value="profile">👤 My Profile</option>
              {isAdmin && <option value="logs">📜 System Audit Log</option>}
            </select>
          </div>

          {/* Desktop Segmented Navigation Tabs */}
          <div className="hidden md:flex bg-slate-100 dark:bg-zinc-800/80 p-1.5 rounded-2xl border border-slate-200 dark:border-zinc-700 gap-1.5 mt-3">
            <button
              onClick={() => handleTabChange("general")}
              className={clsx(
                "px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 flex-1 whitespace-nowrap",
                activeTab === "general"
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-sm"
                  : "text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
              )}
            >
              {isAdmin ? <Globe className="w-4 h-4 shrink-0" /> : <Palette className="w-4 h-4 shrink-0" />}
              <span>{isAdmin ? "General Preferences" : "Appearance & Theme"}</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTabChange("roles")}
                className={clsx(
                  "px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 flex-1 whitespace-nowrap",
                  activeTab === "roles"
                    ? "bg-lime-500 text-zinc-950 font-bold shadow-sm"
                    : "text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
                )}
              >
                <Sliders className="w-4 h-4 shrink-0" />
                <span>Role Access</span>
              </button>
            )}

            {isAdmin && (
              <button
                onClick={() => handleTabChange("users")}
                className={clsx(
                  "px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 flex-1 whitespace-nowrap",
                  activeTab === "users"
                    ? "bg-lime-500 text-zinc-950 font-bold shadow-sm"
                    : "text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
                )}
              >
                <Users className="w-4 h-4 shrink-0" />
                <span>Staff & Users</span>
              </button>
            )}

            <button
              onClick={() => handleTabChange("profile")}
              className={clsx(
                "px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 flex-1 whitespace-nowrap",
                activeTab === "profile"
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-sm"
                  : "text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
              )}
            >
              <User className="w-4 h-4 shrink-0" />
              <span>My Profile</span>
            </button>

            {isAdmin && (
              <button
                onClick={() => handleTabChange("logs")}
                className={clsx(
                  "px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 flex-1 whitespace-nowrap",
                  activeTab === "logs"
                    ? "bg-lime-500 text-zinc-950 font-bold shadow-sm"
                    : "text-slate-600 dark:text-zinc-300 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
                )}
              >
                <FileText className="w-4 h-4 shrink-0" />
                <span>Audit Log</span>
              </button>
            )}
          </div>
        </>
      </div>

      <div className="w-full md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
        {/* TAB 1: GENERAL APP CONFIGURATION (Admin Only) */}
        {isAdmin && activeTab === "general" && (
          <div className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
            <form onSubmit={handleSaveGeneral} className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
              <div className="md:flex-1 md:min-h-0 overflow-visible md:overflow-y-auto px-3 sm:px-4 md:px-6 py-4 space-y-8">
                {/* Store Preferences Section */}
                <div className="pb-8 border-b border-zinc-800/80 space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <Building className="w-5 h-5 text-cyan-500 dark:text-cyan-400" />
                        Store Preferences
                      </h2>
                      <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">
                        Shop branding, timezone, currency, and regionalization.
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

                  <div className="space-y-6">
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
                      <div className="p-4 rounded-xl bg-zinc-900/40 border border-zinc-800/80 space-y-4 flex flex-col justify-between">
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
                <div className="pb-8 border-b border-zinc-800/80 space-y-6 animate-in fade-in">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
                    <div>
                      <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
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

                  <div className="space-y-6">
                    {/* Board Stage Names */}
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
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
                    <div className="pt-4 border-t border-zinc-800/60">
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

                {/* Legal & Regulatory Compliance Section */}
                <div className="pb-8 space-y-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                        <ShieldCheck className="w-5 h-5" />
                      </div>
                      <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                          Legal & Regulatory Compliance
                        </h2>
                        <p className="text-xs text-zinc-400 mt-0.5">
                          Public statutory notices, Philippine Data Privacy Act (RA 10173), and workshop service agreements.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Privacy Policy Card */}
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-cyan-500/30 transition-all flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-cyan-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <Lock className="w-3.5 h-3.5" />
                            Data Protection
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                            RA 10173 DPA
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-zinc-100 mb-1">
                          Customer Privacy Policy
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                          Defines personal identification, motorcycle registration/VIN data processing, 5-year accounting retention, and customer rights to access, rectification, and erasure.
                        </p>
                      </div>
                      <Link
                        href="/privacy"
                        target="_blank"
                        className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/30 text-xs font-medium text-zinc-200 hover:text-cyan-300 transition-all"
                      >
                        <span>Inspect Privacy Policy</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>

                    {/* Terms & Conditions Card */}
                    <div className="p-5 rounded-xl bg-zinc-900/40 border border-zinc-800/80 hover:border-blue-500/30 transition-all flex flex-col justify-between group">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-blue-400 flex items-center gap-1.5 uppercase tracking-wider">
                            <FileText className="w-3.5 h-3.5" />
                            Shop Service Terms
                          </span>
                          <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-300 border border-blue-500/20">
                            Civil Code & Consumer Act
                          </span>
                        </div>
                        <h3 className="text-sm font-bold text-zinc-100 mb-1">
                          Terms & Conditions of Service
                        </h3>
                        <p className="text-xs text-zinc-400 leading-relaxed mb-4">
                          Governs diagnostic test-ride authorizations, pre-existing defect disclaimers, 30-day workmanship warranties, non-refundable custom parts deposits, and Article 1731 mechanic's liens.
                        </p>
                      </div>
                      <Link
                        href="/terms"
                        target="_blank"
                        className="inline-flex items-center justify-between w-full px-4 py-2.5 rounded-xl bg-zinc-900/80 hover:bg-blue-500/10 border border-white/10 hover:border-blue-500/30 text-xs font-medium text-zinc-200 hover:text-blue-300 transition-all"
                      >
                        <span>Inspect Terms of Service</span>
                        <ExternalLink className="w-3.5 h-3.5 opacity-70 group-hover:opacity-100 group-hover:translate-x-0.5 transition-transform" />
                      </Link>
                    </div>
                  </div>

                  <div className="text-[11px] text-zinc-500 flex items-center gap-2 pt-2 border-t border-zinc-800/60">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>
                      Policies automatically reflect your configured Store Name (<strong>{settings.appName || "MotoShop"}</strong>) and contact credentials. Both documents are permanently reachable by clients and staff at the login screen and application footer.
                    </span>
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
                  className="w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl text-xs flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-400 text-zinc-950 border border-lime-600 shadow-sm active:scale-[0.98] transition-all"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Store Settings</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 1: APPEARANCE & THEME (For Cashiers & Non-Admin Staff) */}
        {!isAdmin && activeTab === "general" && (
          <div className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
            <div className="md:flex-1 md:min-h-0 overflow-visible md:overflow-y-auto px-3 sm:px-4 md:px-6 py-4 space-y-8">
              <div className="pb-8 border-b border-zinc-800/80 space-y-6 animate-in fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/60">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Palette className="w-5 h-5 text-lime-400" />
                      Appearance & Theme
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Configure your workshop display appearance mode and color scheme.
                    </p>
                  </div>
                </div>

                {/* Display Mode Single Canonical Source Notice */}
                <div className="p-4 rounded-2xl bg-slate-100 dark:bg-zinc-900/60 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-lime-500/15 border border-lime-500/30 flex items-center justify-center text-lime-700 dark:text-lime-400 shrink-0">
                      <Sun className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-zinc-200">
                        Display Appearance Mode
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                        Dark and Daylight modes are controlled globally via the 1-click Sun/Moon toggle in the top navigation header bar.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Theme Palette Options */}
                {renderThemeSelector()}
              </div>
            </div>

            {/* Sticky Save Footer for Non-Admins */}
            <div className="shrink-0 px-6 py-3.5 bg-zinc-950/95 border-t border-white/10 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-3 z-30 shadow-2xl">
              <div className="flex items-center gap-3">
                {generalSuccess ? (
                  <span className="text-xs text-emerald-400 flex items-center gap-1.5 font-medium animate-in fade-in">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {generalSuccess}
                  </span>
                ) : (
                  <span className="text-xs text-zinc-400">
                    {isModeDirty || isThemeDirty
                      ? "Unsaved appearance preview (click Save to commit)"
                      : "Appearance preferences are saved"}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={handleSaveAppearanceOnly}
                className="w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 bg-lime-500 hover:bg-lime-400 text-zinc-950 shadow-sm"
              >
                <Save className="w-4 h-4" />
                <span>Save Appearance Preferences</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 2: ROLE ACCESSIBILITY MATRIX (Admin Only) */}
        {isAdmin && activeTab === "roles" && (
          <div className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
            <div className="md:flex-1 md:min-h-0 overflow-visible md:overflow-y-auto px-3 sm:px-4 md:px-6 py-4 space-y-6">
              <div className="space-y-6 animate-in fade-in pb-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                      <Sliders className="w-5 h-5 text-cyan-400" />
                      Role Access Matrix
                    </h2>
                    <p className="text-xs text-zinc-400 mt-1">
                      Control which operational sections each staff role is authorized to visit and operate.
                    </p>
                  </div>
                </div>

                {/* Mobile View: Adaptive Role Access Module Cards */}
                <div className="block md:hidden space-y-3">
                  {CONFIGURABLE_MODULES.map((mod) => {
                    const currentRoles = modulePermissions[mod.id] || ["admin"];
                    const isManager = currentRoles.includes("manager");
                    const isCashier = currentRoles.includes("cashier");
                    const isMechanic = currentRoles.includes("mechanic");

                    return (
                      <div key={mod.id} className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 space-y-3 shadow-md">
                        <div>
                          <div className="font-bold text-white text-sm">{mod.name}</div>
                          <div className="text-xs text-zinc-400 mt-0.5">{mod.description}</div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5">
                          {/* Admin (Locked) */}
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-xs">
                            <span className="font-bold text-cyan-400">Admin</span>
                            <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/20 px-2 py-0.5 rounded-md">
                              <Lock className="w-3 h-3" /> Locked
                            </span>
                          </div>

                          {/* Manager Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRole(mod.id, "manager")}
                            className={clsx(
                              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95",
                              isManager
                                ? "bg-purple-500/20 text-purple-300 border-purple-500/40"
                                : "bg-zinc-900/80 text-zinc-500 border-white/5"
                            )}
                          >
                            <span>Manager</span>
                            <span className={clsx(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                              isManager ? "bg-purple-500/30 text-purple-200" : "bg-zinc-800 text-zinc-600"
                            )}>
                              {isManager ? "Allowed" : "Off"}
                            </span>
                          </button>

                          {/* Cashier Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRole(mod.id, "cashier")}
                            className={clsx(
                              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95",
                              isCashier
                                ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40"
                                : "bg-zinc-900/80 text-zinc-500 border-white/5"
                            )}
                          >
                            <span>Cashier</span>
                            <span className={clsx(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                              isCashier ? "bg-emerald-500/30 text-emerald-200" : "bg-zinc-800 text-zinc-600"
                            )}>
                              {isCashier ? "Allowed" : "Off"}
                            </span>
                          </button>

                          {/* Mechanic Toggle */}
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRole(mod.id, "mechanic")}
                            className={clsx(
                              "flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all active:scale-95",
                              isMechanic
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                                : "bg-zinc-900/80 text-zinc-500 border-white/5"
                            )}
                          >
                            <span>Mechanic</span>
                            <span className={clsx(
                              "text-[10px] uppercase font-bold px-2 py-0.5 rounded-md",
                              isMechanic ? "bg-amber-500/30 text-amber-200" : "bg-zinc-800 text-zinc-600"
                            )}>
                              {isMechanic ? "Allowed" : "Off"}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View: Full Matrix Table */}
                <div className="hidden md:block overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                  <table className="w-full text-left text-sm text-zinc-300">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800/80 text-xs uppercase text-zinc-400 font-semibold tracking-wider">
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
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-900 border border-white/10 hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2 shadow-xs active:scale-[0.98]"
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
                  className="w-full sm:w-auto px-6 py-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold border border-lime-600 rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm active:scale-[0.98]"
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
          <div className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden px-3 sm:px-4 md:px-6 pb-6 animate-in fade-in">
            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
              <div>
                <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Staff Accounts
                </h2>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Provision staff accounts, assign operational roles, and review individual user profiles.
                </p>
              </div>

              <Link
                href="/users/register"
                className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 rounded-xl font-bold transition-colors text-xs self-start sm:self-auto shrink-0"
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

            {/* Search and Role Filter Pills Bar (Hidden on Mobile) */}
            <div className="hidden md:flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-zinc-800/80 mb-4 shrink-0">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search staff name or email..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-zinc-900/80 border border-zinc-800 rounded-xl py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="overflow-x-auto no-scrollbar overscroll-x-contain -mx-1 px-1 py-0.5">
                <div className="inline-flex items-center gap-1.5 bg-zinc-900/60 p-1 rounded-xl border border-zinc-800 min-w-max">
                  <Filter className="w-3.5 h-3.5 text-zinc-500 ml-1.5 mr-0.5 hidden sm:block shrink-0" />
                  {STAFF_ROLE_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setStaffRoleFilter(option.value)}
                      className={clsx(
                        "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all border whitespace-nowrap shrink-0",
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
            </div>

            {/* Staff Users Data Table Container (Fixed Viewport, Scrollable Body, Pinned Footer) */}
            <div className="md:flex-1 md:min-h-0 md:overflow-hidden rounded-xl border border-zinc-800/80 bg-zinc-900/30 flex flex-col">
              <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
                {/* Mobile View: Adaptive Staff Account Cards */}
                <div className="block md:hidden p-3 space-y-3">
                  {staffLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <div key={idx} className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-3">
                        <div className="flex items-center gap-3">
                          <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                          <div className="space-y-1.5 flex-1">
                            <Skeleton className="h-4 w-32 rounded" />
                            <Skeleton className="h-3 w-40 rounded" />
                          </div>
                          <Skeleton className="h-5 w-16 rounded-full" />
                        </div>
                      </div>
                    ))
                  ) : staffUsers.length === 0 ? (
                    <div className="py-12 text-center text-zinc-500 text-xs">
                      No staff accounts found matching your criteria.
                    </div>
                  ) : (
                    staffUsers.map((user) => {
                      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Staff Member";
                      const initials = `${user.first_name ? user.first_name[0] : ""}${user.last_name ? user.last_name[0] : ""}`.toUpperCase() || "U";
                      return (
                        <div
                          key={user.id}
                          onClick={() => router.push(`/users/${user.id}`)}
                          className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer space-y-3 active:scale-[0.99] group shadow-sm"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-10 h-10 rounded-xl border border-white/10 flex items-center justify-center shrink-0 overflow-hidden bg-zinc-900 shadow-sm">
                                {user.avatar ? (
                                  <UserAvatar avatarId={user.avatar} className="w-10 h-10" />
                                ) : (
                                  <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-bold text-cyan-400 text-sm">
                                    {initials}
                                  </div>
                                )}
                              </div>
                              <div className="min-w-0">
                                <div className="font-bold text-white group-hover:text-cyan-400 transition-colors text-sm truncate">
                                  {fullName}
                                </div>
                                <div className="text-[10px] text-zinc-500 font-mono">
                                  ID: {user.id.slice(0, 8)}
                                </div>
                              </div>
                            </div>

                            <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shrink-0", getRoleBadgeStyle(user.role))}>
                              {user.role}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                            <span className="text-zinc-400 font-mono text-[11px] truncate mr-2">
                              {user.email}
                            </span>
                            <span className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                              <span>Edit Profile</span>
                              <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Desktop View: Traditional Data Table */}
                <table className="hidden md:table w-full text-left text-xs text-zinc-300">
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
                                    <div className="w-full h-full bg-zinc-800 flex items-center justify-center font-bold text-cyan-400 text-xs">
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
              <div className="p-3.5 border-t border-white/10 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-400 shrink-0">
                <div className="text-center sm:text-left">
                  Showing <span className="font-bold text-slate-900">{staffUsers.length}</span> of{" "}
                  <span className="font-bold text-slate-900">{staffTotal}</span> registered staff members (Page{" "}
                  <span className="font-bold text-slate-900">{staffPage}</span> of{" "}
                  <span className="font-bold text-slate-900">{staffTotalPages || 1}</span>)
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleStaffPageChange(staffPage - 1)}
                    disabled={staffPage <= 1 || staffLoading}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
                    title="Previous Page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleStaffPageChange(staffPage + 1)}
                    disabled={staffPage >= staffTotalPages || staffLoading}
                    className="p-1.5 rounded-lg bg-white border border-slate-200 text-slate-700 hover:bg-slate-100 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed transition-all"
                    title="Next Page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Floating Filter FAB (Mobile Only for Staff Users) */}
            <FloatingFilterButton
              onClick={() => setIsStaffFilterOpen(true)}
              activeCount={staffActiveFilterCount}
            />

            {/* Mobile Slide-Up Filter Sheet */}
            <MobileFilterSheet
              isOpen={isStaffFilterOpen}
              onClose={() => setIsStaffFilterOpen(false)}
              title="Filter Staff Accounts"
              activeCount={staffActiveFilterCount}
              onReset={handleResetStaffFilters}
            >
              {/* Search */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-300">Search Staff</label>
                <div className="relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Search name or email..."
                    value={staffSearch}
                    onChange={(e) => setStaffSearch(e.target.value)}
                    className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              {/* Staff Role */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300">Staff Role</label>
                <div className="grid grid-cols-2 gap-2">
                  {STAFF_ROLE_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStaffRoleFilter(opt.value)}
                      className={clsx(
                        "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                        staffRoleFilter === opt.value
                          ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                          : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            </MobileFilterSheet>
          </div>
        )}

        {/* TAB 4: PROFILE & SECURITY (All Roles) */}
        {activeTab === "profile" && (
          <div className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
            <form onSubmit={handleUpdateProfile} className="md:flex-1 md:min-h-0 flex flex-col overflow-visible md:overflow-hidden">
              <div className="md:flex-1 md:min-h-0 overflow-visible md:overflow-y-auto px-3 sm:px-4 md:px-6 py-4">
                <div className="space-y-6 animate-in fade-in pb-8">
                  {/* Staff Header & Minimalist Popover Avatar Picker */}
                  <div className="relative pb-6 border-b border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      {/* Minimalist Avatar Trigger Circle */}
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setIsAvatarPopoverOpen(!isAvatarPopoverOpen)}
                          className="relative group p-0.5 rounded-full bg-zinc-800 border-2 border-zinc-700 hover:border-cyan-400 transition-all focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                          title="Click to select staff avatar"
                        >
                          <div className="w-16 h-16 rounded-full bg-zinc-950 flex items-center justify-center p-1 overflow-hidden">
                            {(AVATAR_PRESETS.find((p) => p.id === selectedAvatar) || AVATAR_PRESETS[0]).renderFace()}
                          </div>
                          <div className="absolute inset-0 rounded-full bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                            Change
                          </div>
                        </button>

                        {/* Minimalist Popover Dropdown (12 Avatar Circles, Zero Text Context) */}
                        {isAvatarPopoverOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-30" 
                              onClick={() => setIsAvatarPopoverOpen(false)} 
                            />
                            <div className="absolute left-0 top-full mt-2 z-40 p-3 bg-zinc-950 border border-white/10 rounded-2xl shadow-2xl w-64 animate-in fade-in zoom-in-95 duration-150">
                              <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80 mb-3">
                                <span className="text-[11px] font-bold text-zinc-300">Choose Avatar</span>
                                <span className="text-[10px] text-zinc-500 font-mono">12 styles</span>
                              </div>
                              <div className="grid grid-cols-4 gap-2">
                                {AVATAR_PRESETS.map((preset) => {
                                  const isSelected = selectedAvatar === preset.id;
                                  return (
                                    <button
                                      key={preset.id}
                                      type="button"
                                      onClick={() => {
                                        handleSelectAvatar(preset.id);
                                        setIsAvatarPopoverOpen(false);
                                      }}
                                      className={clsx(
                                        "w-12 h-12 rounded-full p-0.5 border transition-all flex items-center justify-center relative group hover:scale-105",
                                        isSelected
                                          ? "border-cyan-400 bg-cyan-500/10 ring-2 ring-cyan-500/40"
                                          : "border-zinc-800 hover:border-zinc-600 bg-zinc-900/60"
                                      )}
                                    >
                                      <div className="w-full h-full rounded-full bg-zinc-950 flex items-center justify-center overflow-hidden p-0.5">
                                        {preset.renderFace()}
                                      </div>
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          </>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2">
                          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                            {[profile.first_name, profile.last_name].filter(Boolean).join(" ") || "Staff Member Profile"}
                          </h2>
                          <span className={clsx("px-2.5 py-0.5 text-[10px] font-bold border rounded-md uppercase tracking-wider", getRoleBadgeStyle(profile.role))}>
                            {profile.role}
                          </span>
                        </div>
                        <p className="text-xs text-zinc-400 mt-0.5 font-mono">
                          {profile.email || "staff@motoshop.com"}
                        </p>
                      </div>
                    </div>

                    {isProfileDirty && (
                      <span className="text-xs text-amber-400 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 self-start sm:self-auto">
                        <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
                        Unsaved profile changes
                      </span>
                    )}
                  </div>

                  {profileError && (
                    <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                      <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                      <div>{profileError}</div>
                    </div>
                  )}

                  {/* Profile Form Details */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
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

                  {/* Password Authentication Section */}
                  <div className="py-5 border-t border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-0.5">
                      <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                        <KeyRound className="w-4 h-4 text-cyan-400" />
                        <span>Account Authentication Password</span>
                      </h3>
                      <p className="text-xs text-zinc-400">
                        Keep your account secure with regular password updates.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => window.dispatchEvent(new CustomEvent("open_change_password_modal"))}
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
                    "w-full sm:w-auto px-6 py-2.5 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed active:scale-[0.98]",
                    isProfileDirty
                      ? "bg-amber-500 hover:bg-amber-400 text-zinc-950 border border-amber-600 ring-2 ring-amber-400/50 scale-[1.02]"
                      : "bg-lime-500 hover:bg-lime-400 text-zinc-950 border border-lime-600"
                  )}
                >
                  {isUpdatingProfile ? (
                    <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
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
          <div className="md:flex-1 md:min-h-0 overflow-visible md:overflow-y-auto px-3 sm:px-4 md:px-6 py-4 pb-6 space-y-6 animate-in fade-in">
            <div className="space-y-6 pb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800/80">
                <div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
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
              <div className="p-6 md:p-8 rounded-xl bg-zinc-900/60 border border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Dedicated History Logs Page
                  </span>
                  <h3 className="text-lg md:text-xl font-black text-slate-900 dark:text-white">
                    Access Dedicated Audit Logs
                  </h3>
                  <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
                    Inspect user-friendly change histories across all store sections, filter by page, view staff members who made changes, inspect details, and export clean audit reports.
                  </p>
                </div>

                <Link
                  href="/audit-logs"
                  className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-xl transition-colors text-xs flex items-center justify-center gap-2 shrink-0"
                >
                  <span>View Full Log</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              </div>

              {/* Recent 5 Logs Preview */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Recent 5 Database Changes
                  </h4>
                </div>

                <div className="overflow-x-auto rounded-xl border border-zinc-800/80 bg-zinc-900/30">
                  <table className="w-full text-left text-xs text-zinc-300">
                    <thead className="bg-zinc-900/80 border-b border-zinc-800/80 text-zinc-400 font-semibold uppercase tracking-wider">
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
