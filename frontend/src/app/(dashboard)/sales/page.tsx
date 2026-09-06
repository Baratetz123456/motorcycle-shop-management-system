"use client";

import { useEffect, useState } from "react";
import { 
  Receipt, 
  Search, 
  Filter, 
  CheckCircle, 
  Eye, 
  Ban, 
  History,
  ChevronRight,
  Calendar,
  X
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/lib/permissions";
import { useRouter } from "next/navigation";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";

export interface TransactionRecord {
  id: string;
  invoice_no: string;
  customer_name?: string;
  cashier_name?: string;
  mechanic_name?: string;
  motorcycle_name?: string;
  subtotal: number;
  total: number;
  amount_paid: number;
  discount_percentage?: number;
  discount_amount?: number;
  cash_received?: number;
  cash_change?: number;
  status: "COMPLETED" | "PENDING" | "VOIDED";
  payment_method: string;
  created_at: string;
  item_count: number;
  items?: {
    name: string;
    qty: number;
    price: number;
    type?: string;
  }[];
}

export default function SalesManagementPage() {
  const router = useRouter();
  const [role, setRole] = useState<UserRole>("cashier");
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);

  // Date Range Filter State
  type DatePreset = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";
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

  useEffect(() => {
    const userRole = (localStorage.getItem("user_role") as UserRole) || "cashier";
    setRole(userRole);
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    let list: TransactionRecord[] = [];
    try {
      const res = await apiClient.get<TransactionRecord[]>("/sales/transactions");
      if (Array.isArray(res.data) && res.data.length > 0) {
        list = res.data;
      }
    } catch (e) {
      // empty list on error
    }

    const storedLogs = localStorage.getItem("motoshop_sales_logs");
    if (storedLogs) {
      try {
        const localList = JSON.parse(storedLogs);
        if (Array.isArray(localList) && localList.length > 0) {
          const existingIds = new Set(list.map((t) => t.id));
          const combined = [...localList.filter((t: any) => !existingIds.has(t.id)), ...list];
          setTransactions(combined);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    setTransactions(list);
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.cashier_name && t.cashier_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.mechanic_name && t.mechanic_name.toLowerCase().includes(search.toLowerCase())) ||
      t.payment_method.toLowerCase().includes(search.toLowerCase());

    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;

    if (!matchesSearch || !matchesStatus) return false;

    // Date range filter against t.created_at
    if (startDate || endDate) {
      if (!t.created_at) return false;
      const txTime = new Date(t.created_at).getTime();
      if (isNaN(txTime)) return false;

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`).getTime();
        if (txTime < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`).getTime();
        if (txTime > end) return false;
      }
    }

    return true;
  });

  return (
    <div className="w-full h-full flex-1 min-h-0 bg-zinc-950 p-6 flex flex-col overflow-hidden font-sans text-zinc-100">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-cyan-400" />
            Invoices & Receipts
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Completed sales receipts, open customer invoices, and audit logs.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAuditOpen(true)}
            className="px-4 py-2.5 bg-zinc-900 border border-white/10 hover:border-cyan-500/30 text-zinc-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
          >
            <History className="w-4 h-4 text-cyan-400" />
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-zinc-900/60 border border-white/10 rounded-2xl backdrop-blur-xl shrink-0">
        <div className="flex flex-wrap items-center gap-3">
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-zinc-400" />
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs">
              {["ALL", "COMPLETED", "VOIDED"].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={clsx(
                    "px-3 py-1.5 rounded-lg font-medium transition-all",
                    statusFilter === st
                      ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20 font-bold"
                      : "text-zinc-400 hover:text-white"
                  )}
                >
                  {st}
                </button>
              ))}
            </div>
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

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
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all",
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
                className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                title="Filter from transaction date"
              />
              <span className="text-zinc-500 text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="bg-zinc-900 border border-white/10 rounded-lg px-2 py-1 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
                title="Filter to transaction date"
              />

              {(startDate || endDate || datePreset !== "ALL") && (
                <button
                  onClick={handleClearDateFilter}
                  className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-rose-400 transition-colors ml-0.5"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Invoice #, Customer, Bike..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="flex-1 min-h-0 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-auto flex-1 min-h-0 touch-pan-x overscroll-contain">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice No</th>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Customer / Motorcycle</th>
                <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-500">
                    <Calendar className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                    <p className="font-semibold text-zinc-400">No sales transactions match your filter criteria.</p>
                    {(startDate || endDate || search || statusFilter !== "ALL") && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setStatusFilter("ALL");
                          handleClearDateFilter();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-cyan-500/40 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCompleted = tx.status === "COMPLETED";

                  return (
                    <tr 
                      key={tx.id} 
                      onClick={() => router.push(`/sales/receipt?id=${encodeURIComponent(tx.id)}`)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4 font-mono font-bold text-cyan-400">{tx.invoice_no}</td>

                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                          {tx.customer_name || "Walk-in Customer"}
                        </div>
                        {tx.motorcycle_name && (
                          <div className="text-xs text-zinc-400 font-mono mt-0.5">{tx.motorcycle_name}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-white text-base">
                        ₱{tx.total.toFixed(2)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-red-500/10 text-red-400 border border-red-500/20">
                            <Ban className="w-3.5 h-3.5" />
                            Voided
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center text-xs text-zinc-500 group-hover:text-cyan-400 transition-colors font-medium">
                          <span className="hidden group-hover:inline mr-1">View Receipt</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div>Displaying {filteredTransactions.length} transaction record(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Commission rates are determined by each assigned mechanic</span>
          </div>
        </div>
      </div>

      {/* Contextual Audit Drawer */}
      <ContextualAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Invoices & Receipts Audit Log"
        subtitle="Audit log of completed sales, receipts, and voided transactions"
        actionPrefix="SALES_"
        resourceFilter="/sales"
      />
    </div>
  );
}
