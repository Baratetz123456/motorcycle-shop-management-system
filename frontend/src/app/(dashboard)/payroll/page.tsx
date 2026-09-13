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
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  FileText,
  Calendar, 
  CalendarDays, 
  ArrowLeft,
  Settings,
  Sparkles,
  Percent,
  Check,
  AlertCircle
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { fetchStaffCompensationFromDB } from "@/lib/compensation";
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

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
  
  // Per-mechanic commission rates map
  const [mechanicRates, setMechanicRates] = useState<Record<string, number>>({});

  const [selectedPayslip, setSelectedPayslip] = useState<any | null>(null);
  const [expandedMechanic, setExpandedMechanic] = useState<string | null>(null);
  const [disbursing, setDisbursing] = useState<boolean>(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Disbursement Confirmation Modal State
  const [disburseConfirmTarget, setDisburseConfirmTarget] = useState<{
    type: "ALL" | "MECHANIC" | "CASHIER";
    targetName?: string;
    amount: number;
    count: number;
  } | null>(null);

  const activeFilterCount = (selectedPeriod !== "MONTHLY" ? 1 : 0);
  const handleResetAllFilters = () => {
    setSelectedPeriod("MONTHLY");
  };

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
    } catch (e) {}
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
          created_at: new Date().toISOString(),
          status: "PENDING"
        };
      });

      setCashierPayroll(records);
    } catch (e) {}
  };

  // Filter items by selected period
  const filteredCommissions = useMemo(() => {
    return commissions.filter((c) => {
      const itemTime = new Date(c.created_at).getTime();
      if (selectedPeriod === "WEEKLY") return NOW - itemTime <= 7 * ONE_DAY;
      if (selectedPeriod === "MONTHLY") return NOW - itemTime <= 30 * ONE_DAY;
      if (selectedPeriod === "YEARLY") return NOW - itemTime <= 365 * ONE_DAY;
      return true;
    });
  }, [commissions, selectedPeriod]);

  const filteredCashiers = useMemo(() => {
    return cashierPayroll.filter((c) => {
      const itemTime = new Date(c.created_at).getTime();
      if (selectedPeriod === "WEEKLY") return NOW - itemTime <= 7 * ONE_DAY;
      if (selectedPeriod === "MONTHLY") return NOW - itemTime <= 30 * ONE_DAY;
      if (selectedPeriod === "YEARLY") return NOW - itemTime <= 365 * ONE_DAY;
      return true;
    });
  }, [cashierPayroll, selectedPeriod]);

  // Aggregate commissions by mechanic
  const mechanicSummaries = useMemo(() => {
    return filteredCommissions.reduce((acc, comm) => {
      const name = comm.mechanic_name;
      const assignedRate = mechanicRates[name] !== undefined ? mechanicRates[name] : comm.rate_percentage;

      if (!acc[name]) {
        acc[name] = {
          name,
          assignedRate,
          jobs_count: 0,
          total_labor: 0,
          total_earned: 0,
          disbursed_amount: 0,
          pending_amount: 0,
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

  const confirmAndExecuteDisbursement = async () => {
    if (!disburseConfirmTarget) return;
    const { type, targetName } = disburseConfirmTarget;
    setDisbursing(true);
    setDisburseConfirmTarget(null);

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
      selectedPeriod === "WEEKLY" ? "Weekly Settlement (7 Days)" :
      selectedPeriod === "MONTHLY" ? "Monthly Settlement (30 Days)" :
      selectedPeriod === "YEARLY" ? "Annual Settlement (Year-to-Date)" : "Consolidated Cumulative Settlement";

    setSelectedPayslip({
      ...recipient,
      payPeriod: periodLabel,
      payslipNo: `PAY-${Date.now().toString().slice(-6)}`,
      issuedDate: new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    });
  };

  // Role Access Guard Screen
  if (!checkingAuth && userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-slate-900 dark:text-zinc-100">
        <div className="max-w-md w-full border border-red-200 dark:border-red-500/20 rounded-2xl p-8 bg-white dark:bg-zinc-900 text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900 dark:text-white">Access Restricted</h2>
            <p className="text-sm text-slate-600 dark:text-zinc-400 mt-2 leading-relaxed">
              The Payroll & Commissions ledger contains confidential compensation figures accessible exclusively to <span className="text-lime-600 dark:text-lime-400 font-semibold">Shop Administrators</span> and <span className="text-lime-600 dark:text-lime-400 font-semibold">Managers</span>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push(userRole === "cashier" ? "/pos" : "/repairs/board")}
              className="w-full py-3 rounded-xl bg-slate-900 dark:bg-zinc-800 hover:bg-slate-800 dark:hover:bg-zinc-700 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Assigned Station</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-slate-50 dark:bg-zinc-950 p-4 sm:p-6 lg:p-8 flex flex-col font-sans text-slate-900 dark:text-zinc-100 overflow-y-auto w-full">
      
      {/* Top Header */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white flex items-center gap-2.5 tracking-tight">
              <DollarSign className="w-7 h-7 text-lime-600 dark:text-lime-400" />
              Staff Compensation & Payroll
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-500/20">
              Confidential P&L
            </span>
          </div>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-xs sm:text-sm">
            Automated technician labor commissions, cashier daily allowances, and official payslip disbursements.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setDisburseConfirmTarget({
              type: "ALL",
              amount: totalPendingPayroll,
              count: mechanicList.filter(m => m.pending_amount > 0).length + filteredCashiers.filter(c => c.status === "PENDING").length
            })}
            disabled={disbursing || totalPendingPayroll === 0}
            className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{disbursing ? "Disbursing..." : "Disburse All Pending"}</span>
          </button>
        </div>
      </div>

      {/* Period Filter Toolbar (Directly on Canvas, Hairline Dividers) */}
      <div className="pb-6 border-b border-slate-200 dark:border-zinc-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-zinc-400">
          <CalendarDays className="w-4 h-4 text-lime-600 dark:text-lime-400" />
          <span className="font-semibold">Settlement Period:</span>
        </div>

        <div className="flex bg-slate-200/60 dark:bg-zinc-900 p-1 rounded-xl border border-slate-300/80 dark:border-zinc-800 text-xs overflow-x-auto no-scrollbar w-fit">
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
                "px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap",
                selectedPeriod === item.key
                  ? "bg-lime-500 text-zinc-950 shadow-sm"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CARD-FREE KPI FINANCIAL RIBBON (Open Canvas Strip with Subtle Hairline Dividers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 py-5 border-y border-slate-200 dark:border-zinc-800 mb-8 divide-y sm:divide-y-0 sm:divide-x divide-slate-200 dark:divide-zinc-800">
        
        {/* Metric 1: Total Payroll Liability */}
        <div className="px-4 py-3 sm:py-0 first:pl-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
            Total Payroll Liability
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono">
            ₱{grandTotalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            Combined staff labor & cashier allowances
          </span>
        </div>

        {/* Metric 2: Mechanic Commissions */}
        <div className="px-4 py-3 sm:py-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
            Technician Commissions
          </span>
          <div className="text-2xl sm:text-3xl font-black text-lime-600 dark:text-lime-400 font-mono">
            ₱{totalMechanicCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            {mechanicList.length} mechanics ({filteredCommissions.length} job orders)
          </span>
        </div>

        {/* Metric 3: Cashier Wages */}
        <div className="px-4 py-3 sm:py-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
            Cashier Shift Allowances
          </span>
          <div className="text-2xl sm:text-3xl font-black text-cyan-600 dark:text-cyan-400 font-mono">
            ₱{totalCashierPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            {filteredCashiers.length} cashier shift settlements
          </span>
        </div>

        {/* Metric 4: Pending Payout */}
        <div className="px-4 py-3 sm:py-0 last:pr-0">
          <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400 uppercase tracking-wider block mb-1">
            Unsettled Pending Pay
          </span>
          <div className={clsx(
            "text-2xl sm:text-3xl font-black font-mono",
            totalPendingPayroll > 0 ? "text-amber-600 dark:text-amber-400" : "text-emerald-600 dark:text-emerald-400"
          )}>
            ₱{totalPendingPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-slate-500 dark:text-zinc-400 mt-1 block">
            {totalPendingPayroll > 0 ? "Awaiting executive release" : "All accounts up to date"}
          </span>
        </div>

      </div>

      {/* Segmented Staff Category Tabs */}
      <div className="flex items-center gap-1 bg-slate-200/60 dark:bg-zinc-900 p-1 rounded-xl border border-slate-300/80 dark:border-zinc-800 text-xs w-fit mb-6">
        <button
          onClick={() => setActiveTab("MECHANICS")}
          className={clsx(
            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
            activeTab === "MECHANICS"
              ? "bg-lime-500 text-zinc-950 shadow-sm"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60"
          )}
        >
          <Wrench className="w-4 h-4" />
          <span>Mechanics ({mechanicList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("CASHIERS")}
          className={clsx(
            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
            activeTab === "CASHIERS"
              ? "bg-lime-500 text-zinc-950 shadow-sm"
              : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-white/60 dark:hover:bg-zinc-800/60"
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Cashiers ({filteredCashiers.length})</span>
        </button>
      </div>

      {/* TABULAR LEDGERS */}

      {/* TAB 1: MECHANICS COMMISSION LEDGER */}
      {activeTab === "MECHANICS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-lime-600 dark:text-lime-400" />
              <span>Technician Commission Accounts ({mechanicList.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono hidden sm:inline-block">
              Click row to inspect itemized job orders
            </span>
          </div>

          {mechanicList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 dark:text-zinc-400 border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl">
              No mechanic commission logs match the active timeframe.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 dark:divide-zinc-800 border-y border-slate-200 dark:border-zinc-800">
              {mechanicList.map((m) => {
                const isExpanded = expandedMechanic === m.name;
                const isAllDisbursed = m.pending_amount === 0 && m.records.length > 0;

                return (
                  <div key={m.name} className="py-4">
                    {/* Header Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div 
                        onClick={() => setExpandedMechanic(isExpanded ? null : m.name)}
                        className="flex items-center gap-3 cursor-pointer group flex-1"
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 flex items-center justify-center text-slate-500 dark:text-zinc-400 group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-lime-600 dark:group-hover:text-lime-400 transition-colors">
                              {m.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-lime-50 dark:bg-lime-500/10 text-lime-700 dark:text-lime-400 border border-lime-200 dark:border-lime-500/20">
                              {m.assignedRate}% Comm.
                            </span>
                            {isAllDisbursed ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20">
                                Disbursed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20">
                                Unsettled
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 dark:text-zinc-400 block mt-0.5 font-mono">
                            {m.jobs_count} completed jobs • Labor Billed: ₱{m.total_labor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Financials & Actions */}
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900 dark:text-white text-base block">
                            ₱{m.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={clsx(
                            "text-[10px] block",
                            m.pending_amount > 0 ? "text-amber-600 dark:text-amber-400 font-semibold" : "text-emerald-600 dark:text-emerald-400"
                          )}>
                            {m.pending_amount > 0 ? `₱${m.pending_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending` : "Fully cleared"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {m.pending_amount > 0 && (
                            <button
                              onClick={() => setDisburseConfirmTarget({
                                type: "MECHANIC",
                                targetName: m.name,
                                amount: m.pending_amount,
                                count: m.records.filter((r: any) => r.status === "PENDING").length
                              })}
                              disabled={disbursing}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
                            >
                              <CheckCircle className="w-3.5 h-3.5" />
                              <span>Disburse</span>
                            </button>
                          )}

                          <button
                            onClick={() => openPayslip({
                              name: m.name,
                              role: "Mechanic",
                              laborTotal: m.total_labor,
                              commissionRate: m.assignedRate,
                              commissionEarned: m.total_earned,
                              totalPayout: m.total_earned,
                              itemsProcessed: m.jobs_count,
                              status: isAllDisbursed ? "DISBURSED" : "PENDING"
                            })}
                            className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
                            <span>Payslip</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Itemized Job Orders Table */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-slate-200 dark:border-zinc-800 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 uppercase text-[10px]">
                              <th className="p-2.5">Job Order #</th>
                              <th className="p-2.5">Customer & Bike</th>
                              <th className="p-2.5">Completion Date</th>
                              <th className="p-2.5">Labor Billed</th>
                              <th className="p-2.5">Commission Rate</th>
                              <th className="p-2.5 text-right">Earned (PHP)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300 font-mono">
                            {m.records.map((r: CommissionRecord) => (
                              <tr key={r.id} className="hover:bg-slate-100/40 dark:hover:bg-zinc-800/30">
                                <td className="p-2.5 font-bold text-lime-600 dark:text-lime-400">{r.jo_number}</td>
                                <td className="p-2.5 font-sans">
                                  <span className="text-slate-900 dark:text-white block font-medium">{r.customer_name}</span>
                                  <span className="text-[10px] text-slate-500 dark:text-zinc-400">{r.motorcycle_name}</span>
                                </td>
                                <td className="p-2.5 text-slate-500 dark:text-zinc-400 text-[11px]">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-2.5">₱{r.labor_base.toFixed(2)}</td>
                                <td className="p-2.5 text-slate-500 dark:text-zinc-400">{r.rate_percentage}%</td>
                                <td className="p-2.5 text-right font-bold text-emerald-600 dark:text-emerald-400">₱{r.amount_earned.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: CASHIERS SHIFT PAY LEDGER */}
      {activeTab === "CASHIERS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-zinc-800">
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-600 dark:text-cyan-400" />
              <span>Cashier Shift Pay & Performance Ledger ({filteredCashiers.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono hidden sm:inline-block">
              Daily wage base + POS checkout volume
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 dark:border-zinc-800 bg-slate-100/50 dark:bg-zinc-900 text-slate-600 dark:text-zinc-400 uppercase text-[10px]">
                  <th className="p-3">Cashier Name</th>
                  <th className="p-3">Email Address</th>
                  <th className="p-3">Shifts Logged</th>
                  <th className="p-3">Daily Base Rate</th>
                  <th className="p-3">POS Transactions</th>
                  <th className="p-3">Total Volume</th>
                  <th className="p-3 text-right">Total Pay (PHP)</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-zinc-800 text-slate-700 dark:text-zinc-300">
                {filteredCashiers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500 dark:text-zinc-400">
                      No cashier shift records logged in the active period.
                    </td>
                  </tr>
                ) : (
                  filteredCashiers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-100/40 dark:hover:bg-zinc-800/30">
                      <td className="p-3 font-semibold text-slate-900 dark:text-white">{c.cashier_name}</td>
                      <td className="p-3 font-mono text-slate-500 dark:text-zinc-400 text-[11px]">{c.cashier_email}</td>
                      <td className="p-3 font-mono">{c.shifts_count} shifts</td>
                      <td className="p-3 font-mono text-slate-600 dark:text-zinc-400">₱{c.base_daily_rate.toFixed(2)}/day</td>
                      <td className="p-3 font-mono text-lime-600 dark:text-lime-400 font-bold">{c.transactions_processed} txs</td>
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">₱{c.total_volume_handled.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-cyan-600 dark:text-cyan-400 text-sm">
                        ₱{c.total_pay.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === "PENDING" && (
                            <button
                              onClick={() => setDisburseConfirmTarget({
                                type: "CASHIER",
                                targetName: c.cashier_name,
                                amount: c.total_pay,
                                count: c.shifts_count
                              })}
                              disabled={disbursing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors shadow-sm"
                            >
                              Disburse
                            </button>
                          )}
                          <button
                            onClick={() => openPayslip({
                              name: c.cashier_name,
                              role: "Cashier",
                              baseWage: c.base_daily_rate,
                              totalPayout: c.total_pay,
                              itemsProcessed: c.transactions_processed,
                              status: c.status
                            })}
                            className="px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 border border-slate-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200 font-semibold text-[11px] transition-colors flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-lime-600 dark:text-lime-400" />
                            <span>Payslip</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* DISBURSEMENT CONFIRMATION MODAL */}
      {disburseConfirmTarget && (
        <ConfirmModal
          isOpen={!!disburseConfirmTarget}
          onClose={() => setDisburseConfirmTarget(null)}
          onConfirm={confirmAndExecuteDisbursement}
          title={
            disburseConfirmTarget.type === "ALL"
              ? "Confirm Mass Payroll Disbursement"
              : `Confirm Staff Payout for ${disburseConfirmTarget.targetName}`
          }
          message={
            disburseConfirmTarget.type === "ALL"
              ? `You are about to disburse ₱${disburseConfirmTarget.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} across ${disburseConfirmTarget.count} eligible staff accounts.`
              : `Disburse pending compensation of ₱${disburseConfirmTarget.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${disburseConfirmTarget.targetName}?`
          }
          warningDetails="This marks all pending compensation records as disbursed and creates an immutable executive audit trail. Ensure cash reserves or payroll accounts are funded."
          confirmText={disbursing ? "Processing..." : "Release Funds"}
          cancelText="Cancel"
          confirmVariant="primary"
          isLoading={disbursing}
        />
      )}

      {/* OFFICIAL PRINTABLE PAYSLIP MODAL */}
      <Modal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        size="lg"
      >
        <ModalHeader
          icon={Receipt}
          iconVariant="lime"
          title="Official Staff Compensation Voucher"
          subtitle={`Disbursement record for ${selectedPayslip?.name}`}
          onClose={() => setSelectedPayslip(null)}
        />

        <ModalBody className="space-y-6 text-xs font-sans">
          {/* Printable Voucher Canvas */}
          <div className="p-6 rounded-2xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 space-y-5 text-slate-900 dark:text-zinc-100 printable-payslip">
            
            {/* Store Header */}
            <div className="flex justify-between items-start border-b border-slate-200 dark:border-zinc-800 pb-4">
              <div>
                <span className="font-black text-lg text-slate-900 dark:text-white tracking-tight block">
                  VERSIKLO MOTORCYCLE PARTS & SERVICES
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block font-mono">
                  BIR Registered TIN: 442-891-003-000 Non-VAT
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400 block">
                  Official Staff Payroll & Commission Statement
                </span>
              </div>
              <div className="text-right font-mono">
                <span className="text-lime-600 dark:text-lime-400 font-bold text-sm block">
                  {selectedPayslip?.payslipNo}
                </span>
                <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                  {selectedPayslip?.issuedDate}
                </span>
              </div>
            </div>

            {/* Recipient Profile */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-500 dark:text-zinc-400 block uppercase text-[10px] font-bold">
                  Employee Details:
                </span>
                <span className="font-bold text-slate-900 dark:text-white text-base">
                  {selectedPayslip?.name}
                </span>
                <span className="text-slate-600 dark:text-zinc-400 block">
                  Role: {selectedPayslip?.role} Technician / Staff
                </span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 dark:text-zinc-400 block uppercase text-[10px] font-bold">
                  Settlement Period:
                </span>
                <span className="font-mono font-bold text-slate-700 dark:text-zinc-300">
                  {selectedPayslip?.payPeriod}
                </span>
                <div className="mt-1.5">
                  <span className={clsx(
                    "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase",
                    selectedPayslip?.status === "DISBURSED" 
                      ? "bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/20" 
                      : "bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-500/20"
                  )}>
                    {selectedPayslip?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* Compensation Ledger Breakdown */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-4 space-y-2.5 font-mono text-xs">
              {selectedPayslip?.role === "Mechanic" ? (
                <>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Job Orders Completed:</span>
                    <span className="font-bold">{selectedPayslip?.itemsProcessed} orders</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Gross Customer Labor Billed:</span>
                    <span>₱{Number(selectedPayslip?.laborTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <div className="flex justify-between text-lime-600 dark:text-lime-400 font-bold">
                    <span>Assigned Commission Rate:</span>
                    <span>{selectedPayslip?.commissionRate}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>POS Transactions Processed:</span>
                    <span className="font-bold">{selectedPayslip?.itemsProcessed} tickets</span>
                  </div>
                  <div className="flex justify-between text-slate-700 dark:text-zinc-300">
                    <span>Daily Shift Base Wage:</span>
                    <span>₱{Number(selectedPayslip?.baseWage || 0).toFixed(2)}/day</span>
                  </div>
                </>
              )}

              {/* Total Payout */}
              <div className="flex justify-between text-base font-black text-emerald-600 dark:text-emerald-400 pt-3 border-t border-slate-200 dark:border-zinc-800">
                <span>Total Net Payout:</span>
                <span className="text-lg">
                  ₱{Number(selectedPayslip?.totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Signatures & Acknowledgement */}
            <div className="border-t border-slate-200 dark:border-zinc-800 pt-6 grid grid-cols-2 gap-8 text-[11px]">
              <div>
                <div className="border-b border-slate-300 dark:border-zinc-700 h-8 mb-1"></div>
                <span className="font-semibold text-slate-700 dark:text-zinc-300 block">Approved & Disbursed By</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Shop Manager / Admin</span>
              </div>
              <div>
                <div className="border-b border-slate-300 dark:border-zinc-700 h-8 mb-1"></div>
                <span className="font-semibold text-slate-700 dark:text-zinc-300 block">Received in Full By</span>
                <span className="text-[10px] text-slate-500 dark:text-zinc-400">Employee Signature & Date</span>
              </div>
            </div>

          </div>
        </ModalBody>

        <ModalFooter>
          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Print Official Payslip</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPayslip(null)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-semibold transition-all"
          >
            Close
          </button>
        </ModalFooter>
      </Modal>

      {/* Floating Filter FAB (Mobile Only) */}
      <FloatingFilterButton
        onClick={() => setIsMobileFilterOpen(true)}
        activeCount={activeFilterCount}
      />

      {/* Mobile Slide-Up Filter Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Settlement Period"
        activeCount={activeFilterCount}
        onReset={handleResetAllFilters}
      >
        <div className="space-y-3">
          <label className="text-xs font-bold text-slate-700 dark:text-zinc-300">Settlement Interval</label>
          <div className="grid grid-cols-2 gap-2.5">
            {[
              { key: "WEEKLY", label: "Weekly View (7d)" },
              { key: "MONTHLY", label: "Monthly View (30d)" },
              { key: "YEARLY", label: "Yearly View (365d)" },
              { key: "ALL", label: "All Records" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  setSelectedPeriod(item.key as PeriodOption);
                  setIsMobileFilterOpen(false);
                }}
                className={clsx(
                  "px-3 py-3 rounded-xl text-xs font-bold text-center transition-all",
                  selectedPeriod === item.key
                    ? "bg-lime-500 text-zinc-950 shadow-md shadow-lime-500/20"
                    : "bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>
      </MobileFilterSheet>

    </div>
  );
}
