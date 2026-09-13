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
import { UserAvatar } from "@/lib/avatars";
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { recordUserAuditLog } from "@/lib/audit";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";

interface UserProfile {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  avatar?: string | null;
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
      recordUserAuditLog("UPDATE_USER", `/users/${user.id}`, {
        userId: user.id,
        email: editEmail,
        role: editRole,
        firstName: editFirstName,
        lastName: editLastName,
      });
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
      recordUserAuditLog("DELETE_USER", `/users/${user.id}`, {
        userId: user.id,
        email: user.email,
        role: user.role,
        name: `${user.first_name} ${user.last_name}`,
      });
      setIsDeleteModalOpen(false);
      router.push("/settings?tab=users");
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
      case "admin": return "bg-lime-100 text-lime-800 border-lime-300 font-bold";
      case "manager": return "bg-purple-100 text-purple-800 border-purple-300 font-bold";
      case "cashier": return "bg-emerald-100 text-emerald-800 border-emerald-300 font-bold";
      case "mechanic": return "bg-amber-100 text-amber-800 border-amber-300 font-bold";
      default: return "bg-slate-100 text-slate-700 border-slate-200 font-bold";
    }
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-slate-50 min-h-screen">
        <DetailViewSkeleton hasTable={false} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center font-sans text-slate-800">
        <ShieldAlert className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 mb-1">User Profile Not Found</h2>
        <p className="text-xs text-slate-500 mb-6">The requested staff profile does not exist or has been removed.</p>
        <Link
          href="/settings?tab=users"
          className="px-5 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold flex items-center gap-2 shadow-sm transition-all"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Users List</span>
        </Link>
      </div>
    );
  }

  const fullName = `${user.first_name || ""} ${user.last_name || ""}`.trim() || "Staff Member";

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-16 bg-slate-50">
      <div className="w-full space-y-8 animate-profile-enter">
        {/* Top Action & Navigation Bar */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/settings?tab=users"
            className="px-4 py-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Users List</span>
          </Link>

          {/* Action Controls */}
          <div className="flex items-center gap-3">
            <button
              onClick={openEditModal}
              className="px-4 py-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold border border-lime-600 rounded-xl text-xs transition-all flex items-center gap-2 shadow-sm active:scale-[0.98]"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              disabled={isSelf}
              title={isSelf ? "You cannot delete your own account" : "Delete User Account"}
              className={clsx(
                "px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border",
                isSelf
                  ? "bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed shadow-none"
                  : "bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200 shadow-sm font-bold active:scale-[0.98]"
              )}
            >
              <Trash2 className="w-4 h-4 text-rose-600" />
              <span>Delete User</span>
            </button>
          </div>
        </div>

        {/* Main Profile Document Container */}
        <div className="w-full space-y-6">
        {/* Notifications */}
        {error && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 shadow-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <div className="font-medium">{success}</div>
          </div>
        )}

        {/* Staff Profile Document Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm space-y-8">
          {/* Top Banner with Avatar */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl border border-lime-200 flex items-center justify-center shrink-0 overflow-hidden bg-lime-50 shadow-sm">
                {user.avatar ? (
                  <UserAvatar avatarId={user.avatar} className="w-16 h-16" />
                ) : (
                  <div className="w-full h-full bg-lime-50 flex items-center justify-center text-lime-700 font-black text-2xl">
                    {user.first_name ? user.first_name[0] : "U"}
                    {user.last_name ? user.last_name[0] : ""}
                  </div>
                )}
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900">{fullName}</h1>
                  <span className={clsx("px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider", getRoleBadgeColor(user.role))}>
                    {user.role}
                  </span>
                  {isSelf && (
                    <span className="px-2 py-0.5 text-[10px] bg-lime-100 text-lime-800 border border-lime-300 rounded font-mono font-bold">
                      YOU
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 mt-1 font-mono">{user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-3 px-5 rounded-2xl border border-slate-200 self-start md:self-auto">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">User ID:</span>
              <span className="font-mono text-xs text-slate-700">{user.id.slice(0, 12)}...</span>
            </div>
          </div>

          {/* Profile Overview Grids */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Account Details Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                <IdCard className="w-4 h-4 text-lime-600" />
                Staff Account Credentials
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 text-xs font-medium">First Name:</span>
                  <span className="font-semibold text-slate-900">{user.first_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 text-xs font-medium">Last Name:</span>
                  <span className="font-semibold text-slate-900">{user.last_name || "—"}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 text-xs font-medium">Email Address:</span>
                  <span className="font-mono text-slate-800 text-xs font-medium">{user.email}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 text-xs font-medium">Operational Role:</span>
                  <span className="font-bold uppercase text-slate-900 text-xs">{user.role}</span>
                </div>
                <div className="flex justify-between py-1.5 border-b border-slate-200">
                  <span className="text-slate-500 text-xs font-medium">Date Registered:</span>
                  <span className="text-slate-700 text-xs">
                    {user.created_at ? new Date(user.created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : "—"}
                  </span>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-slate-500 text-xs font-medium">Account ID:</span>
                  <span className="font-mono text-xs text-slate-500">{user.id}</span>
                </div>
              </div>
            </div>

            {/* Compensation & Duty Pay Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                Duty Compensation & Pay Structure
              </h3>

              {user.role === "cashier" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1 font-medium">Standard Shift Wage</span>
                      <span className="text-2xl font-bold font-mono text-emerald-800">
                        ₱{Number(user.base_wage !== undefined && user.base_wage !== null ? user.base_wage : 650).toFixed(2)}
                      </span>
                      <span className="text-xs text-emerald-700 ml-1">/ shift</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700">
                      <Coins className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Standard daily base pay received per completed cashier shift during POS checkout operations.
                  </p>
                </div>
              ) : user.role === "mechanic" ? (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1 font-medium">Assigned Labor Commission</span>
                      <span className="text-2xl font-bold font-mono text-amber-800">
                        {user.commission_rate !== undefined && user.commission_rate !== null ? user.commission_rate : 40}%
                      </span>
                      <span className="text-xs text-amber-700 ml-1">on service labor</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-100 border border-amber-200 flex items-center justify-center text-amber-700">
                      <Percent className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Commission percentage earned by the mechanic based on completed job order labor charges.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 rounded-xl bg-lime-50 border border-lime-200 flex items-center justify-between">
                    <div>
                      <span className="text-xs text-slate-500 block mb-1 font-medium">Executive Compensation</span>
                      <span className="text-xl font-bold text-lime-900">Management Salary</span>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-lime-100 border border-lime-200 flex items-center justify-center text-lime-800">
                      <ShieldCheck className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Executive store supervisory role without per-shift duty wage or individual service labor commissions.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="md"
      >
        <ModalHeader
          icon={Edit3}
          iconVariant="lime"
          title="Edit Staff Profile"
          subtitle="Modify staff details, role, and compensation"
          onClose={() => setIsEditModalOpen(false)}
        />

        <form onSubmit={handleUpdateProfile}>
          <ModalBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">First Name</label>
                <input
                  type="text"
                  required
                  value={editFirstName}
                  onChange={(e) => setEditFirstName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 transition-all shadow-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Last Name</label>
                <input
                  type="text"
                  required
                  value={editLastName}
                  onChange={(e) => setEditLastName(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 transition-all shadow-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                required
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 font-mono transition-all shadow-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assigned Role</label>
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value)}
                disabled={isSelf}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 disabled:opacity-50 transition-all shadow-sm cursor-pointer"
              >
                <option value="cashier">Cashier</option>
                <option value="mechanic">Mechanic</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>
              {isSelf && (
                <p className="text-[10px] text-slate-500 mt-1">You cannot modify your own administrative role.</p>
              )}
            </div>

            {/* Conditional Compensation */}
            {editRole === "mechanic" && (
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 space-y-1.5">
                <label className="block text-xs font-semibold text-amber-800">
                  Mechanic Commission Rate (%) *
                </label>
                <div className="relative">
                  <Percent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-amber-600" />
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.5"
                    required
                    value={editCommissionRate}
                    onChange={(e) => setEditCommissionRate(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-amber-200 rounded-xl py-2 pl-8 pr-3 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 transition-all shadow-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Percentage of service labor charge earned by the mechanic on completed jobs.
                </p>
              </div>
            )}

            {editRole === "cashier" && (
              <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5">
                <label className="block text-xs font-semibold text-emerald-800">
                  Daily Shift Wage (₱) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 select-none">
                    ₱
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="10"
                    required
                    value={editBaseWage}
                    onChange={(e) => setEditBaseWage(parseFloat(e.target.value) || 0)}
                    className="w-full bg-white border border-emerald-200 rounded-xl py-2 pl-8 pr-3 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 transition-all shadow-sm"
                  />
                </div>
                <p className="text-[10px] text-slate-500">
                  Standard daily pay received per completed cashier shift.
                </p>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-all shadow-sm"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isUpdating}
              className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 border border-lime-600 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm active:scale-[0.98]"
            >
              {isUpdating ? "Saving..." : "Save Changes"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteUser}
        isLoading={isDeleting}
        confirmVariant="danger"
        title="Confirm Deletion"
        confirmText="Yes, Delete User"
        message={
          <div className="space-y-3">
            <p className="text-sm text-slate-700">
              Are you sure you want to delete <span className="font-semibold text-slate-900">{user.email}</span> ({fullName})? This action cannot be undone.
            </p>
          </div>
        }
      />

      </div>
    </div>
  );
}

