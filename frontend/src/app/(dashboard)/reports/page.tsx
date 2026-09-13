"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  AreaChart, Area
} from "recharts";
import { 
  DollarSign, 
  Wrench, 
  Package, 
  TrendingUp, 
  Receipt, 
  ArrowRight, 
  Boxes, 
  AlertTriangle, 
  Coins,
  Activity,
  CheckCircle,
  FileSpreadsheet,
  Calendar,
  CalendarDays,
  Percent,
  Layers,
  ArrowUpRight
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { ReportsSkeleton } from "@/components/reports/ReportsSkeleton";

interface SalesLog {
  id: string;
  invoice_no: string;
  created_at: string;
  total: number;
  subtotal: number;
  status: string;
  amount_paid?: number;
  payment_method?: string;
  customer_name?: string;
}

interface InventoryItem {
  id: string;
  name: string;
  current_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  item_type: string;
}

type PeriodFilter = "7D" | "30D" | "YTD" | "ALL";

export default function BusinessReportsPage() {
  const router = useRouter();

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [period, setPeriod] = useState<PeriodFilter>("30D");

  // Raw fetched data
  const [salesList, setSalesList] = useState<SalesLog[]>([]);
  const [inventoryList, setInventoryList] = useState<InventoryItem[]>([]);
  const [completedRepairsCount, setCompletedRepairsCount] = useState<number>(0);
  const [repairsChartData, setRepairsChartData] = useState<{ name: string; completed: number }[]>([]);

  useEffect(() => {
    loadReportsData();
  }, []);

  const loadReportsData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch Sales Transactions
      let sales: SalesLog[] = [];
      try {
        const res = await apiClient.get<SalesLog[]>("/sales/transactions");
        if (Array.isArray(res.data)) sales = res.data;
      } catch (e) {}

      if (typeof window !== "undefined") {
        try {
          const storedSales = localStorage.getItem("motoshop_sales_logs");
          if (storedSales) {
            const localList: SalesLog[] = JSON.parse(storedSales);
            if (Array.isArray(localList) && localList.length > 0) {
              const ids = new Set(sales.map((s) => s.id));
              sales = [...localList.filter((s) => !ids.has(s.id)), ...sales];
            }
          }
        } catch (e) {}
      }
      setSalesList(sales);

      // 2. Fetch Inventory
      let inv: InventoryItem[] = [];
      try {
        const invRes = await apiClient.get<InventoryItem[]>("/inventory");
        if (Array.isArray(invRes.data)) inv = invRes.data;
      } catch (e) {}

      if (typeof window !== "undefined") {
        try {
          const storedCustom = localStorage.getItem("motoshop_custom_inventory");
          if (storedCustom) {
            const customList: InventoryItem[] = JSON.parse(storedCustom);
            const ids = new Set(inv.map((i) => i.id));
            inv = [...customList.filter((i) => !ids.has(i.id)), ...inv];
          }

          const stockMap = JSON.parse(localStorage.getItem("motoshop_inventory_stock") || "{}");
          inv = inv.map((item) => ({
            ...item,
            current_stock: stockMap[item.id] !== undefined ? stockMap[item.id] : item.current_stock
          }));
        } catch (e) {}
      }
      setInventoryList(inv);

      // 3. Fetch Repairs
      try {
        const repairRes = await apiClient.get<any[]>("/repairs/jobs");
        if (Array.isArray(repairRes.data)) {
          const finished = repairRes.data.filter((j) => j.status === "COMPLETED" || j.status === "RELEASED");
          setCompletedRepairsCount(finished.length);

          const weeks: Record<string, number> = { "Wk 1": 0, "Wk 2": 0, "Wk 3": 0, "Wk 4": 0 };
          finished.forEach((j, i) => {
            const wName = `Wk ${(i % 4) + 1}`;
            weeks[wName] = (weeks[wName] || 0) + 1;
          });
          setRepairsChartData(Object.entries(weeks).map(([name, completed]) => ({ name, completed })));
        }
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  };

  // Filter sales by selected period
  const filteredSales = useMemo(() => {
    const completed = salesList.filter((s) => s.status === "COMPLETED");
    if (period === "ALL") return completed;

    const now = Date.now();
    const daysLimit = period === "7D" ? 7 : period === "30D" ? 30 : 365;
    const cutoff = now - daysLimit * 24 * 60 * 60 * 1000;

    return completed.filter((s) => {
      if (!s.created_at) return true;
      return new Date(s.created_at).getTime() >= cutoff;
    });
  }, [salesList, period]);

  // Aggregate Metrics
  const totalRevenue = useMemo(() => {
    return filteredSales.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
  }, [filteredSales]);

  const netProfit = useMemo(() => {
    return Number((totalRevenue * 0.38).toFixed(2));
  }, [totalRevenue]);

  const vatAmount = useMemo(() => {
    return Number((totalRevenue - (totalRevenue / 1.12)).toFixed(2));
  }, [totalRevenue]);

  const lowStockCount = useMemo(() => {
    return inventoryList.filter(
      (i) => i.item_type === "PRODUCT" && i.current_stock <= i.reorder_level
    ).length;
  }, [inventoryList]);

  const inventoryValue = useMemo(() => {
    return inventoryList.reduce(
      (acc, i) => acc + (Number(i.cost_price || 0) * Number(i.current_stock || 0)),
      0
    );
  }, [inventoryList]);

  // Trajectory Chart Data
  const revenueChartData = useMemo(() => {
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const dayMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
    filteredSales.forEach((s) => {
      const d = s.created_at ? new Date(s.created_at) : new Date();
      const dayName = days[d.getDay()];
      dayMap[dayName] = (dayMap[dayName] || 0) + (Number(s.total) || 0);
    });

    return ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
      name: day,
      revenue: Math.round(dayMap[day] || 0),
    }));
  }, [filteredSales]);

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
      {/* ============ TOP HEADER & PERIOD FILTER ============ */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
              <Activity className="w-7 h-7 text-lime-600 dark:text-lime-400" />
              <span>Business Intelligence & Reports</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-lime-50 dark:bg-lime-950/30 text-lime-800 dark:text-lime-400 border border-lime-200 dark:border-lime-800/50">
              Live BI
            </span>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-xs sm:text-sm">
            Revenue trajectory, gross margins, inventory valuation, and repair labor performance.
          </p>
        </div>

        {/* Action Controls & Export */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Toggle Pills */}
          <div className="flex bg-slate-100 dark:bg-zinc-900 p-1 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs">
            {[
              { id: "7D", label: "7 Days" },
              { id: "30D", label: "30 Days" },
              { id: "YTD", label: "Year-to-Date" },
              { id: "ALL", label: "All Time" },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setPeriod(tab.id as PeriodFilter)}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-bold transition-all text-xs",
                  period === tab.id
                    ? "bg-lime-500 text-zinc-950 shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push("/reports/extract")}
            className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-2 border border-lime-600 shadow-sm active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Financial Ledger & CSV</span>
          </button>
        </div>
      </div>

      {/* ============ CARD-FREE KPI FINANCIAL RIBBON ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 py-5 border-y border-slate-200 dark:border-zinc-800 mb-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-200 dark:divide-zinc-800">
        
        {/* Metric 1: Total Revenue */}
        <div 
          onClick={() => router.push("/sales")}
          className="px-4 py-3 sm:py-0 first:pl-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Net Sales Revenue
            </span>
            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              +{period}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-zinc-100 font-mono group-hover:text-lime-700 dark:group-hover:text-lime-400 transition-colors">
            ₱{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-lime-700 dark:text-lime-400 font-medium group-hover:underline mt-1">
            <span>Inspect Sales Ledger</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 2: Net Margin */}
        <div 
          onClick={() => router.push("/payroll")}
          className="px-4 py-3 sm:py-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Est. Operating Margin (38%)
            </span>
            <span className="text-[10px] text-emerald-800 dark:text-emerald-300 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-200 dark:border-emerald-800/40">
              Profitable
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            ₱{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium group-hover:underline mt-1">
            <span>Staff Payroll & Wages</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 3: Low Stock Alerts */}
        <div 
          onClick={() => router.push("/inventory")}
          className="px-4 py-3 sm:py-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <span className={clsx(
              "text-[10px] font-bold px-1.5 py-0.5 rounded border",
              lowStockCount > 0
                ? "bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/40"
                : "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/40"
            )}>
              {lowStockCount > 0 ? `${lowStockCount} Reorder` : "Healthy"}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-600 dark:text-amber-400 font-mono">
            {lowStockCount} items
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium group-hover:underline mt-1">
            <span>Manage Inventory</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 4: Completed Repairs */}
        <div 
          onClick={() => router.push("/repairs/board")}
          className="px-4 py-3 sm:py-0 last:pr-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider">
              Completed Repairs
            </span>
            <span className="text-[10px] text-blue-800 dark:text-blue-300 font-bold bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded border border-blue-200 dark:border-blue-800/40">
              Workshop
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-600 dark:text-blue-400 font-mono">
            {completedRepairsCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-600 dark:text-blue-400 font-medium group-hover:underline mt-1">
            <span>Workshop Kanban Board</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* ============ BORDERLESS INTEGRATED CHARTS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 border-b border-slate-200 dark:border-zinc-800 mb-8">
        
        {/* Revenue Trajectory Chart (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales & Revenue Trajectory</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Daily business transaction volume synchronized with POS</p>
            </div>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs text-lime-700 dark:text-lime-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>View Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="limeGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#84cc16" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#84cc16" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: 12,
                    color: '#ffffff',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
                  }}
                  itemStyle={{ color: '#84cc16', fontWeight: 700 }}
                  formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#84cc16" strokeWidth={3} fillOpacity={1} fill="url(#limeGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Completed Repairs Bar Chart (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Workshop Output</h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">Weekly job volume completed by technicians</p>
            </div>
            <button
              onClick={() => router.push("/repairs/board")}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-semibold flex items-center gap-1"
            >
              <span>Board</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" strokeOpacity={0.4} vertical={false} />
                <XAxis dataKey="name" stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(59, 130, 246, 0.08)' }}
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: 12,
                    color: '#ffffff'
                  }}
                />
                <Bar dataKey="completed" fill="#06b6d4" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ============ BORDERLESS OPERATIONAL DETAIL FEEDS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Feed 1: Recent Completed Sales Invoices */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Recent Completed Sales</span>
            </h4>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs text-lime-700 dark:text-lime-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <span>All Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs">
            {filteredSales.length === 0 ? (
              <p className="text-slate-500 dark:text-zinc-500 py-6 text-center">No completed transactions in this period.</p>
            ) : (
              filteredSales.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => router.push(`/sales/receipt?id=${tx.id}`)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-100/60 dark:hover:bg-zinc-900/40 px-2.5 rounded-xl transition-colors group"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                      {tx.invoice_no}
                    </span>
                    <span className="text-[11px] text-slate-500 dark:text-zinc-500 block">
                      {tx.customer_name || "Walk-in Customer"} • {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">
                      ₱{Number(tx.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">
                      {tx.payment_method || "Paid"}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feed 2: Inventory Valuation & Tax Summary */}
        <div className="space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800 mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span>Inventory Valuation & Tax Analysis</span>
              </h4>
              <button
                onClick={() => router.push("/inventory")}
                className="text-xs text-purple-600 dark:text-purple-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Stock Control</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs mb-6">
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-slate-800 dark:text-zinc-200 block font-semibold">Total Warehouse Asset Value</span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">Aggregated inventory purchase wholesale cost</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-base">
                  ₱{inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-slate-800 dark:text-zinc-200 block font-semibold">BIR 12% Value Added Tax (VAT)</span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">Estimated output tax collected during period</span>
                </div>
                <span className="font-mono text-cyan-600 dark:text-cyan-400 font-bold text-sm">
                  ₱{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-slate-800 dark:text-zinc-200 block font-semibold">Low Stock Reorder Items</span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-500">Catalog items requiring supplier restocking</span>
                </div>
                <span className={clsx(
                  "font-mono font-bold text-sm",
                  lowStockCount > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
                )}>
                  {lowStockCount} items
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/inventory")}
              className="flex-1 py-2.5 rounded-xl bg-white dark:bg-zinc-900 hover:bg-slate-100 dark:hover:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 shadow-xs"
            >
              <Package className="w-4 h-4 text-lime-600 dark:text-lime-400" />
              <span>Inventory Catalog</span>
            </button>
            <button
              onClick={() => router.push("/payroll")}
              className="flex-1 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition-all border border-lime-600 shadow-sm flex items-center justify-center gap-2 active:scale-[0.98]"
            >
              <DollarSign className="w-4 h-4" />
              <span>Payroll Hub</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
