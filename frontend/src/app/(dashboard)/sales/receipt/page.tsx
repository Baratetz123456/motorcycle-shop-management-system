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
  Copy,
  Check,
  AlertCircle
} from "lucide-react";
import clsx from "clsx";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/lib/permissions";
import { extractInvoiceLaborAndCommission, fetchStaffCompensationFromDB } from "@/lib/compensation";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";
import { ConfirmModal } from "@/components/ui/Modal";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { printIsolatedDocument } from "@/components/documents/printUtils";
import { PrintableInvoiceDocument, getInvoiceDocumentHtml } from "@/components/documents/PrintableInvoiceDocument";

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
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());

  const laborAnalysis = useMemo(() => {
    if (!transaction) return null;
    return extractInvoiceLaborAndCommission(transaction.items, transaction.mechanic_name, mechanicRates);
  }, [transaction, mechanicRates]);

  useEffect(() => {
    const role = (localStorage.getItem("user_role") as UserRole) || "cashier";
    setUserRole(role);
    setSettings(getSystemSettings());
    fetchStaffCompensationFromDB().then((data) => {
      setMechanicRates(data.mechanicRates);
    });
    loadTransaction();
  }, [txId]);

  const loadTransaction = async () => {
    setLoading(true);
    let matchedTx: TransactionRecord | null = null;

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
              motorcycle_name: matchedTx.motorcycle_name || linkedJob.motorcycle || linkedJob.bike_model,
              plate_number: matchedTx.plate_number || linkedJob.plate || linkedJob.plate_number,
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

  const handlePrintInvoice = () => {
    if (!transaction) return;
    const docHtml = getInvoiceDocumentHtml({
      invoiceNo: transaction.invoice_no,
      jobOrderNumber: transaction.job_order_number || transaction.job_order_id,
      createdAt: transaction.created_at,
      status: transaction.status,
      customerName: transaction.customer_name,
      customerPhone: transaction.customer_phone,
      motorcycleName: transaction.motorcycle_name,
      plateNumber: transaction.plate_number,
      cashierName: transaction.cashier_name,
      mechanicName: transaction.mechanic_name,
      paymentMethod: transaction.payment_method,
      items: transaction.items || [{ name: "Repair Labor Charge", qty: 1, price: transaction.total }],
      subtotal: transaction.subtotal,
      discountPercentage: transaction.discount_percentage,
      discountAmount: transaction.discount_amount,
      total: transaction.total,
      amountPaid: transaction.amount_paid,
      cashReceived: transaction.cash_received,
      cashChange: transaction.cash_change,
      laborAnalysis,
      settings,
    });
    printIsolatedDocument(`Invoice-${transaction.invoice_no}`, docHtml);
  };

  const handleCopyInvoice = () => {
    if (!transaction) return;
    navigator.clipboard.writeText(transaction.invoice_no);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  const handleVoidTransaction = async () => {
    if (!transaction || transaction.status === "VOIDED") return;
    setIsVoiding(true);

    try {
      try {
        await apiClient.put(`/sales/transactions/${transaction.id}/void`);
      } catch (err) {
        // Fallback to local storage update
      }

      setTransaction((prev) => prev ? { ...prev, status: "VOIDED" } : null);

      const stored = localStorage.getItem("motoshop_sales_logs");
      if (stored) {
        try {
          const list: TransactionRecord[] = JSON.parse(stored);
          const updated = list.map((t) => t.id === transaction.id ? { ...t, status: "VOIDED" as const } : t);
          localStorage.setItem("motoshop_sales_logs", JSON.stringify(updated));
        } catch (e) {
          // ignore
        }
      }
    } catch (e) {
      console.error("Failed to void transaction:", e);
    } finally {
      setIsVoiding(false);
    }
  };

  const handleDownloadCSV = () => {
    if (!transaction) return;

    const lines: string[] = [];
    const brandName = settings.appName || "Versiklo";
    const shopDesc = settings.shopDescription || "Motorcycle Parts & Services";
    const shopAddr = settings.shopAddress || "123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila";

    // Header Metadata
    lines.push(`"${brandName} - OFFICIAL COMMERCIAL SALES INVOICE"`);
    lines.push(`"${shopDesc}"`);
    lines.push(`"${shopAddr}"`);
    lines.push(`"TIN: ${settings.shopTin || "491-002-884-000 NV"}"`);
    lines.push("");

    lines.push(`Invoice Number,"${transaction.invoice_no}"`);
    lines.push(`Linked Job Order,"${transaction.job_order_number || transaction.job_order_id || "Direct POS Sale"}"`);
    lines.push(`Transaction Status,"${transaction.status}"`);
    lines.push(`Transaction Date,"${new Date(transaction.created_at).toLocaleString()}"`);
    lines.push("");

    // Customer & Bike Profile
    lines.push("--- CUSTOMER & BIKE PROFILE ---");
    lines.push(`Customer Name,"${transaction.customer_name || "Walk-in Customer"}"`);
    lines.push(`Contact Phone,"${transaction.customer_phone || "N/A"}"`);
    lines.push(`Motorcycle Model,"${transaction.motorcycle_name || "General Bike"}"`);
    lines.push(`Plate / VIN,"${transaction.plate_number || "N/A"}"`);
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
    lines.push(`"Certified System Export: ${settings.appName || "Versiklo"} Operations"`);

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
      <div data-invoice-page="true" className="w-full flex-1 min-h-screen p-4 sm:p-6 bg-zinc-950 text-zinc-100">
        <DetailViewSkeleton hasTable={true} />
      </div>
    );
  }

  if (!transaction) {
    return (
      <div data-invoice-page="true" className="w-full flex-1 min-h-[70vh] p-8 flex flex-col items-center justify-center font-sans text-zinc-100 bg-zinc-950">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold mb-1">Receipt Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">Could not find a valid transaction matching the requested ID.</p>
        <button
          onClick={() => router.push("/sales")}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
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
    <>
      <div 
        data-invoice-page="true"
        className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 touch-pan-y bg-zinc-950 text-zinc-100 print:hidden"
      >
      {/* Complete Single-Page Official Invoice Print Stylesheet */}
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
          nav, aside, header, [role="navigation"], button, .no-print, .modal-backdrop, [role="dialog"] {
            display: none !important;
          }
          html.dark .printable-receipt,
          html.dark [data-invoice-canvas="true"],
          .printable-receipt,
          [data-invoice-canvas="true"] {
            display: block !important;
            color: #09090b !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            backdrop-filter: none !important;
            width: 100% !important;
            max-width: 100% !important;
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          html.dark .printable-receipt *,
          html.dark [data-invoice-canvas="true"] *,
          .printable-receipt *,
          [data-invoice-canvas="true"] * {
            color: #09090b !important;
            border-color: #e4e4e7 !important;
            background-color: transparent !important;
          }
          html.dark .printable-receipt table,
          html.dark [data-invoice-canvas="true"] table,
          .printable-receipt table,
          [data-invoice-canvas="true"] table {
            border-collapse: collapse !important;
            width: 100% !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
          }
          html.dark .printable-receipt th,
          html.dark .printable-receipt td,
          .printable-receipt th, .printable-receipt td {
            border: 1px solid #e4e4e7 !important;
            padding: 4px 6px !important;
            color: #09090b !important;
            font-size: 9pt !important;
          }
          html.dark .printable-receipt th,
          .printable-receipt th {
            background-color: #f4f4f5 !important;
            background: #f4f4f5 !important;
            font-weight: 700 !important;
            color: #09090b !important;
          }
          html.dark .printable-receipt tr,
          .printable-receipt tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            background-color: #ffffff !important;
            background: #ffffff !important;
          }
          html.dark .printable-receipt .print-pill,
          .printable-receipt .print-pill {
            background-color: #f4f4f5 !important;
            color: #09090b !important;
            border-color: #d4d4d8 !important;
          }
        }
      `}</style>

      <div className="w-full space-y-6">
        {/* Top Action & Navigation Bar (No-Print) */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 no-print max-w-4xl mx-auto">
          <button
            onClick={() => router.push("/sales")}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </button>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={handleCopyInvoice}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm"
              title="Copy Invoice Number"
            >
              {copiedInvoice ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
              <span>{copiedInvoice ? "Copied" : "Copy Invoice #"}</span>
            </button>

            <button
              onClick={handleDownloadCSV}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-sm active:scale-95"
              title="Download structured invoice as CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Download CSV</span>
            </button>

            <button
              onClick={handlePrintInvoice}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-sm border border-emerald-500/30 active:scale-95"
              title="Print or Save Invoice as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Print / Save PDF</span>
            </button>
          </div>
        </div>

        {/* UNIFIED SINGLE-PAGE DOCUMENT TEMPLATE (Dark In-App, Pure White in Print) */}
        <div 
          data-invoice-canvas="true" 
          className="printable-receipt w-full max-w-4xl mx-auto bg-zinc-900 text-zinc-100 border border-zinc-800 shadow-2xl rounded-xl p-6 sm:p-8 space-y-4 relative"
        >

          {/* 1. Official Letterhead Header (Dynamic Brand Info & TIN) */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-800">
            <div className="flex items-start gap-3.5">
              <BrandLogo size="md" variant="monochrome" className="shrink-0 mt-0.5" />
              <div>
                <h1 className="text-xl font-black tracking-tight text-white uppercase leading-none">
                  {settings.appName || "Versiklo"}
                </h1>
                <p className="text-xs font-semibold text-zinc-400 mt-1">
                  {settings.shopDescription || "Motorcycle Parts & Services"}
                </p>
                <p className="text-[11px] text-zinc-500 mt-0.5 leading-tight">
                  {settings.shopAddress || "123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila"}
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5 font-mono">
                  Tel: {settings.contactPhone || "+63 (02) 8123-4567"} • Email: {settings.contactEmail || "support@versiklo.ph"} • <span className="font-bold text-zinc-300">TIN: {settings.shopTin || "491-002-884-000 NV"}</span>
                </p>
              </div>
            </div>

            <div className="text-left sm:text-right space-y-0.5 shrink-0">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Commercial Sales Invoice
              </span>
              <span className="font-mono text-lg font-black text-white block leading-tight">
                {transaction.invoice_no}
              </span>
              <div className="text-[11px] text-zinc-400 font-mono">
                <span>Linked JO: </span>
                <span className="font-semibold text-zinc-200">
                  {transaction.job_order_number || transaction.job_order_id || "Direct POS Sale"}
                </span>
              </div>
              <div className="text-[10px] text-zinc-500 font-mono">
                {new Date(transaction.created_at).toLocaleDateString()} {new Date(transaction.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
              <div className="pt-0.5">
                <span className={clsx(
                  "print-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase",
                  isCompleted 
                    ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" 
                    : "bg-rose-950/40 text-rose-400 border border-rose-800/40"
                )}>
                  {isCompleted ? <CheckCircle className="w-3 h-3" /> : <Ban className="w-3 h-3" />}
                  {isCompleted ? "Status: Completed (Paid)" : "Status: Voided"}
                </span>
              </div>
            </div>
          </div>

          {/* 2. Customer, Vehicle, and Staff Metadata (Card-Free Flat Layout with Hairline Dividers) */}
          <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-zinc-800 border-b border-zinc-800 pb-3 text-xs">
            {/* Customer Details */}
            <div className="pr-4 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Customer Profile
              </span>
              <p className="font-bold text-white text-sm">{transaction.customer_name || "Walk-in Customer"}</p>
              <p className="text-zinc-400 font-mono text-[11px]">Phone: {transaction.customer_phone || "N/A"}</p>
            </div>

            {/* Vehicle Profile */}
            <div className="py-2 md:py-0 md:px-4 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Vehicle Profile
              </span>
              <p className="font-bold text-white text-sm font-mono">{transaction.motorcycle_name || "General Motorcycle"}</p>
              <p className="text-zinc-400 font-mono text-[11px]">Plate / VIN: {transaction.plate_number || "N/A"}</p>
            </div>

            {/* Staff & Settlement Profile */}
            <div className="pt-2 md:pt-0 md:pl-4 space-y-1">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block">
                Staff & Settlement
              </span>
              <p className="text-zinc-300 text-[11px]">
                <span className="text-zinc-500">Cashier:</span> <strong className="text-white">{transaction.cashier_name || "Authorized Cashier"}</strong>
              </p>
              <p className="text-zinc-300 text-[11px]">
                <span className="text-zinc-500">Mechanic:</span> <strong className="text-white">{transaction.mechanic_name || "N/A (Counter Sale)"}</strong>
              </p>
              <p className="text-zinc-300 text-[11px]">
                <span className="text-zinc-500">Payment Method:</span> <strong className="text-white uppercase">{transaction.payment_method || "CASH"}</strong>
              </p>
            </div>
          </div>

          {/* 3. Itemized Parts & Services Table (Border-collapsed, Condensed Single-Page Format) */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
              Itemized Parts & Services ({transaction.items?.length || 1})
            </span>
            <div className="w-full overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-y border-zinc-800 bg-zinc-800/60 text-zinc-400 font-bold uppercase text-[10px]">
                    <th className="py-1.5 px-2 w-10 text-center">#</th>
                    <th className="py-1.5 px-2">Description / Service</th>
                    <th className="py-1.5 px-2 w-24 text-center">Type</th>
                    <th className="py-1.5 px-2 w-20 text-center">Qty</th>
                    <th className="py-1.5 px-2 w-28 text-right">Unit Price</th>
                    <th className="py-1.5 px-2 w-28 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                  {(transaction.items || [
                    { name: "Repair Labor Charge", qty: 1, price: transaction.total }
                  ]).map((item, idx) => {
                    const isService = item.name.toLowerCase().includes("labor") || item.name.toLowerCase().includes("service") || item.type === "service";
                    return (
                      <tr key={idx} className="hover:bg-zinc-800/30">
                        <td className="py-1.5 px-2 text-center font-mono text-zinc-500 text-[11px]">{idx + 1}</td>
                        <td className="py-1.5 px-2 font-medium text-white">{item.name}</td>
                        <td className="py-1.5 px-2 text-center">
                          <span className={clsx(
                            "print-pill inline-block px-1.5 py-0.2 rounded text-[9px] font-bold",
                            isService ? "bg-purple-950/40 text-purple-300 border border-purple-800/40" : "bg-emerald-950/40 text-emerald-300 border border-emerald-800/40"
                          )}>
                            {isService ? "SERVICE" : "PART"}
                          </span>
                        </td>
                        <td className="py-1.5 px-2 text-center font-mono text-zinc-300">{item.qty}</td>
                        <td className="py-1.5 px-2 text-right font-mono text-zinc-300">₱{item.price.toFixed(2)}</td>
                        <td className="py-1.5 px-2 text-right font-mono font-bold text-white">
                          ₱{(item.qty * item.price).toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Tax & Settlement Financial Grid (Side-by-Side Squeezed Layout) */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2 border-t border-zinc-800 text-xs">
            {/* Left: BIR Tax Breakdown */}
            <div className="space-y-1 text-zinc-400">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                BIR Tax Compliance (12% VAT)
              </span>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/60">
                <span>12% VATable Sales:</span>
                <span className="font-mono text-zinc-200 font-semibold">₱{vatableSales.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/60">
                <span>12% Value Added Tax (VAT):</span>
                <span className="font-mono text-zinc-200 font-semibold">₱{vatAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/60 text-zinc-500">
                <span>VAT-Exempt Sales:</span>
                <span className="font-mono">₱0.00</span>
              </div>
              <div className="flex justify-between py-0.5 text-zinc-500">
                <span>Zero-Rated Sales:</span>
                <span className="font-mono">₱0.00</span>
              </div>
            </div>

            {/* Right: Financial Settlement */}
            <div className="space-y-1 text-zinc-400">
              <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                Financial Settlement
              </span>
              <div className="flex justify-between py-0.5 border-b border-zinc-800/60">
                <span>Gross Items Subtotal:</span>
                <span className="font-mono text-zinc-200 font-semibold">₱{transaction.subtotal.toFixed(2)}</span>
              </div>
              {(transaction.discount_percentage || 0) > 0 && (
                <div className="flex justify-between py-0.5 border-b border-zinc-800/60 text-emerald-400">
                  <span>Discount ({transaction.discount_percentage}%):</span>
                  <span className="font-mono font-semibold">-₱{(transaction.discount_amount || 0).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between py-1 border-b-2 border-zinc-700 text-sm font-bold text-white">
                <span>Net Total Due:</span>
                <span className="font-mono text-base font-black text-emerald-400">₱{transaction.total.toFixed(2)}</span>
              </div>
              <div className="flex justify-between py-0.5 text-zinc-300">
                <span>Total Amount Paid:</span>
                <span className="font-mono font-bold text-emerald-400">₱{transaction.amount_paid.toFixed(2)}</span>
              </div>
              {transaction.payment_method === "CASH" && (
                <div className="flex justify-between py-0.5 text-[11px] text-zinc-400">
                  <span>Tendered: ₱{(transaction.cash_received || transaction.amount_paid).toFixed(2)}</span>
                  <span className="font-bold text-emerald-400">Change: ₱{(transaction.cash_change || 0).toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {/* 5. Workshop Labor Commission Settlement (If applicable) */}
          {laborAnalysis && laborAnalysis.grossLabor > 0 && (
            <div className="p-2.5 bg-zinc-950/60 border border-zinc-800 rounded text-xs space-y-1">
              <div className="flex justify-between items-center text-[10px] font-bold uppercase text-zinc-400">
                <span>Workshop Labor Settlement</span>
                <span>Assigned: {laborAnalysis.mechanicName} (@{laborAnalysis.commissionRate}% Commission)</span>
              </div>
              <div className="flex justify-between text-zinc-300 text-[11px]">
                <span>Gross Labor Billed: ₱{laborAnalysis.grossLabor.toFixed(2)}</span>
                <span>Mechanic Commission: -₱{laborAnalysis.commissionDeduction.toFixed(2)}</span>
                <span className="font-bold text-emerald-400">Net Shop Retained: ₱{laborAnalysis.netShopLabor.toFixed(2)}</span>
              </div>
            </div>
          )}

          {/* 6. Warranty Terms & Store Policy */}
          <div className="py-2 border-y border-zinc-800 text-[10px] text-zinc-400 space-y-0.5">
            <p className="font-bold text-zinc-300">Warranty Terms & Store Policy</p>
            <p>• <strong>30-Day Workmanship Warranty:</strong> Covers labor services performed by certified service technicians.</p>
            <p>• <strong>7-Day Parts Replacement:</strong> Valid for factory defective parts returned in original packaging with this receipt. Electrical parts and opened consumables are non-refundable.</p>
            <p>• Issued under Philippine Bureau of Internal Revenue (BIR) regulations and Republic Act 10173 (Data Privacy Act of 2012).</p>
          </div>

          {/* 7. Dual Physical Signatures */}
          <div className="pt-3 grid grid-cols-2 gap-10 text-xs">
            <div className="text-center space-y-1">
              <div className="border-b border-zinc-700 h-6 mx-auto w-3/4" />
              <p className="font-bold text-zinc-200 text-[11px]">Customer Received By</p>
              <p className="text-[10px] text-zinc-500">Signature over Printed Name</p>
            </div>
            <div className="text-center space-y-1">
              <div className="border-b border-zinc-700 h-6 mx-auto w-3/4" />
              <p className="font-bold text-zinc-200 text-[11px]">Authorized Cashier</p>
              <p className="text-[10px] text-zinc-500">{transaction.cashier_name || "Official Signatory"}</p>
            </div>
          </div>

          {/* 8. Audit Footnote */}
          <div className="pt-2 text-center text-[10px] text-zinc-500 space-y-0.5 border-t border-zinc-800/60">
            <p>Certified Official Commercial System Receipt • Generated: {new Date().toLocaleString()}</p>
            <p className="font-mono">Reference ID: {transaction.id} • Official Record • {settings.appName || "Versiklo"} Operations</p>
          </div>

          {/* Void Transaction Action Bar (Screen only) */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-zinc-800 no-print">
            <div>
              {!isCashierReadOnly && isCompleted ? (
                <button
                  type="button"
                  onClick={() => setIsVoidModalOpen(true)}
                  disabled={isVoiding}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/50 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50 active:scale-98"
                >
                  <Ban className="w-3.5 h-3.5" />
                  <span>{isVoiding ? "Voiding Invoice..." : "Void Transaction"}</span>
                </button>
              ) : (
                <span className="text-[11px] text-zinc-500 italic">
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

    {/* Dedicated Isolated Printable Invoice Document for native Ctrl+P */}
    <div className="hidden print:block w-full bg-white text-zinc-950">
      <PrintableInvoiceDocument
        invoiceNo={transaction.invoice_no}
        jobOrderNumber={transaction.job_order_number || transaction.job_order_id}
        createdAt={transaction.created_at}
        status={transaction.status}
        customerName={transaction.customer_name}
        customerPhone={transaction.customer_phone}
        motorcycleName={transaction.motorcycle_name}
        plateNumber={transaction.plate_number}
        cashierName={transaction.cashier_name}
        mechanicName={transaction.mechanic_name}
        paymentMethod={transaction.payment_method}
        items={transaction.items || [{ name: "Repair Labor Charge", qty: 1, price: transaction.total }]}
        subtotal={transaction.subtotal}
        discountPercentage={transaction.discount_percentage}
        discountAmount={transaction.discount_amount}
        total={transaction.total}
        amountPaid={transaction.amount_paid}
        cashReceived={transaction.cash_received}
        cashChange={transaction.cash_change}
        laborAnalysis={laborAnalysis}
        settings={settings}
      />
    </div>
  </>
  );
}

export default function SalesReceiptPage() {
  return (
    <Suspense fallback={
      <div data-invoice-page="true" className="w-full flex-1 min-h-screen p-4 sm:p-6 bg-zinc-950 text-zinc-100">
        <DetailViewSkeleton hasTable={true} />
      </div>
    }>
      <SalesReceiptContent />
    </Suspense>
  );
}
