"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { 
  FileText, 
  Download, 
  Printer, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  CalendarDays, 
  Plus, 
  Receipt, 
  Wrench, 
  Package, 
  Zap, 
  Building2, 
  Users, 
  Hammer, 
  CheckCircle, 
  AlertCircle, 
  X, 
  ArrowLeft,
  ShieldAlert,
  Percent,
  CreditCard,
  Banknote,
  Smartphone,
  ChevronDown
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { fetchStaffCompensationFromDB, extractInvoiceLaborAndCommission } from "@/lib/compensation";

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

  // CSV Export
  const handleExportCSV = () => {
    const periodStr = 
      reportType === "DAILY" ? selectedDate :
      reportType === "MONTHLY" ? selectedMonth : selectedYear;

    let csv = `Versiklo Financial & Sales Extraction Report - ${reportType} (${periodStr})\n\n`;
    
    // Financial Summary
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

    // Sales Transactions
    csv += "COMPLETED SALES TRANSACTIONS\n";
    csv += "Invoice No,Customer,Motorcycle,Date,Payment Method,Total (PHP)\n";
    filteredTransactions.forEach((t) => {
      csv += `"${t.invoice_no}","${t.customer_name || "Walk-in Customer"}","${t.motorcycle_name || "N/A"}","${new Date(t.created_at).toLocaleDateString()}","${t.payment_method}",${t.total.toFixed(2)}\n`;
    });
    csv += "\n";

    // Shop Expenses
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
  };

  // Guard for Admin and Manager only
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
              Financial extraction reports, operating expense logs, and P&L balances are strictly restricted to <span className="text-cyan-400 font-semibold">Administrators</span> and <span className="text-cyan-400 font-semibold">Managers</span>.
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

  const periodDisplay = 
    reportType === "DAILY" ? `Daily Statement for ${selectedDate}` :
    reportType === "MONTHLY" ? `Monthly Statement for ${selectedMonth}` :
    `Fiscal Annual Statement for Year ${selectedYear}`;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 font-sans p-6 md:p-8 overflow-y-auto">
      
      {/* Global Print Styles for Clean Vector PDF Download */}
      <style jsx global>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #000000 !important;
          }
          nav, aside, button, .no-print {
            display: none !important;
          }
          .printable-report {
            display: block !important;
            color: #000000 !important;
            background: #ffffff !important;
            width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          .printable-report table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .printable-report th, .printable-report td {
            border: 1px solid #d1d5db !important;
            padding: 8px !important;
            color: #111827 !important;
          }
          .printable-report th {
            background-color: #f3f4f6 !important;
            font-weight: bold !important;
          }
          .print-card {
            border: 1px solid #e5e7eb !important;
            background: #ffffff !important;
            color: #000000 !important;
            box-shadow: none !important;
          }
        }
      `}</style>

      {/* Top Header Bar & Action Buttons (Hidden when printing) */}
      <div className="no-print flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400 flex items-center gap-3">
              <FileText className="w-8 h-8 text-cyan-400" />
              Sales & Financial Extraction
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold tracking-wide uppercase bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              P&L Audited
            </span>
          </div>
          <p className="text-zinc-400 mt-1 text-sm">
            Generate audited daily, monthly, and yearly sales ledgers, track operating overhead expenses, and export official PDF statements.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => setIsExpenseModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-md"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Record Shop Expense</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-md"
            title="Download Spreadsheet"
          >
            <Download className="w-4 h-4 text-emerald-400" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Download / Print PDF</span>
          </button>
        </div>
      </div>

      {/* Timeframe & Date Picker Controls (Hidden when printing) */}
      <div className="no-print bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-8 backdrop-blur-xl flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Report Interval Tabs */}
        <div className="flex bg-zinc-950 p-1.5 rounded-xl border border-white/10 text-xs w-full md:w-auto">
          {[
            { key: "DAILY", label: "Daily Report" },
            { key: "MONTHLY", label: "Monthly Report" },
            { key: "YEARLY", label: "Yearly Report" }
          ].map((item) => (
            <button
              key={item.key}
              onClick={() => setReportType(item.key as any)}
              className={clsx(
                "flex-1 md:flex-none px-5 py-2 rounded-lg font-bold transition-all",
                reportType === item.key
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* Dynamic Period Date Controls */}
        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <span className="font-semibold">Target Period:</span>
          </div>

          {reportType === "DAILY" && (
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="bg-zinc-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500"
            />
          )}

          {reportType === "MONTHLY" && (
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-zinc-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500"
            />
          )}

          {reportType === "YEARLY" && (
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-zinc-950 border border-white/10 px-3 py-1.5 rounded-xl text-xs font-mono text-zinc-100 focus:outline-none focus:border-cyan-500"
            >
              {[2024, 2025, 2026, 2027].map((yr) => (
                <option key={yr} value={yr}>Fiscal Year {yr}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* PRINTABLE CONTAINER (Rendered on screen and styled for PDF print) */}
      <div className="printable-report space-y-8">
        
        {/* Official Printable Header (Visible in print or screen) */}
        <div className="border-b border-white/10 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-500 flex items-center justify-center text-black font-black text-sm">
                  VK
                </div>
                <h2 className="text-2xl font-black tracking-tight text-white">Versiklo Enterprises</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-1">Official Sales Ledger & Operating Expense P&L Statement</p>
            </div>

            <div className="sm:text-right">
              <span className="text-xs font-mono font-bold text-cyan-400 block">{periodDisplay}</span>
              <span className="text-[11px] text-zinc-500">Extracted on: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</span>
            </div>
          </div>
        </div>

        {/* 4 Core Financial Summary Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Gross Revenue */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2 print-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Gross Sales Revenue</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Receipt className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-white font-mono">₱{grossRevenue.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-500 flex justify-between">
              <span>{filteredTransactions.length} completed transactions</span>
            </div>
          </div>

          {/* Operating Expenses */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2 print-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Shop Overhead Expenses</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <TrendingDown className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-amber-400 font-mono">₱{totalExpenses.toFixed(2)}</div>
            <div className="text-[11px] text-zinc-500 flex justify-between">
              <span>{filteredExpenses.length} expense items logged</span>
            </div>
          </div>

          {/* Net Operating Profit */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2 print-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Net Operating Income</span>
              <div className={clsx(
                "w-8 h-8 rounded-xl flex items-center justify-center",
                netIncome >= 0
                  ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400"
                  : "bg-red-500/10 border border-red-500/20 text-red-400"
              )}>
                {netIncome >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
              </div>
            </div>
            <div className={clsx(
              "text-3xl font-black font-mono",
              netIncome >= 0 ? "text-emerald-400" : "text-red-400"
            )}>
              ₱{netIncome.toFixed(2)}
            </div>
            <p className="text-[11px] text-zinc-500">Gross revenue minus shop expenses</p>
          </div>

          {/* Profit Margin */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl relative overflow-hidden space-y-2 print-card">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Net Profit Margin</span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="text-3xl font-black text-purple-400 font-mono">{profitMargin}%</div>
            <p className="text-[11px] text-zinc-500">Operational efficiency yield</p>
          </div>
        </div>

        {/* Section: Revenue Breakdown & Payment Methods */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Categories */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl print-card space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Receipt className="w-4 h-4 text-cyan-400" />
              <span>Revenue Channels Breakdown</span>
            </h3>
            
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-blue-400" />
                  <div>
                    <span className="font-semibold text-white block">Parts & Accessories Retail</span>
                    <span className="text-[11px] text-zinc-400">Inventory merchandise sales</span>
                  </div>
                </div>
                <span className="font-mono text-base font-bold text-white">₱{partsRevenue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/60 border border-white/5">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-cyan-400" />
                  <div>
                    <span className="font-semibold text-white block">Gross Labor Charged (Customer Invoices)</span>
                    <span className="text-[11px] text-zinc-400">Total repair and service billings</span>
                  </div>
                </div>
                <span className="font-mono text-base font-bold text-cyan-400">₱{grossLaborRevenue.toFixed(2)}</span>
              </div>

              {mechanicCommissionsDeducted > 0 && (
                <div className="flex justify-between items-center p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                  <div className="flex items-center gap-2">
                    <Percent className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-semibold text-amber-300 block">Mechanic Commissions (Deducted per Invoice)</span>
                      <span className="text-[11px] text-zinc-400">Assigned per-mechanic rates saved in database</span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-amber-400">-₱{mechanicCommissionsDeducted.toFixed(2)}</span>
                </div>
              )}

              <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/80 border border-white/10">
                <div>
                  <span className="font-semibold text-zinc-200 block">Net Shop Labor Retained</span>
                  <span className="text-[11px] text-zinc-500">Gross labor minus mechanic commission deductions</span>
                </div>
                <span className="font-mono text-base font-bold text-white">₱{netLaborRevenue.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center p-3 rounded-xl bg-zinc-950/90 border border-cyan-500/30">
                <div>
                  <span className="font-bold text-zinc-100 block">Net Retained Shop Sales</span>
                  <span className="text-[10px] text-zinc-400 font-mono">Gross revenue minus mechanic labor commissions</span>
                </div>
                <span className="font-mono text-lg font-black text-emerald-400">₱{netShopRevenue.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Distribution */}
          <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl print-card space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2 border-b border-white/10 pb-3">
              <Banknote className="w-4 h-4 text-emerald-400" />
              <span>Payment Settlement Channels</span>
            </h3>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Banknote className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Cash Payments</span>
                </div>
                <div className="font-mono text-lg font-bold text-white">
                  ₱{(paymentMethodsSummary["CASH"] || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  <span>GCash / E-Wallet</span>
                </div>
                <div className="font-mono text-lg font-bold text-white">
                  ₱{(paymentMethodsSummary["GCASH"] || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <CreditCard className="w-3.5 h-3.5 text-purple-400" />
                  <span>Credit / Debit Card</span>
                </div>
                <div className="font-mono text-lg font-bold text-white">
                  ₱{(paymentMethodsSummary["CARD"] || 0).toFixed(2)}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-zinc-950/60 border border-white/5 space-y-1">
                <div className="flex items-center gap-1.5 text-zinc-400">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  <span>Bank Transfer</span>
                </div>
                <div className="font-mono text-lg font-bold text-white">
                  ₱{(paymentMethodsSummary["BANK_TRANSFER"] || 0).toFixed(2)}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Shop Operating Expenses Breakdown (User Requested) */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl print-card space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <TrendingDown className="w-5 h-5 text-amber-400" />
                <span>Shop Overhead & Operating Expenses Ledger</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Itemized electricity, rent, staff compensation, consumable fluids, and tool purchases.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Total Period Expenses</span>
              <span className="font-mono text-xl font-black text-amber-400">₱{totalExpenses.toFixed(2)}</span>
            </div>
          </div>

          {/* Quick Category Totals Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Zap className="w-3 h-3 text-amber-400" /> Electricity & Utilities
              </span>
              <span className="font-mono font-bold text-white block mt-1">
                ₱{(expenseByCategory["ELECTRICITY_UTILITIES"] || 0).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-400" /> Facility Rent
              </span>
              <span className="font-mono font-bold text-white block mt-1">
                ₱{(expenseByCategory["RENT"] || 0).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Users className="w-3 h-3 text-purple-400" /> Staff Wages
              </span>
              <span className="font-mono font-bold text-white block mt-1">
                ₱{(expenseByCategory["STAFF_WAGES"] || 0).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Package className="w-3 h-3 text-emerald-400" /> Consumable Parts
              </span>
              <span className="font-mono font-bold text-white block mt-1">
                ₱{(expenseByCategory["CONSUMABLE_PARTS"] || 0).toFixed(2)}
              </span>
            </div>

            <div className="p-3 rounded-2xl bg-zinc-950/70 border border-white/5">
              <span className="text-[10px] text-zinc-400 flex items-center gap-1">
                <Hammer className="w-3 h-3 text-cyan-400" /> Tools & Equipment
              </span>
              <span className="font-mono font-bold text-white block mt-1">
                ₱{(expenseByCategory["TOOLS_EQUIPMENT"] || 0).toFixed(2)}
              </span>
            </div>
          </div>

          {/* Itemized Expenses Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950/70 text-zinc-400 uppercase text-[10px]">
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Description</th>
                  <th className="p-3.5">Vendor / Payee</th>
                  <th className="p-3.5">Ref #</th>
                  <th className="p-3.5">Date</th>
                  <th className="p-3.5 text-right">Amount (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-500">
                      No expenses logged for this period.
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 font-mono">
                          {exp.category.replace("_", " ")}
                        </span>
                      </td>
                      <td className="p-3.5 font-semibold text-white">{exp.description}</td>
                      <td className="p-3.5 text-zinc-400">{exp.vendor || "N/A"}</td>
                      <td className="p-3.5 font-mono text-zinc-400 text-[11px]">{exp.reference_no || "N/A"}</td>
                      <td className="p-3.5 font-mono text-zinc-400 text-[11px]">{exp.date}</td>
                      <td className="p-3.5 text-right font-mono font-bold text-amber-400">
                        ₱{exp.amount.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Section: Completed Sales Transactions Ledger */}
        <div className="bg-zinc-900/50 border border-white/10 rounded-3xl p-6 backdrop-blur-xl print-card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Receipt className="w-5 h-5 text-cyan-400" />
                <span>Extracted Completed Sales Orders ({filteredTransactions.length})</span>
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Itemized transaction records for the active billing period.
              </p>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-zinc-400 uppercase tracking-wider block">Gross Sales Total</span>
              <span className="font-mono text-xl font-black text-cyan-400">₱{grossRevenue.toFixed(2)}</span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-950/70 text-zinc-400 uppercase text-[10px]">
                  <th className="p-3.5">Invoice #</th>
                  <th className="p-3.5">Customer & Motorcycle</th>
                  <th className="p-3.5">Date & Time</th>
                  <th className="p-3.5">Payment Method</th>
                  <th className="p-3.5">Line Items Summary</th>
                  <th className="p-3.5 text-right">Total (PHP)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-zinc-500">
                      No sales records match the selected timeframe.
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-cyan-400">{tx.invoice_no}</td>
                      <td className="p-3.5">
                        <span className="font-semibold text-white block">{tx.customer_name || "Walk-in Customer"}</span>
                        <span className="text-[10px] text-zinc-500 font-mono">{tx.motorcycle_name || "Standard Bike"}</span>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-400 text-[11px]">
                        {new Date(tx.created_at).toLocaleDateString()} {new Date(tx.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="p-3.5">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-zinc-800 text-zinc-300 font-mono">
                          {tx.payment_method}
                        </span>
                      </td>
                      <td className="p-3.5 text-zinc-400 text-[11px]">
                        {tx.items ? tx.items.map((i) => `${i.qty}x ${i.name}`).join(", ") : "Standard Repair Order"}
                      </td>
                      <td className="p-3.5 text-right font-mono font-bold text-emerald-400 text-sm">
                        ₱{tx.total.toFixed(2)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Printable Official Signatory Certification (Visible in Print & PDF) */}
        <div className="pt-8 border-t border-white/10 mt-8 grid grid-cols-2 gap-8 text-xs text-zinc-400">
          <div>
            <span className="block text-[10px] uppercase font-bold text-zinc-500 mb-6">Prepared by Accounting / Cashier</span>
            <div className="border-b border-zinc-700 w-48 mb-1"></div>
            <span className="text-zinc-300 font-mono">{localStorage.getItem("user_email") || "admin@versiklo.com"}</span>
          </div>
          <div className="text-right">
            <span className="block text-[10px] uppercase font-bold text-zinc-500 mb-6">Certified & Approved by Management</span>
            <div className="border-b border-zinc-700 w-48 ml-auto mb-1"></div>
            <span className="text-zinc-300 font-mono">Versiklo Operations Manager</span>
          </div>
        </div>

      </div>

      {/* Modal: Add Shop Operating Expense */}
      {isExpenseModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">Record Shop Expense</h3>
              </div>
              <button
                onClick={() => setIsExpenseModalOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1">Expense Category *</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value as ExpenseCategory)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 focus:outline-none focus:border-cyan-500"
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
                <label className="block text-zinc-400 font-semibold mb-1">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Meralco Electric Power - Main Service Bay"
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Amount (PHP) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="0.00"
                    value={newAmount}
                    onChange={(e) => setNewAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Date Logged *</label>
                  <input
                    type="date"
                    required
                    value={expenseDate}
                    onChange={(e) => setExpenseDate(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Vendor / Payee</label>
                  <input
                    type="text"
                    placeholder="e.g. Hardware Store / Meralco"
                    value={newVendor}
                    onChange={(e) => setNewVendor(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1">Receipt / Invoice Ref #</label>
                  <input
                    type="text"
                    placeholder="e.g. OR-5491"
                    value={newRef}
                    onChange={(e) => setNewRef(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 font-mono placeholder-zinc-600 focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsExpenseModalOpen(false)}
                  className="flex-1 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-semibold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold transition-all shadow-md shadow-cyan-500/20"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
