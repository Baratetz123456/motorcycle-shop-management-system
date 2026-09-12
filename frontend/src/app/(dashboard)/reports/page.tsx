"use client";

import { useEffect, useState } from "react";
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
  FileSpreadsheet
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
  amount_paid: number;
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

export default function DashboardReportsPage() {
  const router = useRouter();

  // Metrics state
  const [totalRevenue, setTotalRevenue] = useState<number>(0);
  const [netProfit, setNetProfit] = useState<number>(0);
  const [completedRepairsCount, setCompletedRepairsCount] = useState<number>(0);
  const [lowStockCount, setLowStockCount] = useState<number>(0);
  const [inventoryValue, setInventoryValue] = useState<number>(0);
  const [recentSales, setRecentSales] = useState<SalesLog[]>([]);
  const [revenueChartData, setRevenueChartData] = useState<{ name: string; revenue: number }[]>([]);
  const [repairsChartData, setRepairsChartData] = useState<{ name: string; completed: number }[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    loadSalesAndInventoryMetrics();
  }, []);

  const loadSalesAndInventoryMetrics = async () => {
    try {
      let salesTotal = 0;
      let salesList: SalesLog[] = [];

      // 1. Fetch Sales Transactions
      try {
        const res = await apiClient.get<SalesLog[]>("/sales/transactions");
        if (Array.isArray(res.data)) {
          salesList = res.data;
        }
      } catch (e) {}

      const storedSales = localStorage.getItem("motoshop_sales_logs");
      if (storedSales) {
        try {
          const localList: SalesLog[] = JSON.parse(storedSales);
          if (Array.isArray(localList) && localList.length > 0) {
            const ids = new Set(salesList.map((s) => s.id));
            salesList = [...localList.filter((s) => !ids.has(s.id)), ...salesList];
          }
        } catch (e) {}
      }

      if (salesList.length > 0) {
        const completed = salesList.filter((s) => s.status === "COMPLETED");
        salesTotal = completed.reduce((sum, s) => sum + (Number(s.total) || 0), 0);
        setRecentSales(completed.slice(0, 6));
        setTotalRevenue(salesTotal);
        setNetProfit(Number((salesTotal * 0.38).toFixed(2)));

        // Dynamic Daily Revenue Chart from Live Sales
        const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
        const dayMap: Record<string, number> = { Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0, Sun: 0 };
        completed.forEach((s) => {
          const d = s.created_at ? new Date(s.created_at) : new Date();
          const dayName = days[d.getDay()];
          dayMap[dayName] = (dayMap[dayName] || 0) + (Number(s.total) || 0);
        });
        setRevenueChartData(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({
          name: day,
          revenue: Math.round(dayMap[day] || 0),
        })));
      } else {
        setRevenueChartData(["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => ({ name: day, revenue: 0 })));
      }

      // 2. Fetch Inventory Items & Stock
      try {
        const invRes = await apiClient.get<InventoryItem[]>("/inventory");
        if (Array.isArray(invRes.data) && invRes.data.length > 0) {
          let invItems = invRes.data;
          const storedInv = localStorage.getItem("motoshop_inventory_stock");
          if (storedInv) {
            try {
              const stockMap = JSON.parse(storedInv);
              invItems = invItems.map((item) => ({
                ...item,
                current_stock: stockMap[item.id] !== undefined ? stockMap[item.id] : item.current_stock
              }));
            } catch (e) {}
          }

          const lowStock = invItems.filter(
            (i) => i.item_type === "PRODUCT" && i.current_stock <= i.reorder_level
          ).length;
          setLowStockCount(lowStock);

          const totalVal = invItems.reduce(
            (acc, i) => acc + (Number(i.cost_price || 0) * Number(i.current_stock || 0)),
            0
          );
          setInventoryValue(totalVal);
        }
      } catch (e) {}

      // 3. Fetch Repairs Jobs
      try {
        const repairRes = await apiClient.get<any[]>("/repairs/jobs");
        if (Array.isArray(repairRes.data)) {
          const finished = repairRes.data.filter((j) => j.status === "COMPLETED" || j.status === "RELEASED");
          setCompletedRepairsCount(finished.length);

          const weeks: Record<string, number> = { "Week 1": 0, "Week 2": 0, "Week 3": 0, "Week 4": 0 };
          finished.forEach((j, i) => {
            const wName = `Week ${(i % 4) + 1}`;
            weeks[wName] = (weeks[wName] || 0) + 1;
          });
          setRepairsChartData(Object.entries(weeks).map(([name, completed]) => ({ name, completed })));
        }
      } catch (e) {}
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <ReportsSkeleton />;
  }

  return (
    <div className="min-h-full bg-zinc-950 p-4 sm:p-6 lg:p-8 text-zinc-50 font-sans overflow-y-auto w-full">
      
      {/* Top Header */}
      <div className="pb-6 border-b border-zinc-800/80 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <Activity className="w-7 h-7 text-lime-600" />
              Executive Business Intelligence
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-lime-50 text-lime-800 border border-lime-200">
              Live Dashboard
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            Aggregated operational analytics across Sales, Inventory, Repairs, and Payroll.
          </p>
        </div>

        {/* Quick Actions & Navigation */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => router.push("/reports/extract")}
            className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-2 shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Shop Financial Ledger & Extracts</span>
          </button>

          <button
            onClick={() => router.push("/sales")}
            className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <Receipt className="w-3.5 h-3.5 text-lime-600" />
            <span>Sales</span>
          </button>

          <button
            onClick={() => router.push("/inventory")}
            className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <Boxes className="w-3.5 h-3.5 text-purple-600" />
            <span>Inventory</span>
          </button>

          <button
            onClick={() => router.push("/payroll")}
            className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <DollarSign className="w-3.5 h-3.5 text-emerald-600" />
            <span>Payroll</span>
          </button>

          <button
            onClick={() => router.push("/repairs/board")}
            className="px-3 py-2 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 transition-all text-xs font-semibold flex items-center gap-1.5"
          >
            <Wrench className="w-3.5 h-3.5 text-blue-600" />
            <span>Repairs</span>
          </button>
        </div>
      </div>

      {/* CARD-FREE KPI FINANCIAL RIBBON (Open Canvas Strip with Subtle Dividers) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 py-5 border-y border-slate-200 mb-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Metric 1: Total Revenue */}
        <div 
          onClick={() => router.push("/sales")}
          className="px-4 py-3 sm:py-0 first:pl-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Total Sales Revenue
            </span>
            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
              +14.2%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono group-hover:text-lime-700 transition-colors">
            ₱{totalRevenue.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-lime-700 group-hover:underline mt-1">
            <span>Inspect Sales Ledger</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Metric 2: Net Profit Margin */}
        <div 
          onClick={() => router.push("/payroll")}
          className="px-4 py-3 sm:py-0 cursor-pointer group transition-colors"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
              Est. Net Margin
            </span>
            <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
              +8.6%
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₱{netProfit.toFixed(2)}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-emerald-400 group-hover:underline mt-1">
            <span>Staff Payroll & Commissions</span>
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
            <span className="text-[10px] text-amber-400 font-bold bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
              Reorder
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 font-mono">
            {lowStockCount} items
          </div>
          <div className="flex items-center gap-1 text-[11px] text-amber-400 group-hover:underline mt-1">
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
            <span className="text-[10px] text-blue-400 font-bold bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">
              Active Stage
            </span>
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400 font-mono">
            {completedRepairsCount}
          </div>
          <div className="flex items-center gap-1 text-[11px] text-blue-400 group-hover:underline mt-1">
            <span>View Kanban Board</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

      </div>

      {/* BORDERLESS INTEGRATED CHARTS SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 pb-8 border-b border-zinc-800/80 mb-8">
        
        {/* Revenue Trajectory Chart */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Sales & Revenue Trajectory</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Daily business transaction volume synchronized with POS</p>
            </div>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs text-cyan-500 dark:text-cyan-400 hover:text-cyan-600 dark:hover:text-cyan-300 font-semibold flex items-center gap-1"
            >
              <span>View Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: 12 }}
                  itemStyle={{ color: '#06b6d4' }}
                />
                <Area type="monotone" dataKey="revenue" stroke="#06b6d4" strokeWidth={2.5} fillOpacity={0.12} fill="#06b6d4" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Weekly Completed Repairs Bar Chart */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white">Repairs Completed</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Weekly job volume by technicians</p>
            </div>
            <button
              onClick={() => router.push("/repairs/board")}
              className="text-xs text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1"
            >
              <span>Board</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-[280px] w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={repairsChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />
                <XAxis dataKey="name" stroke="#71717a" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                <YAxis stroke="#71717a" tick={{fill: '#a1a1aa', fontSize: 12}} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{fill: '#18181b'}}
                  contentStyle={{ backgroundColor: '#09090b', borderColor: '#27272a', borderRadius: '12px', fontSize: 12 }}
                />
                <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>

      {/* BORDERLESS OPERATIONAL DETAIL FEEDS (Recent Sales & Inventory Valuation) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* Feed 1: Recent Completed Sales Invoices */}
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80">
            <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              <span>Recent Completed Sales</span>
            </h4>
            <button
              onClick={() => router.push("/sales")}
              className="text-xs text-cyan-500 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              <span>All Invoices</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>

          <div className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs">
            {recentSales.length === 0 ? (
              <p className="text-zinc-500 py-6 text-center">No recent transactions found.</p>
            ) : (
              recentSales.map((tx) => (
                <div
                  key={tx.id}
                  onClick={() => router.push(`/sales/receipt?id=${tx.id}`)}
                  className="py-3 flex items-center justify-between cursor-pointer hover:bg-slate-50 dark:hover:bg-zinc-900/40 px-2 rounded-lg transition-colors group"
                >
                  <div>
                    <span className="font-mono font-bold text-slate-900 dark:text-white group-hover:text-cyan-500 dark:group-hover:text-cyan-400 transition-colors">
                      {tx.invoice_no}
                    </span>
                    <span className="text-[11px] text-zinc-500 block">
                      {new Date(tx.created_at).toLocaleDateString()} • {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <div className="text-right font-mono">
                    <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm block">₱{tx.total.toFixed(2)}</span>
                    <span className="text-[10px] text-zinc-500 uppercase">Paid</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Feed 2: Inventory Valuation & Stock Summary */}
        <div className="space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-zinc-200 dark:border-zinc-800/80 mb-3">
              <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Boxes className="w-4 h-4 text-purple-500 dark:text-purple-400" />
                <span>Inventory Stock & Valuation</span>
              </h4>
              <button
                onClick={() => router.push("/inventory")}
                className="text-xs text-purple-500 dark:text-purple-400 hover:underline flex items-center gap-1"
              >
                <span>Manage Stock</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="divide-y divide-slate-100 dark:divide-zinc-900 text-xs mb-6">
              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-slate-700 dark:text-zinc-300 block font-semibold">Total Inventory Cost Valuation</span>
                  <span className="text-[11px] text-zinc-500">Aggregated inventory purchase value</span>
                </div>
                <span className="font-mono font-bold text-slate-900 dark:text-white text-base">₱{inventoryValue.toFixed(2)}</span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-zinc-300 block font-semibold">Active Products & Parts</span>
                  <span className="text-[11px] text-zinc-500">SKUs tracked in warehouse</span>
                </div>
                <span className="font-mono text-cyan-400 font-semibold">Active Catalog</span>
              </div>

              <div className="py-3 flex justify-between items-center">
                <div>
                  <span className="text-zinc-300 block font-semibold">Low Stock Reorder Items</span>
                  <span className="text-[11px] text-zinc-500">Items at or below reorder threshold</span>
                </div>
                <span className="font-mono text-amber-400 font-bold">{lowStockCount} items</span>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <button
              onClick={() => router.push("/inventory")}
              className="flex-1 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/10 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <Package className="w-4 h-4 text-cyan-400" />
              <span>Inventory Control</span>
            </button>
            <button
              onClick={() => router.push("/payroll")}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2"
            >
              <DollarSign className="w-4 h-4" />
              <span>Payroll Center</span>
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
