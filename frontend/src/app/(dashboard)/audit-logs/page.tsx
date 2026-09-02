"use client";

import { useEffect, useState } from "react";
import { apiClient } from "@/lib/api-client";
import { 
  ShieldCheck, 
  Search, 
  Download, 
  Calendar, 
  Filter, 
  ChevronLeft, 
  ChevronRight, 
  Code, 
  RefreshCw,
  Clock,
  User,
  Activity
} from "lucide-react";

interface AuditLogItem {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_role: string | null;
  action: string;
  resource: string;
  details: any;
  ip_address: string | null;
}

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchAuditLogs = async (currentPage = page) => {
    setIsLoading(true);
    try {
      const params: any = {
        page: currentPage,
        page_size: 15,
      };
      if (search) params.search = search;
      if (roleFilter) params.user_role = roleFilter;
      if (actionFilter) params.action = actionFilter;

      const response = await apiClient.get("/audit-logs", { params });
      setLogs(response.data.items || []);
      setTotal(response.data.total || 0);
      setTotalPages(response.data.total_pages || 1);
    } catch (err) {
      console.error("Failed to fetch audit logs:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs(1);
    setPage(1);
  }, [search, roleFilter, actionFilter]);

  const handlePageChange = (newPage: int) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
      fetchAuditLogs(newPage);
    }
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const token = localStorage.getItem("auth_token");
      const res = await fetch("http://localhost:8080/api/v1/audit-logs/export", {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `audit_logs_${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();

      // Refresh list to show AUDIT_EXPORT event
      fetchAuditLogs(1);
    } catch (err) {
      console.error("Failed to export audit logs:", err);
    } finally {
      setIsExporting(false);
    }
  };

  const getActionColor = (action: string) => {
    if (action.includes("FAILURE") || action.includes("DENIED")) {
      return "bg-red-500/10 text-red-400 border-red-500/30";
    }
    if (action.includes("SUCCESS") || action.includes("CREATED") || action.includes("CHECKOUT")) {
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/30";
    }
    if (action.includes("EXPORT") || action.includes("UPDATE")) {
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/30";
    }
    return "bg-zinc-800 text-zinc-300 border-zinc-700";
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              System Audit Logs
            </h1>
          </div>
          <p className="text-sm text-zinc-400 mt-1">
            Immutable, append-only security and transaction log records.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchAuditLogs(page)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white rounded-xl font-medium shadow-lg shadow-cyan-500/20 transition-all text-sm disabled:opacity-50"
          >
            <Download className="w-4 h-4" />
            <span>{isExporting ? "Exporting..." : "Export CSV"}</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search action, resource, IP..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Role Filter */}
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          <option value="">All Roles</option>
          <option value="admin">Admin</option>
          <option value="manager">Manager</option>
          <option value="cashier">Cashier</option>
          <option value="mechanic">Mechanic</option>
        </select>

        {/* Action Type Filter */}
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="bg-zinc-950/80 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        >
          <option value="">All Action Types</option>
          <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
          <option value="LOGIN_FAILURE">LOGIN_FAILURE</option>
          <option value="LOGOUT">LOGOUT</option>
          <option value="POS_CHECKOUT">POS_CHECKOUT</option>
          <option value="STOCK_UPDATE">STOCK_UPDATE</option>
          <option value="REPAIR_JOB_UPDATE">REPAIR_JOB_UPDATE</option>
          <option value="ACCESS_DENIED">ACCESS_DENIED</option>
          <option value="AUDIT_EXPORT">AUDIT_EXPORT</option>
        </select>

        {/* Counter */}
        <div className="flex items-center justify-end px-3 text-xs text-zinc-400">
          Total Logs: <span className="font-semibold text-cyan-400 ml-1.5">{total}</span>
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-zinc-300">
            <thead className="bg-zinc-950/80 border-b border-white/10 text-zinc-400 font-medium uppercase tracking-wider">
              <tr>
                <th className="py-3.5 px-4">Timestamp</th>
                <th className="py-3.5 px-4">User & Role</th>
                <th className="py-3.5 px-4">Action</th>
                <th className="py-3.5 px-4">Resource</th>
                <th className="py-3.5 px-4">IP Address</th>
                <th className="py-3.5 px-4 text-right">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading audit entries...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-zinc-500">
                    No audit logs found matching criteria.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3 px-4 text-zinc-400 whitespace-nowrap">
                      {log.timestamp ? new Date(log.timestamp).toLocaleString() : "-"}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <span className="text-zinc-200">{log.user_id ? log.user_id.slice(0, 8) + "..." : "Anonymous"}</span>
                        {log.user_role && (
                          <span className="px-2 py-0.5 text-[10px] rounded border bg-zinc-950 border-white/10 uppercase text-zinc-300">
                            {log.user_role}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className={`px-2.5 py-1 text-[10px] font-bold rounded-lg border uppercase tracking-wider ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-zinc-300 max-w-xs truncate">{log.resource}</td>
                    <td className="py-3 px-4 text-zinc-400">{log.ip_address || "127.0.0.1"}</td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                        className="p-1.5 rounded-lg hover:bg-zinc-800 text-cyan-400 transition-colors"
                        title="View Raw JSON Details"
                      >
                        <Code className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Expandable JSON Details Modal / Section */}
        {expandedId && (
          <div className="p-4 bg-zinc-950 border-t border-white/10 text-xs font-mono">
            <div className="flex justify-between items-center mb-2">
              <span className="text-cyan-400 font-semibold">JSON Audit Event Metadata ({expandedId})</span>
              <button onClick={() => setExpandedId(null)} className="text-zinc-500 hover:text-zinc-300">Close</button>
            </div>
            <pre className="p-3 bg-zinc-900 rounded-xl overflow-x-auto text-zinc-300">
              {JSON.stringify(logs.find(l => l.id === expandedId)?.details, null, 2) || "No extra metadata"}
            </pre>
          </div>
        )}

        {/* Pagination Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
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
  );
}
