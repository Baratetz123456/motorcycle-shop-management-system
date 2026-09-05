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
  Filter
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";
import { 
  getSystemSettings, 
  saveSystemSettings, 
  TIMEZONE_OPTIONS, 
  COUNTRY_OPTIONS, 
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
import { THEME_OPTIONS, getAppTheme, saveAppTheme, applyThemeToDocument, AppTheme } from "@/lib/theme";
import { AVATAR_PRESETS, UserAvatar } from "@/lib/avatars";

type SettingsTab = "general" | "roles" | "users" | "profile" | "logs";

interface UserProfileData {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
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

  // Avatar State (All users)
  const [selectedAvatar, setSelectedAvatar] = useState<string>("avatar-1");
  const [savedAvatar, setSavedAvatar] = useState<string>("avatar-1");
  const savedAvatarRef = useRef<string>("avatar-1");

  // Dirty Flags
  const isThemeDirty = activeTheme !== savedTheme;
  const isAvatarDirty = selectedAvatar !== savedAvatar;

  useEffect(() => {
    savedThemeRef.current = savedTheme;
  }, [savedTheme]);

  useEffect(() => {
    savedAvatarRef.current = savedAvatar;
  }, [savedAvatar]);

  // Cleanup on unmount: if leaving the settings page with an unsaved theme preview, revert to savedTheme!
  useEffect(() => {
    return () => {
      applyThemeToDocument(savedThemeRef.current);
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

    // Initialize Theme
    const storedTheme = getAppTheme();
    setActiveTheme(storedTheme);
    setSavedTheme(storedTheme);
    savedThemeRef.current = storedTheme;

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
        });
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
    saveSystemSettings(settings);

    // Commit theme if changed
    if (activeTheme !== savedTheme) {
      saveAppTheme(activeTheme);
      setSavedTheme(activeTheme);
      savedThemeRef.current = activeTheme;
    }

    setGeneralSuccess("Application preferences and theme updated successfully.");
    setTimeout(() => setGeneralSuccess(null), 4000);
  };

  const handleResetGeneral = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSystemSettings(DEFAULT_SETTINGS);
    setActiveTheme("cyan");
    applyThemeToDocument("cyan");
    saveAppTheme("cyan");
    setSavedTheme("cyan");
    savedThemeRef.current = "cyan";
    setGeneralSuccess("Preferences restored to factory defaults.");
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
      });

      if (res.data) {
        setProfile({
          id: res.data.id || currentUserId,
          first_name: res.data.first_name || profile.first_name,
          last_name: res.data.last_name || profile.last_name,
          email: res.data.email || profile.email,
          role: res.data.role || profile.role,
        });
        localStorage.setItem("user_email", res.data.email || profile.email);
        const updatedName = [res.data.first_name || profile.first_name, res.data.last_name || profile.last_name].filter(Boolean).join(" ");
        if (updatedName) {
          localStorage.setItem("user_name", updatedName);
          window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: { userName: updatedName } }));
        }
      }

      // Commit Avatar selection to localStorage and broadcast to sidebar
      if (selectedAvatar !== savedAvatar) {
        localStorage.setItem("user_avatar", selectedAvatar);
        window.dispatchEvent(new CustomEvent("user_profile_updated", { detail: { avatarId: selectedAvatar } }));
        setSavedAvatar(selectedAvatar);
        savedAvatarRef.current = selectedAvatar;
      }

      // If non-admin and theme changed, commit theme
      if (!isAdmin && activeTheme !== savedTheme) {
        saveAppTheme(activeTheme);
        setSavedTheme(activeTheme);
        savedThemeRef.current = activeTheme;
      }

      setProfileSuccess("Your profile, avatar, and preferences have been saved successfully.");
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
  const renderThemeSelector = () => (
    <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Palette className="w-4 h-4 text-cyan-400" />
            App Theme & Visual Identity
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            Choose your preferred color palette for accents, status highlights, and dashboard badges.
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
        {THEME_OPTIONS.map((theme) => {
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

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans p-8 overflow-y-auto w-full">
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <div className="w-full space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
              <Settings className="w-8 h-8 text-cyan-400" />
              {isAdmin ? "Shop Settings" : "My Profile"}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">
              {isAdmin 
                ? "Configure store currency, timezone, staff access, and appearance."
                : "Manage your staff account details, appearance theme, and password."}
            </p>
          </div>

          <div className="flex items-center gap-2 bg-zinc-900 border border-white/10 px-4 py-2 rounded-2xl self-start md:self-auto shadow-inner">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span className={clsx("text-xs font-semibold uppercase tracking-wider px-2 py-0.5 rounded-lg border", getRoleBadgeStyle(currentUserRole))}>
              {currentUserRole || "USER"}
            </span>
          </div>
        </div>

        {/* Segmented Navigation Tabs (Rendered for Admin Only) */}
        {isAdmin && (
          <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 shadow-inner flex-wrap gap-1.5">
            <button
              onClick={() => handleTabChange("general")}
              className={clsx(
                "flex-1 min-w-[130px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
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
                "flex-1 min-w-[130px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
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
                "flex-1 min-w-[130px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
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
                "flex-1 min-w-[130px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
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
                "flex-1 min-w-[130px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
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

        {/* TAB 1: GENERAL APP CONFIGURATION (Admin Only) */}
        {isAdmin && activeTab === "general" && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Building className="w-5 h-5 text-cyan-400" />
                  Store Preferences
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Shop branding, timezone, currency, and appearance.
                </p>
              </div>

              {generalSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{generalSuccess}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleSaveGeneral} className="space-y-6 relative z-10">
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

                {/* Shop Floor Description */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Shop Floor Description / Subtitle <span className="text-cyan-400">*</span>
                  </label>
                  <div className="relative">
                    <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <input
                      type="text"
                      required
                      value={settings.shopDescription || "Shop Floor"}
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

              {/* Theme Preference Selector */}
              {renderThemeSelector()}

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetGeneral}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-white/5 hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Defaults</span>
                </button>

                <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                  {isThemeDirty && (
                    <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                      <Sparkles className="w-3.5 h-3.5" />
                      Theme preview active
                    </span>
                  )}
                  <button
                    type="submit"
                    className={clsx(
                      "w-full sm:w-auto px-6 py-2.5 font-semibold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2",
                      isThemeDirty
                        ? "bg-gradient-to-r from-cyan-400 to-blue-500 text-white ring-2 ring-cyan-400/50 shadow-cyan-500/30 scale-105"
                        : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-500/20"
                    )}
                  >
                    <Save className="w-4 h-4" />
                    <span>Save Store Preferences</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: ROLE ACCESSIBILITY MATRIX (Admin Only - No Resource Paths) */}
        {isAdmin && activeTab === "roles" && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  Role Access Matrix
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Control which operational sections each staff role is authorized to visit and operate.
                </p>
              </div>

              {rolesSuccess && (
                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2 animate-in fade-in">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{rolesSuccess}</span>
                </div>
              )}
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

            {/* Matrix Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10 relative z-10">
              <button
                type="button"
                onClick={handleResetRoles}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-white/5 hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                onClick={handleSaveRoles}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 3: STAFF & USER MANAGEMENT (Admin Only - Migrated from Sidebar) */}
        {isAdmin && activeTab === "users" && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-6 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Top Action Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Users className="w-5 h-5 text-cyan-400" />
                  Staff Accounts
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Provision staff accounts, assign operational roles, and review individual user profiles.
                </p>
              </div>

              <Link
                href="/users/register"
                className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all text-xs self-start sm:self-auto"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Add Staff</span>
              </Link>
            </div>

            {staffError && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-start gap-2.5">
                <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                <div>{staffError}</div>
              </div>
            )}

            {/* Search and Role Filter Pills Bar */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-zinc-950/70 border border-white/10 rounded-2xl relative z-10">
              {/* Search */}
              <div className="relative w-full md:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  placeholder="Search staff name or email..."
                  value={staffSearch}
                  onChange={(e) => setStaffSearch(e.target.value)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {/* Role Filter Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                <Filter className="w-3.5 h-3.5 text-zinc-500 mr-1 hidden sm:block" />
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setStaffRoleFilter(option.value)}
                    className={clsx(
                      "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border",
                      staffRoleFilter === option.value
                        ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                        : "bg-zinc-900 text-zinc-400 border-white/5 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Staff Users Table */}
            <div className="relative z-10 overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/60 shadow-xl">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-950 border-b border-white/10 uppercase text-[11px] text-zinc-400 font-semibold tracking-wider">
                  <tr>
                    <th className="py-4 px-6">Staff Member</th>
                    <th className="py-4 px-6">Email Address</th>
                    <th className="py-4 px-6">Assigned Role</th>
                    <th className="py-4 px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-sans">
                  {staffLoading ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs">
                        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                        Loading staff user records...
                      </td>
                    </tr>
                  ) : staffUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-12 text-center text-zinc-500 text-xs">
                        No staff accounts found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    staffUsers.map((user) => {
                      const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Staff Member";
                      const initials = `${user.first_name ? user.first_name[0] : ""}${user.last_name ? user.last_name[0] : ""}`.toUpperCase() || "U";
                      return (
                        <tr key={user.id} className="hover:bg-white/[0.02] transition-colors group">
                          <td className="py-4 px-6">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center font-bold text-cyan-400 text-xs shrink-0">
                                {initials}
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

                          <td className="py-4 px-6 text-zinc-300 font-mono text-[11px]">
                            {user.email}
                          </td>

                          <td className="py-4 px-6">
                            <span className={clsx("px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border", getRoleBadgeStyle(user.role))}>
                              {user.role}
                            </span>
                          </td>

                          <td className="py-4 px-6 text-right">
                            <Link
                              href={`/users/${user.id}`}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-cyan-500/40 text-zinc-300 hover:text-white transition-all text-xs font-semibold shadow-sm"
                            >
                              <span>View Profile</span>
                              <ArrowRight className="w-3 h-3 text-cyan-400" />
                            </Link>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2 relative z-10 text-xs text-zinc-400">
              <div>
                Showing <span className="font-bold text-white">{staffUsers.length}</span> of <span className="font-bold text-white">{staffTotal}</span> registered staff members
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleStaffPageChange(staffPage - 1)}
                  disabled={staffPage <= 1 || staffLoading}
                  className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="px-3 py-1 bg-zinc-900/80 rounded-xl border border-white/10 font-mono text-xs">
                  Page {staffPage} of {staffTotalPages || 1}
                </span>
                <button
                  type="button"
                  onClick={() => handleStaffPageChange(staffPage + 1)}
                  disabled={staffPage >= staffTotalPages || staffLoading}
                  className="p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: PROFILE & SECURITY (All Roles) */}
        {activeTab === "profile" && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-xl shadow-inner">
                  {profile.first_name ? profile.first_name[0] : "U"}
                  {profile.last_name ? profile.last_name[0] : ""}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-white flex items-center gap-2">
                    Staff Profile & Security
                  </h2>
                  <p className="text-xs text-zinc-400 mt-0.5">
                    Update your personal account details, visual theme, and manage login credentials.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className={clsx("px-3 py-1 rounded-xl text-xs font-bold uppercase tracking-wider border", getRoleBadgeStyle(profile.role))}>
                  Role: {profile.role.toUpperCase()}
                </span>
              </div>
            </div>

            {profileSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{profileSuccess}</span>
              </div>
            )}

            {profileError && (
              <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* First Name */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    First Name <span className="text-rose-400">*</span>
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
                    Last Name <span className="text-rose-400">*</span>
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
                    Email Address <span className="text-rose-400">*</span>
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

              {/* Personal Theme Selector (Non-admins configure theme here; Admins configure it in General Store Preferences) */}
              {!isAdmin && renderThemeSelector()}

              {/* Profile Face Avatar Presets & Live Persona Identity Preview */}
              <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-6 shadow-xl backdrop-blur-sm">
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
                          "p-5 rounded-2xl bg-gradient-to-b from-zinc-900/90 to-zinc-950/90 border shadow-lg relative overflow-hidden group transition-all",
                          isAvatarDirty ? "border-amber-500/40 ring-1 ring-amber-500/20" : "border-white/10"
                        )}>
                          {/* Ambient glow from persona gradient */}
                          <div className={clsx(
                            "absolute -top-10 -right-10 w-36 h-36 rounded-full blur-3xl opacity-20 bg-gradient-to-tr pointer-events-none transition-all duration-500",
                            activePreset.bgGradient
                          )} />

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

                        {/* Sidebar Bottom Dock Live Simulation */}
                        <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/5 space-y-2">
                          <div className="flex items-center justify-between text-[11px] text-zinc-400 font-medium">
                            <span className="flex items-center gap-1.5">
                              <Activity className="w-3.5 h-3.5 text-cyan-400" />
                              Sidebar Dock Mockup
                            </span>
                            {isAvatarDirty ? (
                              <span className="text-[10px] text-amber-400 font-mono flex items-center gap-1 font-semibold">
                                <Sparkles className="w-3 h-3 animate-pulse" />
                                Previewing (Unsaved)
                              </span>
                            ) : (
                              <span className="text-[10px] text-emerald-400 font-mono flex items-center gap-1 font-semibold">
                                <Check className="w-3 h-3" />
                                Active Synced
                              </span>
                            )}
                          </div>

                          <div className={clsx(
                            "p-2.5 rounded-xl bg-zinc-950/80 border flex items-center gap-3 shadow-inner transition-colors",
                            isAvatarDirty ? "border-amber-500/30" : "border-white/10"
                          )}>
                            <UserAvatar avatarId={selectedAvatar} className="w-8 h-8" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-zinc-100 truncate">{fullName}</p>
                              <span className={clsx("inline-block px-1.5 py-0.5 text-[9px] font-semibold border rounded uppercase tracking-wider", getRoleBadgeStyle(profile.role))}>
                                {profile.role}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* Right Column: 12 Distinct Flat Persona Cards */}
                  <div className="lg:col-span-8 xl:col-span-8">
                    <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
                      {AVATAR_PRESETS.map((preset) => {
                        const isSelected = selectedAvatar === preset.id;
                        const isCurrentSaved = savedAvatar === preset.id;

                        return (
                          <button
                            key={preset.id}
                            type="button"
                            onClick={() => handleSelectAvatar(preset.id)}
                            className={clsx(
                              "p-3 rounded-2xl border text-left transition-all relative group flex flex-col items-center justify-between gap-2.5 min-h-[148px]",
                              isSelected
                                ? isAvatarDirty
                                  ? "bg-amber-500/10 border-amber-500 shadow-lg shadow-amber-500/10 ring-2 ring-amber-500/40 -translate-y-0.5"
                                  : "bg-cyan-500/10 border-cyan-500 shadow-lg shadow-cyan-500/10 ring-2 ring-cyan-500/40 -translate-y-0.5"
                                : "bg-zinc-900/40 border-white/5 hover:border-white/20 hover:bg-zinc-900/80 hover:-translate-y-0.5"
                            )}
                            title={`${preset.name} - ${preset.roleHint} (${preset.department})`}
                          >
                            {/* Selection / Checkmark Indicator */}
                            {isSelected && (
                              <div className={clsx(
                                "absolute top-2 right-2 w-5 h-5 rounded-full flex items-center justify-center shadow-md animate-in zoom-in-50 duration-150",
                                isAvatarDirty ? "bg-amber-400 text-zinc-950" : "bg-cyan-500 text-zinc-950"
                              )}>
                                {isAvatarDirty ? (
                                  <Sparkles className="w-3 h-3 stroke-[2.5]" />
                                ) : (
                                  <Check className="w-3 h-3 stroke-[3]" />
                                )}
                              </div>
                            )}

                            {/* Flat Avatar Graphic (56px) */}
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
                                  ? isAvatarDirty ? "text-amber-300" : "text-cyan-300"
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
              <div className="p-6 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
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
                  className="px-4 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center justify-center gap-2 shrink-0 shadow-sm"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              </div>

              {/* Save Profile */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                {(isAvatarDirty || (!isAdmin && isThemeDirty)) ? (
                  <span className="text-xs text-amber-400 flex items-center gap-1.5 font-medium animate-pulse">
                    <Sparkles className="w-3.5 h-3.5" />
                    You have unsaved changes ({isAvatarDirty ? "Avatar" : ""}{isAvatarDirty && !isAdmin && isThemeDirty ? " & " : ""}{!isAdmin && isThemeDirty ? "Theme" : ""}). Click Save to persist.
                  </span>
                ) : (
                  <span className="text-xs text-zinc-500">
                    All profile preferences are currently saved.
                  </span>
                )}

                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className={clsx(
                    "w-full sm:w-auto px-6 py-2.5 font-semibold rounded-xl shadow-lg transition-all text-xs flex items-center justify-center gap-2 disabled:opacity-50",
                    (isAvatarDirty || (!isAdmin && isThemeDirty))
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
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
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
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-zinc-500 text-xs">
                          <div className="w-5 h-5 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                          Loading recent change logs...
                        </td>
                      </tr>
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
        )}
      </div>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
