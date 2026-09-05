"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { saveStaffCompensationToDB } from "@/lib/compensation";
import { 
  User, 
  Mail, 
  ShieldCheck, 
  Calendar, 
  Edit3, 
  Trash2, 
  ArrowLeft, 
  Percent, 
  Coins, 
  ShieldAlert, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Sparkles,
  IdCard,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  commission_rate?: number | null;
  base_wage?: number | null;
  created_at: string | null;
}

export default function UserProfilePage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.id as string;

  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [currentUserRole, setCurrentUserRole] = useState<string>("");

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFirstName, setEditFirstName] = useState("");
  const [editLastName, setEditLastName] = useState("");
  const [editEmail, setEditEmail] = useState("");
  const [editRole, setEditRole] = useState("cashier");
  const [editCommissionRate, setEditCommissionRate] = useState<number>(40);
  const [editBaseWage, setEditBaseWage] = useState<number>(650);
  const [isUpdating, setIsUpdating] = useState(false);

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const loggedInId = localStorage.getItem("user_id") || "";
    const loggedInRole = (localStorage.getItem("user_role") || "").toLowerCase();
    setCurrentUserId(loggedInId);
    setCurrentUserRole(loggedInRole);

    if (userId) {
      fetchUserProfile();
    }
  }, [userId]);

  const fetchUserProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await apiClient.get<UserProfile>(`/auth/users/${userId}`);
      if (res.data) {
        setUser(res.data);
      }
    } catch (err: any) {
      console.error("Failed to load user profile:", err);
      setError("User profile not found or could not be loaded.");
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = () => {
    if (!user) return;
    setEditFirstName(user.first_name || "");
    setEditLastName(user.last_name || "");
    setEditEmail(user.email);
    setEditRole(user.role);
    setEditCommissionRate(
      user.commission_rate !== undefined && user.commission_rate !== null
        ? Number(user.commission_rate)
        : 40
    );
    setEditBaseWage(
      user.base_wage !== undefined && user.base_wage !== null
        ? Number(user.base_wage)
        : 650
    );
    setIsEditModalOpen(true);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsUpdating(true);
    setError(null);

    const commRateToSave = editRole === "mechanic" ? editCommissionRate : undefined;
    const baseWageToSave = editRole === "cashier" ? editBaseWage : undefined;

    try {
      const res = await apiClient.put<UserProfile>(`/auth/users/${user.id}`, {
        first_name: editFirstName,
        last_name: editLastName,
        email: editEmail,
        role: editRole,
        commission_rate: commRateToSave,
        base_wage: baseWageToSave,
      });

      // Synchronize centralized compensation store
      await saveStaffCompensationToDB(
        {
          id: user.id,
          first_name: editFirstName,
          last_name: editLastName,
          email: editEmail,
          role: editRole,
        },
        commRateToSave,
        baseWageToSave
      );

      setUser(res.data);
      setSuccess(`Profile for '${editEmail}' updated successfully.`);
      setIsEditModalOpen(false);
    } catch (err: any) {
      console.error("Failed to update user profile:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to update user profile.");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!user) return;

    setIsDeleting(true);
    setError(null);
    try {
      await apiClient.delete(`/auth/users/${user.id}`);
      setIsDeleteModalOpen(false);
      router.push("/users");
    } catch (err: any) {
      console.error("Failed to delete user:", err);
      const detail = err.response?.data?.detail;
      setError(typeof detail === "string" ? detail : "Failed to delete user account.");
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
    }
  };

  const isSelf = user?.id === currentUserId;
  const isAdmin = currentUserRole === "admin";

  const getRoleBadgeColor = (r: string) => {
    switch (r.toLowerCase()) {
      case "admin": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "manager": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "cashier": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "mechanic": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-400">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading staff profile details...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <ShieldAlert className="w-12 h-12 text-rose-400 mb-3" />
        <h2 className="text-xl font-bold mb-1">User Profile Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">The requested staff profile does not exist or has been removed.</p>
        <Link
          href="/users"
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Users List</span>
        </Link>
      </div>
    );
  }

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Staff Member";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans p-8 overflow-y-auto w-full">
      
      {/* Top Action & Navigation Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          href="/settings?tab=users"
          className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users List</span>
        </Link>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={openEditModal}
            className="px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 hover:text-white border border-white/10 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 shadow-lg"
          >
            <Edit3 className="w-4 h-4 text-cyan-400" />
            <span>Edit Profile</span>
          </button>

          <button
            onClick={() => setIsDeleteModalOpen(true)}
            disabled={isSelf}
            title={isSelf ? "You cannot delete your own account" : "Delete User Account"}
            className={clsx(
              "px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border",
              isSelf
                ? "bg-zinc-950 text-zinc-600 border-white/5 cursor-not-allowed opacity-50"
                : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border-rose-500/30 hover:border-rose-500/50 shadow-lg shadow-rose-950/30"
            )}
          >
            <Trash2 className="w-4 h-4 text-rose-400" />
            <span>Delete User</span>
          </button>
        </div>
      </div>

      {/* Main Profile Document Container */}
      <div className="w-full space-y-6">
        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <div>{success}</div>
          </div>
        )}

        {/* Staff Profile Document Card */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8">
          {/* Ambient Glow */}
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Top Banner with Avatar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-2xl shadow-inner">
                {user.first_name ? user.first_name[0] : "U"}
                {user.last_name ? user.last_name[0] : ""}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-white">{fullName}</h1>
                  <span className={clsx("px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider", getRoleBadgeColor(user.role))}>
                    {user.role}
                  </span>
                  {isSelf && (
                    <span className="px-2 py-0.5 text-[10px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded font-mono font-bold">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-sm text-zinc-400 mt-1 font-mono">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-zinc-950/80 p-3 px-5 rounded-2xl border border-white/5 self-start md:self-auto">
              <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">User ID:</span>
              <span className="font-mono text-xs text-zinc-300">{user.id.slice(0, 12)}...</span>
            </div>
          </div>

          {/* Profile Overview Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 relative z-10">
            {/* Account Details Panel */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <IdCard className="w-4 h-4 text-cyan-400" />
                Staff Account Credentials
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 text-xs">First Name:</span>
                  <span className="font-semibold text-zinc-100">{user.first_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 text-xs">Last Name:</span>
                  <span className="font-semibold text-zinc-100">{user.last_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 text-xs">Email Address:</span>
                  <span className="font-mono text-zinc-200 text-xs">{user.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 text-xs">Operational Role:</span>
                  <span className="font-bold uppercase text-zinc-200 text-xs">{user.role}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-white/5">
                  <span className="text-zinc-400 text-xs">Date Registered:</span>
                  <span className="text-zinc-300 text-xs">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-zinc-400 text-xs">Account ID:</span>
                  <span className="font-mono text-xs text-zinc-500">{user.id}</span>
                </div>
              </div>
            </div>

            {/* Compensation & Duty Pay Panel */}
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/5 pb-3">
                <Briefcase className="w-4 h-4 text-emerald-400" />
                Duty Compensation & Pay Structure
              </h3>

              {user.role === "cashier" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">Standard Shift Wage</span>
                      <span className="text-2xl font-bold font-mono text-emerald-400">
                        ₱{Number(user.base_wage !== undefined && user.base_wage !== null ? user.base_wage : 650).toFixed(2)}
                      </span>
                      <span className="text-xs text-emerald-500/80 ml-1">/ shift</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                      <Coins className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Standard daily base pay received per completed cashier shift during POS checkout operations.
                  </p>
                </div>
              ) : user.role === "mechanic" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-950/30 border border-amber-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">Assigned Labor Commission</span>
                      <span className="text-2xl font-bold font-mono text-amber-400">
                        {user.commission_rate !== undefined && user.commission_rate !== null ? user.commission_rate : 40}%
                      </span>
                      <span className="text-xs text-amber-500/80 ml-1">on service labor</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Commission percentage earned by the mechanic based on completed job order labor charges.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-cyan-950/30 border border-cyan-500/30 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-zinc-400 block mb-1">Executive Compensation</span>
                      <span className="text-xl font-bold text-cyan-300">Management Salary</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Executive store supervisory role without per-shift duty wage or individual service labor commissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl relative">
            <button
              onClick={() => setIsEditModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4">
              <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Edit Staff Profile</h3>
                <p className="text-xs text-zinc-400">Modify staff details, role, and compensation</p>
              </div>
            </div>

            <form onSubmit={handleUpdateProfile} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={editFirstName}
                    onChange={(e) => setEditFirstName(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={editLastName}
                    onChange={(e) => setEditLastName(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Assigned Role</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value)}
                  disabled={isSelf}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-xs text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 disabled:opacity-50"
                >
                  <option value="cashier">Cashier</option>
                  <option value="mechanic">Mechanic</option>
                  <option value="manager">Manager</option>
                  <option value="admin">Admin</option>
                </select>
                {isSelf && (
                  <p className="text-[10px] text-zinc-500 mt-1">You cannot modify your own administrative role.</p>
                )}
              </div>

              {/* Conditional Compensation */}
              {editRole === "mechanic" && (
                <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-amber-500/30 space-y-1.5">
                  <label className="block text-xs font-semibold text-amber-400">
                    Mechanic Commission Rate (%) *
                  </label>
                  <div className="relative">
                    <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-500" />
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.5"
                      required
                      value={editCommissionRate}
                      onChange={(e) => setEditCommissionRate(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-amber-500"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Percentage of service labor charge earned by the mechanic on completed jobs.
                  </p>
                </div>
              )}

              {editRole === "cashier" && (
                <div className="p-3.5 rounded-xl bg-zinc-950/90 border border-emerald-500/30 space-y-1.5">
                  <label className="block text-xs font-semibold text-emerald-400">
                    Daily Shift Wage (₱) *
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400 select-none">
                      ₱
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="10"
                      required
                      value={editBaseWage}
                      onChange={(e) => setEditBaseWage(parseFloat(e.target.value) || 0)}
                      className="w-full bg-zinc-900 border border-white/10 rounded-lg py-1.5 pl-8 pr-3 text-xs text-zinc-100 font-mono focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-zinc-500">
                    Standard daily pay received per completed cashier shift.
                  </p>
                </div>
              )}

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUpdating}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isUpdating ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete User Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-900 border border-rose-500/30 rounded-2xl p-6 shadow-2xl relative">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-zinc-100">Confirm Deletion</h3>
                <p className="text-xs text-zinc-400">This action permanently deletes the user account</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-6">
              Are you sure you want to delete <span className="font-semibold text-white">{user.email}</span> ({fullName})? This action cannot be undone.
            </p>

            <div className="flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteUser}
                disabled={isDeleting}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-rose-600/20 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete User"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
