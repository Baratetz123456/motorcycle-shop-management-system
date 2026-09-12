"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Receipt, 
  ArrowLeft, 
  Printer, 
  Download,
  CheckCircle, 
  Ban, 
  UserCheck, 
  Wrench, 
  ShieldCheck, 
  History, 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  Copy,
  Check,
  Percent,
  FileText,
  Phone,
  Bike
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/lib/permissions";
import { extractInvoiceLaborAndCommission, fetchStaffCompensationFromDB } from "@/lib/compensation";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";
import { ConfirmModal } from "@/components/ui/Modal";

interface TransactionRecord {
  id: string;
  invoice_no: string;
  job_order_id?: string;
  job_order_number?: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  motorcycle_name?: string;
  plate_number?: string;
  cashier_name?: string;
  mechanic_name?: string;
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  total: number;
  amount_paid: number;
  cash_received?: number;
  cash_change?: number;
  payment_method?: string;
  status: "COMPLETED" | "VOIDED";
  items?: { name: string; qty: number; price: number; type?: "product" | "service" }[];
}

function SalesReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get("id") || "";

  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("cashier");
  const [isVoiding, setIsVoiding] = useState(false);
  const [isVoidModalOpen, setIsVoidModalOpen] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [mechanicRates, setMechanicRates] = useState<Record<string, number>>({});

  const laborAnalysis = useMemo(() => {
    if (!transaction) return null;
    return extractInvoiceLaborAndCommission(transaction.items, transaction.mechanic_name, mechanicRates);
  }, [transaction, mechanicRates]);

  useEffect(() => {
    const role = (localStorage.getItem("user_role") as UserRole) || "cashier";
    setUserRole(role);
    fetchStaffCompensationFromDB().then((data) => {
      setMechanicRates(data.mechanicRates);
    });
    loadTransaction();
  }, [txId]);

  const loadTransaction = async () => {
    setLoading(true);
    let matchedTx: TransactionRecord | null = null;

    // 1. If txId is a client-local fallback ID (e.g. starts with 'tx-'), check localStorage sales logs first
    if (txId && txId.startsWith("tx-")) {
      const stored = localStorage.getItem("motoshop_sales_logs");
      if (stored) {
        try {
          const list: TransactionRecord[] = JSON.parse(stored);
          const found = list.find((t) => t.id === txId || t.invoice_no === txId);
          if (found) matchedTx = found;
        } catch (e) {
          // ignore
        }
      }
    }

    // 2. Check direct API lookup if txId is present and not already found locally
    if (txId && !matchedTx) {
      try {
        const res = await apiClient.get<TransactionRecord>(`/sales/transactions/${txId}`);
        if (res.data && res.data.invoice_no) {
          matchedTx = res.data;
        }
      } catch (e) {
        // Continue to general check
      }
    }

    // 3. Check general transactions API
    if (!matchedTx) {
      try {
        const res = await apiClient.get<TransactionRecord[]>("/sales/transactions");
        if (Array.isArray(res.data)) {
          const found = res.data.find((t) => t.id === txId || t.invoice_no === txId);
          if (found) {
            matchedTx = found;
          } else if (!txId && res.data.length > 0) {
            matchedTx = res.data[0];
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 4. Check localStorage sales logs if offline / fallback
    if (!matchedTx) {
      const stored = localStorage.getItem("motoshop_sales_logs");
      if (stored) {
        try {
          const list: TransactionRecord[] = JSON.parse(stored);
          const found = list.find((t) => t.id === txId || t.invoice_no === txId);
          if (found) matchedTx = found;
        } catch (e) {
          // ignore
        }
      }
    }

    // 5. Enrich with workshop job details if available
    if (matchedTx) {
      try {
        const rawJobs = localStorage.getItem("motoshop_jobs");
        if (rawJobs) {
          const jobs: any[] = JSON.parse(rawJobs);
          const linkedJob = jobs.find((j) => 
            (matchedTx?.job_order_id && (j.id === matchedTx.job_order_id || j.jo_number === matchedTx.job_order_id)) ||
            (matchedTx?.customer_name && j.customer && j.customer.toLowerCase() === matchedTx.customer_name.toLowerCase())
          );
          if (linkedJob) {
            matchedTx = {
              ...matchedTx,
              job_order_number: matchedTx.job_order_number || linkedJob.jo_number,
              customer_phone: matchedTx.customer_phone || linkedJob.customer_phone || linkedJob.phone,
              plate_number: matchedTx.plate_number || linkedJob.plate_number || linkedJob.plate,
              motorcycle_name: matchedTx.motorcycle_name || linkedJob.motorcycle,
              mechanic_name: matchedTx.mechanic_name || linkedJob.mechanic
            };
          }
        }
      } catch (e) {
        // ignore
      }
    }

    setTransaction(matchedTx);
    setLoading(false);
  };

  const handleVoidTransaction = async () => {
    if (!transaction || userRole === "cashier" || transaction.status === "VOIDED") return;

    setIsVoiding(true);
    try {
      await apiClient.post(`/sales/transactions/${transaction.id}/void`);
    } catch (e) {
      // ignore network error
    }

    const updatedTx = { ...transaction, status: "VOIDED" as const };
    setTransaction(updatedTx);

    // Sync to local sales logs
    const stored = localStorage.getItem("motoshop_sales_logs");
    if (stored) {
      try {
        const list: TransactionRecord[] = JSON.parse(stored);
        const updatedList = list.map((t) => (t.id === transaction.id ? { ...t, status: "VOIDED" as const } : t));
        localStorage.setItem("motoshop_sales_logs", JSON.stringify(updatedList));
      } catch (e) {
        // ignore
      }
    }
    setIsVoiding(false);
  };

  const handleCopyInvoice = () => {
    if (!transaction) return;
    navigator.clipboard.writeText(transaction.invoice_no);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  const handlePrintInvoice = () => {
    if (!transaction) return;
    const originalTitle = document.title;
    document.title = `Invoice-${transaction.invoice_no}`;
    window.print();
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const handleDownloadCSV = () => {
    if (!transaction) return;
    const lines: string[] = [];

    // Shop Header
    lines.push("MOTOSHOP PRO MANAGEMENT SYSTEM");
    lines.push("Official Commercial Sales Invoice & Service Receipt");
    lines.push("Address: 123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila, Philippines");
    lines.push("Contact: (02) 8123-4567 | support@motoshop.com | TIN: 491-002-884-000 NV");
    lines.push("");

    // Invoice Metadata
    lines.push("--- INVOICE DETAILS ---");
    lines.push(`Invoice Number,${transaction.invoice_no}`);
    lines.push(`Transaction ID,${transaction.id}`);
    lines.push(`Date & Time,"${new Date(transaction.created_at).toLocaleString()}"`);
    lines.push(`Transaction Status,${transaction.status}`);
    lines.push(`Linked Job Order,${transaction.job_order_number || transaction.job_order_id || "Direct Counter POS Sale"}`);
    lines.push("");

    // Customer & Bike Profile
    lines.push("--- CUSTOMER & MOTORCYCLE PROFILE ---");
    lines.push(`Customer Name,"${transaction.customer_name || "Walk-in Customer"}"`);
    lines.push(`Contact Phone,"${transaction.customer_phone || "N/A"}"`);
    lines.push(`Motorcycle Model,"${transaction.motorcycle_name || "General Bike"}"`);
    lines.push(`Plate / Registration / VIN,"${transaction.plate_number || "N/A"}"`);
    lines.push("");

    // Staff Attribution
    lines.push("--- STAFF ATTRIBUTION ---");
    lines.push(`Processing Cashier,"${transaction.cashier_name || "Authorized Cashier"}"`);
    lines.push(`Assigned Mechanic,"${transaction.mechanic_name || "N/A (Counter Sale)"}"`);
    if (laborAnalysis && laborAnalysis.commissionRate) {
      lines.push(`Mechanic Commission Rate,${laborAnalysis.commissionRate}%`);
    }
    lines.push("");

    // Itemized Table
    lines.push("--- ITEMIZED PARTS & SERVICES ---");
    lines.push("Line #,Item Description / Service,Classification,Quantity,Unit Price (PHP),Line Total (PHP)");
    const items = transaction.items || [{ name: "Repair Labor Charge", qty: 1, price: transaction.total }];
    items.forEach((item, idx) => {
      const isService = item.name.toLowerCase().includes("labor") || item.name.toLowerCase().includes("service") || item.type === "service";
      const classification = isService ? "SERVICE / LABOR" : "PART / PRODUCT";
      const lineTotal = (item.qty * item.price).toFixed(2);
      lines.push(`${idx + 1},"${item.name.replace(/"/g, '""')}",${classification},${item.qty},${item.price.toFixed(2)},${lineTotal}`);
    });
    lines.push("");

    // Financial Breakdown
    lines.push("--- FINANCIAL BREAKDOWN ---");
    lines.push(`Gross Items Subtotal,${transaction.subtotal.toFixed(2)}`);
    lines.push(`Discount Percentage,${transaction.discount_percentage || 0}%`);
    lines.push(`Discount Amount,${(transaction.discount_amount || 0).toFixed(2)}`);
    lines.push(`Net Total Amount Due,${transaction.total.toFixed(2)}`);
    lines.push("");

    // BIR Tax Parity
    const vatableSales = transaction.total / 1.12;
    const vatAmount = transaction.total - vatableSales;
    lines.push("--- TAX ANALYSIS (BIR COMPLIANCE) ---");
    lines.push(`12% VATable Sales,${vatableSales.toFixed(2)}`);
    lines.push(`12% Value Added Tax (VAT),${vatAmount.toFixed(2)}`);
    lines.push("VAT-Exempt Sales,0.00");
    lines.push("Zero-Rated Sales,0.00");
    lines.push("");

    // Payment Settlement
    lines.push("--- PAYMENT & SETTLEMENT ---");
    lines.push(`Payment Method,${transaction.payment_method || "CASH"}`);
    lines.push(`Total Amount Tendered / Paid,${transaction.amount_paid.toFixed(2)}`);
    if (transaction.payment_method === "CASH") {
      lines.push(`Cash Received Tendered,${(transaction.cash_received || transaction.amount_paid).toFixed(2)}`);
      lines.push(`Cash Change Returned,${(transaction.cash_change || 0).toFixed(2)}`);
    }
    lines.push("");

    // Labor Commission Settlement
    if (laborAnalysis && laborAnalysis.grossLabor > 0) {
      lines.push("--- LABOR COMMISSION SETTLEMENT ---");
      lines.push(`Gross Workshop Labor Charged,${laborAnalysis.grossLabor.toFixed(2)}`);
      lines.push(`Mechanic Commission Deducted (${laborAnalysis.commissionRate}%),-${laborAnalysis.commissionDeduction.toFixed(2)}`);
      lines.push(`Net Shop Labor Retained,${laborAnalysis.netShopLabor.toFixed(2)}`);
      lines.push("");
    }

    // Statutory Disclaimers & Signatures
    lines.push("--- TERMS & CERTIFICATION ---");
    lines.push('"30-Day Workmanship Warranty on services. 7-Day Replacement for defective uninstalled sealed parts."');
    lines.push('"Issued under Bureau of Internal Revenue (BIR) regulations and RA 10173 Data Privacy Act."');
    lines.push(`"Customer Received By: __________________________  Date: ______________"`);
    lines.push(`"Authorized Cashier: __________________________  Date: ______________"`);
    lines.push(`"Certified System Export: ${new Date().toISOString()}"`);

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Invoice-${transaction.invoice_no}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isCashierReadOnly = userRole === "cashier";

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <DetailViewSkeleton hasTable={true} />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-[70vh] p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold mb-1">Receipt Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">Could not find a valid transaction matching the requested ID.</p>
        <button
          onClick={() => router.push("/sales")}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sales Management</span>
        </button>
      </div>
    );
  }

  const isCompleted = transaction.status === "COMPLETED";
  const vatableSales = transaction.total / 1.12;
  const vatAmount = transaction.total - vatableSales;

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 touch-pan-y">
      {/* Complete Official Invoice Print Stylesheet */}
      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm 10mm;
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
            overflow-x: visible !important;
            overflow-y: visible !important;
            position: static !important;
          }
          body {
            background: #ffffff !important;
            color: #09090b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            font-size: 11pt !important;
          }
          nav, aside, header, [role="navigation"], button, .no-print, .modal-backdrop, [role="dialog"] {
            display: none !important;
          }
          .printable-receipt {
            display: block !important;
            color: #09090b !important;
            background: #ffffff !important;
            border: 1px solid #d4d4d8 !important;
            border-radius: 8px !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 18px 22px !important;
            margin: 0 !important;
            overflow: visible !important;
          }
          .print-card-bg {
            background-color: #fafafa !important;
            border: 1px solid #e4e4e7 !important;
            color: #09090b !important;
          }
          .print-text-dark {
            color: #09090b !important;
          }
          .print-text-muted {
            color: #52525b !important;
          }
          .print-border {
            border-color: #e4e4e7 !important;
          }
          .printable-receipt table {
            border-collapse: collapse !important;
            width: 100% !important;
          }
          .printable-receipt th, .printable-receipt td {
            border: 1px solid #e4e4e7 !important;
            padding: 6px 10px !important;
            color: #09090b !important;
            font-size: 10pt !important;
          }
          .printable-receipt th {
            background-color: #f4f4f5 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }
          .printable-receipt tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-avoid-break {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .print-only {
            display: block !important;
          }
        }
        @media screen {
          .print-only {
            display: none !important;
          }
        }
      `}</style>

      <div className="w-full space-y-8 animate-profile-enter">
        {/* Top Action & Navigation Bar */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 no-print">
          <button
            onClick={() => router.push("/sales")}
            className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyInvoice}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
              title="Copy Invoice Number"
            >
              {copiedInvoice ? <Check className="w-4 h-4 text-emerald-600 dark:text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-600 dark:text-zinc-400" />}
              <span>{copiedInvoice ? "Copied" : "Copy Invoice #"}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-300 dark:border-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-800/80 text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm active:scale-95"
              title="Download structured invoice as CSV"
            >
              <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={handlePrintInvoice}
              className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 dark:bg-zinc-900 dark:border dark:border-lime-500/60 dark:text-lime-400 dark:hover:bg-zinc-800 font-bold text-xs transition-colors flex items-center gap-2 shadow-sm active:scale-95"
              title="Print or Save Invoice as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* Main Official Receipt Document Container */}
        <div className="printable-receipt w-full bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl p-6 sm:p-8 md:p-10 shadow-sm relative overflow-hidden space-y-8">

          {/* Official Shop Header & TIN Information */}
          <div className="flex flex-col md:flex-row md:items-start justify-between gap-6 pb-6 border-b border-slate-200 dark:border-zinc-800 print-border">
            <div>
              <div className="flex items-center gap-3.5">
                <BrandLogo size="lg" variant="lime-on-dark" />
                <div>
                  <h1 className="text-2xl font-black tracking-wide text-slate-900 dark:text-zinc-100 print-text-dark">MOTOSHOP PRO</h1>
                  <p className="text-xs font-semibold text-lime-700 dark:text-lime-400 print-text-dark">Official Commercial Sales Invoice & Service Receipt</p>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400 print-text-muted mt-1">123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila</p>
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 print-text-muted">
                    Tel: (02) 8123-4567 • Email: support@motoshop.com • <span className="font-mono font-bold text-slate-700 dark:text-zinc-300 print-text-dark">TIN: 491-002-884-000 NV</span>
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:items-end gap-2 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500 print-text-muted uppercase tracking-wider font-semibold">Invoice No:</span>
                <span className="font-mono text-lg font-black text-lime-700 print-text-dark">{transaction.invoice_no}</span>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[11px] text-slate-500 print-text-muted">Linked Job Order:</span>
                <span className="font-mono text-xs font-bold text-slate-700 print-text-dark">
                  {transaction.job_order_number || transaction.job_order_id || "Direct POS Sale"}
                </span>
              </div>
              
              <div>
                {isCompleted ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200 print-border">
                    <CheckCircle className="w-3.5 h-3.5" />
                    STATUS: COMPLETED (PAID)
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-50 text-rose-800 border border-rose-200 print-border">
                    <Ban className="w-3.5 h-3.5" />
                    STATUS: VOIDED
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Customer & Staff Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-avoid-break">
            
            {/* Left Column: Customer & Motorcycle Details */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs print-card-bg print-border">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-2 print-text-muted print-border">
                Customer & Bike Profile
              </span>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 print-text-muted">Customer Name:</span>
                <span className="font-bold text-slate-900 text-sm print-text-dark">{transaction.customer_name || "Walk-in Customer"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 print-text-muted">Contact Phone:</span>
                <span className="font-mono text-slate-700 font-semibold print-text-dark">{transaction.customer_phone || "N/A"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 print-text-muted">Bike Model:</span>
                <span className="font-mono font-semibold text-slate-900 print-text-dark">{transaction.motorcycle_name || "General Bike"}</span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 print-text-muted">Plate / VIN:</span>
                <span className="font-mono font-bold text-slate-900 print-text-dark">{transaction.plate_number || "N/A"}</span>
              </div>
            </div>

            {/* Right Column: Staff Attribution & Payment Details */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs print-card-bg print-border">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-2 print-text-muted print-border">
                Staff Attribution & Settlement
              </span>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm print-border">
                  <span className="text-[10px] text-emerald-700 font-bold uppercase block mb-0.5 flex items-center gap-1 print-text-dark">
                    <UserCheck className="w-3 h-3 no-print" /> Cashier
                  </span>
                  <span className="font-bold text-slate-900 text-xs truncate block print-text-dark">
                    {transaction.cashier_name || "Authorized Cashier"}
                  </span>
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 shadow-sm print-border">
                  <span className="text-[10px] text-purple-700 font-bold uppercase block mb-0.5 flex items-center gap-1 print-text-dark">
                    <Wrench className="w-3 h-3 no-print" /> Mechanic
                  </span>
                  <span className="font-bold text-slate-900 text-xs truncate block print-text-dark">
                    {transaction.mechanic_name || "N/A (Counter Sale)"}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center pt-1">
                <span className="text-slate-500 print-text-muted">Payment Method:</span>
                <span className="font-mono font-bold text-slate-900 uppercase flex items-center gap-1.5 print-text-dark">
                  {transaction.payment_method === "CARD" ? <CreditCard className="w-3.5 h-3.5 text-blue-600 no-print" /> : <Banknote className="w-3.5 h-3.5 text-emerald-600 no-print" />}
                  {transaction.payment_method || "CASH"}
                </span>
              </div>

              <div className="flex justify-between items-center">
                <span className="text-slate-500 print-text-muted">Transaction Date:</span>
                <span className="font-mono text-slate-700 print-text-dark">
                  {new Date(transaction.created_at).toLocaleDateString()} {new Date(transaction.created_at).toLocaleTimeString()}
                </span>
              </div>
            </div>
          </div>

          {/* Itemized Purchased / Repair Breakdown Table */}
          <div className="space-y-3 print-avoid-break">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 print-text-dark">
                <ShoppingBag className="w-4 h-4 text-lime-600 no-print" />
                Itemized Parts & Services ({transaction.items?.length || 1})
              </h3>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-x-auto shadow-sm print-border print-card-bg">
              <table className="w-full text-left text-sm border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50 text-slate-500 font-bold uppercase text-xs print-border">
                    <th className="p-3.5 w-12 text-center">#</th>
                    <th className="p-3.5">Item Description / Service</th>
                    <th className="p-3.5 w-32 text-center">Type</th>
                    <th className="p-3.5 w-24 text-center">Quantity</th>
                    <th className="p-3.5 w-32 text-right">Unit Price</th>
                    <th className="p-3.5 w-32 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-700 print-border">
                  {(transaction.items || [
                    { name: "Repair Labor Charge", qty: 1, price: transaction.total }
                  ]).map((item, idx) => {
                    const isService = item.name.toLowerCase().includes("labor") || item.name.toLowerCase().includes("service") || item.type === "service";
                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-3.5 text-center font-mono text-xs text-slate-400 print-text-muted">{idx + 1}</td>
                        <td className="p-3.5">
                          <span className="font-bold text-slate-900 block print-text-dark">{item.name}</span>
                        </td>
                        <td className="p-3.5 text-center">
                          {isService ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200 print-border print-text-dark">
                              SERVICE
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-lime-50 text-lime-800 border border-lime-200 print-border print-text-dark">
                              PART
                            </span>
                          )}
                        </td>
                        <td className="p-3.5 text-center font-mono text-xs text-slate-700 print-text-dark">{item.qty}</td>
                        <td className="p-3.5 text-right font-mono text-xs text-slate-700 print-text-dark">₱{item.price.toFixed(2)}</td>
                        <td className="p-3.5 text-right font-mono font-bold text-slate-900 print-text-dark">
                          ₱{(item.qty * item.price).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Financial & Settlement Breakdown Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print-avoid-break">
            {/* Left Card: BIR Value Added Tax (VAT) Breakdown */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs print-card-bg print-border">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-2 print-text-muted print-border">
                BIR Tax Compliance Breakdown (12% VAT)
              </span>
              <div className="flex justify-between items-center text-slate-600 print-text-dark">
                <span>12% VATable Sales:</span>
                <span className="font-mono text-slate-900 font-semibold print-text-dark">₱{vatableSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-600 print-text-dark">
                <span>12% Value Added Tax (VAT):</span>
                <span className="font-mono text-slate-900 font-semibold print-text-dark">₱{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 print-text-muted">
                <span>VAT-Exempt Sales:</span>
                <span className="font-mono">₱0.00</span>
              </div>
              <div className="flex justify-between items-center text-slate-400 print-text-muted">
                <span>Zero-Rated Sales:</span>
                <span className="font-mono">₱0.00</span>
              </div>
            </div>

            {/* Right Card: Gross, Discount & Net Settlement */}
            <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5 text-xs print-card-bg print-border">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-200 pb-2 print-text-muted print-border">
                Financial Settlement Summary
              </span>
              <div className="flex justify-between items-center text-slate-600 print-text-dark">
                <span>Gross Items Subtotal:</span>
                <span className="font-mono text-slate-900 font-semibold text-sm print-text-dark">₱{transaction.subtotal.toFixed(2)}</span>
              </div>

              {(transaction.discount_percentage || 0) > 0 ? (
                <div className="flex justify-between items-center text-emerald-700 print-text-dark">
                  <span>Discount Applied ({transaction.discount_percentage}%):</span>
                  <span className="font-mono font-semibold">-₱{(transaction.discount_amount || 0).toFixed(2)}</span>
                </div>
              ) : (
                <div className="flex justify-between items-center text-slate-400 print-text-muted">
                  <span>Discount Applied (0%):</span>
                  <span className="font-mono">₱0.00</span>
                </div>
              )}

              <div className="flex justify-between items-center text-base font-bold text-slate-900 pt-2 border-t border-slate-200 print-border print-text-dark">
                <span>Net Total Amount Due:</span>
                <span className="font-mono text-lime-700 text-lg font-black print-text-dark">₱{transaction.total.toFixed(2)}</span>
              </div>

              <div className="flex justify-between items-center text-slate-700 print-text-dark">
                <span>Total Amount Paid:</span>
                <span className="font-mono text-emerald-700 font-bold print-text-dark">₱{transaction.amount_paid.toFixed(2)}</span>
              </div>

              {transaction.payment_method === "CASH" && (
                <>
                  <div className="flex justify-between items-center text-slate-600 pt-1 border-t border-slate-200 print-border print-text-dark">
                    <span>Cash Received Tendered:</span>
                    <span className="font-mono text-slate-900 print-text-dark">₱{(transaction.cash_received || transaction.amount_paid).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-slate-900 font-bold print-text-dark">
                    <span>Cash Change Returned:</span>
                    <span className="font-mono text-lime-700 print-text-dark">₱{(transaction.cash_change || 0).toFixed(2)}</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Labor Commission Deduction & Net Shop Labor Card */}
          {laborAnalysis && laborAnalysis.grossLabor > 0 && (
            <div className="p-5 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-2 text-xs print-card-bg print-border print-avoid-break">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2 print-border">
                <span className="font-bold text-amber-800 uppercase tracking-wider text-[10px] flex items-center gap-1.5 print-text-dark">
                  <Wrench className="w-3.5 h-3.5 text-amber-600 no-print" />
                  Workshop Labor Commission Settlement
                </span>
                <span className="font-mono text-slate-600 text-[11px] print-text-muted">
                  Assigned: <span className="text-slate-900 font-semibold print-text-dark">{laborAnalysis.mechanicName}</span> (@{laborAnalysis.commissionRate}% Commission)
                </span>
              </div>
              <div className="flex justify-between items-center text-slate-700 print-text-dark">
                <span>Gross Labor Charged to Customer:</span>
                <span className="font-mono text-slate-900 font-semibold print-text-dark">₱{laborAnalysis.grossLabor.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-amber-800 print-text-dark">
                <span>Mechanic Labor Commission Deducted ({laborAnalysis.commissionRate}%):</span>
                <span className="font-mono font-bold print-text-dark">-₱{laborAnalysis.commissionDeduction.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-emerald-800 font-bold pt-1.5 border-t border-amber-200 text-sm print-border print-text-dark">
                <span>Net Shop Labor Retained:</span>
                <span className="font-mono font-black text-base print-text-dark">₱{laborAnalysis.netShopLabor.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* Statutory Warranty & Terms Disclaimer */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-[11px] space-y-1.5 text-slate-600 print-card-bg print-border print-avoid-break">
            <p className="font-bold text-slate-900 print-text-dark flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-lime-600 no-print" />
              Warranty Terms & Store Policy
            </p>
            <p className="print-text-muted">
              • <strong>30-Day Workmanship Warranty:</strong> Covers labor services performed by certified MotoShop technicians.
            </p>
            <p className="print-text-muted">
              • <strong>7-Day Parts Replacement:</strong> Valid for factory defective parts returned in original packaging with this receipt. Electrical parts and opened consumables are non-refundable.
            </p>
            <p className="print-text-muted text-[10px]">
              • Issued under Philippine Bureau of Internal Revenue (BIR) regulations and Republic Act 10173 (Data Privacy Act of 2012).
            </p>
          </div>

          {/* Physical Signatures & Certification Footer (Optimized for Printing & Official Filing) */}
          <div className="pt-6 border-t border-slate-200 print-border space-y-6 print-avoid-break">
            <div className="grid grid-cols-2 gap-8 text-xs">
              <div className="space-y-6">
                <div className="border-b border-slate-300 print-border pt-8" />
                <div className="text-center print-text-dark">
                  <p className="font-bold text-slate-900 print-text-dark">Customer Received By</p>
                  <p className="text-[10px] text-slate-500 print-text-muted">Signature over Printed Name</p>
                </div>
              </div>

              <div className="space-y-6">
                <div className="border-b border-slate-300 print-border pt-8" />
                <div className="text-center print-text-dark">
                  <p className="font-bold text-slate-900 print-text-dark">Authorized Store Cashier</p>
                  <p className="text-[10px] text-slate-500 print-text-muted">{transaction.cashier_name || "Official Signatory"}</p>
                </div>
              </div>
            </div>

            <div className="pt-3 text-center text-[10px] text-slate-500 print-text-muted space-y-0.5">
              <p>Certified Official Commercial System Receipt • Generated: {new Date().toLocaleString()}</p>
              <p className="font-mono">Transaction Hash / ID: {transaction.id} • MotoShop Core POS Engine v2.4</p>
            </div>
          </div>

          {/* Bottom Actions Bar (Single Void Button, Redundant Back Button Removed) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-slate-200 no-print">
            <div>
              {!isCashierReadOnly && isCompleted ? (
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(true)}
                  disabled={isVoiding}
                  className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-2 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <Ban className="w-4 h-4" />
                  <span>{isVoiding ? "Voiding Invoice..." : "Void Transaction"}</span>
                </button>
              ) : (
                <span className="text-[11px] text-slate-500 italic">
                  {isCashierReadOnly ? "Voiding restricted for Cashier role" : "Invoice is Voided"}
                </span>
              )}
            </div>
          </div>

          {/* Danger ConfirmModal for Voiding Transaction */}
          <ConfirmModal
            isOpen={isVoidModalOpen}
            onClose={() => setIsVoidModalOpen(false)}
            onConfirm={async () => {
              await handleVoidTransaction();
              setIsVoidModalOpen(false);
            }}
            title="Void Transaction?"
            message={`Are you sure you want to void invoice ${transaction.invoice_no} (${transaction.customer_name || "Walk-in Customer"} • ₱${transaction.total.toFixed(2)})? This action is irreversible and will mark the transaction as VOIDED in store financial records.`}
            confirmText={isVoiding ? "Voiding Invoice..." : "Yes, Void Transaction"}
            confirmVariant="danger"
            isLoading={isVoiding}
          />

        </div>
      </div>
    </div>
  );
}

export default function SalesReceiptPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6">
        <DetailViewSkeleton hasTable={true} />
      </div>
    }>
      <SalesReceiptContent />
    </Suspense>
  );
}
