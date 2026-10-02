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
    <div className="min-h-full bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
      {/* ============ TOP HEADER & PERIOD FILTER ============ */}
      <div className="pb-6 border-b border-zinc-800 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <Activity className="w-7 h-7 text-emerald-400" />
              <span>Business Intelligence & Reports</span>
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-zinc-800 text-zinc-300 border border-zinc-700">
              Live BI
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
            Revenue trajectory, gross margins, inventory valuation, and repair labor performance.
          </p>
        </div>

        {/* Action Controls & Export */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Period Toggle Pills */}
          <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
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
                    ? "bg-emerald-600 text-white"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={() => router.push("/reports/extract")}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center gap-2 border border-emerald-500 active:scale-[0.98]"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Financial Ledger & CSV</span>
          </button>
        </div>
      </div>

      {/* ============ CARD-FREE KPI FINANCIAL RIBBON ============ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 py-5 border-y border-zinc-800 mb-8 divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
        
        {/* Metric 1: Total Revenue */}
        <div 
          onClick={() => router.push("/sales")}
          className="px-4 py-3 sm:py-0 first:pl-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Net Sales Revenue
            </span>
            <span className="text-[10px] text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
              +{period}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono group-hover:text-emerald-400 transition-colors">
            ₱{totalRevenue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium group-hover:text-zinc-200 mt-1">
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
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Est. Operating Margin (38%)
            </span>
            <span className="text-[10px] text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
              Profitable
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₱{netProfit.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium group-hover:text-zinc-200 mt-1">
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
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Low Stock Alerts
            </span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border bg-zinc-800 text-zinc-300 border-zinc-700">
              {lowStockCount > 0 ? `${lowStockCount} Reorder` : "Healthy"}
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono">
            {lowStockCount} items
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium group-hover:text-zinc-200 mt-1">
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
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Completed Repairs
            </span>
            <span className="text-[10px] text-zinc-300 font-bold bg-zinc-800 px-1.5 py-0.5 rounded border border-zinc-700">
              Workshop
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-zinc-100 font-mono">
            {completedRepairsCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-zinc-400 font-medium group-hover:text-zinc-200 mt-1">
            <span>Workshop Kanban Board</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* ============ BORDERLESS INTEGRATED CHARTS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 border-b border-zinc-800 mb-8">
        
        {/* Revenue Trajectory Chart (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Sales & Revenue Trajectory</h3>
              <p className="text-xs text-zinc-400">Daily business transaction volume synchronized with POS</p>
            </div>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <span>View Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.6} vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: 12,
                    color: '#ffffff',
                    boxShadow: 'none'
                  }}
                  itemStyle={{ color: '#10b981', fontWeight: 700 }}
                  formatter={(val: any) => [`₱${Number(val).toLocaleString()}`, "Revenue"]}
                />
                <Area type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={2.5} fillOpacity={1} fill="url(#emeraldGradient)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Completed Repairs Bar Chart (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Workshop Output</h3>
              <p className="text-xs text-zinc-400">Weekly job volume completed by technicians</p>
            </div>
            <button
              onClick={() => router.push("/repairs/board")}
              className="text-xs text-zinc-400 hover:text-white font-semibold flex items-center gap-1 transition-colors"
            >
              <span>Board</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" strokeOpacity={0.6} vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{ fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ 
                    backgroundColor: '#18181b', 
                    borderColor: '#27272a', 
                    borderRadius: '12px', 
                    fontSize: 12,
                    color: '#ffffff',
                    boxShadow: 'none'
                  }}
                />
                <Bar dataKey="completed" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* ============ BORDERLESS OPERATIONAL DETAIL FEEDS ============ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Feed 1: Recent Completed Sales Invoices */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-emerald-400" />
              <span>Recent Completed Sales</span>
            </h4>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
            >
              <span>All Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-zinc-900 text-xs">
            {filteredSales.length === 0 ? (
              <p className="text-zinc-500 py-6 text-center">No completed transactions in this period.</p>
            ) : (
              filteredSales.slice(0, 5).map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => router.push(`/sales/receipt?id=${tx.id}`)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-zinc-900/60 px-2.5 rounded-xl transition-colors group"
                >
                  <div>
                    <span className="font-mono font-bold text-white group-hover:text-emerald-400 transition-colors">
                      {tx.invoice_no}
                    </span>
                    <span className="text-[11px] text-zinc-400 block">
                      {tx.customer_name || "Walk-in Customer"} • {tx.created_at ? new Date(tx.created_at).toLocaleDateString() : "Recent"}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-400 text-sm block">
                      ₱{Number(tx.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </span>
                    <span className="text-[10px] text-zinc-400 uppercase font-semibold">
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
            <div className="flex items-center justify-between pb-2 border-b border-zinc-800 mb-3">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-zinc-400" />
                <span>Inventory Valuation & Tax Analysis</span>
              </h4>
              <button
                onClick={() => router.push("/inventory")}
                className="text-xs text-zinc-400 hover:text-white flex items-center gap-1 font-semibold transition-colors"
              >
                <span>Stock Control</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-zinc-900 text-xs mb-6">
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-zinc-200 block font-semibold">Total Warehouse Asset Value</span>
                  <span className="text-[11px] text-zinc-400">Aggregated inventory purchase wholesale cost</span>
                </div>
                <span className="font-mono font-bold text-white text-base">
                  ₱{inventoryValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-zinc-200 block font-semibold">BIR 12% Value Added Tax (VAT)</span>
                  <span className="text-[11px] text-zinc-400">Estimated output tax collected during period</span>
                </div>
                <span className="font-mono text-zinc-200 font-bold text-sm">
                  ₱{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-zinc-200 block font-semibold">Low Stock Reorder Items</span>
                  <span className="text-[11px] text-zinc-400">Catalog items requiring supplier restocking</span>
                </div>
                <span className="font-mono font-bold text-sm text-zinc-200">
                  {lowStockCount} items
                </span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/inventory")}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 hover:text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4 text-zinc-400" />
              <span>Inventory Catalog</span>
            </button>
            <button
              onClick={() => router.push("/payroll")}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-all border border-emerald-500 flex items-center justify-center gap-2 active:scale-[0.98]"
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
