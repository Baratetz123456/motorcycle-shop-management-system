"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  DollarSign, 
  Wrench, 
  UserCheck, 
  Receipt, 
  Printer, 
  CheckCircle, 
  Clock, 
  ShieldCheck, 
  ShieldAlert,
  Percent, 
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  FileText,
  AlertCircle,
  X,
  Calendar,
  CalendarDays,
  Activity,
  ArrowLeft,
  Settings
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";
import { fetchStaffCompensationFromDB } from "@/lib/compensation";

interface CommissionRecord {
  id: string;
  job_order_id: string | null;
  jo_number?: string;
  customer_name?: string;
  motorcycle_name?: string;
  mechanic_id: string | null;
  mechanic_name: string;
  labor_base: number;
  rate_percentage: number;
  amount_earned: number;
  created_at: string;
  status?: "PENDING" | "DISBURSED";
}

interface CashierPayrollRecord {
  id: string;
  cashier_email: string;
  cashier_name: string;
  shifts_count: number;
  base_daily_rate: number;
  transactions_processed: number;
  total_volume_handled: number;
  total_pay: number;
  created_at: string;
  status: "PENDING" | "DISBURSED";
}

const NOW = Date.now();
const ONE_DAY = 24 * 3600 * 1000;

type PeriodOption = "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL";

export default function PayrollPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [activeTab, setActiveTab] = useState<"MECHANICS" | "CASHIERS">("MECHANICS");
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("MONTHLY");
  
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [cashierPayroll, setCashierPayroll] = useState<CashierPayrollRecord[]>([]);
  
  // Per-mechanic commission rates map (determined by assigned mechanic profiles in database)
  const [mechanicRates, setMechanicRates] = useState<Record<string, number>>({});

  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState<boolean>(false);
  const [expandedMechanic, setExpandedMechanic] = useState<string | null>(null);
  const [disbursing, setDisbursing] = useState<boolean>(false);

  useEffect(() => {
    // 1. Role verification: Restricted to admin and manager
    const role = localStorage.getItem("user_role");
    setUserRole(role);
    setCheckingAuth(false);

    // 2. Load live DB staff compensation rates
    fetchStaffCompensationFromDB().then((data) => {
      setMechanicRates((prev) => ({ ...prev, ...data.mechanicRates }));
    });

    fetchCommissions();
    fetchCashiers();
  }, []);

  const fetchCommissions = async () => {
    try {
      const res = await apiClient.get<CommissionRecord[]>("/repairs/commissions");
      if (Array.isArray(res.data)) {
        const merged = res.data.map((item) => ({
          ...item,
          mechanic_name: item.mechanic_name || "Mike Smith",
          jo_number: item.jo_number || `JO-${(item.job_order_id || "A1B2").slice(0, 4).toUpperCase()}`,
          customer_name: item.customer_name || "Customer",
          motorcycle_name: item.motorcycle_name || "Motorcycle",
          status: item.status || "PENDING",
          created_at: item.created_at || new Date().toISOString()
        }));
        setCommissions(merged);
        if (merged.length > 0) {
          setExpandedMechanic(merged[0].mechanic_name);
        }
      }
    } catch (e) {
      // ignore
    }
  };

  const fetchCashiers = async () => {
    try {
      const [usersRes, salesRes] = await Promise.all([
        apiClient.get<any>("/auth/users?page=1&page_size=100"),
        apiClient.get<any[]>("/sales/transactions"),
      ]);

      const cashiers = (usersRes.data?.items || []).filter((u: any) => u.role === "cashier");
      const sales = Array.isArray(salesRes.data) ? salesRes.data : [];

      const records: CashierPayrollRecord[] = cashiers.map((c: any) => {
        const cName = `${c.first_name || ""} ${c.last_name || ""}`.trim() || c.email;
        const mySales = sales.filter((s: any) => s.cashier_name === c.email || s.cashier_name === cName);
        const volume = mySales.reduce((sum: number, s: any) => sum + (Number(s.total) || 0), 0);
        const baseWage = Number(c.base_wage) || 650;
        const shifts = Math.max(1, Math.ceil(mySales.length / 5));
        return {
          id: `cpay-${c.id}`,
          cashier_email: c.email,
          cashier_name: cName,
          shifts_count: shifts,
          base_daily_rate: baseWage,
          transactions_processed: mySales.length,
          total_volume_handled: volume,
          total_pay: shifts * baseWage,
          created_at: c.created_at || new Date().toISOString(),
          status: "PENDING"
        };
      });
      setCashierPayroll(records);
    } catch (e) {}
  };

  // Filter items by selected period
  const isDateInPeriod = (dateStr: string, period: PeriodOption) => {
    if (period === "ALL") return true;
    const itemDate = new Date(dateStr).getTime();
    if (isNaN(itemDate)) return true;
    const diffMs = NOW - itemDate;
    if (period === "WEEKLY") return diffMs <= 7 * ONE_DAY;
    if (period === "MONTHLY") return diffMs <= 30 * ONE_DAY;
    if (period === "YEARLY") return diffMs <= 365 * ONE_DAY;
    return true;
  };

  // Filtered commissions based on active period
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => isDateInPeriod(c.created_at, selectedPeriod));
  }, [commissions, selectedPeriod]);

  // Filtered cashier payroll based on active period
  const filteredCashiers = useMemo(() => {
    return cashierPayroll.filter((c) => isDateInPeriod(c.created_at, selectedPeriod));
  }, [cashierPayroll, selectedPeriod]);

  // Group commissions by mechanic, computing earned amounts using EACH mechanic's assigned rate
  const mechanicSummaries = useMemo(() => {
    return filteredCommissions.reduce((acc, comm) => {
      const name = comm.mechanic_name || "Mike Smith";
      const assignedRate = mechanicRates[name] ?? 40;

      if (!acc[name]) {
        acc[name] = {
          name,
          assignedRate,
          jobs_count: 0,
          total_labor: 0,
          total_earned: 0,
          pending_amount: 0,
          disbursed_amount: 0,
          records: [] as CommissionRecord[]
        };
      }

      const recomputedEarned = Number((comm.labor_base * (assignedRate / 100)).toFixed(2));
      acc[name].jobs_count += 1;
      acc[name].total_labor += Number(comm.labor_base);
      acc[name].total_earned += recomputedEarned;

      if (comm.status === "DISBURSED") {
        acc[name].disbursed_amount += recomputedEarned;
      } else {
        acc[name].pending_amount += recomputedEarned;
      }

      acc[name].records.push({
        ...comm,
        rate_percentage: assignedRate,
        amount_earned: recomputedEarned
      });
      return acc;
    }, {} as Record<string, any>);
  }, [filteredCommissions, mechanicRates]);

  const mechanicList = Object.values(mechanicSummaries);

  // Totals
  const totalMechanicCommission = mechanicList.reduce((sum, m) => sum + m.total_earned, 0);
  const totalCashierPayroll = filteredCashiers.reduce((sum, c) => sum + c.total_pay, 0);
  const grandTotalPayroll = totalMechanicCommission + totalCashierPayroll;
  const totalPendingPayroll = 
    mechanicList.reduce((sum, m) => sum + m.pending_amount, 0) +
    filteredCashiers.filter(c => c.status === "PENDING").reduce((sum, c) => sum + c.total_pay, 0);

  const handleDisbursePayroll = (type: "ALL" | "MECHANIC" | "CASHIER", targetName?: string) => {
    setDisbursing(true);
    setTimeout(() => {
      if (type === "ALL" || type === "MECHANIC") {
        setCommissions((prev) =>
          prev.map((c) =>
            !targetName || c.mechanic_name === targetName ? { ...c, status: "DISBURSED" } : c
          )
        );
      }
      if (type === "ALL" || type === "CASHIER") {
        setCashierPayroll((prev) =>
          prev.map((c) =>
            !targetName || c.cashier_name === targetName ? { ...c, status: "DISBURSED" } : c
          )
        );
      }
      recordUserAuditLog("PAYROLL_DISBURSED", "/payroll", {
        type,
        target: targetName || "ALL_STAFF",
        period: selectedPeriod,
        timestamp: new Date().toISOString()
      });
      setDisbursing(false);
    }, 600);
  };

  const openPayslip = (recipient: {
    name: string;
    role: "Mechanic" | "Cashier";
    baseWage?: number;
    laborTotal?: number;
    commissionRate?: number;
    commissionEarned?: number;
    totalPayout: number;
    itemsProcessed?: number;
    status: string;
  }) => {
    const periodLabel = 
      selectedPeriod === "WEEKLY" ? "Weekly Settlement Period" :
      selectedPeriod === "MONTHLY" ? "Monthly Settlement Period" :
      selectedPeriod === "YEARLY" ? "Annual Settlement Period" : "Consolidated All-Time Period";

    setSelectedPayslip({
      ...recipient,
      payPeriod: periodLabel,
      payslipNo: `PAY-${Date.now().toString().slice(-6)}`,
      issuedDate: new Date().toLocaleDateString()
    });
  };

  // Role Access Guard Screen for Cashier & Mechanic
  if (!checkingAuth && userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <div className="max-w-md w-full bg-zinc-900/80 border border-red-500/20 rounded-3xl p-8 backdrop-blur-xl shadow-2xl text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Restricted</h2>
            <p className="text-sm text-zinc-400 mt-2">
              The Payroll & Commissions portal and individual mechanic earnings are confidential and accessible exclusively to <span className="text-cyan-400 font-semibold">Shop Administrators</span> and <span className="text-cyan-400 font-semibold">Managers</span>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push(userRole === "cashier" ? "/pos" : "/repairs/board")}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Assigned Workspace</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 p-8 flex flex-col font-sans text-zinc-100 overflow-y-auto">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 flex items-center gap-3">
              <DollarSign className="w-8 h-8 text-emerald-400" />
              Payroll & Commission Management
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Admin / Manager Exclusive
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">
            Configure per-mechanic commission rates, manage cashier shift disbursements, and audit compensation periods.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsAuditOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-md"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => handleDisbursePayroll("ALL")}
            disabled={disbursing || totalPendingPayroll === 0}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{disbursing ? "Disbursing Funds..." : "Disburse All Pending"}</span>
          </button>
        </div>
      </div>

      {/* Period Filter Bar & Settlement Selector */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-3 px-5 mb-8 backdrop-blur-xl flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs font-semibold text-zinc-400">
          <CalendarDays className="w-4 h-4 text-cyan-400" />
          <span>Settlement Time Period:</span>
        </div>

        <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10 text-xs">
          {[
            { key: "WEEKLY", label: "Weekly View (7d)" },
            { key: "MONTHLY", label: "Monthly View (30d)" },
            { key: "YEARLY", label: "Yearly View (365d)" },
            { key: "ALL", label: "All Records" },
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setSelectedPeriod(item.key as PeriodOption)}
              className={clsx(
                "px-3.5 py-1.5 rounded-lg font-semibold transition-all",
                selectedPeriod === item.key
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Total Payroll Due</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">₱{grandTotalPayroll.toFixed(2)}</div>
          <p className="text-[11px] text-zinc-500">Combined labor commission & cashier wages ({selectedPeriod.toLowerCase()})</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Mechanic Commissions</span>
            <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <Wrench className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-cyan-400 font-mono">₱{totalMechanicCommission.toFixed(2)}</div>
          <p className="text-[11px] text-zinc-500">Custom rates across {filteredCommissions.length} job orders</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Cashier Base Wages</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-purple-400 font-mono">₱{totalCashierPayroll.toFixed(2)}</div>
          <p className="text-[11px] text-zinc-500">{filteredCashiers.length} shift payouts in period</p>
        </div>

        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pending Payout</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-amber-400 font-mono">₱{totalPendingPayroll.toFixed(2)}</div>
          <p className="text-[11px] text-zinc-500">Unsettled earnings ready for disbursement</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("MECHANICS")}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === "MECHANICS"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Wrench className="w-4 h-4" />
            <span>Mechanic Commissions ({mechanicList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("CASHIERS")}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeTab === "CASHIERS"
                ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <UserCheck className="w-4 h-4" />
            <span>Cashier Payroll ({filteredCashiers.length})</span>
          </button>
        </div>

        <div className="text-xs text-zinc-400 flex items-center gap-2 bg-zinc-900/50 px-4 py-2 rounded-xl border border-white/5">
          <Percent className="w-3.5 h-3.5 text-cyan-400" />
          <span>Commission rates are determined by each assigned mechanic (configured in User Management).</span>
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "MECHANICS" ? (
        /* Mechanics Commission Breakdown View with Individual Rates */
        <div className="space-y-6">
          {mechanicList.length === 0 ? (
            <div className="p-12 text-center bg-zinc-900/40 rounded-3xl border border-white/10 text-zinc-500">
              No mechanic job orders found for the selected period ({selectedPeriod.toLowerCase()}).
            </div>
          ) : (
            mechanicList.map((mechanic) => {
              const isExpanded = expandedMechanic === mechanic.name;
              const currentRate = mechanicRates[mechanic.name] ?? mechanic.assignedRate;

              return (
                <div
                  key={mechanic.name}
                  className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl transition-all space-y-5"
                >
                  {/* Mechanic Summary Header Bar */}
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 font-bold text-lg">
                        {mechanic.name.split(" ").map((n: string) => n[0]).join("")}
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white flex items-center gap-2">
                          {mechanic.name}
                          <span className="text-xs font-normal text-zinc-400 font-mono bg-zinc-800 px-2 py-0.5 rounded-full">
                            {mechanic.jobs_count} job order(s) in {selectedPeriod.toLowerCase()}
                          </span>
                        </h3>
                        <p className="text-xs text-zinc-400">
                          Total Labor Handled: <span className="font-mono text-zinc-200 font-semibold">₱{mechanic.total_labor.toFixed(2)}</span>
                        </p>
                      </div>
                    </div>

                    {/* Assigned Mechanic Commission Rate (Read-Only, determined by assigned mechanic) */}
                    <div className="flex items-center gap-2 bg-zinc-950/80 p-2.5 px-4 rounded-2xl border border-white/5">
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 font-mono text-xs font-bold flex items-center gap-1.5">
                          <Percent className="w-3.5 h-3.5 text-amber-400" />
                          <span>Commission Rate: {currentRate}%</span>
                        </span>
                        <span className="text-[11px] text-zinc-500 hidden sm:inline">
                          (Determined by Mechanic Profile)
                        </span>
                      </div>
                    </div>

                    {/* Actions & Payout */}
                    <div className="flex flex-wrap items-center gap-4">
                      <div className="text-right">
                        <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Commission Earned</span>
                        <span className="font-mono text-xl font-black text-emerald-400">₱{mechanic.total_earned.toFixed(2)}</span>
                      </div>

                      <button
                        onClick={() => openPayslip({
                          name: mechanic.name,
                          role: "Mechanic",
                          laborTotal: mechanic.total_labor,
                          commissionRate: currentRate,
                          commissionEarned: mechanic.total_earned,
                          totalPayout: mechanic.total_earned,
                          itemsProcessed: mechanic.jobs_count,
                          status: mechanic.pending_amount > 0 ? "PENDING" : "DISBURSED"
                        })}
                        className="px-3.5 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5"
                      >
                        <Receipt className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Official Payslip</span>
                      </button>

                      {mechanic.pending_amount > 0 && (
                        <button
                          onClick={() => handleDisbursePayroll("MECHANIC", mechanic.name)}
                          className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all shadow-md flex items-center gap-1.5"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Disburse ₱{mechanic.pending_amount.toFixed(2)}</span>
                        </button>
                      )}

                      <button
                        onClick={() => setExpandedMechanic(isExpanded ? null : mechanic.name)}
                        className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition-colors"
                        title={isExpanded ? "Collapse Breakdown" : "Expand Job Orders"}
                      >
                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Itemized Job Orders Table */}
                  {isExpanded && (
                    <div className="pt-3 border-t border-white/5 animate-in fade-in">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-2">
                        Itemized Repair Jobs for {mechanic.name} (Calculated @ {currentRate}%)
                      </span>

                      <div className="bg-zinc-950 rounded-2xl border border-white/5 overflow-hidden">
                        <table className="w-full text-left text-sm">
                          <thead>
                            <tr className="border-b border-white/10 bg-zinc-900/60 text-zinc-400 uppercase text-xs font-semibold">
                              <th className="p-3.5">JO Number</th>
                              <th className="p-3.5">Customer & Vehicle</th>
                              <th className="p-3.5">Date Completed</th>
                              <th className="p-3.5 text-right">Labor Base</th>
                              <th className="p-3.5 text-center">Assigned Rate</th>
                              <th className="p-3.5 text-right">Commission</th>
                              <th className="p-3.5 text-center">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-white/5 text-zinc-300 font-sans">
                            {mechanic.records.map((rec: CommissionRecord) => (
                              <tr key={rec.id} className="hover:bg-zinc-900/40 transition-colors">
                                <td className="p-3.5 font-mono font-bold text-cyan-400">{rec.jo_number}</td>
                                <td className="p-3.5">
                                  <span className="font-bold text-zinc-100 block">{rec.customer_name}</span>
                                  <span className="text-xs text-zinc-400 font-mono">{rec.motorcycle_name}</span>
                                </td>
                                <td className="p-3.5 text-zinc-400 font-mono text-[11px]">
                                  {new Date(rec.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-3.5 text-right font-mono text-zinc-300">₱{rec.labor_base.toFixed(2)}</td>
                                <td className="p-3.5 text-center font-mono font-semibold text-cyan-300">{currentRate}%</td>
                                <td className="p-3.5 text-right font-mono font-bold text-emerald-400">
                                  ₱{rec.amount_earned.toFixed(2)}
                                </td>
                                <td className="p-3.5 text-center">
                                  <span className={clsx(
                                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                                    rec.status === "DISBURSED"
                                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                  )}>
                                    {rec.status || "PENDING"}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* Cashier Shift Payroll Table View */
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-900/90 text-zinc-400 uppercase text-xs font-semibold">
                  <th className="p-4">Cashier Staff</th>
                  <th className="p-4 text-center">Shifts Logged</th>
                  <th className="p-4 text-right">Daily Shift Rate</th>
                  <th className="p-4 text-center">POS Transactions</th>
                  <th className="p-4 text-right">Volume Handled</th>
                  <th className="p-4 text-right">Total Net Pay</th>
                  <th className="p-4 text-center">Status</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredCashiers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-zinc-500">
                      No cashier payroll logs found for the selected period ({selectedPeriod.toLowerCase()}).
                    </td>
                  </tr>
                ) : (
                  filteredCashiers.map((c) => (
                    <tr key={c.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-4">
                        <span className="font-bold text-white block">{c.cashier_name}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{c.cashier_email}</span>
                      </td>
                      <td className="p-4 text-center font-mono font-bold text-zinc-200">{c.shifts_count} shifts</td>
                      <td className="p-4 text-right font-mono text-zinc-400">₱{c.base_daily_rate.toFixed(2)}</td>
                      <td className="p-4 text-center font-mono text-cyan-400">{c.transactions_processed} orders</td>
                      <td className="p-4 text-right font-mono text-zinc-300">₱{c.total_volume_handled.toFixed(2)}</td>
                      <td className="p-4 text-right font-mono font-bold text-emerald-400 text-sm">
                        ₱{c.total_pay.toFixed(2)}
                      </td>
                      <td className="p-4 text-center">
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                          c.status === "DISBURSED"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                        )}>
                          {c.status}
                        </span>
                      </td>
                      <td className="p-4 text-center space-x-2">
                        <button
                          onClick={() => openPayslip({
                            name: c.cashier_name,
                            role: "Cashier",
                            baseWage: c.total_pay,
                            totalPayout: c.total_pay,
                            itemsProcessed: c.transactions_processed,
                            status: c.status
                          })}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-white font-semibold text-xs transition-colors"
                        >
                          Payslip
                        </button>

                        {c.status === "PENDING" && (
                          <button
                            onClick={() => handleDisbursePayroll("CASHIER", c.cashier_name)}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors shadow-sm"
                          >
                            Disburse
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Official Printable Payslip Modal */}
      {selectedPayslip && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-8 space-y-6">
            
            {/* Payslip Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div>
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  <h3 className="text-xl font-black text-white">Official Employee Payslip</h3>
                </div>
                <p className="text-xs text-zinc-400">Versiklo Enterprise Compensation Statement</p>
              </div>
              <button
                onClick={() => setSelectedPayslip(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Payslip Body Details */}
            <div className="bg-zinc-950 p-5 rounded-2xl border border-white/5 space-y-3 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-white/5">
                <span className="text-zinc-500">Employee Name:</span>
                <span className="font-bold text-white text-sm">{selectedPayslip.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Role Attribution:</span>
                <span className="font-mono text-cyan-400 font-semibold">{selectedPayslip.role}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Statement Reference #:</span>
                <span className="font-mono text-zinc-300 font-bold">{selectedPayslip.payslipNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Pay Settlement Period:</span>
                <span className="text-zinc-300 font-medium">{selectedPayslip.payPeriod}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-500">Settlement Status:</span>
                <span className={clsx(
                  "font-bold uppercase",
                  selectedPayslip.status === "DISBURSED" ? "text-emerald-400" : "text-amber-400"
                )}>
                  {selectedPayslip.status}
                </span>
              </div>

              {/* Earnings Breakdown */}
              <div className="pt-3 border-t border-white/10 space-y-2">
                {selectedPayslip.role === "Mechanic" ? (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>Total Labor Handled:</span>
                      <span className="font-mono text-zinc-200">₱{selectedPayslip.laborTotal?.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-cyan-400">
                      <span>Assigned Individual Rate:</span>
                      <span className="font-mono font-bold">{selectedPayslip.commissionRate}%</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="flex justify-between text-zinc-400">
                      <span>Logged Shifts Worked:</span>
                      <span className="font-mono text-zinc-200">₱650.00 / shift base</span>
                    </div>
                    <div className="flex justify-between text-purple-400">
                      <span>POS Transactions Handled:</span>
                      <span className="font-mono font-bold">{selectedPayslip.itemsProcessed} orders</span>
                    </div>
                  </>
                )}

                <div className="flex justify-between items-center text-base font-bold text-white pt-2 border-t border-white/5">
                  <span>Net Payout Disbursed:</span>
                  <span className="font-mono text-emerald-400 text-xl font-black">
                    ₱{selectedPayslip.totalPayout.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            {/* Payslip Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                onClick={() => window.print()}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 border border-white/10"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Print Official Payslip</span>
              </button>

              <button
                onClick={() => setSelectedPayslip(null)}
                className="flex-1 py-3 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl transition-all shadow-md"
              >
                <span>Close Statement</span>
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Contextual Audit Drawer */}
      <ContextualAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Payroll & Compensation Audit Trail"
        subtitle="Cryptographic audit stream for commission calculations and payroll disbursements"
        actionPrefix="PAYROLL_"
        resourceFilter="/payroll"
      />
    </div>
  );
}
