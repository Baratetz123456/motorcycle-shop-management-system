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
  ShieldAlert,
  ChevronDown, 
  ChevronRight,
  TrendingUp,
  FileText,
  CalendarDays, 
  ArrowLeft,
  Filter
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { fetchStaffCompensationFromDB } from "@/lib/compensation";
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getSystemSettings, SystemSettings } from "@/lib/settings";

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
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());

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
    setSettings(getSystemSettings());
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
      <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <div className="max-w-md w-full border border-red-500/30 rounded-2xl p-8 bg-zinc-900 text-center space-y-5 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Restricted</h2>
            <p className="text-sm text-zinc-400 mt-2 leading-relaxed">
              The Payroll & Commissions ledger contains confidential compensation figures accessible exclusively to <span className="text-emerald-400 font-semibold">Shop Administrators</span> and <span className="text-emerald-400 font-semibold">Managers</span>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push(userRole === "cashier" ? "/pos" : "/repairs/board")}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2 border border-zinc-700"
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
    <div className="min-h-full bg-zinc-950 p-4 sm:p-6 lg:p-8 flex flex-col font-sans text-zinc-100 overflow-y-auto w-full">
      
      {/* Top Header */}
      <div className="pb-6 border-b border-zinc-800 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <DollarSign className="w-7 h-7 text-emerald-400" />
              Staff Compensation & Payroll
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Confidential P&L
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
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
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:bg-zinc-800/60 disabled:text-zinc-500 disabled:border-zinc-700/40 disabled:cursor-not-allowed border border-emerald-500/30"
          >
            <CheckCircle className="w-4 h-4" />
            <span>{disbursing ? "Disbursing..." : "Disburse All Pending"}</span>
          </button>
        </div>
      </div>

      {/* Period Filter Toolbar (Directly on Canvas, Hairline Dividers) */}
      <div className="pb-6 border-b border-zinc-800 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
          <CalendarDays className="w-4 h-4 text-emerald-400" />
          <span className="font-semibold text-zinc-300">Settlement Period:</span>
        </div>

        <div className="flex bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs overflow-x-auto no-scrollbar w-fit">
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
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CARD-FREE KPI FINANCIAL RIBBON (Open Canvas Strip with Subtle Hairline Dividers) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 py-5 border-y border-zinc-800 mb-8 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
        
        {/* Metric 1: Total Payroll Liability */}
        <div className="px-4 py-3 sm:py-0 first:pl-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Total Payroll Liability
          </span>
          <div className="text-2xl sm:text-3xl font-black text-white font-mono">
            ₱{grandTotalPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            Combined staff labor & cashier allowances
          </span>
        </div>

        {/* Metric 2: Mechanic Commissions */}
        <div className="px-4 py-3 sm:py-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Technician Commissions
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
            ₱{totalMechanicCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {mechanicList.length} mechanics ({filteredCommissions.length} job orders)
          </span>
        </div>

        {/* Metric 3: Cashier Wages */}
        <div className="px-4 py-3 sm:py-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Cashier Shift Allowances
          </span>
          <div className="text-2xl sm:text-3xl font-black text-cyan-400 font-mono">
            ₱{totalCashierPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {filteredCashiers.length} cashier shift settlements
          </span>
        </div>

        {/* Metric 4: Pending Payout */}
        <div className="px-4 py-3 sm:py-0 last:pr-0">
          <span className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider block mb-1">
            Unsettled Pending Pay
          </span>
          <div className={clsx(
            "text-2xl sm:text-3xl font-black font-mono",
            totalPendingPayroll > 0 ? "text-amber-400" : "text-emerald-400"
          )}>
            ₱{totalPendingPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <span className="text-[11px] text-zinc-400 mt-1 block">
            {totalPendingPayroll > 0 ? "Awaiting executive release" : "All accounts up to date"}
          </span>
        </div>

      </div>

      {/* Segmented Staff Category Tabs */}
      <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs w-fit mb-6">
        <button
          onClick={() => setActiveTab("MECHANICS")}
          className={clsx(
            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
            activeTab === "MECHANICS"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
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
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          )}
        >
          <UserCheck className="w-4 h-4" />
          <span>Cashiers ({filteredCashiers.length})</span>
        </button>
      </div>

      {/* TABULAR & CARD LEDGERS */}

      {/* TAB 1: MECHANICS COMMISSION LEDGER */}
      {activeTab === "MECHANICS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-400" />
              <span>Technician Commission Accounts ({mechanicList.length})</span>
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline-block">
              Click row to inspect itemized job orders
            </span>
          </div>

          {mechanicList.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
              No mechanic commission logs match the active timeframe.
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 border-y border-zinc-800">
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
                        <div className="w-6 h-6 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-emerald-400 transition-colors">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors">
                              {m.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              {m.assignedRate}% Comm.
                            </span>
                            {isAllDisbursed ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                Disbursed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">
                                Unsettled
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-zinc-400 block mt-0.5 font-mono">
                            {m.jobs_count} completed jobs • Labor Billed: ₱{m.total_labor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      {/* Financials & Actions */}
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right font-mono">
                          <span className="font-bold text-white text-base block">
                            ₱{m.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className={clsx(
                            "text-[10px] block font-semibold",
                            m.pending_amount > 0 ? "text-amber-400" : "text-emerald-400"
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
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm border border-emerald-500/30"
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
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Payslip</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Itemized Job Orders */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-zinc-800">
                        {/* 1. Desktop Table View (>= md) */}
                        <div className="hidden md:block overflow-x-auto">
                          <table className="w-full text-left text-xs">
                            <thead>
                              <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 uppercase text-[10px]">
                                <th className="p-2.5">Job Order #</th>
                                <th className="p-2.5">Customer & Bike</th>
                                <th className="p-2.5">Completion Date</th>
                                <th className="p-2.5">Labor Billed</th>
                                <th className="p-2.5">Commission Rate</th>
                                <th className="p-2.5 text-right">Earned (PHP)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-zinc-800 text-zinc-300 font-mono">
                              {m.records.map((r: CommissionRecord) => (
                                <tr key={r.id} className="hover:bg-zinc-900/50">
                                  <td className="p-2.5 font-bold text-emerald-400">{r.jo_number}</td>
                                  <td className="p-2.5 font-sans">
                                    <span className="text-white block font-medium">{r.customer_name}</span>
                                    <span className="text-[10px] text-zinc-400">{r.motorcycle_name}</span>
                                  </td>
                                  <td className="p-2.5 text-zinc-400 text-[11px]">
                                    {new Date(r.created_at).toLocaleDateString()}
                                  </td>
                                  <td className="p-2.5 text-zinc-300">₱{r.labor_base.toFixed(2)}</td>
                                  <td className="p-2.5 text-zinc-400">{r.rate_percentage}%</td>
                                  <td className="p-2.5 text-right font-bold text-emerald-400">₱{r.amount_earned.toFixed(2)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        {/* 2. Mobile Master-Detail Card View (< md) */}
                        <div className="md:hidden space-y-2.5">
                          <span className="text-[10px] font-bold uppercase text-zinc-400 tracking-wider block mb-1">
                            Itemized Job Orders ({m.records.length})
                          </span>
                          {m.records.map((r: CommissionRecord) => (
                            <div 
                              key={r.id} 
                              className="p-3.5 rounded-xl bg-zinc-900/80 border border-zinc-800/80 space-y-2 font-sans"
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-950/40 px-2.5 py-0.5 rounded border border-emerald-800/40">
                                  {r.jo_number}
                                </span>
                                <span className="font-mono font-bold text-sm text-emerald-400">
                                  +₱{r.amount_earned.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex justify-between items-start text-xs pt-1 border-t border-zinc-800/50">
                                <div>
                                  <span className="text-white font-medium block">{r.customer_name}</span>
                                  <span className="text-[11px] text-zinc-400 block">{r.motorcycle_name}</span>
                                </div>
                                <div className="text-right text-[11px] text-zinc-400 font-mono">
                                  <span>{new Date(r.created_at).toLocaleDateString()}</span>
                                  <span className="block text-zinc-500 mt-0.5">Labor: ₱{r.labor_base.toFixed(0)} @ {r.rate_percentage}%</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
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
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-cyan-400" />
              <span>Cashier Shift Pay & Performance Ledger ({filteredCashiers.length})</span>
            </h3>
            <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline-block">
              Daily wage base + POS checkout volume
            </span>
          </div>

          {filteredCashiers.length === 0 ? (
            <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
              No cashier shift records logged in the active period.
            </div>
          ) : (
            <>
              {/* 1. Desktop Table View (>= md) */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-900/60 text-zinc-400 uppercase text-[10px]">
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
                  <tbody className="divide-y divide-zinc-800 text-zinc-300">
                    {filteredCashiers.map((c) => (
                      <tr key={c.id} className="hover:bg-zinc-900/50">
                        <td className="p-3 font-semibold text-white">{c.cashier_name}</td>
                        <td className="p-3 font-mono text-zinc-400 text-[11px]">{c.cashier_email}</td>
                        <td className="p-3 font-mono text-zinc-200">{c.shifts_count} shifts</td>
                        <td className="p-3 font-mono text-zinc-400">₱{c.base_daily_rate.toFixed(2)}/day</td>
                        <td className="p-3 font-mono text-emerald-400 font-bold">{c.transactions_processed} txs</td>
                        <td className="p-3 font-mono font-bold text-white">₱{c.total_volume_handled.toFixed(2)}</td>
                        <td className="p-3 text-right font-mono font-bold text-cyan-400 text-sm">
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
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] transition-colors border border-emerald-500/30"
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
                              className="px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-[11px] transition-colors flex items-center gap-1"
                            >
                              <Printer className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Payslip</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* 2. Mobile Master-Detail Card View (< md) */}
              <div className="md:hidden space-y-3">
                {filteredCashiers.map((c) => (
                  <div 
                    key={c.id} 
                    className="p-4 rounded-2xl bg-zinc-900 border border-zinc-800 space-y-3 font-sans shadow-xs"
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <h4 className="text-sm font-bold text-white">{c.cashier_name}</h4>
                        <span className="text-[11px] text-zinc-400 font-mono block">{c.cashier_email}</span>
                      </div>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                        c.status === "DISBURSED" 
                          ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" 
                          : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                      )}>
                        {c.status}
                      </span>
                    </div>

                    {/* 2x2 Metric Grid */}
                    <div className="grid grid-cols-2 gap-2 p-2.5 rounded-xl bg-zinc-950/70 border border-zinc-800/70 text-xs font-mono">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block">Shifts Logged</span>
                        <span className="font-bold text-zinc-200">{c.shifts_count} shifts</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block">Daily Rate</span>
                        <span className="font-bold text-zinc-200">₱{c.base_daily_rate.toFixed(0)}/day</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block">POS Transactions</span>
                        <span className="font-bold text-emerald-400">{c.transactions_processed} txs</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block">Volume Handled</span>
                        <span className="font-bold text-white">₱{c.total_volume_handled.toFixed(0)}</span>
                      </div>
                    </div>

                    {/* Bottom Action Row */}
                    <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60">
                      <div>
                        <span className="text-[10px] text-zinc-400 uppercase block font-mono">Total Payout</span>
                        <span className="text-base font-black text-cyan-400 font-mono">₱{c.total_pay.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {c.status === "PENDING" && (
                          <button
                            onClick={() => setDisburseConfirmTarget({
                              type: "CASHIER",
                              targetName: c.cashier_name,
                              amount: c.total_pay,
                              count: c.shifts_count
                            })}
                            disabled={disbursing}
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs border border-emerald-500/30"
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
                          className="px-3 py-1.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-200 font-semibold text-xs flex items-center gap-1"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Payslip</span>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
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

      {/* Complete Single-Page Official Payslip Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 8mm 8mm;
          }
          *, *::before, *::after {
            box-shadow: none !important;
            text-shadow: none !important;
          }
          html, body, #__next, div, main, section, article {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            position: static !important;
            background: #ffffff !important;
          }
          body {
            background: #ffffff !important;
            color: #09090b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 10pt !important;
          }
          nav, aside, header, [role="navigation"], button, .no-print, .modal-backdrop, [role="dialog"] > div:first-child, [data-modal-header="true"], [data-modal-footer="true"] {
            display: none !important;
          }
          html.dark .printable-payslip,
          html.dark [data-payslip-canvas="true"],
          .printable-payslip,
          [data-payslip-canvas="true"] {
            display: block !important;
            color: #09090b !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          html.dark .printable-payslip *,
          html.dark [data-payslip-canvas="true"] *,
          .printable-payslip * {
            color: #09090b !important;
            border-color: #e4e4e7 !important;
            background-color: transparent !important;
          }
          html.dark .printable-payslip table,
          html.dark [data-payslip-canvas="true"] table,
          .printable-payslip table {
            border-collapse: collapse !important;
            width: 100% !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
          }
          html.dark .printable-payslip th,
          html.dark .printable-payslip td,
          .printable-payslip th, .printable-payslip td {
            border: 1px solid #e4e4e7 !important;
            padding: 4px 6px !important;
            color: #09090b !important;
            font-size: 9pt !important;
          }
          html.dark .printable-payslip th,
          .printable-payslip th {
            background-color: #f4f4f5 !important;
            background: #f4f4f5 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }
          html.dark .printable-payslip tr,
          .printable-payslip tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
          }
          html.dark .printable-payslip .print-pill,
          .printable-payslip .print-pill {
            background-color: #f4f4f5 !important;
            color: #09090b !important;
            border-color: #d4d4d8 !important;
          }
        }
      `}</style>

      {/* OFFICIAL PRINTABLE PAYSLIP MODAL */}
      <Modal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        size="lg"
      >
        <div data-modal-header="true">
          <ModalHeader
            icon={Receipt}
            iconVariant="emerald"
            title="Official Staff Compensation Voucher"
            subtitle={`Disbursement record for ${selectedPayslip?.name}`}
            onClose={() => setSelectedPayslip(null)}
          />
        </div>

        <ModalBody className="space-y-4 text-xs font-sans p-3 sm:p-6 bg-zinc-950">
          {/* UNIFIED SINGLE-PAGE DOCUMENT TEMPLATE (Dark In-App, Pure White in Print) */}
          <div 
            data-payslip-canvas="true" 
            className="printable-payslip w-full bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-xl rounded-xl p-5 sm:p-7 space-y-4 relative"
          >
            
            {/* 1. Official Letterhead Header (Dynamic Brand Info & TIN) */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-start gap-3.5">
                <BrandLogo size="md" variant="monochrome" className="shrink-0 mt-0.5" />
                <div>
                  <h1 className="text-xl font-black tracking-tight text-white uppercase leading-none">
                    {settings.appName ? `${settings.appName.toUpperCase()} ${settings.shopDescription === "Shop Floor" ? "MOTORCYCLE PARTS & SERVICES" : settings.shopDescription.toUpperCase()}` : "VERSIKLO MOTORCYCLE PARTS & SERVICES"}
                  </h1>
                  <p className="text-[11px] text-zinc-400 mt-1 leading-tight">
                    {settings.shopAddress || "123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila"}
                  </p>
                  <p className="text-[10px] text-zinc-400 mt-0.5 font-mono">
                    BIR Registered TIN: {settings.shopTin || "442-891-003-000 Non-VAT"}
                  </p>
                  <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                    Tel: {settings.contactPhone || "+63 (02) 8123-4567"} • Email: {settings.contactEmail || "compliance@versiklo.ph"}
                  </p>
                </div>
              </div>

              <div className="text-left sm:text-right space-y-0.5 shrink-0">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Official Staff Payslip
                </span>
                <span className="font-mono text-lg font-black text-white block leading-tight">
                  {selectedPayslip?.payslipNo}
                </span>
                <div className="text-[11px] text-zinc-400 font-mono">
                  <span>Period: </span>
                  <span className="font-semibold text-zinc-200">{selectedPayslip?.payPeriod}</span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Issued: {selectedPayslip?.issuedDate}
                </div>
                <div className="pt-0.5">
                  <span className={clsx(
                    "print-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase",
                    selectedPayslip?.status === "DISBURSED" 
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" 
                      : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                  )}>
                    {selectedPayslip?.status === "DISBURSED" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    Status: {selectedPayslip?.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Employee Profile & Settlement Details (Card-Free Flat Layout with Hairline Dividers) */}
            <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border-b border-zinc-800 pb-3 text-xs">
              {/* Employee Details */}
              <div className="pr-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Employee Details
                </span>
                <p className="font-bold text-white text-sm">{selectedPayslip?.name}</p>
                <p className="text-zinc-400 text-[11px]">Role: {selectedPayslip?.role} Technician / Staff</p>
              </div>

              {/* Settlement Period */}
              <div className="py-2 md:py-0 md:px-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Settlement Details
                </span>
                <p className="font-bold text-white text-sm font-mono">{selectedPayslip?.payPeriod}</p>
                <p className="text-zinc-400 text-[11px]">Voucher: {selectedPayslip?.payslipNo}</p>
              </div>

              {/* Authorization */}
              <div className="pt-2 md:pt-0 md:pl-4 space-y-1">
                <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                  Authorization
                </span>
                <p className="text-zinc-300 text-[11px]">
                  <span className="text-zinc-500">Disbursed By:</span> <strong className="text-white">Shop Manager / Admin</strong>
                </p>
                <p className="text-zinc-300 text-[11px]">
                  <span className="text-zinc-500">Date Issued:</span> <strong className="text-white">{selectedPayslip?.issuedDate}</strong>
                </p>
              </div>
            </div>

            {/* 3. Compensation Ledger Table (Border-collapsed, Condensed Single-Page Format) */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Compensation Breakdown & Earnings Ledger
              </span>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-zinc-800 bg-zinc-800/60 text-zinc-400 font-bold uppercase text-[10px]">
                      <th className="py-1.5 px-2">Earning Description / Activity</th>
                      <th className="py-1.5 px-2 w-32 text-center">Volume / Shifts</th>
                      <th className="py-1.5 px-2 w-32 text-right">Base / Billed</th>
                      <th className="py-1.5 px-2 w-28 text-center">Rate / Share</th>
                      <th className="py-1.5 px-2 w-32 text-right">Payout Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {selectedPayslip?.role === "Mechanic" ? (
                      <tr>
                        <td className="py-2 px-2 font-medium text-white">
                          Workshop Repair Labor Commission
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-zinc-300">
                          {selectedPayslip?.itemsProcessed} orders
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-zinc-300">
                          ₱{Number(selectedPayslip?.laborTotal || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-emerald-400 font-bold">
                          {selectedPayslip?.commissionRate}%
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-white">
                          ₱{Number(selectedPayslip?.totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="py-2 px-2 font-medium text-white">
                          Cashier Daily Shift Base Allowance & POS Tickets
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-zinc-300">
                          {selectedPayslip?.itemsProcessed} tickets
                        </td>
                        <td className="py-2 px-2 text-right font-mono text-zinc-300">
                          ₱{Number(selectedPayslip?.baseWage || 0).toFixed(2)}/day
                        </td>
                        <td className="py-2 px-2 text-center font-mono text-zinc-300 font-medium">
                          100%
                        </td>
                        <td className="py-2 px-2 text-right font-mono font-bold text-white">
                          ₱{Number(selectedPayslip?.totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Financial Total Squeezed Summary */}
            <div className="flex justify-between items-center py-2 px-3 bg-zinc-950/60 border border-zinc-800 rounded text-xs">
              <span className="font-bold text-zinc-400 uppercase tracking-wider text-[11px]">
                Net Compensation Payable:
              </span>
              <span className="font-mono text-base font-black text-emerald-400">
                ₱{Number(selectedPayslip?.totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 5. Statutory Terms & Acknowledgement */}
            <div className="py-2 border-y border-zinc-800 text-[10px] text-zinc-400 space-y-0.5">
              <p className="font-bold text-zinc-300">Disbursement Terms & Statutory Compliance</p>
              <p>• Official compensation statement issued in accordance with Philippine Labor Standards and Bureau of Internal Revenue (BIR) regulations.</p>
              <p>• Net disbursement has been credited and settled in accordance with shop payroll records and agreed commission schedule.</p>
            </div>

            {/* 6. Dual Physical Signatures */}
            <div className="pt-3 grid grid-cols-2 gap-10 text-xs">
              <div className="text-center space-y-1">
                <div className="border-b border-zinc-700 h-6 mx-auto w-3/4" />
                <p className="font-bold text-zinc-200 text-[11px]">Approved & Disbursed By</p>
                <p className="text-[10px] text-zinc-500">Shop Manager / Admin</p>
              </div>
              <div className="text-center space-y-1">
                <div className="border-b border-zinc-700 h-6 mx-auto w-3/4" />
                <p className="font-bold text-zinc-200 text-[11px]">Received in Full By</p>
                <p className="text-[10px] text-zinc-500">Employee Signature & Date</p>
              </div>
            </div>

            {/* 7. Audit Footnote */}
            <div className="pt-2 text-center text-[10px] text-zinc-500 space-y-0.5 border-t border-zinc-800/60">
              <p>Certified Official Compensation Voucher • Generated: {new Date().toLocaleString()}</p>
              <p className="font-mono">Reference ID: {selectedPayslip?.payslipNo} • Official Record • {settings.appName || "Versiklo"} Operations</p>
            </div>

          </div>
        </ModalBody>

        <div data-modal-footer="true">
          <ModalFooter>
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm border border-emerald-500/30"
            >
              <Printer className="w-4 h-4" />
              <span>Print Official Payslip</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedPayslip(null)}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold transition-all"
            >
              Close
            </button>
          </ModalFooter>
        </div>
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
          <label className="text-xs font-bold text-zinc-300">Settlement Interval</label>
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
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-950/50"
                    : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800"
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
