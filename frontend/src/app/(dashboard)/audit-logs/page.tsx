"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { 
  Activity, 
  Search, 
  Download, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  ArrowLeft, 
  ShieldCheck, 
  RotateCcw,
  SlidersHorizontal,
  Code2
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

interface AuditLogItem {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_role: string | null;
  user_name?: string | null;
  user_email?: string | null;
  action: string;
  resource: string;
  details: any;
  ip_address: string | null;
}

const PAGE_FILTERS = [
  { label: "All Pages", value: "ALL" },
  { label: "POS & Sales", value: "POS & Sales" },
  { label: "Inventory", value: "Inventory" },
  { label: "Repairs", value: "Repairs" },
  { label: "Staff & Users", value: "Staff & Users" },
  { label: "Settings", value: "Settings" },
];

export function mapLogToPage(resource: string, action: string): string {
  const res = (resource || "").toLowerCase();
  const act = (action || "").toLowerCase();

  if (res.includes("/pos") || res.includes("/sales") || act.includes("transaction") || act.includes("sale") || act.includes("checkout")) {
    return "POS & Sales";
  }
  if (res.includes("/inventory") || res.includes("/items") || act.includes("stock") || act.includes("item") || act.includes("price")) {
    return "Inventory";
  }
  if (res.includes("/repairs") || res.includes("/motorcycles") || act.includes("repair") || act.includes("job")) {
    return "Repairs";
  }
  if (res.includes("/users") || res.includes("/auth/users") || act.includes("user") || act.includes("role") || act.includes("password")) {
    return "Staff & Users";
  }
  if (res.includes("/settings") || act.includes("settings")) {
    return "Settings";
  }
  return "General Store";
}

export function formatFriendlyAction(action: string): { label: string; color: string } {
  const act = action.toUpperCase();
  switch (act) {
    case "CREATE_USER":
      return { label: "User Created", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
    case "UPDATE_USER":
      return { label: "Profile Updated", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case "DELETE_USER":
      return { label: "User Removed", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    case "CHANGE_ROLE":
      return { label: "Role Changed", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    case "PASSWORD_CHANGED":
      return { label: "Password Updated", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
    case "STOCK_IN":
    case "CREATE_ITEM":
      return { label: "Stock Added", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "STOCK_OUT":
      return { label: "Stock Deducted", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "CREATE_TRANSACTION":
      return { label: "Sale Completed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "VOID_TRANSACTION":
      return { label: "Sale Voided", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    case "REPAIR_ORDER_CREATED":
      return { label: "Job Created", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case "REPAIR_STATUS_UPDATED":
      return { label: "Job Status Updated", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    default:
      return { label: action.replace(/_/g, " "), color: "bg-zinc-800 text-zinc-300 border-zinc-700" };
  }
}

export function formatChangesSummary(log: AuditLogItem): string {
  const details = log.details || {};
  const action = (log.action || "").toUpperCase();

  if (action === "CREATE_USER") {
    const email = details.created_email || details.email || "";
    const role = details.assigned_role || details.role || "";
    const name = details.name || "";
    return `Created new ${role ? role.toUpperCase() : "staff"} account for "${name || email}".`;
  }
  if (action === "UPDATE_USER") {
    const email = details.updated_email || details.email || "";
    const role = details.role ? ` with role ${details.role.toUpperCase()}` : "";
    return `Updated staff profile details for "${email}"${role}.`;
  }
  if (action === "CHANGE_ROLE") {
    const oldR = (details.old_role || "").toUpperCase();
    const newR = (details.new_role || "").toUpperCase();
    return `Transferred permissions from ${oldR} to ${newR}.`;
  }
  if (action === "DELETE_USER") {
    const email = details.deleted_email || details.email || "";
    return `Deactivated and deleted staff account for "${email}".`;
  }
  if (action === "PASSWORD_CHANGED") {
    return `Updated account security credentials.`;
  }
  if (action === "CREATE_TRANSACTION") {
    const invoice = details.invoice_no || details.invoice || "INV";
    const total = details.total ? `₱${Number(details.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "";
    const method = details.payment_method ? ` via ${details.payment_method}` : "";
    return `Completed checkout invoice #${invoice}${total ? ` for ${total}` : ""}${method}.`;
  }
  if (action === "STOCK_IN" || action === "INVENTORY_ADJUSTMENT") {
    const item = details.item_name || details.name || "inventory item";
    const qty = details.quantity_changed || details.qty || "";
    return `Added +${qty} units to stock for "${item}".`;
  }
  if (action === "REPAIR_STATUS_UPDATED") {
    const job = details.job_order_id ? `#${String(details.job_order_id).slice(0, 8)}` : "job";
    const status = details.new_status || details.status || "Updated";
    return `Progressed repair job ${job} to ${status.toUpperCase()}.`;
  }

  // Fallback description from details
  if (typeof details === "object" && details !== null && Object.keys(details).length > 0) {
    const pairs = Object.entries(details)
      .filter(([k]) => !k.toLowerCase().includes("page") && !k.toLowerCase().includes("filter"))
      .slice(0, 3)
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`);
    if (pairs.length > 0) {
      return pairs.join(", ");
    }
  }

  return `Database modification executed on ${log.resource || "system"}.`;
}

export default function SystemLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAuditLogs = async (currentPage = page) => {
    setIsLoading(true);
    let fetchedList: AuditLogItem[] = [];
    try {
      const params: any = { 
        page: currentPage, 
        page_size: 15,
        mutations_only: true 
      };
      if (search) params.search = search;
      if (roleFilter && roleFilter !== "ALL") params.user_role = roleFilter;

      const response = await apiClient.get("/audit-logs", { params });
      if (Array.isArray(response.data.items)) {
        fetchedList = response.data.items;
      }
    } catch (err) {
      // Fallback if needed
    }

    // Filter out read-only events from local list as well
    const NON_MUTATING = ["AUDIT_LOGS_VIEWED", "LOGIN_SUCCESS", "LOGOUT", "LOGIN_FAILURE", "AUDIT_EXPORT"];
    const filteredMutations = fetchedList.filter((l) => !NON_MUTATING.includes(l.action));

    // Apply Client-Side Page/Module Filter
    let displayedLogs = filteredMutations;
    if (selectedPage !== "ALL") {
      displayedLogs = displayedLogs.filter((l) => mapLogToPage(l.resource, l.action) === selectedPage);
    }

    setLogs(displayedLogs);
    setTotal(displayedLogs.length);
    setTotalPages(Math.max(1, Math.ceil(displayedLogs.length / 15)));
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAuditLogs(1);
    setPage(1);
  }, [search, selectedPage, roleFilter]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchAuditLogs(newPage);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const response = await apiClient.get("/audit-logs/export", {
        params: { mutations_only: true },
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `system_history_logs_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      console.error("Failed to export logs:", e);
    } finally {
      setIsExporting(false);
    }
  };

  const getRoleBadgeStyle = (r: string | null) => {
    switch ((r || "").toLowerCase()) {
      case "admin": return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
      case "manager": return "bg-purple-500/10 text-purple-400 border-purple-500/30";
      case "cashier": return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
      case "mechanic": return "bg-amber-500/10 text-amber-400 border-amber-500/30";
      default: return "bg-zinc-800 text-zinc-300 border-zinc-700";
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 font-sans text-zinc-100 flex flex-col w-full overflow-y-auto">
      {/* Top Action & Navigation Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 border border-white/10 px-4 py-2.5 rounded-xl hover:bg-zinc-800 self-start shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Settings</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-medium text-zinc-400 bg-zinc-900/80 border border-white/10 px-3.5 py-1.5 rounded-xl self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Admin Security Access</span>
        </div>
      </div>

      <div className="w-full space-y-6 flex-1 flex flex-col">
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
              <Activity className="w-8 h-8 text-cyan-400" />
              System History Logs
            </h1>
            <p className="text-zinc-400 mt-1 text-sm">
              Comprehensive, non-technical history of database modifications, price adjustments, and customer transactions across all store pages.
            </p>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all text-xs self-start md:self-auto disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Export Change Logs (CSV)</span>
              </>
            )}
          </button>
        </div>

        {/* Filter Bar */}
        <div className="p-4 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Search staff name, action, or changes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>

            {/* Page/Module Filter Pills */}
            <div className="flex bg-zinc-950 p-1 rounded-2xl border border-white/10 text-xs shadow-inner flex-wrap gap-1">
              {PAGE_FILTERS.map((f) => (
                <button
                  key={f.value}
                  onClick={() => setSelectedPage(f.value)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl font-semibold transition-all text-xs flex items-center gap-1.5",
                    selectedPage === f.value
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Role Filter and Total Counter */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-3 border-t border-white/5 text-xs">
            <div className="flex items-center gap-2">
              <span className="text-zinc-400">Filter Staff Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-zinc-950 border border-white/10 rounded-xl py-1 px-3 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="ALL">All Staff Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="mechanic">Mechanic</option>
              </select>
            </div>

            <div className="text-zinc-400 font-mono">
              Displaying <span className="text-cyan-400 font-bold">{logs.length}</span> recorded database changes
            </div>
          </div>
        </div>

        {/* User-Friendly System Logs Table */}
        <div className="flex-1 overflow-hidden flex flex-col bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl shadow-2xl">
          <div className="flex-1 overflow-y-auto overflow-x-auto">
            <table className="w-full text-left text-sm text-zinc-300">
              <thead className="bg-zinc-950/90 border-b border-white/10 text-zinc-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
                <tr>
                  <th className="py-4 px-6">Staff User</th>
                  <th className="py-4 px-4">Page / Section</th>
                  <th className="py-4 px-4">Action</th>
                  <th className="py-4 px-6">Changes Made</th>
                  <th className="py-4 px-6 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-sans">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-zinc-500 text-sm">
                      <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                      Loading system change history...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-16 text-center text-zinc-500 text-sm">
                      No database change history found matching selected filters.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const actionInfo = formatFriendlyAction(log.action);
                    const pageName = mapLogToPage(log.resource, log.action);
                    const changesText = formatChangesSummary(log);
                    const isExpanded = expandedId === log.id;

                    return (
                      <tr
                        key={log.id}
                        className="hover:bg-white/[0.03] transition-colors cursor-pointer"
                        onClick={() => setExpandedId(isExpanded ? null : log.id)}
                      >
                        {/* Staff User */}
                        <td className="py-4 px-6">
                          <div className="font-bold text-white text-sm">
                            {log.user_name || "System User"}
                          </div>
                          <div className="flex items-center gap-2 mt-1">
                            <span className={clsx("px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border", getRoleBadgeStyle(log.user_role))}>
                              {log.user_role || "ADMIN"}
                            </span>
                            {log.user_email && (
                              <span className="text-zinc-500 font-mono text-[11px] truncate max-w-[140px]">
                                {log.user_email}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Page / Section */}
                        <td className="py-4 px-4">
                          <span className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-zinc-950 border border-white/5 text-zinc-200">
                            {pageName}
                          </span>
                        </td>

                        {/* Action Badge */}
                        <td className="py-4 px-4">
                          <span className={clsx("px-2.5 py-1 rounded-xl text-xs font-bold border inline-block whitespace-nowrap", actionInfo.color)}>
                            {actionInfo.label}
                          </span>
                        </td>

                        {/* Changes Made */}
                        <td className="py-4 px-6 max-w-md">
                          <div className="text-xs text-zinc-200 leading-relaxed">
                            {changesText}
                          </div>
                          {isExpanded && log.details && (
                            <div className="mt-3 p-3 rounded-xl bg-zinc-950/80 border border-white/5 font-mono text-[11px] text-cyan-300 overflow-x-auto space-y-1 animate-in fade-in">
                              <div className="text-[10px] uppercase text-zinc-500 font-bold flex items-center gap-1 mb-1">
                                <Code2 className="w-3 h-3" /> Technical Event Payload
                              </div>
                              <pre className="whitespace-pre-wrap">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          )}
                        </td>

                        {/* Timestamp */}
                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="text-xs font-semibold text-zinc-200">
                            {log.timestamp ? new Date(log.timestamp).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : "—"}
                          </div>
                          <div className="text-[11px] text-zinc-500 font-mono mt-0.5">
                            {log.timestamp ? new Date(log.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : ""}
                          </div>
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
                onClick={() => handlePageChange(page - 1)}
                disabled={page === 1}
                className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => handlePageChange(page + 1)}
                disabled={page === totalPages}
                className="p-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
