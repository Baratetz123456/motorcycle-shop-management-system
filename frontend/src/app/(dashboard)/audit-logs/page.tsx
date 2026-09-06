"use client";

import { useEffect, useState, useMemo } from "react";
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
  Code2,
  Calendar,
  X,
  Filter
} from "lucide-react";
import Link from "next/link";
import clsx from "clsx";

export interface AuditLogItem {
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

export const PAGE_FILTERS = [
  { label: "All Pages", value: "ALL" },
  { label: "Showroom Counter", value: "Showroom Counter" },
  { label: "Parts & Stock", value: "Parts & Stock" },
  { label: "Workshop", value: "Workshop" },
  { label: "Payroll & Expenses", value: "Payroll & Expenses" },
  { label: "Staff & Users", value: "Staff & Users" },
  { label: "Shop Settings", value: "Shop Settings" },
];

export function mapLogToPage(resource: string, action: string): string {
  const res = (resource || "").toLowerCase();
  const act = (action || "").toLowerCase();

  // Showroom Counter (POS & Sales transactions)
  if (
    res.includes("/pos") || 
    res.includes("/sales") || 
    act.includes("transaction") || 
    act.includes("sale") || 
    act.includes("checkout")
  ) {
    return "Showroom Counter";
  }

  // Parts & Stock (Inventory, Catalog, Stock adjustments)
  if (
    res.includes("/inventory") || 
    res.includes("/items") || 
    act.includes("stock") || 
    act.includes("item") || 
    act.includes("price")
  ) {
    return "Parts & Stock";
  }

  // Workshop (Repairs, Job Orders, Motorcycles)
  if (
    res.includes("/repairs") || 
    res.includes("/motorcycles") || 
    act.includes("repair") || 
    act.includes("job") || 
    act.includes("motorcycle") ||
    act.includes("diagnosis")
  ) {
    return "Workshop";
  }

  // Payroll & Expenses (Disbursements, Operating Expenses, Daily Cash Out)
  if (
    res.includes("/payroll") || 
    res.includes("/reports/extract") || 
    act.includes("payroll") || 
    act.includes("expense")
  ) {
    return "Payroll & Expenses";
  }

  // Staff & Users (User accounts, roles, security passwords)
  if (
    res.includes("/users") || 
    res.includes("/auth") || 
    act.includes("user") || 
    act.includes("role") || 
    act.includes("password")
  ) {
    return "Staff & Users";
  }

  // Shop Settings (Store config, board statuses, permissions)
  if (
    res.includes("/settings") || 
    act.includes("setting") || 
    act.includes("permission")
  ) {
    return "Shop Settings";
  }

  return "General Store";
}

export function formatFriendlyAction(action: string): { label: string; color: string } {
  const act = (action || "").toUpperCase();
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
    case "ITEM_UPDATED":
      return { label: "Stock Item Updated", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case "ITEM_DELETED":
      return { label: "Stock Item Removed", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    case "CREATE_TRANSACTION":
    case "POS_CHECKOUT":
      return { label: "Sale Completed", color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30" };
    case "VOID_TRANSACTION":
      return { label: "Sale Voided", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    case "REPAIR_ORDER_CREATED":
      return { label: "Job Created", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case "REPAIR_STATUS_UPDATED":
      return { label: "Job Status Updated", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "DIAGNOSIS_UPDATED":
      return { label: "Diagnosis Updated", color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30" };
    case "REPAIR_ORDER_DELETED":
      return { label: "Job Order Deleted", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    case "MOTORCYCLE_CREATED":
      return { label: "Motorcycle Added", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
    case "MOTORCYCLE_UPDATED":
      return { label: "Motorcycle Updated", color: "bg-blue-500/10 text-blue-400 border-blue-500/30" };
    case "MOTORCYCLE_DELETED":
      return { label: "Motorcycle Removed", color: "bg-rose-500/10 text-rose-400 border-rose-500/30" };
    case "PAYROLL_DISBURSED":
      return { label: "Payroll Disbursed", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    case "ADD_SHOP_EXPENSE":
      return { label: "Shop Expense Added", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "SETTINGS_UPDATED":
      return { label: "Settings Saved", color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" };
    case "SETTINGS_RESTORED_DEFAULTS":
      return { label: "Settings Reset", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
    case "ROLE_PERMISSIONS_UPDATED":
      return { label: "Permissions Saved", color: "bg-purple-500/10 text-purple-400 border-purple-500/30" };
    case "ROLE_PERMISSIONS_RESET":
      return { label: "Permissions Reset", color: "bg-amber-500/10 text-amber-400 border-amber-500/30" };
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
  if (action === "CREATE_TRANSACTION" || action === "POS_CHECKOUT") {
    const invoice = details.invoice_no || details.invoice || details.invoiceNo || "INV";
    const total = details.total ? `₱${Number(details.total).toLocaleString(undefined, { minimumFractionDigits: 2 })}` : "";
    const method = details.payment_method || details.paymentMethod ? ` via ${details.payment_method || details.paymentMethod}` : "";
    const customer = details.customerName ? ` (${details.customerName})` : "";
    return `Completed checkout invoice #${invoice}${total ? ` for ${total}` : ""}${method}${customer}.`;
  }
  if (action === "STOCK_IN" || action === "INVENTORY_ADJUSTMENT") {
    const item = details.item_name || details.name || "inventory item";
    const qty = details.quantity_changed || details.qty || "";
    return `Added +${qty} units to stock for "${item}".`;
  }
  if (action === "CREATE_ITEM") {
    const name = details.name || details.item_name || "inventory item";
    const price = details.price ? ` at ₱${Number(details.price).toLocaleString()}` : "";
    return `Added new inventory item "${name}"${price}.`;
  }
  if (action === "ITEM_UPDATED") {
    const name = details.name || details.item_name || details.sku || "inventory item";
    return `Modified inventory details for "${name}".`;
  }
  if (action === "ITEM_DELETED") {
    const name = details.name || details.item_name || details.id || "item";
    return `Removed inventory item "${name}".`;
  }
  if (action === "REPAIR_STATUS_UPDATED") {
    const job = details.job_order_id ? `#${String(details.job_order_id).slice(0, 8)}` : "job";
    const status = details.new_status || details.status || "Updated";
    return `Progressed repair job ${job} to ${status.toUpperCase()}.`;
  }
  if (action === "REPAIR_ORDER_CREATED") {
    const job = details.jobId ? `#${String(details.jobId).slice(0, 8)}` : "job";
    const plate = details.plateNumber ? ` for ${details.plateNumber}` : "";
    return `Created new repair work order ${job}${plate}.`;
  }
  if (action === "DIAGNOSIS_UPDATED") {
    const job = details.jobId ? `#${String(details.jobId).slice(0, 8)}` : "job";
    return `Updated mechanical diagnosis for repair job ${job}.`;
  }
  if (action === "REPAIR_ORDER_DELETED") {
    const job = details.jobId ? `#${String(details.jobId).slice(0, 8)}` : "job";
    return `Deleted repair work order ${job}.`;
  }
  if (action === "MOTORCYCLE_CREATED") {
    const plate = details.plateNumber || details.plate_number || "";
    const model = details.model || "";
    return `Registered motorcycle "${plate} ${model}".`;
  }
  if (action === "MOTORCYCLE_UPDATED") {
    const plate = details.plateNumber || details.model || "motorcycle";
    return `Updated vehicle specifications for "${plate}".`;
  }
  if (action === "MOTORCYCLE_DELETED") {
    const plate = details.plateNumber || details.id || "motorcycle";
    return `Removed motorcycle record "${plate}".`;
  }
  if (action === "PAYROLL_DISBURSED") {
    const staff = details.staffName || details.staff_name || "staff member";
    const amt = details.amount ? `₱${Number(details.amount).toLocaleString()}` : "";
    return `Disbursed ${amt} payroll to ${staff}.`;
  }
  if (action === "ADD_SHOP_EXPENSE") {
    const desc = details.description || details.category || "store expense";
    const amt = details.amount ? `₱${Number(details.amount).toLocaleString()}` : "";
    return `Recorded ${amt} operational expense for "${desc}".`;
  }
  if (action === "SETTINGS_UPDATED") {
    const store = details.storeName ? ` (${details.storeName})` : "";
    return `Updated store preferences & operational configuration${store}.`;
  }
  if (action === "SETTINGS_RESTORED_DEFAULTS") {
    return `Restored shop preferences and board retention to factory defaults.`;
  }
  if (action === "ROLE_PERMISSIONS_UPDATED") {
    return `Saved customized role access control permissions matrix.`;
  }
  if (action === "ROLE_PERMISSIONS_RESET") {
    return `Reset role permissions matrix to default system configuration.`;
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

type DatePreset = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";

export default function SystemLogsPage() {
  const [allLogs, setAllLogs] = useState<AuditLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  // Pagination
  const [page, setPage] = useState(1);
  const pageSize = 15;

  // Filters
  const [search, setSearch] = useState("");
  const [selectedPage, setSelectedPage] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Date Range Filter State
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");

  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = formatYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "WEEK") {
      const pastWeek = new Date(today);
      pastWeek.setDate(pastWeek.getDate() - 7);
      setStartDate(formatYMD(pastWeek));
      setEndDate(formatYMD(today));
    } else if (preset === "MONTH") {
      const pastMonth = new Date(today);
      pastMonth.setDate(pastMonth.getDate() - 30);
      setStartDate(formatYMD(pastMonth));
      setEndDate(formatYMD(today));
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDatePreset("CUSTOM");
  };

  const handleClearDateFilter = () => {
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
  };

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    let fetchedList: AuditLogItem[] = [];
    try {
      const response = await apiClient.get("/audit-logs", {
        params: {
          page: 1,
          page_size: 200,
          mutations_only: true,
        },
      });
      if (Array.isArray(response.data?.items)) {
        fetchedList = response.data.items;
      }
    } catch (err) {
      // Backend fallback
    }

    // Merge with localStorage motoshop_audit_logs fallback
    try {
      const localStored = localStorage.getItem("motoshop_audit_logs");
      if (localStored) {
        const parsed = JSON.parse(localStored);
        if (Array.isArray(parsed)) {
          const existingIds = new Set(fetchedList.map((x) => x.id));
          for (const item of parsed) {
            if (!existingIds.has(item.id)) {
              fetchedList.push(item);
            }
          }
        }
      }
    } catch (e) {
      // ignore
    }

    // Filter out read-only / noisy events
    const NON_MUTATING = ["AUDIT_LOGS_VIEWED", "LOGIN_SUCCESS", "LOGOUT", "LOGIN_FAILURE", "AUDIT_EXPORT"];
    const filteredMutations = fetchedList.filter((l) => !NON_MUTATING.includes(l.action));

    // Sort descending by timestamp
    filteredMutations.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    setAllLogs(filteredMutations);
    setIsLoading(false);
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  // Filter logs locally
  const filteredLogs = useMemo(() => {
    return allLogs.filter((log) => {
      // Page/Module filter
      if (selectedPage !== "ALL") {
        const logModule = mapLogToPage(log.resource, log.action);
        if (logModule !== selectedPage) return false;
      }

      // Role filter
      if (roleFilter !== "ALL") {
        if ((log.user_role || "").toLowerCase() !== roleFilter.toLowerCase()) return false;
      }

      // Text search
      if (search.trim()) {
        const q = search.toLowerCase();
        const actionLabel = formatFriendlyAction(log.action).label.toLowerCase();
        const changesSummary = formatChangesSummary(log).toLowerCase();
        const userName = (log.user_name || "").toLowerCase();
        const userEmail = (log.user_email || "").toLowerCase();
        const userRole = (log.user_role || "").toLowerCase();

        const matches = 
          actionLabel.includes(q) ||
          changesSummary.includes(q) ||
          userName.includes(q) ||
          userEmail.includes(q) ||
          userRole.includes(q);

        if (!matches) return false;
      }

      // Date Range filter
      if (startDate || endDate) {
        const logTime = new Date(log.timestamp).getTime();
        if (startDate) {
          const start = new Date(`${startDate}T00:00:00.000`).getTime();
          if (logTime < start) return false;
        }
        if (endDate) {
          const end = new Date(`${endDate}T23:59:59.999`).getTime();
          if (logTime > end) return false;
        }
      }

      return true;
    });
  }, [allLogs, selectedPage, roleFilter, search, startDate, endDate]);

  // Reset page when filters change
  useEffect(() => {
    setPage(1);
  }, [selectedPage, roleFilter, search, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / pageSize));
  const paginatedLogs = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredLogs.slice(start, start + pageSize);
  }, [filteredLogs, page, pageSize]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setPage(newPage);
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      // Build CSV from currently filtered logs
      const headers = ["ID", "Timestamp", "Staff User", "Role", "Email", "Module", "Action", "Changes", "IP Address"];
      const rows = filteredLogs.map((l) => [
        l.id,
        l.timestamp,
        `"${(l.user_name || "System User").replace(/"/g, '""')}"`,
        `"${(l.user_role || "").toUpperCase()}"`,
        `"${l.user_email || ""}"`,
        `"${mapLogToPage(l.resource, l.action)}"`,
        `"${formatFriendlyAction(l.action).label}"`,
        `"${formatChangesSummary(l).replace(/"/g, '""')}"`,
        `"${l.ip_address || ""}"`
      ]);

      const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `audit_log_history_${new Date().toISOString().slice(0, 10)}.csv`);
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
    <div className="w-full h-full flex-1 min-h-0 bg-zinc-950 p-6 flex flex-col overflow-hidden font-sans text-zinc-100">
      {/* Top Navigation & Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4 shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href="/settings"
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 border border-white/10 px-3.5 py-2 rounded-xl hover:bg-zinc-800 shadow-sm shrink-0"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Settings</span>
          </Link>
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-cyan-400" />
              Audit Log
            </h1>
            <p className="text-zinc-400 text-xs mt-0.5 hidden sm:block">
              Monitored activity records across showroom, stock catalog, workshop, payroll, and settings.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 self-start md:self-auto">
          <div className="flex items-center gap-1.5 text-xs font-medium text-zinc-400 bg-zinc-900/80 border border-white/10 px-3 py-1.5 rounded-xl">
            <ShieldCheck className="w-4 h-4 text-cyan-400" />
            <span>Admin Oversight</span>
          </div>

          <button
            onClick={handleExport}
            disabled={isExporting || filteredLogs.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold shadow-lg shadow-cyan-500/20 transition-all text-xs disabled:opacity-50"
          >
            {isExporting ? (
              <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Filter & Control Bar */}
      <div className="p-3.5 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl mb-4 shrink-0 space-y-3">
        {/* Row 1: Search + Module Pills */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative w-full lg:w-72 shrink-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search staff, action, changes..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>

          {/* 6 Monitored Module Filter Pills */}
          <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs shadow-inner flex-wrap gap-1 items-center">
            {PAGE_FILTERS.map((f) => (
              <button
                key={f.value}
                onClick={() => setSelectedPage(f.value)}
                className={clsx(
                  "px-2.5 py-1 rounded-lg font-semibold transition-all text-xs flex items-center gap-1",
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

        {/* Row 2: Date Range Filter + Role Filter + Record Counter */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2.5 border-t border-white/5 text-xs">
          {/* Date Range Filter Controls */}
          <div className="flex flex-wrap items-center gap-1.5 bg-zinc-950/70 p-1 rounded-xl border border-white/10">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-cyan-400 ml-1.5 mr-0.5" />
              {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((preset) => {
                const labels = {
                  ALL: "All Time",
                  TODAY: "Today",
                  WEEK: "This Week",
                  MONTH: "This Month",
                };
                const isSelected = datePreset === preset;
                return (
                  <button
                    key={preset}
                    onClick={() => handleSelectPreset(preset)}
                    className={clsx(
                      "px-2 py-0.5 rounded-lg text-xs font-semibold transition-all",
                      isSelected
                        ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
                    )}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            <div className="h-3.5 w-px bg-white/10 hidden sm:block" />

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-1 text-xs text-zinc-400">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                title="Filter from date"
              />
              <span className="text-zinc-500 text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-0.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                title="Filter to date"
              />
            </div>

            {(startDate || endDate || datePreset !== "ALL") && (
              <button
                onClick={handleClearDateFilter}
                className="p-1 rounded-lg text-zinc-400 hover:text-rose-400 hover:bg-zinc-800/60 transition-colors ml-0.5"
                title="Reset date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Role Filter & Counter */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5">
              <span className="text-zinc-400 text-xs">Staff Role:</span>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="bg-zinc-950 border border-white/10 rounded-xl py-1 px-2.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 cursor-pointer"
              >
                <option value="ALL">All Roles</option>
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="cashier">Cashier</option>
                <option value="mechanic">Mechanic</option>
              </select>
            </div>

            <div className="text-zinc-400 font-mono text-xs hidden sm:block">
              Total: <span className="text-cyan-400 font-bold">{filteredLogs.length}</span> events
            </div>
          </div>
        </div>
      </div>

      {/* Main Data Table Container (Fixed Viewport, Scrollable Body, Pinned Footer) */}
      <div className="flex-1 min-h-0 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-auto flex-1 min-h-0 touch-pan-x overscroll-contain">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/90 border-b border-white/10 text-zinc-400 font-semibold text-xs uppercase tracking-wider sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="py-3 px-5">Staff User</th>
                <th className="py-3 px-4">Page / Module</th>
                <th className="py-3 px-4">Action</th>
                <th className="py-3 px-5">Changes Made</th>
                <th className="py-3 px-5 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-sans">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 text-sm">
                    <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                    Loading system audit history...
                  </td>
                </tr>
              ) : paginatedLogs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-20 text-center text-zinc-500 text-sm">
                    No database change history found matching selected filters.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map((log) => {
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
                      <td className="py-3.5 px-5">
                        <div className="font-bold text-white text-xs lg:text-sm">
                          {log.user_name || "System User"}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className={clsx("px-1.5 py-0.2 rounded text-[9px] font-bold uppercase tracking-wider border", getRoleBadgeStyle(log.user_role))}>
                            {log.user_role || "ADMIN"}
                          </span>
                          {log.user_email && (
                            <span className="text-zinc-500 font-mono text-[11px] truncate max-w-[130px]">
                              {log.user_email}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Page / Section */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-lg text-xs font-semibold bg-zinc-950 border border-white/5 text-zinc-200">
                          {pageName}
                        </span>
                      </td>

                      {/* Action Badge */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <span className={clsx("px-2 py-0.5 rounded-lg text-xs font-bold border inline-block", actionInfo.color)}>
                          {actionInfo.label}
                        </span>
                      </td>

                      {/* Changes Made */}
                      <td className="py-3.5 px-5 max-w-md">
                        <div className="text-xs text-zinc-200 leading-relaxed">
                          {changesText}
                        </div>
                        {isExpanded && log.details && (
                          <div className="mt-2.5 p-3 rounded-xl bg-zinc-950/90 border border-white/10 font-mono text-[11px] text-cyan-300 overflow-x-auto space-y-1 shadow-inner">
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
                      <td className="py-3.5 px-5 text-right whitespace-nowrap">
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

        {/* Pinned Bottom Pagination Footer */}
        <div className="p-3.5 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div>
            Showing <span className="font-semibold text-zinc-200">{paginatedLogs.length}</span> of{" "}
            <span className="font-semibold text-zinc-200">{filteredLogs.length}</span> events (Page{" "}
            <span className="font-semibold text-zinc-200">{page}</span> of{" "}
            <span className="font-semibold text-zinc-200">{totalPages}</span>)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(page - 1)}
              disabled={page === 1}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              title="Previous Page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handlePageChange(page + 1)}
              disabled={page === totalPages}
              className="p-1.5 rounded-lg bg-zinc-900 border border-white/10 hover:bg-zinc-800 disabled:opacity-40 transition-colors"
              title="Next Page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
