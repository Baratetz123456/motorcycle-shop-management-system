"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  Activity
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

type SettingsTab = "general" | "roles" | "profile" | "logs";

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

export default function SettingsPage() {
  const router = useRouter();

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

  // Tab 3: Profile State (All users)
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

  // Tab 4: System Logs Snapshot State (Admin only)
  const [recentLogs, setRecentLogs] = useState<RecentAuditItem[]>([]);
  const [totalLogsCount, setTotalLogsCount] = useState<number>(0);
  const [isLoadingLogs, setIsLoadingLogs] = useState(false);

  useEffect(() => {
    const role = (localStorage.getItem("user_role") || "").toLowerCase();
    const userId = localStorage.getItem("user_id") || "";
    const userEmail = localStorage.getItem("user_email") || "";

    setCurrentUserRole(role);
    setCurrentUserId(userId);

    const adminCheck = role === "admin";
    setIsAdmin(adminCheck);

    if (!adminCheck) {
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
    }

    setIsReady(true);
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
      const res = await apiClient.get("/audit-logs", {
        params: { page: 1, page_size: 5, mutations_only: true },
      });
      if (res.data) {
        setRecentLogs(res.data.items || []);
        setTotalLogsCount(res.data.total || 0);
      }
    } catch (e) {
      // Fallback
    } finally {
      setIsLoadingLogs(false);
    }
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
      setSettings((prev) => ({ ...prev, country: countryName }));
    }
  };

  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    saveSystemSettings(settings);
    setGeneralSuccess("Application preferences updated and broadcasted successfully.");
    setTimeout(() => setGeneralSuccess(null), 4000);
  };

  const handleResetGeneral = () => {
    setSettings(DEFAULT_SETTINGS);
    saveSystemSettings(DEFAULT_SETTINGS);
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
    if (!profile.id) return;
    setIsUpdatingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await apiClient.put(`/auth/users/${profile.id}`, {
        first_name: profile.first_name,
        last_name: profile.last_name,
        email: profile.email,
        role: profile.role, // Maintain existing role
      });

      if (res.data) {
        localStorage.setItem("user_email", profile.email);
        setProfileSuccess("User profile updated successfully.");
        setTimeout(() => setProfileSuccess(null), 4000);
      }
    } catch (err: any) {
      const detail = err.response?.data?.detail;
      setProfileError(typeof detail === "string" ? detail : "Failed to update profile. Please check inputs.");
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  if (!isReady) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const getRoleBadgeStyle = (r: string) => {
    switch (r.toLowerCase()) {
      case "admin": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "manager": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "cashier": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "mechanic": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans p-6 md:p-10 overflow-y-auto w-full">
      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
      />

      <div className="max-w-6xl w-full mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
              <Settings className="w-8 h-8 text-cyan-400" />
              {isAdmin ? "System Settings & Configuration" : "Staff Profile & Account Settings"}
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">
              {isAdmin 
                ? "Configure enterprise store identity, regional standards, dynamic role accessibility, and administrator credentials."
                : "Manage your personal staff account details, email address, and authentication password."}
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
              onClick={() => setActiveTab("general")}
              className={clsx(
                "flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "general"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Globe className="w-4 h-4" />
              <span>General Preferences</span>
            </button>

            <button
              onClick={() => setActiveTab("roles")}
              className={clsx(
                "flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "roles"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Sliders className="w-4 h-4" />
              <span>Role Accessibility</span>
            </button>

            <button
              onClick={() => setActiveTab("profile")}
              className={clsx(
                "flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "profile"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <User className="w-4 h-4" />
              <span>Admin Profile</span>
            </button>

            <button
              onClick={() => setActiveTab("logs")}
              className={clsx(
                "flex-1 min-w-[140px] px-4 py-2.5 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2",
                activeTab === "logs"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-lg shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <FileText className="w-4 h-4" />
              <span>System Logs Overview</span>
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
                  <Globe className="w-5 h-5 text-cyan-400" />
                  Application Identity & Regional Standards
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Customize the system branding, operational timezone, and national currency standards.
                </p>
              </div>

              {/* Live Preview Pill */}
              <div className="flex items-center gap-2 bg-zinc-950/80 px-4 py-2 rounded-xl border border-white/5 text-xs text-zinc-300 font-mono">
                <span className="text-zinc-500">Active Currency:</span>
                <span className="font-bold text-cyan-400">{settings.currencySymbol} {settings.currency}</span>
              </div>
            </div>

            {generalSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{generalSuccess}</span>
              </div>
            )}

            <form onSubmit={handleSaveGeneral} className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* App Name */}
                <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Application Branding Name
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={settings.appName}
                        onChange={(e) => setSettings({ ...settings, appName: e.target.value })}
                        placeholder="e.g. Versiklo Motorcycle Services"
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Appears on the sidebar header, official receipts, and browser tabs.
                  </p>
                </div>

                {/* Operational Timezone */}
                <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Operational Timezone
                    </label>
                    <div className="relative">
                      <Clock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <select
                        value={settings.timezone}
                        onChange={(e) => setSettings({ ...settings, timezone: e.target.value })}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                      >
                        {TIMEZONE_OPTIONS.map((tz) => (
                          <option key={tz.value} value={tz.value}>
                            {tz.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Used to synchronize repair orders, audit log timestamps, and shift punch clocks.
                  </p>
                </div>

                {/* Country Selection */}
                <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                      Country Location
                    </label>
                    <div className="relative">
                      <Globe className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <select
                        value={settings.country}
                        onChange={(e) => handleCountryChange(e.target.value)}
                        className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
                      >
                        {COUNTRY_OPTIONS.map((c) => (
                          <option key={c.country} value={c.country}>
                            {c.country} ({c.symbol} {c.currency})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <p className="text-xs text-zinc-500">
                    Determines legal tax structures and receipt formatting standards.
                  </p>
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

              {/* Action Buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={handleResetGeneral}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-white/5 hover:bg-zinc-900 transition-colors flex items-center justify-center gap-2"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Restore Factory Defaults</span>
                </button>

                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Save System Preferences</span>
                </button>
              </div>
            </form>
          </div>
        )}

        {/* TAB 2: ROLE ACCESSIBILITY MATRIX (Admin Only - No Resource Paths) */}
        {isAdmin && activeTab === "roles" && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Sliders className="w-5 h-5 text-cyan-400" />
                  Role Accessibility & Feature Access Matrix
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Configure feature availability for <strong>Manager</strong>, <strong>Cashier</strong>, and <strong>Mechanic</strong> roles.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleResetRoles}
                  className="px-3.5 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 bg-zinc-950 border border-white/5 transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset Default Matrix</span>
                </button>
                <button
                  onClick={handleSaveRoles}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save Role Permissions</span>
                </button>
              </div>
            </div>

            {rolesSuccess && (
              <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{rolesSuccess}</span>
              </div>
            )}

            {/* Matrix Table without Resource Paths */}
            <div className="overflow-x-auto rounded-2xl border border-white/10 bg-zinc-950/60 relative z-10">
              <table className="w-full text-left text-sm text-zinc-300">
                <thead className="bg-zinc-950 border-b border-white/10 text-xs font-semibold uppercase tracking-wider text-zinc-400">
                  <tr>
                    <th className="py-4 px-6">Store Module / Feature</th>
                    <th className="py-4 px-4 text-center">Manager</th>
                    <th className="py-4 px-4 text-center">Cashier</th>
                    <th className="py-4 px-4 text-center">Mechanic</th>
                    <th className="py-4 px-4 text-center">Admin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-xs">
                  {CONFIGURABLE_MODULES.map((mod) => {
                    const roles = modulePermissions[mod.id] || ["admin"];
                    const managerEnabled = roles.includes("manager");
                    const cashierEnabled = roles.includes("cashier");
                    const mechanicEnabled = roles.includes("mechanic");

                    return (
                      <tr key={mod.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-white text-sm">{mod.name}</div>
                          <div className="text-zinc-400 text-xs mt-0.5">{mod.description}</div>
                        </td>

                        {/* Manager Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRole(mod.id, "manager")}
                            className={clsx(
                              "w-12 h-6 rounded-full transition-colors relative inline-flex items-center p-1 focus:outline-none",
                              managerEnabled ? "bg-purple-600" : "bg-zinc-800"
                            )}
                          >
                            <span
                              className={clsx(
                                "w-4 h-4 rounded-full bg-white transition-transform transform shadow",
                                managerEnabled ? "translate-x-6" : "translate-x-0"
                              )}
                            />
                          </button>
                        </td>

                        {/* Cashier Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRole(mod.id, "cashier")}
                            className={clsx(
                              "w-12 h-6 rounded-full transition-colors relative inline-flex items-center p-1 focus:outline-none",
                              cashierEnabled ? "bg-emerald-600" : "bg-zinc-800"
                            )}
                          >
                            <span
                              className={clsx(
                                "w-4 h-4 rounded-full bg-white transition-transform transform shadow",
                                cashierEnabled ? "translate-x-6" : "translate-x-0"
                              )}
                            />
                          </button>
                        </td>

                        {/* Mechanic Toggle */}
                        <td className="py-4 px-4 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleModuleRole(mod.id, "mechanic")}
                            className={clsx(
                              "w-12 h-6 rounded-full transition-colors relative inline-flex items-center p-1 focus:outline-none",
                              mechanicEnabled ? "bg-amber-600" : "bg-zinc-800"
                            )}
                          >
                            <span
                              className={clsx(
                                "w-4 h-4 rounded-full bg-white transition-transform transform shadow",
                                mechanicEnabled ? "translate-x-6" : "translate-x-0"
                              )}
                            />
                          </button>
                        </td>

                        {/* Admin Locked */}
                        <td className="py-4 px-4 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                            <Lock className="w-3 h-3" /> Master
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-zinc-500 text-center">
              Changes apply across active browser sessions automatically when saved.
            </p>
          </div>
        )}

        {/* TAB 3: USER PROFILE & PASSWORD (Visible to ALL roles) */}
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
                    Update your personal account details and manage login credentials.
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

                {/* Email */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    Work Email Address <span className="text-rose-400">*</span>
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

                {/* System Account ID */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                    System Account ID
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      readOnly
                      disabled
                      value={profile.id || currentUserId}
                      className="w-full bg-zinc-950/60 border border-white/5 rounded-xl py-2.5 px-4 text-xs font-mono text-zinc-400 cursor-not-allowed"
                    />
                  </div>
                </div>
              </div>

              {/* Password Section */}
              <div className="p-6 rounded-2xl bg-zinc-950/60 border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    Account Authentication & Password
                  </div>
                  <div className="text-xs text-zinc-400 mt-1">
                    Keep your account secure with periodic credential updates.
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPasswordModalOpen(true)}
                  className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-white/10 rounded-xl text-xs font-semibold text-cyan-300 transition-colors flex items-center justify-center gap-2 self-start sm:self-auto"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span>Change Password</span>
                </button>
              </div>

              {/* Actions */}
              <div className="flex justify-end pt-4 border-t border-white/10">
                <button
                  type="submit"
                  disabled={isUpdatingProfile}
                  className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center gap-2 disabled:opacity-50"
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

        {/* TAB 4: SYSTEM LOGS OVERVIEW (Admin Only) */}
        {isAdmin && activeTab === "logs" && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8 animate-in fade-in">
            <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/10 relative z-10">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <Activity className="w-5 h-5 text-cyan-400" />
                  System Change History Logs
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Live snapshot of business actions and database modifications across all store pages.
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
                  Access the Dedicated System Logs Page
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 max-w-2xl">
                  Inspect user-friendly change histories across all store sections, filter by page, view staff members who made changes, inspect details, and export clean audit reports.
                </p>
              </div>

              <Link
                href="/audit-logs"
                className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-xs flex items-center justify-center gap-2 shrink-0"
              >
                <span>Open Dedicated Logs Page</span>
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
