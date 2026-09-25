"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Download, 
  Printer, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Plus, 
  Receipt, 
  Wrench, 
  Package, 
  Zap, 
  Building2, 
  Users, 
  Hammer, 
  ArrowLeft,
  ShieldAlert,
  Percent,
  CreditCard,
  Banknote,
  Smartphone,
  ShieldCheck,
  Loader2,
  RefreshCw
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { fetchStaffCompensationFromDB, extractInvoiceLaborAndCommission } from "@/lib/compensation";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import { 
  PrintableFinancialReportDocument, 
  getFinancialReportDocumentHtml, 
  ExpenseItemRecord 
} from "@/components/documents/PrintableFinancialReportDocument";
import { 
  buildEnterpriseReportCsv, 
  downloadCsvFile, 
  printIsolatedDocument 
} from "@/components/documents/reportExportUtils";

interface SalesTransaction {
  id: string;
  invoice_no: string;
  customer_name?: string;
  motorcycle_name?: string;
  created_at: string;
  total: number;
  subtotal: number;
  status: "COMPLETED" | "VOIDED";
  payment_method: string;
  items?: Array<{ name: string; qty: number; price: number; type?: string }>;
}

export type ExpenseCategory = 
  | "ELECTRICITY_UTILITIES" 
  | "RENT" 
  | "STAFF_WAGES" 
  | "CONSUMABLE_PARTS" 
  | "TOOLS_EQUIPMENT"
  | "MISCELLANEOUS";

export interface ShopExpense {
  id: string;
  category: ExpenseCategory;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  reference_no?: string;
  created_by?: string;
}

export default function FinancialAndSalesExtractPage() {
  const router = useRouter();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string>("admin@versiklo.ph");
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());

  // Timeframe selector
  const [reportType, setReportType] = useState<"DAILY" | "MONTHLY" | "YEARLY">("MONTHLY");
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedYear, setSelectedYear] = useState<string>(String(new Date().getFullYear()));
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const activeFilterCount = (reportType !== "MONTHLY" ? 1 : 0);
  const handleResetAllFilters = () => {
    setReportType("MONTHLY");
    setSelectedMonth(new Date().toISOString().slice(0, 7));
  };

  // Data
  const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
  const [expenses, setExpenses] = useState<ShopExpense[]>([]);
  const [mechanicRates, setMechanicRates] = useState<Record<string, number>>({});

  // Expense modal state
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [newCategory, setNewCategory] = useState<ExpenseCategory>("ELECTRICITY_UTILITIES");
  const [newDescription, setNewDescription] = useState("");
  const [newAmount, setNewAmount] = useState("");
  const [newVendor, setNewVendor] = useState("");
  const [newRef, setNewRef] = useState("");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    const role = localStorage.getItem("user_role");
    const email = localStorage.getItem("user_email") || "admin@versiklo.ph";
    setUserRole(role);
    setUserEmail(email);
    setCheckingAuth(false);
    setSettings(getSystemSettings());

    // Fetch live compensation from database
    fetchStaffCompensationFromDB().then((data) => {
      setMechanicRates(data.mechanicRates);
    });

    // Load persisted expenses
    const storedExp = localStorage.getItem("versiklo_shop_expenses");
    if (storedExp) {
      try {
        const parsed = JSON.parse(storedExp);
        if (Array.isArray(parsed)) {
          setExpenses(parsed);
        }
      } catch (e) {}
    }

    fetchSalesData();
  }, []);

  const fetchSalesData = async () => {
    let salesList: SalesTransaction[] = [];
    try {
      const res = await apiClient.get<SalesTransaction[]>("/sales/transactions");
      if (Array.isArray(res.data) && res.data.length > 0) {
        salesList = res.data;
      }
    } catch (e) {}

    const storedSales = localStorage.getItem("motoshop_sales_logs");
    if (storedSales) {
      try {
        const localList = JSON.parse(storedSales);
        if (Array.isArray(localList) && localList.length > 0) {
          const ids = new Set(salesList.map((s) => s.id));
          salesList = [...localList.filter((s: SalesTransaction) => !ids.has(s.id)), ...salesList];
        }
      } catch (e) {}
    }

    setTransactions(salesList);
  };

  // Filter Transactions by Timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.status !== "COMPLETED") return false;
      const d = new Date(tx.created_at || Date.now());
      if (isNaN(d.getTime())) return false;

      const dateStr = d.toISOString().slice(0, 10);
      const monthStr = d.toISOString().slice(0, 7);
      const yearStr = String(d.getFullYear());

      if (reportType === "DAILY") return dateStr === selectedDate;
      if (reportType === "MONTHLY") return monthStr === selectedMonth;
      if (reportType === "YEARLY") return yearStr === selectedYear;
      return true;
    });
  }, [transactions, reportType, selectedDate, selectedMonth, selectedYear]);

  // Filter Expenses by Timeframe
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (!exp.date) return false;
      const expDate = exp.date.slice(0, 10);
      const expMonth = exp.date.slice(0, 7);
      const expYear = exp.date.slice(0, 4);

      if (reportType === "DAILY") return expDate === selectedDate;
      if (reportType === "MONTHLY") return expMonth === selectedMonth;
      if (reportType === "YEARLY") return expYear === selectedYear;
      return true;
    });
  }, [expenses, reportType, selectedDate, selectedMonth, selectedYear]);

  // Financial Calculations
  const grossRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, tx) => acc + (Number(tx.total) || 0), 0);
  }, [filteredTransactions]);

  const vatableSales = grossRevenue / 1.12;
  const vatOutputTax = grossRevenue - vatableSales;

  // Breakdown parts vs labor
  const { partsRevenue, grossLaborRevenue, mechanicCommissionsDeducted, netLaborRevenue } = useMemo(() => {
    let parts = 0;
    let labor = 0;
    let comms = 0;

    filteredTransactions.forEach((tx) => {
      const { grossLabor, commissionDeduction } = extractInvoiceLaborAndCommission(
        tx.items || [],
        (tx as any).mechanic_name || "Mike Smith",
        mechanicRates
      );
      labor += grossLabor;
      comms += commissionDeduction;
      const invoiceParts = Math.max(0, (Number(tx.total) || 0) - grossLabor);
      parts += invoiceParts;
    });

    return {
      partsRevenue: parts,
      grossLaborRevenue: labor,
      mechanicCommissionsDeducted: comms,
      netLaborRevenue: Math.max(0, labor - comms)
    };
  }, [filteredTransactions, mechanicRates]);

  const netShopRevenue = partsRevenue + netLaborRevenue;

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, exp) => acc + (Number(exp.amount) || 0), 0);
  }, [filteredExpenses]);

  const categoryTotals = useMemo(() => {
    const acc: Record<string, number> = {
      ELECTRICITY_UTILITIES: 0,
      RENT: 0,
      STAFF_WAGES: 0,
      CONSUMABLE_PARTS: 0,
      TOOLS_EQUIPMENT: 0,
      MISCELLANEOUS: 0
    };
    filteredExpenses.forEach((exp) => {
      acc[exp.category] = (acc[exp.category] || 0) + Number(exp.amount || 0);
    });
    return acc;
  }, [filteredExpenses]);

  const netIncome = netShopRevenue - totalExpenses;
  const profitMargin = grossRevenue > 0 ? ((netIncome / grossRevenue) * 100).toFixed(1) : "0.0";

  const periodLabel = useMemo(() => {
    if (reportType === "DAILY") return `Daily Statement: ${selectedDate}`;
    if (reportType === "MONTHLY") return `Monthly Statement: ${selectedMonth}`;
    return `Annual Statement: ${selectedYear}`;
  }, [reportType, selectedDate, selectedMonth, selectedYear]);

  // Add Expense
  const handleAddExpense = () => {
    const amountVal = parseFloat(newAmount);
    if (isNaN(amountVal) || amountVal <= 0 || !newDescription.trim()) return;

    const newExp: ShopExpense = {
      id: `exp-${Date.now()}`,
      category: newCategory,
      description: newDescription.trim(),
      amount: amountVal,
      date: expenseDate,
      vendor: newVendor.trim() || undefined,
      reference_no: newRef.trim() || undefined,
      created_by: userEmail
    };

    const updated = [newExp, ...expenses];
    setExpenses(updated);
    localStorage.setItem("versiklo_shop_expenses", JSON.stringify(updated));

    recordUserAuditLog("ADD_SHOP_EXPENSE", "/reports/extract", {
      category: newCategory,
      amount: amountVal,
      description: newDescription,
      date: expenseDate
    });

    setIsExpenseModalOpen(false);
    setNewDescription("");
    setNewAmount("");
    setNewVendor("");
    setNewRef("");
  };

  // Export CSV Handler
  const handleExportCSV = () => {
    setIsExporting(true);
    try {
      const periodStr = 
        reportType === "DAILY" ? selectedDate :
        reportType === "MONTHLY" ? selectedMonth : selectedYear;

      const csvContent = buildEnterpriseReportCsv(
        {
          appName: settings.appName || "Versiklo",
          shopDescription: settings.shopDescription || "Motorcycle Parts & Services",
          shopAddress: settings.shopAddress,
          shopTin: settings.shopTin,
          reportTitle: "Shop Financial Ledger & Operating Income Statement",
          periodLabel,
          generatedBy: `${userEmail} (${userRole?.toUpperCase() || "ADMIN"})`,
          generatedDate: new Date().toLocaleString()
        },
        {
          headers: ["Category / Type", "Reference #", "Description / Vendor", "Date", "Debit / Cost (PHP)", "Credit / Revenue (PHP)"],
          rows: [
            ...filteredTransactions.map((tx) => [
              "SALES_REVENUE",
              tx.invoice_no,
              `${tx.customer_name || "Walk-in"} (${tx.payment_method})`,
              new Date(tx.created_at).toLocaleDateString(),
              "",
              Number(tx.total || 0).toFixed(2)
            ]),
            ...filteredExpenses.map((exp) => [
              exp.category,
              exp.reference_no || "N/A",
              `${exp.description} ${exp.vendor ? `[Vendor: ${exp.vendor}]` : ""}`,
              exp.date,
              Number(exp.amount || 0).toFixed(2),
              ""
            ])
          ],
          summaryRows: [
            ["Gross Sales Revenue", "", "", "", "", Number(grossRevenue).toFixed(2)],
            ["Operating Expenses Subtotal", "", "", "", Number(totalExpenses).toFixed(2), ""],
            ["Staff Labor Commissions Paid", "", "", "", Number(mechanicCommissionsDeducted).toFixed(2), ""],
            ["BIR 12% Output VAT", "", "", "", "", Number(vatOutputTax).toFixed(2)],
            ["Net Operating Margin (Net Profit)", "", "", "", "", Number(netIncome).toFixed(2)]
          ]
        }
      );

      downloadCsvFile(`versiklo_financial_ledger_${reportType.toLowerCase()}_${periodStr}.csv`, csvContent);

      recordUserAuditLog("EXPORT_FINANCIAL_CSV", "/reports/extract", {
        reportType,
        period: periodStr,
        grossRevenue,
        totalExpenses,
        netIncome
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Print Isolated Document Handler
  const handlePrintReport = () => {
    const docHtml = getFinancialReportDocumentHtml({
      settings,
      periodLabel,
      reportRef: `REP-FIN-${Date.now().toString().slice(-6)}`,
      generatedBy: `${userEmail} (${userRole?.toUpperCase() || "ADMIN"})`,
      generatedDate: new Date().toLocaleString(),
      grossRevenue,
      operatingExpenses: totalExpenses,
      staffLaborAllocations: mechanicCommissionsDeducted,
      vatOutputTax,
      netOperatingIncome: netIncome,
      salesCount: filteredTransactions.length,
      expenses: filteredExpenses,
      categoryTotals
    });

    printIsolatedDocument(`Financial-Ledger-${periodLabel.replace(/[^a-zA-Z0-9]/g, "-")}`, docHtml);

    recordUserAuditLog("PRINT_FINANCIAL_REPORT", "/reports/extract", {
      reportType,
      periodLabel,
      grossRevenue,
      netIncome
    });
  };

  // Guard for Admin and Manager only
  if (!checkingAuth && userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="min-h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <div className="max-w-md w-full border border-red-900/50 rounded-2xl p-8 bg-zinc-900/80 text-center space-y-5 shadow-2xl backdrop-blur-md">
          <div className="w-16 h-16 rounded-2xl bg-red-950/60 border border-red-800/80 flex items-center justify-center text-red-400 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-white">Access Restricted</h2>
            <p className="text-sm text-zinc-400 mt-2">
              Financial extraction reports, operating expense logs, and P&L balances are strictly restricted to <span className="text-lime-400 font-bold">Administrators</span> and <span className="text-lime-400 font-bold">Managers</span>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push(userRole === "cashier" ? "/pos" : "/repairs/board")}
              className="w-full py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-zinc-700"
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
    <>
      <div className="min-h-full bg-zinc-950 text-zinc-100 font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto w-full print:hidden">
        
        {/* Top Header & Action Toolbar */}
        <div className="pb-6 border-b border-zinc-800 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center gap-2.5 tracking-tight">
                <FileText className="w-7 h-7 text-lime-400" />
                Shop Financial Ledger
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-lime-500/10 text-lime-400 border border-lime-500/30">
                Live Audited
              </span>
            </div>
            <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
              Itemized revenue streams, staff labor allocations, and shop overhead operating expenses.
            </p>
          </div>

          {/* Action Controls */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsExpenseModalOpen(true)}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5 text-lime-400" />
              <span>Record Expense</span>
            </button>

            <button
              onClick={handleExportCSV}
              disabled={isExporting}
              className="px-3.5 py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold shadow-sm disabled:opacity-50"
              title="Download formatted RFC 4180 CSV dataset with UTF-8 BOM"
            >
              {isExporting ? (
                <Loader2 className="w-3.5 h-3.5 text-lime-400 animate-spin" />
              ) : (
                <Download className="w-3.5 h-3.5 text-lime-400" />
              )}
              <span>Export CSV</span>
            </button>

            <button
              onClick={handlePrintReport}
              className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 active:bg-lime-600 text-zinc-950 font-black text-xs transition-all flex items-center gap-2 shadow-sm active:scale-95"
            >
              <Printer className="w-3.5 h-3.5 text-zinc-950" />
              <span>Print / Export PDF</span>
            </button>
          </div>
        </div>

        {/* Filter Toolbar (Segmented Controls) */}
        <div className="pb-6 border-b border-zinc-800/80 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-1 bg-zinc-900 p-1 rounded-xl border border-zinc-800 w-fit">
            {[
              { key: "DAILY", label: "Daily" },
              { key: "MONTHLY", label: "Monthly" },
              { key: "YEARLY", label: "Yearly" }
            ].map((item) => (
              <button
                key={item.key}
                onClick={() => setReportType(item.key as any)}
                className={clsx(
                  "px-4 py-1.5 rounded-lg text-xs font-bold transition-all",
                  reportType === item.key
                    ? "bg-lime-500 text-zinc-950 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 text-xs text-zinc-400">
              <Calendar className="w-3.5 h-3.5 text-lime-400" />
              <span className="font-semibold">Target Period:</span>
            </div>

            {reportType === "DAILY" && (
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-lime-500"
              />
            )}

            {reportType === "MONTHLY" && (
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-lime-500"
              />
            )}

            {reportType === "YEARLY" && (
              <select
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-lime-500"
              >
                {[2024, 2025, 2026, 2027].map((y) => (
                  <option key={y} value={String(y)}>
                    Year {y}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* 4 Primary KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Gross Sales Revenue</span>
              <Receipt className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-white">
              ₱{grossRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-400 mt-2">
              {filteredTransactions.length} settled POS invoices
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Overhead Expenses</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-rose-400">
              ₱{totalExpenses.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-400 mt-2">
              {filteredExpenses.length} operational disbursements
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Labor Commission</span>
              <Users className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl sm:text-3xl font-black font-mono text-blue-400">
              ₱{mechanicCommissionsDeducted.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-400 mt-2">
              Allocated to workshop technicians
            </div>
          </div>

          <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between text-zinc-400 mb-2">
              <span className="text-xs font-bold uppercase tracking-wider">Net Operating Income</span>
              <TrendingUp className="w-4 h-4 text-lime-400" />
            </div>
            <div className={clsx(
              "text-2xl sm:text-3xl font-black font-mono",
              netIncome >= 0 ? "text-lime-400" : "text-rose-400"
            )}>
              ₱{netIncome.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-[11px] text-zinc-400 mt-2 flex items-center gap-2">
              <span>{profitMargin}% margin</span>
              <span>•</span>
              <span>VAT: ₱{vatOutputTax.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Operating Expense Distribution Table */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 mb-8">
          <h3 className="text-sm font-black uppercase tracking-wider text-white mb-3">
            Operating Expense Classification
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-4">Expense Classification</th>
                  <th className="py-2.5 px-4 text-right">Share (%)</th>
                  <th className="py-2.5 px-4 text-right">Disbursed Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {Object.entries(categoryTotals).map(([cat, total]) => {
                  const pct = totalExpenses > 0 ? ((total / totalExpenses) * 100).toFixed(1) : "0.0";
                  return (
                    <tr key={cat} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-4 font-semibold text-white">
                        {cat.replace(/_/g, " ")}
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-zinc-400">{pct}%</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-white">
                        ₱{total.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Itemized Disbursements Table */}
        <div className="bg-zinc-900/40 border border-zinc-800 rounded-2xl p-5 mb-8">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-black uppercase tracking-wider text-white">
              Itemized Disbursements Ledger
            </h3>
            <span className="text-xs font-mono text-zinc-400">{filteredExpenses.length} records</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-zinc-300">
              <thead className="bg-zinc-900/80 text-zinc-400 uppercase font-bold text-[10px] tracking-wider border-b border-zinc-800">
                <tr>
                  <th className="py-2.5 px-3 text-center w-12">#</th>
                  <th className="py-2.5 px-4 w-28">Date</th>
                  <th className="py-2.5 px-4">Description & Vendor</th>
                  <th className="py-2.5 px-4 w-32">Ref / OR #</th>
                  <th className="py-2.5 px-4 text-right w-36">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No operating expenses recorded for this reporting period.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp, idx) => (
                    <tr key={exp.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                      <td className="py-2.5 px-3 text-center font-mono text-zinc-500">{idx + 1}</td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400">{exp.date}</td>
                      <td className="py-2.5 px-4">
                        <span className="font-semibold text-white block">{exp.description}</span>
                        <span className="text-[11px] text-zinc-400">
                          {exp.category.replace(/_/g, " ")} {exp.vendor ? `• Vendor: ${exp.vendor}` : ""}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 font-mono text-zinc-400">{exp.reference_no || "N/A"}</td>
                      <td className="py-2.5 px-4 text-right font-mono font-bold text-rose-400">
                        ₱{Number(exp.amount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Record Expense Modal */}
        <Modal isOpen={isExpenseModalOpen} onClose={() => setIsExpenseModalOpen(false)}>
          <ModalHeader onClose={() => setIsExpenseModalOpen(false)}>
            <div className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-lime-400" />
              <span>Record Operating Expense</span>
            </div>
          </ModalHeader>
          <ModalBody>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Classification
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as any)}
                  className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-zinc-100 focus:outline-none focus:border-lime-500"
                >
                  <option value="ELECTRICITY_UTILITIES">Electricity & Utilities</option>
                  <option value="RENT">Shop Rent & Lease</option>
                  <option value="STAFF_WAGES">Staff Wages & Base Salary</option>
                  <option value="CONSUMABLE_PARTS">Consumables & Shop Supplies</option>
                  <option value="TOOLS_EQUIPMENT">Tools & Equipment Repair</option>
                  <option value="MISCELLANEOUS">Miscellaneous Operational</option>
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="e.g. Meralco Electric Bill for October"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-zinc-100 focus:outline-none focus:border-lime-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Amount (PHP)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-zinc-100 font-mono focus:outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Date
                  </label>
                  <input
                    type="date"
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-zinc-100 focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    Vendor / Payee
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Meralco"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-zinc-100 focus:outline-none focus:border-lime-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-400 font-bold mb-1 uppercase tracking-wider text-[10px]">
                    OR / Reference No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. OR-884920"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-700 px-3 py-2 rounded-xl text-zinc-100 focus:outline-none focus:border-lime-500"
                  />
                </div>
              </div>
            </div>
          </ModalBody>
          <ModalFooter>
            <div className="flex gap-2 justify-end w-full">
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleAddExpense}
                disabled={!newDescription.trim() || !newAmount}
                className="px-5 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 active:bg-lime-600 text-zinc-950 font-black text-xs transition-all disabled:opacity-50"
              >
                Save Disbursement
              </button>
            </div>
          </ModalFooter>
        </Modal>

        {/* Mobile Filter Sheet & Button */}
        <FloatingFilterButton
          activeCount={activeFilterCount}
          onClick={() => setIsMobileFilterOpen(true)}
        />
        <MobileFilterSheet
          isOpen={isMobileFilterOpen}
          onClose={() => setIsMobileFilterOpen(false)}
          title="Statement Controls"
          activeCount={activeFilterCount}
          onReset={handleResetAllFilters}
        >
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 font-bold mb-1">Interval</label>
              <div className="grid grid-cols-3 gap-2">
                {(["DAILY", "MONTHLY", "YEARLY"] as const).map((t) => (
                  <button
                    key={t}
                    onClick={() => setReportType(t)}
                    className={clsx(
                      "py-2 rounded-lg font-bold text-center",
                      reportType === t ? "bg-lime-500 text-zinc-950" : "bg-zinc-800 text-zinc-300"
                    )}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </MobileFilterSheet>

      </div>

      {/* Native Ctrl+P Fallback (hidden on screen, visible only to native print driver) */}
      <div className="hidden print:block w-full bg-white text-zinc-950">
        <PrintableFinancialReportDocument
          settings={settings}
          periodLabel={periodLabel}
          reportRef={`REP-FIN-${Date.now().toString().slice(-6)}`}
          generatedBy={`${userEmail} (${userRole?.toUpperCase() || "ADMIN"})`}
          generatedDate={new Date().toLocaleString()}
          grossRevenue={grossRevenue}
          operatingExpenses={totalExpenses}
          staffLaborAllocations={mechanicCommissionsDeducted}
          vatOutputTax={vatOutputTax}
          netOperatingIncome={netIncome}
          salesCount={filteredTransactions.length}
          expenses={filteredExpenses}
          categoryTotals={categoryTotals}
        />
      </div>
    </>
  );
}
