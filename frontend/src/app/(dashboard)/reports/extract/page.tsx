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
import { fetchStaffCompensationFromDB, extractInvoiceLaborAndCommission } from "@/lib/compensation";
import { Modal, ModalHeader, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

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
  const [checkingAuth, setCheckingAuth] = useState(true);

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
    setUserRole(role);
    setCheckingAuth(false);

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
          salesList = [...localList.filter((s: any) => !ids.has(s.id)), ...salesList];
        }
      } catch (e) {}
    }

    setTransactions(salesList);
  };

  // Filter Transactions by active timeframe
  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      if (t.status !== "COMPLETED") return false;
      const txDate = t.created_at || "";
      if (reportType === "DAILY") {
        return txDate.startsWith(selectedDate);
      } else if (reportType === "MONTHLY") {
        return txDate.startsWith(selectedMonth);
      } else {
        return txDate.startsWith(selectedYear);
      }
    });
  }, [transactions, reportType, selectedDate, selectedMonth, selectedYear]);

  // Filter Expenses by active timeframe
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const expDate = e.date || "";
      if (reportType === "DAILY") {
        return expDate.startsWith(selectedDate);
      } else if (reportType === "MONTHLY") {
        return expDate.startsWith(selectedMonth);
      } else {
        return expDate.startsWith(selectedYear);
      }
    });
  }, [expenses, reportType, selectedDate, selectedMonth, selectedYear]);

  // Calculations
  const grossRevenue = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + (Number(t.total) || 0), 0);
  }, [filteredTransactions]);

  // Detailed labor & mechanic commission calculation per invoice
  const laborAndCommissionSummary = useMemo(() => {
    let grossLaborTotal = 0;
    let commissionDeductionTotal = 0;
    let partsCalculated = 0;

    filteredTransactions.forEach((t) => {
      const analysis = extractInvoiceLaborAndCommission(t.items, t.customer_name || t.motorcycle_name, mechanicRates);
      grossLaborTotal += analysis.grossLabor;
      commissionDeductionTotal += analysis.commissionDeduction;
      partsCalculated += analysis.partsTotal;
    });

    const netLaborRetained = Math.max(0, Number((grossLaborTotal - commissionDeductionTotal).toFixed(2)));
    return {
      grossLaborTotal: Number(grossLaborTotal.toFixed(2)),
      commissionDeductionTotal: Number(commissionDeductionTotal.toFixed(2)),
      netLaborRetained,
      partsTotal: Number(partsCalculated.toFixed(2))
    };
  }, [filteredTransactions, mechanicRates]);

  const grossLaborRevenue = laborAndCommissionSummary.grossLaborTotal;
  const mechanicCommissionsDeducted = laborAndCommissionSummary.commissionDeductionTotal;
  const netLaborRevenue = laborAndCommissionSummary.netLaborRetained;
  const partsRevenue = laborAndCommissionSummary.partsTotal;
  const netShopRevenue = partsRevenue + netLaborRevenue;

  const totalExpenses = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => acc + (Number(e.amount) || 0), 0);
  }, [filteredExpenses]);

  // Expense breakdown by category
  const expenseByCategory = useMemo(() => {
    return filteredExpenses.reduce((acc, e) => {
      acc[e.category] = (acc[e.category] || 0) + Number(e.amount);
      return acc;
    }, {} as Record<string, number>);
  }, [filteredExpenses]);

  const netIncome = Number((netShopRevenue - totalExpenses).toFixed(2));
  const profitMargin = grossRevenue > 0 ? ((netIncome / grossRevenue) * 100).toFixed(1) : "0.0";

  // Payment Method Breakdown
  const paymentMethodsSummary = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => {
      const method = t.payment_method || "CASH";
      acc[method] = (acc[method] || 0) + (Number(t.total) || 0);
      return acc;
    }, {} as Record<string, number>);
  }, [filteredTransactions]);

  // Handle Add Expense
  const handleAddExpense = (e: React.FormEvent) => {
    e.preventDefault();
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
      created_by: localStorage.getItem("user_email") || "admin@versiklo.com"
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

  // Export CSV via Backend Python FastAPI Endpoint (with comprehensive client fallback)
  const handleExportCSV = async () => {
    setIsExporting(true);
    const periodStr = 
      reportType === "DAILY" ? selectedDate :
      reportType === "MONTHLY" ? selectedMonth : selectedYear;

    try {
      const params = new URLSearchParams();
      params.set("report_type", reportType);
      if (reportType === "DAILY") params.set("date", selectedDate);
      if (reportType === "MONTHLY") params.set("month", selectedMonth);
      if (reportType === "YEARLY") params.set("year", selectedYear);

      const res = await apiClient.get(`/sales/reports/export?${params.toString()}`, {
        responseType: "blob"
      });

      if (res.data) {
        const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `versiklo_sales_report_python_${reportType.toLowerCase()}_${periodStr}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        setIsExporting(false);
        return;
      }
    } catch (err) {
      console.warn("Python backend CSV export failed, falling back to comprehensive client CSV generator:", err);
    }

    // Comprehensive Fallback Client Generator
    try {
      let csv = `Versiklo Financial & Sales Extraction Report - ${reportType} (${periodStr})\n`;
      csv += `Generated On,${new Date().toISOString()}\n`;
      csv += `Export Engine,Comprehensive Data Ledger Engine\n\n`;

      csv += "FINANCIAL EXECUTIVE SUMMARY\n";
      csv += `Gross Sales Revenue,PHP ${grossRevenue.toFixed(2)}\n`;
      csv += `Parts & Accessories Retail,PHP ${partsRevenue.toFixed(2)}\n`;
      csv += `Gross Labor Billed,PHP ${grossLaborRevenue.toFixed(2)}\n`;
      csv += `Mechanic Commissions Deducted,PHP -${mechanicCommissionsDeducted.toFixed(2)}\n`;
      csv += `Net Shop Labor Retained,PHP ${netLaborRevenue.toFixed(2)}\n`;
      csv += `Net Retained Shop Sales,PHP ${netShopRevenue.toFixed(2)}\n`;
      csv += `Total Operating Expenses,PHP ${totalExpenses.toFixed(2)}\n`;
      csv += `Net Operating Profit,PHP ${netIncome.toFixed(2)}\n`;
      csv += `Operating Profit Margin,${profitMargin}%\n\n`;

      csv += "COMPLETED SALES TRANSACTIONS\n";
      csv += "Invoice No,Customer,Motorcycle,Date,Payment Method,Total (PHP)\n";
      filteredTransactions.forEach((t) => {
        csv += `"${t.invoice_no}","${t.customer_name || "Walk-in Customer"}","${t.motorcycle_name || "N/A"}","${new Date(t.created_at).toLocaleDateString()}","${t.payment_method}",${t.total.toFixed(2)}\n`;
      });
      csv += "\n";

      csv += "SHOP OPERATING EXPENSES\n";
      csv += "Category,Description,Vendor,Reference No,Date,Amount (PHP)\n";
      filteredExpenses.forEach((e) => {
        csv += `"${e.category}","${e.description}","${e.vendor || "N/A"}","${e.reference_no || "N/A"}","${e.date}",${e.amount.toFixed(2)}\n`;
      });

      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `versiklo_financial_report_${reportType.toLowerCase()}_${periodStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setIsExporting(false);
    }
  };

  // Guard for Admin and Manager only
  if (!checkingAuth && userRole !== "admin" && userRole !== "manager") {
    return (
      <div className="min-h-screen bg-slate-50 p-8 flex flex-col items-center justify-center font-sans text-slate-900">
        <div className="max-w-md w-full border border-rose-200 rounded-2xl p-8 bg-white text-center space-y-5 shadow-sm">
          <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-900">Access Restricted</h2>
            <p className="text-sm text-slate-600 mt-2">
              Financial extraction reports, operating expense logs, and P&L balances are strictly restricted to <span className="text-lime-700 font-bold">Administrators</span> and <span className="text-lime-700 font-bold">Managers</span>.
            </p>
          </div>
          <div className="pt-2">
            <button
              onClick={() => router.push(userRole === "cashier" ? "/pos" : "/repairs/board")}
              className="w-full py-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-colors flex items-center justify-center gap-2 border border-slate-300"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Assigned Workspace</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const periodDisplay = 
    reportType === "DAILY" ? `Daily Statement for ${selectedDate}` :
    reportType === "MONTHLY" ? `Monthly Statement for ${selectedMonth}` :
    `Fiscal Annual Statement for Year ${selectedYear}`;

  return (
    <div className="min-h-full bg-slate-50 text-slate-900 font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto w-full">
      
      {/* Complete Full-Capture Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 12mm 10mm;
          }
          html, body, #__next, main, .min-h-full, .overflow-y-auto {
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            overflow: visible !important;
            overflow-x: visible !important;
            overflow-y: visible !important;
            background: #ffffff !important;
            color: #09090b !important;
          }
          nav, aside, button, .no-print, header {
            display: none !important;
          }
          .printable-report {
            display: block !important;
            color: #09090b !important;
            background: #ffffff !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .printable-report table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: auto !important;
          }
          .printable-report th, .printable-report td {
            border: 1px solid #e4e4e7 !important;
            padding: 8px 10px !important;
            color: #09090b !important;
            font-size: 11px !important;
            word-break: break-word !important;
            white-space: normal !important;
          }
          .printable-report th {
            background-color: #f4f4f5 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }
          .printable-report tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .printable-report thead {
            display: table-header-group !important;
          }
          .printable-report tfoot {
            display: table-footer-group !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-contrast-text {
            color: #09090b !important;
          }
          .print-contrast-subtext {
            color: #52525b !important;
          }
          .print-contrast-border {
            border-color: #e4e4e7 !important;
          }
        }
      `}</style>

      {/* Top Header & Sticky Action Toolbar (Hidden in Print) */}
      <div className="no-print pb-6 border-b border-slate-200 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 flex items-center gap-2.5 tracking-tight">
              <FileText className="w-7 h-7 text-lime-600" />
              Shop Financial Ledger
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
              Live Audited
            </span>
          </div>
          <p className="text-slate-500 mt-1 text-xs sm:text-sm">
            Itemized revenue streams, staff labor allocations, and shop overhead operating expenses.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm"
          >
            <Plus className="w-3.5 h-3.5 text-lime-700" />
            <span>Record Expense</span>
          </button>

          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-300 hover:bg-slate-200 text-slate-700 hover:text-slate-900 transition-all flex items-center gap-2 text-xs font-semibold shadow-sm disabled:opacity-50"
            title="Download formatted CSV dataset generated by Python engine"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 text-emerald-600 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5 text-emerald-600" />
            )}
            <span>Export CSV (Python)</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-4 py-2 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold text-xs transition-all flex items-center gap-2 shadow-sm active:scale-95"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Download / Print PDF</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar (Segmented Controls directly on canvas, No Card Box) */}
      <div className="no-print pb-6 border-b border-slate-200 mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Interval Selector */}
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 w-fit">
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
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Date Selector */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Calendar className="w-3.5 h-3.5 text-lime-700" />
            <span className="font-semibold">Target Period:</span>
          </div>

          {reportType === "DAILY" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-lime-500"
            />
          )}

          {reportType === "MONTHLY" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-lime-500"
            />
          )}

          {reportType === "YEARLY" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-white border border-slate-300 px-3 py-1.5 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-lime-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>Fiscal Year {yr}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* PRINTABLE CONTAINER (Canvas and Print-Friendly Vector Document) */}
      <div className="printable-report space-y-8">
        
        {/* Official Printable Header */}
        <div className="pb-6 border-b border-slate-200 print:border-zinc-300 print-contrast-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-lime-500 flex items-center justify-center text-zinc-950 font-black text-xs">
                  VK
                </div>
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 print:text-black">
                  Versiklo Motorcycle Parts & Repair Shop
                </h2>
              </div>
              <p className="text-xs text-slate-500 print:text-zinc-600 mt-1">
                Official Sales Extraction Ledger & Operating Profit/Loss Statement
              </p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-mono font-bold text-lime-700 print:text-black block">
                {periodDisplay}
              </span>
              <span className="text-[11px] text-slate-400 print:text-zinc-500 block">
                Extracted: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}
              </span>
            </div>
          </div>
        </div>

        {/* CARD-FREE KPI FINANCIAL RIBBON (Open Canvas Strip with Vertical Dividers) */}
        <div className="grid grid-cols-2 lg:grid-cols-4 py-5 border-y border-slate-200 print:border-zinc-300 print-avoid-break divide-y lg:divide-y-0 lg:divide-x divide-slate-200 print:divide-zinc-300">
          
          {/* Metric 1: Gross Sales */}
          <div className="px-4 py-3 sm:py-0 first:pl-0">
            <span className="text-[11px] font-bold text-slate-500 print:text-zinc-600 uppercase tracking-wider block mb-1">
              Gross Sales Billed
            </span>
            <div className="text-2xl sm:text-3xl font-black text-slate-900 print:text-black font-mono">
              ₱{grossRevenue.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 print:text-zinc-600 mt-0.5 block">
              {filteredTransactions.length} completed transactions
            </span>
          </div>

          {/* Metric 2: Operating Overhead */}
          <div className="px-4 py-3 sm:py-0">
            <span className="text-[11px] font-bold text-slate-500 print:text-zinc-600 uppercase tracking-wider block mb-1">
              Overhead Expenses
            </span>
            <div className="text-2xl sm:text-3xl font-black text-amber-700 print:text-black font-mono">
              ₱{totalExpenses.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 print:text-zinc-600 mt-0.5 block">
              {filteredExpenses.length} expense items logged
            </span>
          </div>

          {/* Metric 3: Net Operating Income */}
          <div className="px-4 py-3 sm:py-0">
            <span className="text-[11px] font-bold text-slate-500 print:text-zinc-600 uppercase tracking-wider block mb-1">
              Net Operating Profit
            </span>
            <div className={clsx(
              "text-2xl sm:text-3xl font-black font-mono print:text-black",
              netIncome >= 0 ? "text-emerald-700" : "text-rose-700"
            )}>
              ₱{netIncome.toFixed(2)}
            </div>
            <span className="text-[11px] text-slate-500 print:text-zinc-600 mt-0.5 block">
              Net retained sales minus shop expenses
            </span>
          </div>

          {/* Metric 4: Net Margin */}
          <div className="px-4 py-3 sm:py-0 last:pr-0">
            <span className="text-[11px] font-bold text-slate-500 print:text-zinc-600 uppercase tracking-wider block mb-1">
              Profit Yield Margin
            </span>
            <div className="text-2xl sm:text-3xl font-black text-lime-700 print:text-black font-mono">
              {profitMargin}%
            </div>
            <span className="text-[11px] text-slate-500 print:text-zinc-600 mt-0.5 block">
              Operational net margin yield
            </span>
          </div>
        </div>

        {/* SECTION: Revenue Channels & Settlement Channels (Borderless Dual Ledger) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 print-avoid-break">
          
          {/* Channel 1: Revenue Streams */}
          <div className="space-y-3">
            <div className="pb-2 border-b border-slate-200 print:border-zinc-300 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 print:text-black flex items-center gap-2">
                <Receipt className="w-4 h-4 text-lime-700 print:text-black" />
                <span>Revenue Allocation Streams</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Channel breakdown</span>
            </div>

            <div className="divide-y divide-slate-100 print:divide-zinc-200 text-xs">
              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 print:text-black block">Parts & Accessories Retail</span>
                  <span className="text-[11px] text-slate-500">Inventory merchandise sales</span>
                </div>
                <span className="font-mono text-sm font-bold text-slate-900 print:text-black">₱{partsRevenue.toFixed(2)}</span>
              </div>

              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 print:text-black block">Gross Labor Charged</span>
                  <span className="text-[11px] text-slate-500">Total repair and technician billings</span>
                </div>
                <span className="font-mono text-sm font-bold text-lime-700 print:text-black">₱{grossLaborRevenue.toFixed(2)}</span>
              </div>

              {mechanicCommissionsDeducted > 0 && (
                <div className="py-2.5 flex justify-between items-center text-amber-700 print:text-black">
                  <div>
                    <span className="font-bold block">Mechanic Commissions Paid</span>
                    <span className="text-[11px] text-slate-500">Per-mechanic labor rates deducted</span>
                  </div>
                  <span className="font-mono text-sm font-bold">-₱{mechanicCommissionsDeducted.toFixed(2)}</span>
                </div>
              )}

              <div className="py-2.5 flex justify-between items-center">
                <div>
                  <span className="font-bold text-slate-900 print:text-black block">Net Shop Labor Retained</span>
                  <span className="text-[11px] text-slate-500">Gross labor less staff commissions</span>
                </div>
                <span className="font-mono text-sm font-bold text-slate-900 print:text-black">₱{netLaborRevenue.toFixed(2)}</span>
              </div>

              <div className="py-3 flex justify-between items-center border-t border-slate-200 print:border-zinc-300">
                <div>
                  <span className="font-black text-slate-900 print:text-black block">Net Retained Shop Sales</span>
                  <span className="text-[10px] text-slate-500 font-mono">Parts revenue + net shop labor</span>
                </div>
                <span className="font-mono text-base font-black text-emerald-700 print:text-black">
                  ₱{netShopRevenue.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          {/* Channel 2: Payment Settlement */}
          <div className="space-y-3">
            <div className="pb-2 border-b border-slate-200 print:border-zinc-300 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900 print:text-black flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-700 print:text-black" />
                <span>Payment Settlement Channels</span>
              </h3>
              <span className="text-[11px] text-slate-500 font-mono">Tender types</span>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs pt-1">
              <div className="p-3 border border-slate-200 bg-white shadow-sm print:border-zinc-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 print:text-zinc-600 text-[11px]">
                  <Banknote className="w-3.5 h-3.5 text-emerald-600 print:text-black" />
                  <span className="font-semibold">Cash Drawer</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-900 print:text-black">
                  ₱{(paymentMethodsSummary["CASH"] || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 border border-slate-200 bg-white shadow-sm print:border-zinc-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 print:text-zinc-600 text-[11px]">
                  <Smartphone className="w-3.5 h-3.5 text-blue-600 print:text-black" />
                  <span className="font-semibold">GCash / E-Wallet</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-900 print:text-black">
                  ₱{(paymentMethodsSummary["GCASH"] || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 border border-slate-200 bg-white shadow-sm print:border-zinc-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 print:text-zinc-600 text-[11px]">
                  <CreditCard className="w-3.5 h-3.5 text-purple-600 print:text-black" />
                  <span className="font-semibold">Card Payments</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-900 print:text-black">
                  ₱{(paymentMethodsSummary["CARD"] || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 border border-slate-200 bg-white shadow-sm print:border-zinc-300 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-slate-500 print:text-zinc-600 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-amber-600 print:text-black" />
                  <span className="font-semibold">Bank Transfer</span>
                </div>
                <div className="font-mono text-base font-bold text-slate-900 print:text-black">
                  ₱{(paymentMethodsSummary["BANK_TRANSFER"] || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION: Shop Operating Expenses Ledger (Borderless Open Table) */}
        <div className="space-y-4 pt-4 border-t border-slate-200 print:border-zinc-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 print:text-black flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-amber-700 print:text-black" />
                <span>Operating Expenses Ledger ({filteredExpenses.length})</span>
              </h3>
              <p className="text-xs text-slate-500 print:text-zinc-600 mt-0.5">
                Utilities, facility rent, wages, consumable shop supplies, and equipment.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 print:text-zinc-600 uppercase tracking-wider font-bold block">Total Period Overhead</span>
              <span className="font-mono text-lg font-black text-amber-700 print:text-black">₱{totalExpenses.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Expense Category Strip */}
          <div className="flex flex-wrap gap-2 text-[11px]">
            {[
              { cat: "ELECTRICITY_UTILITIES", label: "Utilities", icon: Zap, color: "text-amber-700" },
              { cat: "RENT", label: "Rent", icon: Building2, color: "text-blue-700" },
              { cat: "STAFF_WAGES", label: "Wages", icon: Users, color: "text-purple-700" },
              { cat: "CONSUMABLE_PARTS", label: "Supplies", icon: Package, color: "text-emerald-700" },
              { cat: "TOOLS_EQUIPMENT", label: "Tools", icon: Hammer, color: "text-cyan-700" },
            ].map(({ cat, label, icon: Icon, color }) => (
              <div key={cat} className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white shadow-sm print:border-zinc-300 print:bg-white flex items-center gap-1.5">
                <Icon className={clsx("w-3 h-3 print:text-black", color)} />
                <span className="text-slate-600 print:text-zinc-600 font-medium">{label}:</span>
                <span className="font-mono font-bold text-slate-900 print:text-black">
                  ₱{(expenseByCategory[cat] || 0).toFixed(2)}
                </span>
              </div>
            ))}
          </div>

          {/* Itemized Expenses Table */}
          <div className="w-full overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm print:border-zinc-300">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 print:border-zinc-300 print:bg-zinc-100 text-slate-600 print:text-zinc-700 uppercase text-[10px] font-bold">
                  <th className="p-3">Category</th>
                  <th className="p-3">Description</th>
                  <th className="p-3">Vendor / Payee</th>
                  <th className="p-3">Ref #</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 text-right">Amount (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-zinc-200 text-slate-700 print:text-black">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-5 text-center text-slate-500 print:text-zinc-600">
                      No operating overhead expenses recorded for this timeframe.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60 print:hover:bg-transparent transition-colors">
                      <td className="p-3 font-mono text-[11px]">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 print:border-zinc-300 print:bg-transparent text-slate-700 print:text-black font-bold text-[10px]">
                          {exp.category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3 font-bold text-slate-900 print:text-black">{exp.description}</td>
                      <td className="p-3 text-slate-600 print:text-zinc-600">{exp.vendor || "N/A"}</td>
                      <td className="p-3 font-mono text-slate-500 print:text-zinc-600 text-[11px]">{exp.reference_no || "N/A"}</td>
                      <td className="p-3 font-mono text-slate-500 print:text-zinc-600 text-[11px]">{exp.date}</td>
                      <td className="p-3 text-right font-mono font-bold text-amber-700 print:text-black">
                        ₱{exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION: Completed Sales Orders Ledger (Borderless Open Table) */}
        <div className="space-y-4 pt-4 border-t border-slate-200 print:border-zinc-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2">
            <div>
              <h3 className="text-base font-bold text-slate-900 print:text-black flex items-center gap-2">
                <Receipt className="w-4 h-4 text-lime-700 print:text-black" />
                <span>Completed Sales Orders ({filteredTransactions.length})</span>
              </h3>
              <p className="text-xs text-slate-500 print:text-zinc-600 mt-0.5">
                Itemized transaction records for the active billing timeframe.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-500 print:text-zinc-600 uppercase tracking-wider font-bold block">Gross Sales Total</span>
              <span className="font-mono text-lg font-black text-lime-700 print:text-black">₱{grossRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="w-full overflow-x-auto bg-white rounded-xl border border-slate-200 shadow-sm print:border-zinc-300">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 print:border-zinc-300 print:bg-zinc-100 text-slate-600 print:text-zinc-700 uppercase text-[10px] font-bold">
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer & Motorcycle</th>
                  <th className="p-3">Date & Time</th>
                  <th className="p-3">Payment Method</th>
                  <th className="p-3">Line Items Summary</th>
                  <th className="p-3 text-right">Total (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-zinc-200 text-slate-700 print:text-black">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500 print:text-zinc-600">
                      No sales records match the selected timeframe.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/60 print:hover:bg-transparent transition-colors">
                      <td className="p-3 font-mono font-bold text-lime-700 print:text-black">{tx.invoice_no}</td>
                      <td className="p-3">
                        <span className="font-bold text-slate-900 print:text-black block">{tx.customer_name || "Walk-in Customer"}</span>
                        <span className="text-[10px] text-slate-500 font-mono">{tx.motorcycle_name || "Standard Bike"}</span>
                      </td>
                      <td className="p-3 font-mono text-slate-500 print:text-zinc-600 text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-slate-100 border border-slate-200 print:border-zinc-300 print:bg-transparent text-slate-700 print:text-black font-mono">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="p-3 text-slate-600 print:text-zinc-600 text-[11px]">
                        {tx.items ? tx.items.map((i) => `${i.qty}x ${i.name}`).join(", ") : "Standard Repair Order"}
                      </td>
                      <td className="p-3 text-right font-mono font-bold text-emerald-700 print:text-black text-sm">
                        ₱{tx.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Minimal Report Verification Timestamp & Metadata Footer (Replaced Signature Design) */}
        <div className="pt-8 border-t border-slate-200 print:border-zinc-300 mt-10 text-xs text-slate-500 print:text-zinc-600 flex flex-col sm:flex-row items-center justify-between gap-4 print-avoid-break">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-lime-600 print:text-black" />
            <span className="font-mono text-[11px] font-semibold">
              Certified Financial Audit Record • MotoShop Management System
            </span>
          </div>
          <div className="text-right font-mono text-[11px] text-slate-400 print:text-zinc-600">
            Report Generated: {new Date().toLocaleString()} by {localStorage.getItem("user_email") || "admin@motoshop.com"}
          </div>
        </div>

      </div>

      {/* Modal: Add Shop Operating Expense */}
      <Modal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        size="lg"
      >
        <ModalHeader
          icon={Plus}
          iconVariant="lime"
          title="Record Shop Expense"
          subtitle="Add an operating expense or shop disbursement record"
          onClose={() => setIsExpenseModalOpen(false)}
        />

        <form onSubmit={handleAddExpense}>
          <ModalBody className="space-y-4 text-xs">
            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Expense Category *</label>
              <select
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all"
              >
                <option value="ELECTRICITY_UTILITIES">Electricity & Utilities (Power, Water, Internet)</option>
                <option value="RENT">Facility Rent & Bay Space Lease</option>
                <option value="STAFF_WAGES">Staff Wages & Shift Allowances</option>
                <option value="CONSUMABLE_PARTS">Consumable Parts & Fluids (Oil, Cleaners, Rags)</option>
                <option value="TOOLS_EQUIPMENT">Shop Tools & Equipment Purchased</option>
                <option value="MISCELLANEOUS">Miscellaneous Operational Expense</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1.5">Description *</label>
              <input
                type="text"
                required
                placeholder="e.g. Electric Power - Main Service Bay"
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Amount (PHP) *</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  required
                  placeholder="0.00"
                  value={newAmount}
                  onChange={(e) => setNewAmount(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Date Logged *</label>
                <input
                  type="date"
                  required
                  value={expenseDate}
                  onChange={(e) => setExpenseDate(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Vendor / Payee</label>
                <input
                  type="text"
                  placeholder="e.g. Hardware Store / Meralco"
                  value={newVendor}
                  onChange={(e) => setNewVendor(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1.5">Receipt / Invoice Ref #</label>
                <input
                  type="text"
                  placeholder="e.g. OR-5491"
                  value={newRef}
                  onChange={(e) => setNewRef(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded-xl px-3.5 py-2.5 text-slate-900 text-sm font-mono placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 focus:border-lime-500 transition-all"
                />
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsExpenseModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-200 bg-slate-100 text-slate-700 hover:text-slate-900 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-2 shadow-sm"
            >
              Save Expense
            </button>
          </ModalFooter>
        </form>
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
        title="Filter Financial Ledger"
        activeCount={activeFilterCount}
        onReset={handleResetAllFilters}
      >
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Report Interval</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { key: "DAILY", label: "Daily" },
              { key: "MONTHLY", label: "Monthly" },
              { key: "YEARLY", label: "Yearly" },
            ].map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setReportType(item.key as any)}
                className={clsx(
                  "px-3 py-2.5 rounded-xl text-xs font-bold text-center transition-all",
                  reportType === item.key
                    ? "bg-lime-500 text-zinc-950 shadow-sm"
                    : "bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700">Target Period</label>
          {reportType === "DAILY" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-lime-500"
            />
          )}

          {reportType === "MONTHLY" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-lime-500"
            />
          )}

          {reportType === "YEARLY" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="w-full bg-white border border-slate-300 px-3.5 py-2.5 rounded-xl text-xs font-mono text-slate-900 focus:outline-none focus:border-lime-500 cursor-pointer"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>Fiscal Year {yr}</option>
              ))}
            </select>
          )}
        </div>
      </MobileFilterSheet>
    </div>
  );
}
