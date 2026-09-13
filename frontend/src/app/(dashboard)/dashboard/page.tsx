"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ShoppingBag, 
  Wrench, 
  Package, 
  TrendingUp, 
  Receipt, 
  ArrowRight, 
  Boxes, 
  AlertTriangle, 
  Activity,
  CheckCircle2,
  DollarSign,
  Plus,
  Clock,
  Bike,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Layers,
  FileSpreadsheet,
  ArrowUpRight,
  Users
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { Skeleton } from "@/components/ui/Skeleton";

interface SalesLog {
  id: string;
  invoice_no: string;
  created_at: string;
  total: number;
  subtotal: number;
  status: string;
  customer_name?: string;
  payment_method?: string;
  items?: Array<{ name: string; qty: number; price: number; type?: string }>;
}

interface InventoryItem {
  id: string;
  sku: string;
  name: string;
  current_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  item_type: string;
  category: string;
}

interface RepairJob {
  id: string;
  jo_number: string;
  customer: string;
  customer_name?: string;
  motorcycle: string;
  mechanic: string;
  status: "PENDING" | "ONGOING" | "COMPLETED" | "RELEASED";
  created_at: string;
  labor_charge?: number;
}

export default function ExecutiveDashboardPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [sales, setSales] = useState<SalesLog[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [repairs, setRepairs] = useState<RepairJob[]>([]);
  const [pendingCommissionTotal, setPendingCommissionTotal] = useState(0);

  // Mobile View Tab Selection
  const [mobileTab, setMobileTab] = useState<"overview" | "bays" | "sales" | "top">("overview");

  useEffect(() => {
    loadDashboardMetrics();
  }, []);

  const loadDashboardMetrics = async () => {
    setIsLoading(true);
    try {
      // 1. Load Sales
      let salesList: SalesLog[] = [];
      try {
        const res = await apiClient.get<SalesLog[]>("/sales/transactions");
        if (Array.isArray(res.data)) salesList = res.data;
      } catch (e) {}

      if (typeof window !== "undefined") {
        try {
          const stored = localStorage.getItem("motoshop_sales_logs");
          if (stored) {
            const localList: SalesLog[] = JSON.parse(stored);
            if (Array.isArray(localList) && localList.length > 0) {
              const ids = new Set(salesList.map((s) => s.id));
              salesList = [...localList.filter((s) => !ids.has(s.id)), ...salesList];
            }
          }
        } catch (e) {}
      }
      setSales(salesList);

      // 2. Load Inventory
      let invList: InventoryItem[] = [];
      try {
        const invRes = await apiClient.get<InventoryItem[]>("/inventory");
        if (Array.isArray(invRes.data)) invList = invRes.data;
      } catch (e) {}

      if (typeof window !== "undefined") {
        try {
          const storedCustom = localStorage.getItem("motoshop_custom_inventory");
          if (storedCustom) {
            const customList: InventoryItem[] = JSON.parse(storedCustom);
            const ids = new Set(invList.map((i) => i.id));
            invList = [...customList.filter((i) => !ids.has(i.id)), ...invList];
          }

          const stockMap = JSON.parse(localStorage.getItem("motoshop_inventory_stock") || "{}");
          invList = invList.map((item) => ({
            ...item,
            current_stock: stockMap[item.id] !== undefined ? stockMap[item.id] : item.current_stock,
          }));
        } catch (e) {}
      }
      setInventory(invList);

      // 3. Load Repairs
      let repairList: RepairJob[] = [];
      try {
        const repRes = await apiClient.get<RepairJob[]>("/repairs/jobs");
        if (Array.isArray(repRes.data)) repairList = repRes.data;
      } catch (e) {}

      if (typeof window !== "undefined") {
        try {
          const deletedIds: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_job_ids") || "[]");
          repairList = repairList.filter((j) => !deletedIds.includes(j.id) && !deletedIds.includes(j.jo_number));
        } catch (e) {}
      }
      setRepairs(repairList);

      // 4. Load Commissions
      try {
        const commRes = await apiClient.get<any[]>("/repairs/commissions");
        if (Array.isArray(commRes.data)) {
          const pending = commRes.data
            .filter((c) => c.status !== "DISBURSED")
            .reduce((sum, c) => sum + (Number(c.amount_earned) || 0), 0);
          setPendingCommissionTotal(pending);
        }
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  };

  // Derived Metrics
  const completedSales = useMemo(() => sales.filter((s) => s.status === "COMPLETED"), [sales]);
  const todaySalesTotal = useMemo(() => {
    const todayStr = new Date().toDateString();
    return completedSales
      .filter((s) => s.created_at && new Date(s.created_at).toDateString() === todayStr)
      .reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [completedSales]);

  const allTimeSalesTotal = useMemo(() => {
    return completedSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [completedSales]);

  const activeWorkshopJobs = useMemo(() => {
    return repairs.filter((j) => j.status !== "RELEASED");
  }, [repairs]);

  const lowStockItems = useMemo(() => {
    return inventory.filter((i) => i.item_type === "PRODUCT" && i.current_stock <= i.reorder_level);
  }, [inventory]);

  // Top Selling Items Leaderboard
  const topSellingItems = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; revenue: number; type: string }> = {};
    completedSales.forEach((sale) => {
      (sale.items || []).forEach((item) => {
        const key = item.name;
        if (!counts[key]) {
          counts[key] = {
            name: item.name,
            qty: 0,
            revenue: 0,
            type: item.type || "PRODUCT",
          };
        }
        counts[key].qty += Number(item.qty || 1);
        counts[key].revenue += Number(item.price || 0) * Number(item.qty || 1);
      });
    });

    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [completedSales]);

  const maxItemQty = topSellingItems.length > 0 ? Math.max(...topSellingItems.map((i) => i.qty)) : 1;

  if (isLoading) {
    return (
      <div className="min-h-full bg-slate-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 space-y-6">
        <div className="h-10 w-64 bg-slate-200 dark:bg-zinc-800 rounded-xl animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-28 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 h-96 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
          <div className="h-96 bg-slate-200 dark:bg-zinc-800 rounded-2xl animate-pulse" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
      {/* ============ TOP HEADER & QUICK ACTION LAUNCHER ============ */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2.5">
              <Activity className="w-7 h-7 text-lime-600 dark:text-lime-400" />
              <span>Operations Command</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-lime-50 dark:bg-lime-950/30 text-lime-800 dark:text-lime-400 border border-lime-200 dark:border-lime-800/50 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-lime-500 animate-pulse" />
              Live Workshop
            </span>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-xs sm:text-sm">
            Real-time showroom counter, active repair bench status, and inventory velocity.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={() => router.push("/pos")}
            className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold border border-lime-600 text-xs transition-all flex items-center gap-2 shadow-sm active:scale-[0.98]"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>New Sale (POS)</span>
          </button>
          <button
            onClick={() => router.push("/repairs/board")}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-semibold transition-all flex items-center gap-2 shadow-xs active:scale-[0.98]"
          >
            <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            <span>Job Cards</span>
          </button>
          <button
            onClick={() => router.push("/reports")}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 text-slate-800 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-semibold transition-all flex items-center gap-2 shadow-xs active:scale-[0.98]"
          >
            <TrendingUp className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
            <span>Reports</span>
          </button>
        </div>
      </div>

      {/* ============ CARD-FREE KPI OPERATIONAL RIBBON ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 py-6 border-b border-slate-200 dark:border-zinc-800 mb-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
        
        {/* KPI 1: Today's Sales */}
        <div 
          onClick={() => router.push("/sales")}
          className="px-4 py-3 sm:py-0 first:pl-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Today&apos;s Gross Sales
            </span>
            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              Live
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 font-mono group-hover:text-lime-700 dark:group-hover:text-lime-400 transition-colors">
            ₱{todaySalesTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-lime-700 dark:text-lime-400 font-medium group-hover:underline mt-1">
            <span>All-time ₱{allTimeSalesTotal.toFixed(0)}</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 2: Active Workshop Bays */}
        <div 
          onClick={() => router.push("/repairs/board")}
          className="px-4 py-3 sm:py-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Active Workshop Bays
            </span>
            <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/40">
              {activeWorkshopJobs.length} In Progress
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {activeWorkshopJobs.length} <span className="text-sm font-sans font-bold text-slate-500 dark:text-zinc-400">Bikes</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline mt-1">
            <span>Inspect Repair Bench</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 3: Low Stock Deficits */}
        <div 
          onClick={() => router.push("/inventory")}
          className="px-4 py-3 sm:py-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Stock Reorder Alerts
            </span>
            <span className={clsx(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border",
              lowStockItems.length > 0
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40 animate-pulse"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
            )}>
              {lowStockItems.length > 0 ? `${lowStockItems.length} Urgent` : "Optimal"}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {lowStockItems.length} <span className="text-sm font-sans font-bold text-slate-500 dark:text-zinc-400">Parts</span>
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium group-hover:underline mt-1">
            <span>Restock Inventory</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* KPI 4: Pending Payroll Liability */}
        <div 
          onClick={() => router.push("/payroll")}
          className="px-4 py-3 sm:py-0 last:pr-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Unsettled Labor Pay
            </span>
            <span className="text-[10px] text-purple-800 dark:text-purple-300 font-bold bg-purple-50 dark:bg-purple-950/40 px-1.5 py-0.5 rounded border border-purple-200 dark:border-purple-800/40">
              Payroll
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-purple-600 dark:text-purple-400 font-mono">
            ₱{pendingCommissionTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-purple-600 dark:text-purple-400 font-medium group-hover:underline mt-1">
            <span>Disburse Commissions</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* ============ MOBILE TAB SELECTOR (< md) ============ */}
      <div className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pb-3 mb-6 border-b border-slate-200 dark:border-zinc-800">
        {[
          { id: "overview", label: "Overview", icon: Activity },
          { id: "bays", label: `Workshop (${activeWorkshopJobs.length})`, icon: Wrench },
          { id: "sales", label: "Recent Sales", icon: Receipt },
          { id: "top", label: "Top Items", icon: TrendingUp },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = mobileTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id as any)}
              className={clsx(
                "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0",
                isActive
                  ? "bg-lime-500 text-zinc-950 border border-lime-600 shadow-sm"
                  : "text-slate-600 dark:text-zinc-400 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============ MAIN ASYMMETRIC COMMAND GRID ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT 2 COLUMNS: Workshop Bays & Live Sales */}
        <div className={clsx("lg:col-span-2 space-y-8", mobileTab === "top" && "hidden md:block")}>
          
          {/* Section 1: Workshop Bays Live Monitor */}
          <div className={clsx("space-y-4", mobileTab === "sales" && "hidden md:block")}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  <span>Workshop Bay Live Status</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Technicians actively servicing customer motorcycles on the floor
                </p>
              </div>
              <Link
                href="/repairs/board"
                className="text-xs font-bold text-lime-700 dark:text-lime-400 hover:underline flex items-center gap-1"
              >
                <span>Full Board</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {activeWorkshopJobs.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40">
                <Bike className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-slate-600 dark:text-zinc-400 font-semibold">All workshop bays are currently clear.</p>
                <p className="text-[11px] text-slate-400 dark:text-zinc-500 mt-0.5">New intake jobs from the counter will appear here immediately.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {activeWorkshopJobs.slice(0, 4).map((job) => (
                  <Link
                    key={job.id}
                    href={`/repairs/jobs/${job.id}`}
                    className="p-4 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:border-lime-500/50 dark:hover:border-lime-500/50 transition-all shadow-xs group flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="font-mono text-xs font-bold text-lime-700 dark:text-lime-400 bg-lime-50 dark:bg-lime-950/40 px-2 py-0.5 rounded-lg border border-lime-200 dark:border-lime-800/50">
                          {job.jo_number}
                        </span>
                        <span className={clsx(
                          "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border",
                          job.status === "PENDING" && "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                          job.status === "ONGOING" && "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
                          job.status === "COMPLETED" && "bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800/50"
                        )}>
                          {job.status}
                        </span>
                      </div>
                      <div className="font-bold text-sm text-slate-900 dark:text-white truncate">
                        {job.motorcycle || "Motorcycle Service"}
                      </div>
                      <div className="text-xs text-slate-500 dark:text-zinc-400 truncate mt-0.5">
                        Client: {job.customer || job.customer_name || "Walk-in"}
                      </div>
                    </div>

                    <div className="pt-3 mt-3 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs">
                      <span className="text-slate-600 dark:text-zinc-400 flex items-center gap-1.5 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
                        {job.mechanic}
                      </span>
                      <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-lime-600 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Section 2: Live Invoices & Sales Stream */}
          <div className={clsx("space-y-4", mobileTab === "bays" && "hidden md:block")}>
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Recent Sales Stream</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  Real-time transaction log recorded at the showroom counter
                </p>
              </div>
              <Link
                href="/sales"
                className="text-xs font-bold text-lime-700 dark:text-lime-400 hover:underline flex items-center gap-1"
              >
                <span>View All Invoices</span>
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            {completedSales.length === 0 ? (
              <div className="p-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl bg-white dark:bg-zinc-900/40">
                <Receipt className="w-8 h-8 text-slate-400 dark:text-zinc-600 mx-auto mb-2" />
                <p className="text-xs text-slate-600 dark:text-zinc-400 font-semibold">No sales transactions recorded yet.</p>
              </div>
            ) : (
              <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-zinc-800/80">
                {completedSales.slice(0, 5).map((sale) => (
                  <Link
                    key={sale.id}
                    href={`/sales/receipt?id=${sale.id}`}
                    className="p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-zinc-800/50 transition-colors group"
                  >
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 flex items-center justify-center text-slate-700 dark:text-zinc-300 font-mono text-xs font-bold shrink-0">
                        <Receipt className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-bold text-slate-900 dark:text-white">
                            {sale.invoice_no}
                          </span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50">
                            {sale.payment_method || "CASH"}
                          </span>
                        </div>
                        <div className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                          {sale.customer_name || "Walk-in Customer"} • {sale.created_at ? new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Today"}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="font-mono font-black text-sm text-slate-900 dark:text-white">
                        ₱{Number(sale.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </div>
                      <span className="text-[11px] text-lime-700 dark:text-lime-400 font-semibold group-hover:underline">
                        Inspect Receipt
                      </span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>

        {/* RIGHT COLUMN: Top Products Leaderboard & Inventory Low Stock */}
        <div className={clsx("space-y-8", (mobileTab === "bays" || mobileTab === "sales") && "hidden md:block")}>
          
          {/* Leaderboard Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-lime-600 dark:text-lime-400" />
                <span>Top Products & Services</span>
              </h3>
              <span className="text-[10px] uppercase font-mono font-bold text-slate-500 dark:text-zinc-500">
                Volume
              </span>
            </div>

            {topSellingItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-500 dark:text-zinc-500">
                No items sold yet.
              </div>
            ) : (
              <div className="space-y-4">
                {topSellingItems.map((item, idx) => {
                  const pct = Math.round((item.qty / maxItemQty) * 100);
                  return (
                    <div key={item.name} className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[180px]">
                          {idx + 1}. {item.name}
                        </span>
                        <span className="font-mono font-semibold text-slate-600 dark:text-zinc-400">
                          {item.qty} units • ₱{item.revenue.toFixed(0)}
                        </span>
                      </div>
                      <div className="w-full h-2 rounded-full bg-slate-100 dark:bg-zinc-800 overflow-hidden">
                        <div 
                          className="h-full rounded-full bg-lime-500" 
                          style={{ width: `${Math.max(8, pct)}%` }} 
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Low Stock Alerts Mini List */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <span>Critical Stock Deficits</span>
              </h3>
              <Link
                href="/inventory"
                className="text-xs font-bold text-lime-700 dark:text-lime-400 hover:underline"
              >
                Manage
              </Link>
            </div>

            {lowStockItems.length === 0 ? (
              <div className="py-6 text-center text-xs text-emerald-700 dark:text-emerald-400 font-semibold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                <span>All inventory items are above reorder threshold!</span>
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockItems.slice(0, 4).map((item) => (
                  <div
                    key={item.id}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-800/60 border border-slate-200 dark:border-zinc-700/80 flex items-center justify-between text-xs"
                  >
                    <div className="truncate mr-2">
                      <div className="font-bold text-slate-900 dark:text-white truncate">
                        {item.name}
                      </div>
                      <div className="text-[10px] text-slate-500 dark:text-zinc-400 font-mono">
                        {item.sku} • {item.category}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="px-2 py-0.5 rounded-md font-mono font-bold text-xs bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800/50">
                        {item.current_stock} left
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>

      </div>

    </div>
  );
}
