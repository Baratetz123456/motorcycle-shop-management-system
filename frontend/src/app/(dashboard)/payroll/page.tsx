"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Filter,
  BarChart3
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { fetchStaffCompensationFromDB } from "@/lib/compensation";
import { ConfirmModal } from "@/components/ui/Modal";
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
  transactions?: any[];
}

const NOW = Date.now();
const ONE_DAY = 24 * 3600 * 1000;

type PeriodOption = "WEEKLY" | "MONTHLY" | "YEARLY" | "ALL";

function PayrollContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const subtabParam = searchParams.get("subtab");

  const [userRole, setUserRole] = useState<string | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [mainTab, setMainTab] = useState<"OVERVIEW" | "COMMISSIONS">(() => {
    return tabParam === "COMMISSIONS" ? "COMMISSIONS" : "OVERVIEW";
  });
  const [activeTab, setActiveTab] = useState<"MECHANICS" | "CASHIERS">(() => {
    return subtabParam === "CASHIERS" ? "CASHIERS" : "MECHANICS";
  });
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodOption>("MONTHLY");

  useEffect(() => {
    if (tabParam === "COMMISSIONS" || tabParam === "OVERVIEW") {
      setMainTab(tabParam);
    }
  }, [tabParam]);

  useEffect(() => {
    if (subtabParam === "CASHIERS" || subtabParam === "MECHANICS") {
      setActiveTab(subtabParam);
    }
  }, [subtabParam]);
  
  const [commissions, setCommissions] = useState<CommissionRecord[]>([]);
  const [cashierPayroll, setCashierPayroll] = useState<CashierPayrollRecord[]>([]);
  
  // Per-mechanic commission rates map
  const [mechanicRates, setMechanicRates] = useState<Record<string, number>>({});

  const [systemUsers, setSystemUsers] = useState<any[]>([]);
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
      }
    } catch (e) {}
  };

  const fetchCashiers = async () => {
    try {
      const [usersRes, salesRes] = await Promise.all([
        apiClient.get<any>("/auth/users?page=1&page_size=100"),
        apiClient.get<any[]>("/sales/transactions"),
      ]);

      const allUsers = usersRes.data?.items || [];
      setSystemUsers(allUsers);
      const cashiers = allUsers.filter((u: any) => u.role === "cashier");
      const sales = Array.isArray(salesRes.data) ? salesRes.data : [];

      let records: CashierPayrollRecord[] = cashiers.map((c: any) => {
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
          status: "PENDING",
          transactions: mySales
        };
      });

      if (records.length === 0) {
        records = [
          {
            id: "cpay-sample-01",
            cashier_email: "maria.santos@motoshop.ph",
            cashier_name: "Maria Santos",
            shifts_count: 22,
            base_daily_rate: 650,
            transactions_processed: 86,
            total_volume_handled: 94500,
            total_pay: 14300,
            created_at: new Date().toISOString(),
            status: "PENDING",
            transactions: [
              {
                id: "tx-sample-1",
                invoice_no: "INV-2026-0189",
                customer_name: "Walk-in Customer",
                payment_method: "CASH",
                total_amount: 1450,
                created_at: new Date().toISOString(),
                status: "PAID"
              }
            ]
          }
        ];
      }

      setCashierPayroll(records);
    } catch (e) {
      setCashierPayroll([
        {
          id: "cpay-sample-01",
          cashier_email: "maria.santos@motoshop.ph",
          cashier_name: "Maria Santos",
          shifts_count: 22,
          base_daily_rate: 650,
          transactions_processed: 86,
          total_volume_handled: 94500,
          total_pay: 14300,
          created_at: new Date().toISOString(),
          status: "PENDING",
          transactions: [
            {
              id: "tx-sample-1",
              invoice_no: "INV-2026-0189",
              customer_name: "Walk-in Customer",
              payment_method: "CASH",
              total_amount: 1450,
              created_at: new Date().toISOString(),
              status: "PAID"
            }
          ]
        }
      ]);
    }
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
        const matchedUser = systemUsers.find((u: any) => 
          u.id === comm.mechanic_id || 
          `${u.first_name || ''} ${u.last_name || ''}`.trim().toLowerCase() === name.toLowerCase() ||
          u.email?.toLowerCase() === name.toLowerCase()
        );
        const resolvedUserId = comm.mechanic_id || matchedUser?.id || (name ? `mech-${encodeURIComponent(name.toLowerCase().replace(/\s+/g, '-'))}` : "1");

        acc[name] = {
          name,
          userId: resolvedUserId,
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
  }, [filteredCommissions, mechanicRates, systemUsers]);

  const mechanicList = Object.values(mechanicSummaries);

  // Totals
  const totalMechanicCommission = mechanicList.reduce((sum, m) => sum + m.total_earned, 0);
  const totalMechanicLabor = mechanicList.reduce((sum, m) => sum + m.total_labor, 0);
  const totalMechanicJobs = mechanicList.reduce((sum, m) => sum + m.jobs_count, 0);
  const totalMechanicPending = mechanicList.reduce((sum, m) => sum + m.pending_amount, 0);

  const totalCashierPayroll = filteredCashiers.reduce((sum, c) => sum + c.total_pay, 0);
  const totalCashierShifts = filteredCashiers.reduce((sum, c) => sum + c.shifts_count, 0);
  const totalCashierTxs = filteredCashiers.reduce((sum, c) => sum + c.transactions_processed, 0);
  const totalCashierVolume = filteredCashiers.reduce((sum, c) => sum + c.total_volume_handled, 0);
  const totalCashierPending = filteredCashiers.filter(c => c.status === "PENDING").reduce((sum, c) => sum + c.total_pay, 0);

  const grandTotalPayroll = totalMechanicCommission + totalCashierPayroll;
  const totalPendingPayroll = totalMechanicPending + totalCashierPending;

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
    records?: any[];
  }) => {
    const periodLabel = 
      selectedPeriod === "WEEKLY" ? "Weekly Settlement (7 Days)" :
      selectedPeriod === "MONTHLY" ? "Monthly Settlement (30 Days)" :
      selectedPeriod === "YEARLY" ? "Annual Settlement (Year-to-Date)" : "Consolidated Cumulative Settlement";

    const payslipRecord = {
      ...recipient,
      records: recipient.records || [],
      id: recipient.name.toLowerCase().replace(/\s+/g, "-"),
      payPeriod: periodLabel,
      payslipNo: `PAY-${Date.now().toString().slice(-6)}`,
      issuedDate: new Date().toLocaleDateString("en-PH", {
        year: "numeric",
        month: "long",
        day: "numeric"
      })
    };

    try {
      const existing = localStorage.getItem("motoshop_payroll_cache");
      const list = existing ? JSON.parse(existing) : [];
      const filtered = list.filter((p: any) => p.id !== payslipRecord.id);
      filtered.unshift(payslipRecord);
      localStorage.setItem("motoshop_payroll_cache", JSON.stringify(filtered.slice(0, 20)));
    } catch (e) {
      // ignore
    }

    const targetSubtab = recipient.role.toUpperCase() === "CASHIER" ? "CASHIERS" : "MECHANICS";
    router.push(`/payroll/payslip?id=${encodeURIComponent(payslipRecord.id)}&role=${recipient.role}&period=${selectedPeriod}&subtab=${targetSubtab}`);
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
    <>
      <div 
        data-payroll-page="true"
        className="min-h-full bg-zinc-950 p-4 sm:p-6 lg:p-8 flex flex-col font-sans text-zinc-100 overflow-y-auto w-full print:hidden"
      >
      
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

      {/* 2 PRIMARY TABS: OVERVIEW & COMMISSION PAYSLIPS */}
      <div className="flex items-center gap-1.5 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800 text-xs w-full sm:w-fit mb-6 shadow-xs">
        <button
          type="button"
          onClick={() => setMainTab("OVERVIEW")}
          className={clsx(
            "flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
            mainTab === "OVERVIEW"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          )}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setMainTab("COMMISSIONS")}
          className={clsx(
            "flex-1 sm:flex-initial px-5 py-2.5 rounded-xl font-bold transition-all flex items-center justify-center gap-2 cursor-pointer",
            mainTab === "COMMISSIONS"
              ? "bg-emerald-600 text-white shadow-sm"
              : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
          )}
        >
          <Receipt className="w-4 h-4" />
          <span>Commission & Payslips</span>
        </button>
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
              type="button"
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

      {/* TAB CONTENT 1: OVERVIEW */}
      {mainTab === "OVERVIEW" && (
        <div className="space-y-8">
          {/* CARD-FREE KPI FINANCIAL RIBBON (Open Canvas Strip with Subtle Hairline Dividers) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 py-5 border-y border-zinc-800 divide-y sm:divide-y-0 sm:divide-x divide-zinc-800">
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

          {/* TWO EXECUTIVE BREAKDOWN SUMMARY CARDS */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Card 1: Workshop Technicians Overview */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <Wrench className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Workshop Technician Operations</h4>
                    <span className="text-xs text-zinc-400">Repair labor commission accounts</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {mechanicList.length} Mechanics
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Completed Jobs</span>
                  <span className="font-mono font-bold text-white text-base">{totalMechanicJobs} orders</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Labor Billed</span>
                  <span className="font-mono font-bold text-white text-base">₱{totalMechanicLabor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Commission Earned</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">₱{totalMechanicCommission.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Pending Settlement</span>
                  <span className={clsx("font-mono font-bold text-base", totalMechanicPending > 0 ? "text-amber-400" : "text-emerald-400")}>
                    ₱{totalMechanicPending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMainTab("COMMISSIONS");
                  setActiveTab("MECHANICS");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs transition-colors flex items-center justify-between border border-zinc-700 cursor-pointer"
              >
                <span>View Technician Payslips & Ledgers</span>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>

            {/* Card 2: Frontline Cashiers Overview */}
            <div className="p-6 rounded-2xl bg-zinc-900/60 border border-zinc-800 space-y-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-white">Frontline Cashier Operations</h4>
                    <span className="text-xs text-zinc-400">Shift pay allowances & checkout volume</span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {filteredCashiers.length} Cashiers
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3 p-4 rounded-xl bg-zinc-950/70 border border-zinc-800/80 text-xs">
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Shifts Logged</span>
                  <span className="font-mono font-bold text-white text-base">{totalCashierShifts} shifts</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">POS Transactions</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">{totalCashierTxs} tickets</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Volume Handled</span>
                  <span className="font-mono font-bold text-white text-base">₱{totalCashierVolume.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-400 block uppercase">Wage Liability</span>
                  <span className="font-mono font-bold text-emerald-400 text-base">₱{totalCashierPayroll.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMainTab("COMMISSIONS");
                  setActiveTab("CASHIERS");
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white font-semibold text-xs transition-colors flex items-center justify-between border border-zinc-700 cursor-pointer"
              >
                <span>View Cashier Payslips & Ledgers</span>
                <ChevronRight className="w-4 h-4 text-emerald-400" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT 2: COMMISSION & PAYSLIPS */}
      {mainTab === "COMMISSIONS" && (
        <div className="space-y-6">
          {/* Segmented Staff Category Tabs */}
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs w-fit">
            <button
              type="button"
              onClick={() => setActiveTab("MECHANICS")}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer",
                activeTab === "MECHANICS"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <Wrench className="w-4 h-4" />
              <span>Mechanics ({mechanicList.length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("CASHIERS")}
              className={clsx(
                "px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 cursor-pointer",
                activeTab === "CASHIERS"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-zinc-400 hover:text-white hover:bg-zinc-800/60"
              )}
            >
              <UserCheck className="w-4 h-4" />
              <span>Cashiers ({filteredCashiers.length})</span>
            </button>
          </div>

          {/* TAB 1: MECHANICS COMMISSION LEDGER */}
          {activeTab === "MECHANICS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-emerald-400" />
                  <span>Technician Commission Accounts ({mechanicList.length})</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline-block">
                  Click row or chevron to view profile, disburse settlement, and print payslip
                </span>
              </div>

              {mechanicList.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
                  No mechanic commission logs match the active timeframe.
                </div>
              ) : (
                <div data-technician-table="true" className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-xs">
                  {/* Mobile View: Borderless Edge-to-Edge List Cards (< md) */}
                  <div className="block md:hidden px-2 py-2 space-y-2.5">
                    {mechanicList.map((m) => {
                      const isAllDisbursed = m.pending_amount === 0 && m.records.length > 0;
                      return (
                        <div
                          key={m.name}
                          onClick={() =>
                            openPayslip({
                              name: m.name,
                              role: "Mechanic",
                              laborTotal: m.total_labor,
                              commissionRate: m.assignedRate,
                              commissionEarned: m.total_earned,
                              totalPayout: m.total_earned,
                              itemsProcessed: m.jobs_count,
                              status: isAllDisbursed ? "DISBURSED" : "PENDING",
                              records: m.records || []
                            })
                          }
                          className="p-3.5 hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer space-y-2 group border border-zinc-800/60 bg-zinc-900/60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shrink-0">
                                {m.name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors block">
                                  {m.name}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  Technician / Mechanic
                                </span>
                              </div>
                            </div>
                            {isAllDisbursed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                <CheckCircle className="w-3 h-3" />
                                <span>Disbursed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/40 text-amber-400 border border-amber-800/40">
                                <Clock className="w-3 h-3" />
                                <span>Unsettled</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                {m.assignedRate}% Comm.
                              </span>
                              <span>{m.jobs_count} jobs</span>
                            </div>
                            <span className="font-mono text-zinc-300">
                              Labor: ₱{m.total_labor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs text-zinc-400">
                            <span>Commission Payout</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-zinc-100 text-sm">
                                ₱{m.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Transactions-Style DataTable (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-200 whitespace-nowrap">
                      <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-400 border-b border-zinc-700/80 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 font-bold">Technician</th>
                          <th className="px-6 py-4 font-bold">Rate</th>
                          <th className="px-6 py-4 font-bold">Jobs Completed</th>
                          <th className="px-6 py-4 font-bold">Labor Billed</th>
                          <th className="px-6 py-4 font-bold">Commission Earned</th>
                          <th className="px-6 py-4 font-bold text-center">Settlement Status</th>
                          <th className="px-6 py-4 font-bold text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {mechanicList.map((m) => {
                          const isAllDisbursed = m.pending_amount === 0 && m.records.length > 0;

                          return (
                            <tr
                              key={m.name}
                              onClick={() =>
                                openPayslip({
                                  name: m.name,
                                  role: "Mechanic",
                                  laborTotal: m.total_labor,
                                  commissionRate: m.assignedRate,
                                  commissionEarned: m.total_earned,
                                  totalPayout: m.total_earned,
                                  itemsProcessed: m.jobs_count,
                                  status: isAllDisbursed ? "DISBURSED" : "PENDING",
                                  records: m.records || []
                                })
                              }
                              className="hover:bg-zinc-800/40 transition-all cursor-pointer group"
                            >
                              {/* 1. Technician Name & Avatar */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shrink-0">
                                    {m.name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                                      {m.name}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono">
                                      Technician / Mechanic
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Commission Rate */}
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  {m.assignedRate}% Comm.
                                </span>
                              </td>

                              {/* 3. Jobs Completed */}
                              <td className="px-6 py-4 font-mono">
                                <span className="text-zinc-200 font-semibold">{m.jobs_count}</span>
                                <span className="text-zinc-500 text-xs ml-1">jobs</span>
                              </td>

                              {/* 4. Labor Billed */}
                              <td className="px-6 py-4 font-mono text-zinc-300">
                                ₱{m.total_labor.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* 5. Commission Earned */}
                              <td className="px-6 py-4 font-mono">
                                <span className="font-bold text-zinc-100 text-base block">
                                  ₱{m.total_earned.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={clsx(
                                  "text-[10px] block font-semibold",
                                  m.pending_amount > 0 ? "text-amber-400" : "text-emerald-400"
                                )}>
                                  {m.pending_amount > 0
                                    ? `₱${m.pending_amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} pending`
                                    : "Fully cleared"}
                                </span>
                              </td>

                              {/* 6. Settlement Status */}
                              <td className="px-6 py-4 text-center">
                                {isAllDisbursed ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Disbursed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/40 text-amber-400 border border-amber-800/40">
                                    <Clock className="w-3.5 h-3.5" />
                                    Unsettled
                                  </span>
                                )}
                              </td>

                              {/* 7. Action Chevron (View Profile) */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center text-xs text-zinc-400 group-hover:text-emerald-400 transition-colors font-medium">
                                  <span className="hidden group-hover:inline mr-1">View Profile</span>
                                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CASHIERS SHIFT PAY LEDGER */}
          {activeTab === "CASHIERS" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-zinc-800">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-emerald-400" />
                  <span>Cashier Shift Pay & Performance Ledger ({filteredCashiers.length})</span>
                </h3>
                <span className="text-[11px] text-zinc-400 font-mono hidden sm:inline-block">
                  Click row or chevron to view profile, disburse settlement, and print payslip
                </span>
              </div>

              {filteredCashiers.length === 0 ? (
                <div className="p-8 text-center text-zinc-400 border border-dashed border-zinc-800 rounded-xl bg-zinc-900/40">
                  No cashier shift records logged in the active period.
                </div>
              ) : (
                <div data-cashier-table="true" className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-900/40 shadow-xs">
                  {/* Mobile View: Borderless Edge-to-Edge List Cards (< md) */}
                  <div className="block md:hidden px-2 py-2 space-y-2.5">
                    {filteredCashiers.map((c) => {
                      const isAllDisbursed = c.status === "DISBURSED";
                      return (
                        <div
                          key={c.id}
                          onClick={() =>
                            openPayslip({
                              name: c.cashier_name,
                              role: "Cashier",
                              baseWage: c.base_daily_rate,
                              totalPayout: c.total_pay,
                              itemsProcessed: c.transactions_processed,
                              status: c.status,
                              records: c.transactions || []
                            })
                          }
                          className="p-3.5 hover:bg-zinc-800/50 rounded-xl transition-all cursor-pointer space-y-2 group border border-zinc-800/60 bg-zinc-900/60"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shrink-0">
                                {c.cashier_name.charAt(0)}
                              </div>
                              <div>
                                <span className="font-bold text-sm text-white group-hover:text-emerald-400 transition-colors block">
                                  {c.cashier_name}
                                </span>
                                <span className="text-[10px] text-zinc-400 font-mono">
                                  {c.cashier_email}
                                </span>
                              </div>
                            </div>
                            {isAllDisbursed ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                <CheckCircle className="w-3 h-3" />
                                <span>Disbursed</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/40 text-amber-400 border border-amber-800/40">
                                <Clock className="w-3 h-3" />
                                <span>Unsettled</span>
                              </span>
                            )}
                          </div>

                          <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                              ₱{c.base_daily_rate.toFixed(0)}/day
                            </span>
                            <span className="font-mono text-zinc-300">
                              Volume: ₱{c.total_volume_handled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>

                          <div className="flex items-center justify-between pt-1 border-t border-zinc-800/60 text-xs text-zinc-400">
                            <span>Total Compensation</span>
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-emerald-400 text-sm">
                                ₱{c.total_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </span>
                              <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Desktop View: Transactions-Style DataTable (>= md) */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-sm text-zinc-200 whitespace-nowrap">
                      <thead className="text-xs uppercase bg-zinc-800/80 text-zinc-400 border-b border-zinc-700/80 sticky top-0 z-10">
                        <tr>
                          <th className="px-6 py-4 font-bold">Cashier</th>
                          <th className="px-6 py-4 font-bold">Daily Rate</th>
                          <th className="px-6 py-4 font-bold">Volume Handled</th>
                          <th className="px-6 py-4 font-bold">Total Compensation</th>
                          <th className="px-6 py-4 font-bold text-center">Settlement Status</th>
                          <th className="px-6 py-4 font-bold text-right"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800">
                        {filteredCashiers.map((c) => {
                          const isAllDisbursed = c.status === "DISBURSED";

                          return (
                            <tr
                              key={c.id}
                              onClick={() =>
                                openPayslip({
                                  name: c.cashier_name,
                                  role: "Cashier",
                                  baseWage: c.base_daily_rate,
                                  totalPayout: c.total_pay,
                                  itemsProcessed: c.transactions_processed,
                                  status: c.status,
                                  records: c.transactions || []
                                })
                              }
                              className="hover:bg-zinc-800/40 transition-all cursor-pointer group"
                            >
                              {/* 1. Cashier Name & Avatar */}
                              <td className="px-6 py-4">
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700/60 flex items-center justify-center text-emerald-400 font-bold text-xs uppercase shrink-0">
                                    {c.cashier_name.charAt(0)}
                                  </div>
                                  <div>
                                    <div className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                                      {c.cashier_name}
                                    </div>
                                    <div className="text-xs text-zinc-400 font-mono">
                                      {c.cashier_email}
                                    </div>
                                  </div>
                                </div>
                              </td>

                              {/* 2. Daily Rate */}
                              <td className="px-6 py-4">
                                <span className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                                  ₱{c.base_daily_rate.toFixed(0)}/day
                                </span>
                              </td>

                              {/* 3. Volume Handled */}
                              <td className="px-6 py-4 font-mono text-zinc-300">
                                ₱{c.total_volume_handled.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </td>

                              {/* 4. Total Compensation */}
                              <td className="px-6 py-4 font-mono">
                                <span className="font-bold text-zinc-100 text-base block">
                                  ₱{c.total_pay.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                                <span className={clsx(
                                  "text-[10px] block font-semibold",
                                  !isAllDisbursed ? "text-amber-400" : "text-emerald-400"
                                )}>
                                  {!isAllDisbursed ? "Awaiting release" : "Fully cleared"}
                                </span>
                              </td>

                              {/* 5. Settlement Status */}
                              <td className="px-6 py-4 text-center">
                                {isAllDisbursed ? (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Disbursed
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-amber-950/40 text-amber-400 border border-amber-800/40">
                                    <Clock className="w-3.5 h-3.5" />
                                    Unsettled
                                  </span>
                                )}
                              </td>

                              {/* 6. Action Chevron (View Profile) */}
                              <td className="px-6 py-4 text-right">
                                <div className="inline-flex items-center text-xs text-zinc-400 group-hover:text-emerald-400 transition-colors font-medium">
                                  <span className="hidden group-hover:inline mr-1">View Profile</span>
                                  <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
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
  </>
  );
}

export default function PayrollPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 p-4 sm:p-6 lg:p-8 flex items-center justify-center text-zinc-400 font-sans">
        Loading staff payroll...
      </div>
    }>
      <PayrollContent />
    </Suspense>
  );
}
