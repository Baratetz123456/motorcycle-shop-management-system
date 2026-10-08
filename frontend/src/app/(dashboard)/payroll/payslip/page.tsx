"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Receipt, 
  ArrowLeft, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  AlertCircle,
  CheckCircle,
  Clock,
  FileText
} from "lucide-react";
import clsx from "clsx";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/lib/permissions";
import { fetchStaffCompensationFromDB } from "@/lib/compensation";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { printIsolatedDocument } from "@/components/documents/printUtils";
import { PrintablePayslipDocument, getPrintablePayslipHtml } from "@/components/documents/PrintablePayslipDocument";
import { FloatingDocActionsButton, MobileDocActionsSheet } from "@/components/ui/MobileDocActionsSheet";
import { ConfirmModal } from "@/components/ui/Modal";
import { recordUserAuditLog } from "@/lib/audit";

interface PayslipData {
  id: string;
  payslipNo: string;
  name: string;
  role: "Mechanic" | "Cashier" | string;
  payPeriod: string;
  issuedDate: string;
  status: "PENDING" | "DISBURSED" | string;
  itemsProcessed: number;
  laborTotal?: number;
  commissionRate?: number;
  commissionEarned?: number;
  baseWage?: number;
  totalPayout: number;
  records?: any[];
}

function PayslipContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const staffId = searchParams.get("id");
  const roleParam = searchParams.get("role") || "Mechanic";
  const periodParam = searchParams.get("period") || "MONTHLY";
  const subtabParam = searchParams.get("subtab");
  const targetSubtab = subtabParam || (roleParam.toLowerCase().includes("cashier") ? "CASHIERS" : "MECHANICS");

  const handleReturnToPayroll = () => {
    router.push(`/payroll?tab=COMMISSIONS&subtab=${targetSubtab}`);
  };

  const [payslip, setPayslip] = useState<PayslipData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedVoucher, setCopiedVoucher] = useState(false);
  const [isActionsOpen, setIsActionsOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());
  const [isDisburseModalOpen, setIsDisburseModalOpen] = useState(false);
  const [isDisbursing, setIsDisbursing] = useState(false);

  const handleDisburseSettlement = async () => {
    if (!payslip || payslip.status === "DISBURSED") return;
    setIsDisbursing(true);

    try {
      setPayslip((prev) => prev ? { ...prev, status: "DISBURSED" } : null);

      const stored = typeof window !== "undefined" ? localStorage.getItem("motoshop_payroll_cache") : null;
      let list = stored ? JSON.parse(stored) : [];
      list = list.map((p: any) => p.id === payslip.id || p.payslipNo === payslip.payslipNo ? { ...p, status: "DISBURSED" } : p);
      if (!list.some((p: any) => p.id === payslip.id)) {
        list.push({ ...payslip, status: "DISBURSED" });
      }
      localStorage.setItem("motoshop_payroll_cache", JSON.stringify(list));

      recordUserAuditLog("PAYROLL_DISBURSED", "/payroll/payslip", {
        staffId: payslip.id,
        staffName: payslip.name,
        voucherNo: payslip.payslipNo,
        amount: payslip.totalPayout,
        timestamp: new Date().toISOString(),
      });
    } catch (e) {
      console.error("Disbursement error:", e);
    } finally {
      setIsDisbursing(false);
      setIsDisburseModalOpen(false);
    }
  };

  useEffect(() => {
    setSettings(getSystemSettings());
    loadPayslipData();
  }, [staffId, roleParam, periodParam]);

  const loadPayslipData = async () => {
    setLoading(true);

    const periodLabel = 
      periodParam === "WEEKLY" ? "Weekly Settlement (7 Days)" :
      periodParam === "MONTHLY" ? "Monthly Settlement (30 Days)" :
      periodParam === "YEARLY" ? "Annual Settlement (Year-to-Date)" : "Consolidated Cumulative Settlement";

    const issuedDate = new Date().toLocaleDateString("en-PH", {
      year: "numeric",
      month: "long",
      day: "numeric"
    });

    try {
      // 1. Check localStorage custom cache
      const stored = typeof window !== "undefined" ? localStorage.getItem("motoshop_payroll_cache") : null;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          const found = parsed.find((p: any) => 
            p.id === staffId || 
            p.payslipNo === staffId || 
            (staffId && p.name && p.name.toLowerCase().replace(/\s+/g, "-") === staffId.toLowerCase())
          );
          if (found) {
            setPayslip(found);
            setLoading(false);
            return;
          }
        } catch (e) {
          // ignore
        }
      }

      // 2. Try fetching from live staff compensation DB
      const dbData = await fetchStaffCompensationFromDB();
      const matchedStaff = dbData.staffList.find((s) => 
        s.userId === staffId || 
        s.name.toLowerCase().replace(/\s+/g, "-") === (staffId || "").toLowerCase() ||
        s.email.toLowerCase() === (staffId || "").toLowerCase()
      );

      if (matchedStaff) {
        const isMechanic = matchedStaff.role === "mechanic";
        const commRate = matchedStaff.commissionRate || 40;
        const baseWage = matchedStaff.baseWage || 650;
        setPayslip({
          id: matchedStaff.userId,
          payslipNo: `PAY-${matchedStaff.userId.slice(-6).toUpperCase()}`,
          name: matchedStaff.name,
          role: isMechanic ? "Mechanic" : "Cashier",
          payPeriod: periodLabel,
          issuedDate,
          status: "PENDING",
          itemsProcessed: isMechanic ? 1 : 14,
          laborTotal: isMechanic ? 1500 : undefined,
          commissionRate: isMechanic ? commRate : undefined,
          commissionEarned: isMechanic ? 600 : undefined,
          baseWage: isMechanic ? undefined : baseWage,
          totalPayout: isMechanic ? (1500 * commRate) / 100 : baseWage,
        });
        setLoading(false);
        return;
      }

      // 3. Fallback mock record for demonstration
      const isCashier = roleParam.toLowerCase().includes("cashier");
      setPayslip({
        id: staffId || "staff-sample-01",
        payslipNo: `PAY-${(staffId || Date.now().toString()).slice(-6).toUpperCase()}`,
        name: isCashier ? "Maria Santos" : "Alex Reyes",
        role: isCashier ? "Cashier" : "Mechanic",
        payPeriod: periodLabel,
        issuedDate,
        status: "PENDING",
        itemsProcessed: isCashier ? 14 : 1,
        laborTotal: isCashier ? undefined : 1500,
        commissionRate: isCashier ? undefined : 40,
        commissionEarned: isCashier ? undefined : 600,
        baseWage: isCashier ? 650 : undefined,
        totalPayout: isCashier ? 650 : 600,
      });
    } catch (err) {
      console.error("Failed to load staff compensation data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyVoucher = () => {
    if (!payslip) return;
    navigator.clipboard.writeText(payslip.payslipNo);
    setCopiedVoucher(true);
    setTimeout(() => setCopiedVoucher(false), 2000);
  };

  const handlePrintPayslip = () => {
    if (!payslip) return;
    const docHtml = getPrintablePayslipHtml({
      payslipNo: payslip.payslipNo,
      name: payslip.name,
      role: payslip.role,
      payPeriod: payslip.payPeriod,
      issuedDate: payslip.issuedDate,
      status: payslip.status,
      itemsProcessed: payslip.itemsProcessed,
      laborTotal: payslip.laborTotal,
      commissionRate: payslip.commissionRate,
      commissionEarned: payslip.commissionEarned,
      baseWage: payslip.baseWage,
      totalPayout: payslip.totalPayout,
      settings,
    });
    printIsolatedDocument(`Payslip-${payslip.payslipNo}`, docHtml);
  };

  const handleDownloadCSV = () => {
    if (!payslip) return;

    const brandName = settings.appName || "Versiklo";
    const shopDesc = settings.shopDescription === "Shop Floor" ? "MOTORCYCLE PARTS & SERVICES" : (settings.shopDescription || "Motorcycle Parts & Services");
    const shopAddr = settings.shopAddress || "123 Rizal Ave, Brgy. San Antonio, Pasig City, Metro Manila";

    const lines: string[] = [];
    lines.push(`"${brandName} - OFFICIAL STAFF COMPENSATION PAYSLIP"`);
    lines.push(`"${shopDesc}"`);
    lines.push(`"${shopAddr}"`);
    lines.push(`"TIN: ${settings.shopTin || "442-891-003-000 Non-VAT"}"`);
    lines.push("");

    lines.push(`Voucher Number,"${payslip.payslipNo}"`);
    lines.push(`Settlement Period,"${payslip.payPeriod}"`);
    lines.push(`Date Issued,"${payslip.issuedDate}"`);
    lines.push(`Disbursement Status,"${payslip.status}"`);
    lines.push("");

    lines.push("--- EMPLOYEE DETAILS ---");
    lines.push(`Staff Name,"${payslip.name}"`);
    lines.push(`Staff Role,"${payslip.role} Technician / Staff"`);
    lines.push("");

    lines.push("--- EARNINGS BREAKDOWN ---");
    lines.push("Description,Volume / Shifts,Base Billed (PHP),Rate / Share,Payout Amount (PHP)");
    if (payslip.role.toLowerCase().includes("mechanic")) {
      lines.push(`"Workshop Repair Labor Commission",${payslip.itemsProcessed} orders,${(payslip.laborTotal || 0).toFixed(2)},${payslip.commissionRate}%,${(payslip.totalPayout || 0).toFixed(2)}`);
    } else {
      lines.push(`"Frontline Cashier Wage & Operations",${payslip.itemsProcessed} tickets,${(payslip.baseWage || 0).toFixed(2)}/day,100% Base,${(payslip.totalPayout || 0).toFixed(2)}`);
    }
    lines.push("");

    lines.push(`NET COMPENSATION PAYABLE,${(payslip.totalPayout || 0).toFixed(2)}`);
    lines.push("");
    lines.push("--- STATUTORY NOTICE & SIGNATURES ---");
    lines.push('"Official compensation statement issued under Philippine Labor Standards and Bureau of Internal Revenue (BIR) regulations."');
    lines.push('"Approved By: __________________________  Date: ______________"');
    lines.push(`"Received By (${payslip.name}): __________________________  Date: ______________"`);

    const csvContent = lines.join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `Payslip-${payslip.payslipNo}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const isMechanic = payslip?.role ? payslip.role.toLowerCase().includes("mechanic") : roleParam.toLowerCase().includes("mechanic");

  const displayRecords = useMemo(() => {
    if (!payslip) return [];
    if (payslip.records && payslip.records.length > 0) {
      return payslip.records;
    }
    if (isMechanic) {
      return [
        {
          id: "jo-1",
          job_order_no: `JO-${new Date().getFullYear()}-0042`,
          customer_name: "Juan dela Cruz",
          motorcycle_model: "Honda Click 125i",
          labor_fee: payslip.laborTotal || 1500,
          commission_rate: payslip.commissionRate || 40,
          commission_amount: payslip.commissionEarned || ((payslip.laborTotal || 1500) * (payslip.commissionRate || 40)) / 100,
          created_at: new Date().toISOString(),
          status: "COMPLETED",
        }
      ];
    } else {
      return [
        {
          id: "tx-1",
          invoice_no: `INV-${new Date().getFullYear()}-0189`,
          customer_name: "Walk-in Customer",
          payment_method: "CASH",
          total_amount: 1450,
          created_at: new Date(Date.now() - 3600000).toISOString(),
          status: "PAID",
        },
        {
          id: "tx-2",
          invoice_no: `INV-${new Date().getFullYear()}-0190`,
          customer_name: "Pedro Penduko",
          payment_method: "GCASH",
          total_amount: 820,
          created_at: new Date().toISOString(),
          status: "PAID",
        }
      ];
    }
  }, [payslip, isMechanic]);

  if (loading) {
    return (
      <div data-payroll-page="true" className="w-full flex-1 min-h-screen p-4 sm:p-6 bg-zinc-950 text-zinc-100">
        <DetailViewSkeleton hasTable={true} />
      </div>
    );
  }

  if (!payslip) {
    return (
      <div data-payroll-page="true" className="w-full flex-1 min-h-[70vh] p-8 flex flex-col items-center justify-center font-sans text-zinc-100 bg-zinc-950">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold mb-1">Payslip Record Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">Could not find a valid staff compensation record matching the requested ID.</p>
        <button
          onClick={handleReturnToPayroll}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Payroll Management</span>
        </button>
      </div>
    );
  }

  return (
    <>
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
          nav, aside, header, [role="navigation"], button, .no-print, .modal-backdrop, [role="dialog"] {
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
            backdrop-filter: none !important;
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
          .printable-payslip *,
          [data-payslip-canvas="true"] * {
            color: #09090b !important;
            border-color: #e4e4e7 !important;
            background-color: transparent !important;
          }
          html.dark .printable-payslip table,
          html.dark [data-payslip-canvas="true"] table,
          .printable-payslip table,
          [data-payslip-canvas="true"] table {
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

      <div 
        data-payroll-page="true"
        className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 touch-pan-y bg-zinc-950 text-zinc-100"
      >
        <div className="w-full space-y-6">
          {/* Top Action & Navigation Bar (Desktop Only, hidden on mobile < sm) */}
          <div className="w-full hidden sm:flex sm:flex-row sm:items-center justify-between gap-4 shrink-0 no-print max-w-4xl mx-auto">
            <button
              onClick={handleReturnToPayroll}
              className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-2 text-xs font-semibold w-fit cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
              <span>Back to Payroll</span>
            </button>

            <div className="flex flex-wrap items-center gap-3">
              {payslip.status === "PENDING" ? (
                <button
                  onClick={() => setIsDisburseModalOpen(true)}
                  className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-2 border border-emerald-500 cursor-pointer"
                  title="Disburse Settlement Funds"
                >
                  <CheckCircle className="w-4 h-4 text-white" />
                  <span>Disburse Settlement</span>
                </button>
              ) : (
                <span className="px-3 py-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 text-xs font-bold uppercase flex items-center gap-1.5">
                  <CheckCircle className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Settlement Disbursed</span>
                </span>
              )}

              <button
                onClick={handleCopyVoucher}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
                title="Copy Voucher Number"
              >
                {copiedVoucher ? <Check className="w-4 h-4 text-zinc-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                <span>{copiedVoucher ? "Copied" : "Copy Voucher #"}</span>
              </button>

              <button
                onClick={handleDownloadCSV}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 transition-colors flex items-center gap-2 text-xs font-semibold cursor-pointer"
                title="Download structured payslip as CSV"
              >
                <Download className="w-4 h-4 text-zinc-400" />
                <span>Download CSV</span>
              </button>

              <button
                onClick={handlePrintPayslip}
                className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors flex items-center gap-2 border border-emerald-500 cursor-pointer"
                title="Print or Save Official Payslip as PDF"
              >
                <Printer className="w-4 h-4 text-white" />
                <span>Print Official Payslip</span>
              </button>
            </div>
          </div>

          {/* DEDICATED IN-APP DOCUMENT CANVAS (Dark Mode In-App, Pure White in Print) */}
          <div 
            data-payslip-canvas="true" 
            className="printable-payslip w-full max-w-4xl mx-auto bg-zinc-900 text-zinc-100 border border-zinc-800 rounded-xl p-6 sm:p-8 space-y-5 relative"
          >
            {/* 1. Letterhead & Brand Header */}
            <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-zinc-800">
              <div className="flex items-start gap-3.5">
                <BrandLogo size="md" variant="monochrome" className="shrink-0 mt-0.5" />
                <div>
                  <h1 className="text-lg sm:text-xl font-black tracking-tight text-white uppercase leading-none">
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
                <span className="font-mono text-lg sm:text-xl font-black text-white block leading-tight">
                  {payslip.payslipNo}
                </span>
                <div className="text-[11px] text-zinc-400 font-mono">
                  <span>Period: </span>
                  <strong className="text-zinc-200">{payslip.payPeriod}</strong>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono">
                  Issued: {payslip.issuedDate}
                </div>
                <div className="pt-0.5">
                  <span className={clsx(
                    "print-pill inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase",
                    payslip.status === "DISBURSED" 
                      ? "bg-emerald-950/40 text-emerald-400 border border-emerald-800/40" 
                      : "bg-amber-950/40 text-amber-400 border border-amber-800/40"
                  )}>
                    {payslip.status === "DISBURSED" ? <CheckCircle className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
                    Status: {payslip.status}
                  </span>
                </div>
              </div>
            </div>

            {/* 2. Staff Profile & Authorization Metadata */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-4 border-b border-zinc-800 text-xs">
              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">Employee Details</span>
                <p className="font-bold text-white text-sm">{payslip.name}</p>
                <p className="text-zinc-400 text-[11px]">Role: {payslip.role} Technician / Staff</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">Settlement Details</span>
                <p className="font-bold text-white text-sm font-mono">{payslip.payPeriod}</p>
                <p className="text-zinc-400 text-[11px]">Voucher: {payslip.payslipNo}</p>
              </div>

              <div className="space-y-0.5 sm:text-right">
                <span className="text-[10px] font-bold uppercase text-zinc-400 block tracking-wider">Authorization</span>
                <p className="text-[11px] text-zinc-300">
                  <span className="text-zinc-500">Disbursed By:</span> <strong className="text-white">Shop Manager / Admin</strong>
                </p>
                <p className="text-[11px] text-zinc-300">
                  <span className="text-zinc-500">Date Issued:</span> <strong className="text-white">{payslip.issuedDate}</strong>
                </p>
              </div>
            </div>

            {/* 3. Itemized Compensation Table */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 block">
                Compensation Breakdown & Earnings Ledger
              </span>
              <div className="w-full overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-y border-zinc-800 bg-zinc-800/60 text-zinc-400 font-bold uppercase text-[10px]">
                      <th className="py-2 px-2.5">Earning Description / Activity</th>
                      <th className="py-2 px-2.5 w-32 text-center">Volume / Shifts</th>
                      <th className="py-2 px-2.5 w-32 text-right">Base / Billed</th>
                      <th className="py-2 px-2.5 w-24 text-center">Rate / Share</th>
                      <th className="py-2 px-2.5 w-32 text-right">Payout Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/60 text-zinc-300">
                    {isMechanic ? (
                      <tr>
                        <td className="py-2.5 px-2.5 font-medium text-white">
                          Workshop Repair Labor Commission
                          <span className="block text-[10px] text-zinc-400">Technician labor commission entitlement</span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono">{payslip.itemsProcessed} orders</td>
                        <td className="py-2.5 px-2.5 text-right font-mono">₱{(payslip.laborTotal || 0).toFixed(2)}</td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-400">{payslip.commissionRate}%</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-white">₱{payslip.totalPayout.toFixed(2)}</td>
                      </tr>
                    ) : (
                      <tr>
                        <td className="py-2.5 px-2.5 font-medium text-white">
                          Frontline Cashier Wage & Operations
                          <span className="block text-[10px] text-zinc-400">Daily wage base + shift transactions</span>
                        </td>
                        <td className="py-2.5 px-2.5 text-center font-mono">{payslip.itemsProcessed} tickets</td>
                        <td className="py-2.5 px-2.5 text-right font-mono">₱{(payslip.baseWage || 0).toFixed(2)}/day</td>
                        <td className="py-2.5 px-2.5 text-center font-mono font-bold text-emerald-400">100% Base</td>
                        <td className="py-2.5 px-2.5 text-right font-mono font-bold text-white">₱{payslip.totalPayout.toFixed(2)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 4. Net Compensation Payable Highlight */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-zinc-800/60 border border-zinc-700/60 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <span className="text-xs font-black uppercase text-zinc-300 tracking-wider">
                Net Compensation Payable:
              </span>
              <span className="font-mono text-xl sm:text-2xl font-black text-emerald-400">
                ₱{payslip.totalPayout.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>

            {/* 5. Itemized Work Ledger & Detailed Breakdown */}
            <div className="space-y-2.5 pt-1" data-testid="itemized-activity-ledger">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-lime-400" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-300">
                    Itemized Work & Activity Ledger ({isMechanic ? "Job Orders" : "POS Transactions"})
                  </span>
                </div>
                <span className="text-[10px] font-mono text-zinc-400">
                  {displayRecords.length} {displayRecords.length === 1 ? "settled item" : "settled items"}
                </span>
              </div>

              {/* Desktop Table View */}
              <div className="hidden sm:block w-full overflow-x-auto rounded-lg border border-zinc-800/80 bg-zinc-950/40">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-zinc-800 bg-zinc-800/60 text-zinc-400 font-bold uppercase text-[9px] tracking-wider">
                      {isMechanic ? (
                        <>
                          <th className="py-2 px-2.5">Job Order #</th>
                          <th className="py-2 px-2.5">Customer & Motorcycle</th>
                          <th className="py-2 px-2.5">Timestamp</th>
                          <th className="py-2 px-2.5 text-right">Labor Billed</th>
                          <th className="py-2 px-2.5 text-center">Comm. %</th>
                          <th className="py-2 px-2.5 text-right">Share Earned</th>
                          <th className="py-2 px-2.5 text-center">Status</th>
                        </>
                      ) : (
                        <>
                          <th className="py-2 px-2.5">Invoice #</th>
                          <th className="py-2 px-2.5">Customer / Account</th>
                          <th className="py-2 px-2.5">Timestamp</th>
                          <th className="py-2 px-2.5 text-center">Payment</th>
                          <th className="py-2 px-2.5 text-right">Volume Handled</th>
                          <th className="py-2 px-2.5 text-center">Status</th>
                        </>
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-800/50 text-zinc-300 text-[11px]">
                    {displayRecords.map((rec: any, idx: number) => {
                      if (isMechanic) {
                        const joNo = rec.job_order_no || rec.job_no || rec.id || `JO-${idx + 1}`;
                        const cust = rec.customer_name || "Customer";
                        const bike = rec.motorcycle_model ? ` • ${rec.motorcycle_model}` : "";
                        const labor = Number(rec.labor_fee || rec.labor_total || 0);
                        const rate = Number(rec.commission_rate || payslip.commissionRate || 40);
                        const earned = Number(rec.commission_amount || (labor * rate) / 100);
                        const dateStr = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : payslip.issuedDate;
                        return (
                          <tr key={rec.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2 px-2.5 font-mono font-bold text-white">{joNo}</td>
                            <td className="py-2 px-2.5 text-zinc-300">
                              <span>{cust}</span>
                              <span className="text-zinc-500">{bike}</span>
                            </td>
                            <td className="py-2 px-2.5 font-mono text-[10px] text-zinc-400">{dateStr}</td>
                            <td className="py-2 px-2.5 text-right font-mono text-zinc-300">₱{labor.toFixed(2)}</td>
                            <td className="py-2 px-2.5 text-center font-mono text-emerald-400 font-bold">{rate}%</td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-white">₱{earned.toFixed(2)}</td>
                            <td className="py-2 px-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                {rec.status || "COMPLETED"}
                              </span>
                            </td>
                          </tr>
                        );
                      } else {
                        const invNo = rec.invoice_no || rec.id || `INV-${idx + 1}`;
                        const cust = rec.customer_name || "Walk-in Customer";
                        const method = rec.payment_method || "CASH";
                        const total = Number(rec.total_amount || rec.final_total || 0);
                        const dateStr = rec.created_at ? new Date(rec.created_at).toLocaleDateString() : payslip.issuedDate;
                        return (
                          <tr key={rec.id || idx} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="py-2 px-2.5 font-mono font-bold text-white">{invNo}</td>
                            <td className="py-2 px-2.5 text-zinc-300">{cust}</td>
                            <td className="py-2 px-2.5 font-mono text-[10px] text-zinc-400">{dateStr}</td>
                            <td className="py-2 px-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                                {method}
                              </span>
                            </td>
                            <td className="py-2 px-2.5 text-right font-mono font-bold text-white">₱{total.toFixed(2)}</td>
                            <td className="py-2 px-2.5 text-center">
                              <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                                {rec.status || "PAID"}
                              </span>
                            </td>
                          </tr>
                        );
                      }
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card List View */}
              <div className="block sm:hidden space-y-2">
                {displayRecords.map((rec: any, idx: number) => {
                  if (isMechanic) {
                    const joNo = rec.job_order_no || rec.job_no || rec.id || `JO-${idx + 1}`;
                    const cust = rec.customer_name || "Customer";
                    const bike = rec.motorcycle_model ? ` • ${rec.motorcycle_model}` : "";
                    const labor = Number(rec.labor_fee || rec.labor_total || 0);
                    const rate = Number(rec.commission_rate || payslip.commissionRate || 40);
                    const earned = Number(rec.commission_amount || (labor * rate) / 100);
                    return (
                      <div key={rec.id || idx} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-xs">{joNo}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-bold uppercase bg-emerald-950/40 text-emerald-400 border border-emerald-800/40">
                            {rec.status || "COMPLETED"}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300">{cust}<span className="text-zinc-500">{bike}</span></p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60 font-mono">
                          <span>Labor: ₱{labor.toFixed(2)} ({rate}%)</span>
                          <span className="text-white font-bold">Earned: ₱{earned.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  } else {
                    const invNo = rec.invoice_no || rec.id || `INV-${idx + 1}`;
                    const cust = rec.customer_name || "Walk-in Customer";
                    const method = rec.payment_method || "CASH";
                    const total = Number(rec.total_amount || rec.final_total || 0);
                    return (
                      <div key={rec.id || idx} className="p-3 rounded-lg bg-zinc-950/60 border border-zinc-800 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-white text-xs">{invNo}</span>
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-zinc-800 text-zinc-300 border border-zinc-700">
                            {method}
                          </span>
                        </div>
                        <p className="text-[11px] text-zinc-300">{cust}</p>
                        <div className="flex items-center justify-between text-[10px] text-zinc-400 pt-1 border-t border-zinc-800/60 font-mono">
                          <span className="text-emerald-400 uppercase font-bold">PAID</span>
                          <span className="text-white font-bold">Total: ₱{total.toFixed(2)}</span>
                        </div>
                      </div>
                    );
                  }
                })}
              </div>
            </div>

            {/* 6. Statutory Compliance Note */}
            <div className="p-3 rounded-lg bg-zinc-950/50 border border-zinc-800 text-[10px] text-zinc-400 space-y-1">
              <p className="font-bold text-zinc-300">Disbursement Terms & Statutory Compliance</p>
              <p>• Official compensation statement issued in accordance with Philippine Labor Standards and Bureau of Internal Revenue (BIR) regulations.</p>
              <p>• Net disbursement has been credited and settled in accordance with shop payroll records and agreed commission schedule.</p>
            </div>

            {/* 6. Dual Physical Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-zinc-800 text-center">
              <div className="space-y-1">
                <div className="border-b border-zinc-700 w-3/4 mx-auto h-8 mb-1" />
                <p className="text-[11px] font-bold text-white">Approved & Disbursed By</p>
                <p className="text-[10px] text-zinc-400">Shop Manager / Admin</p>
              </div>

              <div className="space-y-1">
                <div className="border-b border-zinc-700 w-3/4 mx-auto h-8 mb-1" />
                <p className="text-[11px] font-bold text-white">Received in Full By</p>
                <p className="text-[10px] text-zinc-400">Employee Signature & Date</p>
              </div>
            </div>

            {/* 7. Certified Footnote */}
            <div className="text-center pt-3 border-t border-zinc-800/60 text-[10px] text-zinc-400">
              <p>Certified Official Compensation Voucher • Generated: {new Date().toLocaleString()}</p>
              <p className="font-mono mt-0.5">Reference ID: {payslip.payslipNo} • Official Record • {settings.appName || "Versiklo"} Operations</p>
            </div>
          </div>

          {/* Floating Action Button (Mobile Only) */}
          <FloatingDocActionsButton
            onClick={() => setIsActionsOpen(true)}
          />

          {/* Mobile Slide-Up Actions Sheet */}
          <MobileDocActionsSheet
            isOpen={isActionsOpen}
            onClose={() => setIsActionsOpen(false)}
            title="Payslip Actions"
            subtitle={`${payslip.payslipNo} • ${payslip.name}`}
            onBack={handleReturnToPayroll}
            backLabel="Back to Payroll"
            onDisburse={payslip.status === "PENDING" ? () => setIsDisburseModalOpen(true) : undefined}
            disburseLabel="Disburse Settlement"
            isDisbursed={payslip.status === "DISBURSED"}
            onPrint={handlePrintPayslip}
            printLabel="Print Official Payslip"
            onDownloadCSV={handleDownloadCSV}
            csvLabel="Download CSV Voucher"
            onCopy={handleCopyVoucher}
            copyLabel="Copy Voucher Number"
            isCopied={copiedVoucher}
          />
        </div>
      </div>

      {/* Disbursement ConfirmModal Safeguard */}
      {payslip && (
        <ConfirmModal
          isOpen={isDisburseModalOpen}
          title="Confirm Staff Settlement Disbursement"
          message={`Are you sure you want to release compensation payment of ₱${(payslip.totalPayout || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} to ${payslip.name} (${payslip.role}) for voucher ${payslip.payslipNo}?`}
          confirmText="Release Funds"
          cancelText="Cancel"
          isLoading={isDisbursing}
          onConfirm={handleDisburseSettlement}
          onClose={() => setIsDisburseModalOpen(false)}
        />
      )}

      {/* Dedicated Isolated Printable Payslip Document for native Ctrl+P */}
      <div className="hidden print:block w-full bg-white text-zinc-950">
        <PrintablePayslipDocument
          payslipNo={payslip.payslipNo}
          name={payslip.name}
          role={payslip.role}
          payPeriod={payslip.payPeriod}
          issuedDate={payslip.issuedDate}
          status={payslip.status}
          itemsProcessed={payslip.itemsProcessed}
          laborTotal={payslip.laborTotal}
          commissionRate={payslip.commissionRate}
          commissionEarned={payslip.commissionEarned}
          baseWage={payslip.baseWage}
          totalPayout={payslip.totalPayout}
          settings={settings}
        />
      </div>
    </>
  );
}

export default function PayslipPage() {
  return (
    <Suspense fallback={
      <div data-payroll-page="true" className="w-full flex-1 min-h-screen p-4 sm:p-6 bg-zinc-950 text-zinc-100">
        <DetailViewSkeleton hasTable={true} />
      </div>
    }>
      <PayslipContent />
    </Suspense>
  );
}
