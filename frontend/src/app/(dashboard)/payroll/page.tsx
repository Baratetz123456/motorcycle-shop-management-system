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
  Percent
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { fetchStaffCompensationFromDB } from "@/lib/compensation";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
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

  // Role Access Guard Screen
  if (!checkingAuth && userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <div className="max-w-md w-full border border-red-500/20 rounded-2xl p-8 bg-zinc-950 text-center space-y-5">
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
              className="w-full py-3 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-white/10"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Shop</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-zinc-950 p-4 sm:p-6 lg:p-8 flex flex-col font-sans text-zinc-100 overflow-y-auto w-full">
      
      {/* Top Header */}
      <div className="pb-6 border-b border-zinc-800/80 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
              <DollarSign className="w-7 h-7 text-cyan-400" />
              Staff Compensation & Payroll
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Confidential P&L
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
            Automated technician labor commissions, cashier shift allowances, and payslip generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => handleDisbursePayroll("ALL")}
            disabled={disbursing || totalPendingPayroll === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-2 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>{disbursing ? "Disbursing..." : "Disburse All Pending"}</span>
          </button>
        </div>
      </div>

      {/* Period Filter Toolbar (Directly on Canvas, No Card Box) */}
      <div className="pb-6 border-b border-slate-200 mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-1.5 text-xs text-slate-500">
          <CalendarDays className="w-3.5 h-3.5 text-lime-600" />
          <span className="font-semibold">Settlement Period:</span>
        </div>

        <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs overflow-x-auto no-scrollbar w-fit">
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
                  : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* CARD-FREE KPI FINANCIAL RIBBON (Open Canvas Strip with Vertical Dividers) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 py-5 border-y border-slate-200 mb-8 divide-y lg:divide-y-0 lg:divide-x divide-slate-200">
        
        {/* Metric 1: Total Payroll Liability */}
        <div className="px-4 py-3 sm:py-0 first:pl-0">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Total Payroll Liability
          </span>
          <div className="text-2xl sm:text-3xl font-black text-slate-900 font-mono">
            ₱{grandTotalPayroll.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Combined staff labor & shift payouts
          </span>
        </div>

        {/* Metric 2: Mechanic Commissions */}
        <div className="px-4 py-3 sm:py-0">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Mechanic Commissions
          </span>
          <div className="text-2xl sm:text-3xl font-black text-lime-700 font-mono">
            ₱{totalMechanicCommission.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {mechanicList.length} active mechanics ({filteredCommissions.length} jobs)
          </span>
        </div>

        {/* Metric 3: Cashier Wages */}
        <div className="px-4 py-3 sm:py-0">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Cashier Shift Wages
          </span>
          <div className="text-2xl sm:text-3xl font-black text-purple-700 font-mono">
            ₱{totalCashierPayroll.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            {filteredCashiers.length} cashier shift settlements
          </span>
        </div>

        {/* Metric 4: Pending Payout */}
        <div className="px-4 py-3 sm:py-0 last:pr-0">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block mb-1">
            Unsettled Pending Pay
          </span>
          <div className="text-2xl sm:text-3xl font-black text-amber-700 font-mono">
            ₱{totalPendingPayroll.toFixed(2)}
          </div>
          <span className="text-[11px] text-slate-500 mt-0.5 block">
            Awaiting executive disbursement
          </span>
        </div>

      </div>

      {/* Segmented Staff Category Tabs */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs w-fit mb-6">
        <button
          onClick={() => setActiveTab("MECHANICS")}
          className={clsx(
            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
            activeTab === "MECHANICS"
              ? "bg-lime-500 text-zinc-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Mechanics ({mechanicList.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("CASHIERS")}
          className={clsx(
            "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2",
            activeTab === "CASHIERS"
              ? "bg-lime-500 text-zinc-950 shadow-sm"
              : "text-slate-600 hover:text-slate-950 hover:bg-white/60"
          )}
        >
          <UserCheck className="w-3.5 h-3.5" />
          <span>Cashiers ({filteredCashiers.length})</span>
        </button>
      </div>

      {/* BORDERLESS TABULAR LEDGERS */}

      {/* TAB 1: MECHANICS COMMISSION LEDGER */}
      {activeTab === "MECHANICS" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-lime-600" />
              <span>Technician Commission Accounts ({mechanicList.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Expand a technician to inspect job orders</span>
          </div>

          {mechanicList.length === 0 ? (
            <div className="p-8 text-center text-slate-500 border border-slate-200 rounded-xl">
              No mechanic commission logs match the active timeframe.
            </div>
          ) : (
            <div className="divide-y divide-slate-200 border-y border-slate-200">
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
                        <div className="w-6 h-6 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 group-hover:text-lime-700 transition-colors">
                          {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm text-slate-900 group-hover:text-lime-700 transition-colors">
                              {m.name}
                            </span>
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-lime-50 text-lime-800 border border-lime-200">
                              {m.assignedRate}% Comm.
                            </span>
                            {isAllDisbursed ? (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                Disbursed
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                                Unsettled
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-slate-500 block mt-0.5 font-mono">
                            {m.jobs_count} completed jobs • Labor Billed: ₱{m.total_labor.toFixed(2)}
                          </span>
                        </div>
                      </div>

                      {/* Financials & Actions */}
                      <div className="flex items-center gap-4 justify-between sm:justify-end">
                        <div className="text-right font-mono">
                          <span className="font-bold text-slate-900 text-base block">
                            ₱{m.total_earned.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-amber-700 block">
                            {m.pending_amount > 0 ? `₱${m.pending_amount.toFixed(2)} pending` : "Fully cleared"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          {m.pending_amount > 0 && (
                            <button
                              onClick={() => handleDisbursePayroll("MECHANIC", m.name)}
                              disabled={disbursing}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-sm"
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
                            className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center gap-1.5"
                          >
                            <Printer className="w-3.5 h-3.5 text-lime-600" />
                            <span>Payslip</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Itemized Job Orders Table */}
                    {isExpanded && (
                      <div className="mt-4 pt-3 border-t border-slate-200 overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px]">
                              <th className="p-2.5">Job Order #</th>
                              <th className="p-2.5">Customer & Bike</th>
                              <th className="p-2.5">Completion Date</th>
                              <th className="p-2.5">Labor Billed</th>
                              <th className="p-2.5">Commission Rate</th>
                              <th className="p-2.5 text-right">Earned (PHP)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-200 text-slate-700 font-mono">
                            {m.records.map((r: CommissionRecord) => (
                              <tr key={r.id} className="hover:bg-slate-50/60">
                                <td className="p-2.5 font-bold text-lime-700">{r.jo_number}</td>
                                <td className="p-2.5 font-sans">
                                  <span className="text-slate-900 block font-medium">{r.customer_name}</span>
                                  <span className="text-[10px] text-slate-500">{r.motorcycle_name}</span>
                                </td>
                                <td className="p-2.5 text-slate-500 text-[11px]">
                                  {new Date(r.created_at).toLocaleDateString()}
                                </td>
                                <td className="p-2.5 text-slate-700">₱{r.labor_base.toFixed(2)}</td>
                                <td className="p-2.5 text-slate-500">{r.rate_percentage}%</td>
                                <td className="p-2.5 text-right font-bold text-emerald-700">₱{r.amount_earned.toFixed(2)}</td>
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
          <div className="flex items-center justify-between pb-2 border-b border-slate-200">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <UserCheck className="w-4 h-4 text-purple-700" />
              <span>Cashier Shift Pay & Performance Ledger ({filteredCashiers.length})</span>
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">Daily wage base + POS checkout volume</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase text-[10px]">
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
              <tbody className="divide-y divide-slate-200 text-slate-700">
                {filteredCashiers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-6 text-center text-slate-500">
                      No cashier shift records logged in the active period.
                    </td>
                  </tr>
                ) : (
                  filteredCashiers.map((c) => (
                    <tr key={c.id} className="hover:bg-slate-50/60">
                      <td className="p-3 font-semibold text-slate-900">{c.cashier_name}</td>
                      <td className="p-3 font-mono text-slate-500 text-[11px]">{c.cashier_email}</td>
                      <td className="p-3 font-mono">{c.shifts_count} shifts</td>
                      <td className="p-3 font-mono text-slate-700">₱{c.base_daily_rate.toFixed(2)}/day</td>
                      <td className="p-3 font-mono text-lime-700 font-bold">{c.transactions_processed} txs</td>
                      <td className="p-3 font-mono font-bold text-slate-900">₱{c.total_volume_handled.toFixed(2)}</td>
                      <td className="p-3 text-right font-mono font-bold text-purple-700 text-sm">
                        ₱{c.total_pay.toFixed(2)}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {c.status === "PENDING" && (
                            <button
                              onClick={() => handleDisbursePayroll("CASHIER", c.cashier_name)}
                              disabled={disbursing}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] transition-colors"
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
                            className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 font-semibold text-[11px] transition-colors flex items-center gap-1"
                          >
                            <Printer className="w-3.5 h-3.5 text-lime-600" />
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

      {/* OFFICIAL PRINTABLE PAYSLIP MODAL */}
      <Modal
        isOpen={!!selectedPayslip}
        onClose={() => setSelectedPayslip(null)}
        size="lg"
      >
        <ModalHeader
          icon={Receipt}
          iconVariant="cyan"
          title="Official Staff Payslip Voucher"
          subtitle={`Disbursement record for ${selectedPayslip?.name}`}
          onClose={() => setSelectedPayslip(null)}
        />

        <ModalBody className="space-y-6 text-xs font-sans">
          {/* Printable Header Voucher */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
            <div className="flex justify-between items-start border-b border-slate-200 pb-4">
              <div>
                <span className="font-bold text-base text-slate-900 block">Versiklo Motorcycle Shop</span>
                <span className="text-[11px] text-slate-500 block">Staff Compensation P&L Statement</span>
              </div>
              <div className="text-right font-mono">
                <span className="text-lime-700 font-bold block">{selectedPayslip?.payslipNo}</span>
                <span className="text-[10px] text-slate-500">{selectedPayslip?.issuedDate}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-[11px]">
              <div>
                <span className="text-slate-500 block">Recipient Staff:</span>
                <span className="font-bold text-slate-900 text-sm">{selectedPayslip?.name}</span>
                <span className="text-slate-600 block">{selectedPayslip?.role} Staff Member</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Settlement Period:</span>
                <span className="font-mono text-slate-700">{selectedPayslip?.payPeriod}</span>
                <span className="block mt-1">
                  <span className={clsx(
                    "px-2 py-0.5 rounded-full text-[9px] font-bold uppercase",
                    selectedPayslip?.status === "DISBURSED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-amber-50 text-amber-800 border border-amber-200"
                  )}>
                    {selectedPayslip?.status}
                  </span>
                </span>
              </div>
            </div>

            <div className="border-t border-slate-200 pt-3 space-y-2 font-mono">
              {selectedPayslip?.role === "Mechanic" ? (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Job Orders Serviced:</span>
                    <span>{selectedPayslip?.itemsProcessed} orders</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Gross Customer Labor Billed:</span>
                    <span>₱{Number(selectedPayslip?.laborTotal || 0).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lime-700 font-bold">
                    <span>Assigned Commission Rate:</span>
                    <span>{selectedPayslip?.commissionRate}%</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex justify-between text-slate-700">
                    <span>Transactions Handled:</span>
                    <span>{selectedPayslip?.itemsProcessed} tickets</span>
                  </div>
                  <div className="flex justify-between text-slate-700">
                    <span>Daily Shift Base Rate:</span>
                    <span>₱{Number(selectedPayslip?.baseWage || 0).toFixed(2)}</span>
                  </div>
                </>
              )}

              <div className="flex justify-between text-base font-bold text-emerald-700 pt-3 border-t border-slate-200">
                <span>Total Net Payout:</span>
                <span>₱{Number(selectedPayslip?.totalPayout || 0).toFixed(2)}</span>
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
            <span>Print Payslip Voucher</span>
          </button>
          <button
            type="button"
            onClick={() => setSelectedPayslip(null)}
            className="px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all"
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
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Settlement Interval</label>
          <div className="grid grid-cols-2 gap-2">
            {[
              { key: "WEEKLY", label: "Weekly View" },
              { key: "MONTHLY", label: "Monthly View" },
              { key: "YEARLY", label: "Yearly View" },
              { key: "ALL", label: "All Records" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setSelectedPeriod(item.key as PeriodOption)}
                className={clsx(
                  "px-3 py-2.5 rounded-xl text-xs font-semibold text-center transition-all",
                  selectedPeriod === item.key
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
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
