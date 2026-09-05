"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { 
  Users, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  UserPlus, 
  ShieldAlert, 
  CheckCircle2, 
  ArrowRight,
  Filter,
  UserCheck
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface UserItem {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: string;
  created_at: string | null;
}

const ROLE_OPTIONS = [
  { label: "All Roles", value: "ALL" },
  { label: "Admin", value: "admin" },
  { label: "Manager", value: "manager" },
  { label: "Cashier", value: "cashier" },
  { label: "Mechanic", value: "mechanic" },
];

export default function UserManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("ALL");
  const [currentUserId, setCurrentUserId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loggedInId = localStorage.getItem("user_id") || "";
    setCurrentUserId(loggedInId);
  }, []);

  const fetchUsers = async (currentPage = page, roleFilter = selectedRole) => {
    setIsLoading(true);
    setError(null);
    try {
      const params: any = { page: currentPage, page_size: 10, search };
      if (roleFilter && roleFilter !== "ALL") {
        params.role = roleFilter;
      }
      const response = await apiClient.get("/auth/users", { params });
      setUsers(response.data.items || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (err: any) {
      console.error("Failed to fetch users:", err);
      setError("Failed to load user accounts. Please check your network connection.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(1, selectedRole);
    setPage(1);
  }, [search, selectedRole]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchUsers(newPage, selectedRole);
    }
  };

  const getRoleBadgeColor = (r: string) => {
    switch (r.toLowerCase()) {
      case "admin": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "manager": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "cashier": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "mechanic": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans text-zinc-100">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Users className="w-8 h-8 text-cyan-400" />
            User Management
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Manage store staff accounts, assign operational roles, and review individual user profiles.
          </p>
        </div>

        <Link
          href="/users/register"
          className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all text-sm self-start sm:self-auto"
        >
          <UserPlus className="w-4 h-4" />
          <span>Register New User</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 mb-6 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5 flex-shrink-0">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl mb-6 flex-shrink-0">
        <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>

          {/* Role Filter Pills */}
          <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/10 text-xs shadow-inner flex-wrap gap-1">
            {ROLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSelectedRole(opt.value)}
                className={clsx(
                  "px-3.5 py-1.5 rounded-xl font-semibold transition-all text-xs flex items-center gap-1.5",
                  selectedRole === opt.value
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="text-xs text-zinc-400 self-end md:self-auto font-mono">
          Total Users: <span className="font-semibold text-cyan-400">{total}</span>
        </div>
      </div>

      {/* User Table (Clean, expanded to full container space) */}
      <div className="flex-1 overflow-hidden flex flex-col bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
        <div className="flex-1 overflow-y-auto overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/90 border-b border-white/10 text-zinc-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="py-4 px-6">Staff Name</th>
                <th className="py-4 px-6">Email Address</th>
                <th className="py-4 px-6">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-zinc-500 text-sm">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading user records...
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-zinc-500 text-sm">
                    No users found matching current filters.
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const fullName = `${u.first_name || ""} ${u.last_name || ""}`.trim() || "Staff Member";

                  return (
                    <tr
                      key={u.id}
                      onClick={() => router.push(`/users/${u.id}`)}
                      className="hover:bg-white/[0.04] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-6 font-bold text-zinc-100">
                        <div className="flex items-center gap-2">
                          <span className="group-hover:text-cyan-300 transition-colors">{fullName}</span>
                          {isSelf && (
                            <span className="px-1.5 py-0.5 text-[9px] bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 rounded font-mono font-bold">
                              YOU
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-6 font-mono text-xs text-zinc-400">
                        {u.email}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${getRoleBadgeColor(u.role)}`}>
                          {u.role}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400 flex-shrink-0">
          <div>
            Page <span className="font-semibold text-zinc-200">{page}</span> of{" "}
            <span className="font-semibold text-zinc-200">{totalPages}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePageChange(page - 1);
              }}
              disabled={page === 1}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                handlePageChange(page + 1);
              }}
              disabled={page === totalPages}
              className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
