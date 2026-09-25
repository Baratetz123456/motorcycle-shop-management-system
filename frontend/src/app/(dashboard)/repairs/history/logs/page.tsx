"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  History, 
  ArrowLeft, 
  Printer, 
  Wrench, 
  Calendar, 
  User, 
  Phone, 
  CheckCircle, 
  Clock, 
  FileText, 
  Tag, 
  DollarSign, 
  AlertCircle,
  Play,
  Lock,
  ChevronRight,
  ShieldCheck,
  Bike,
  Download
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { CustomerHistoryRecord } from "../page";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";
import { FloatingProfileActionsButton, MobileProfileActionsSheet } from "@/components/ui/MobileProfileActionsSheet";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { 
  PrintableRepairReportDocument, 
  getRepairReportDocumentHtml 
} from "@/components/documents/PrintableRepairReportDocument";
import { 
  buildEnterpriseReportCsv, 
  downloadCsvFile, 
  printIsolatedDocument 
} from "@/components/documents/reportExportUtils";

function CustomerRepairHistoryLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id") || "";

  const [customer, setCustomer] = useState<CustomerHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings());

  useEffect(() => {
    setSettings(getSystemSettings());
  }, []);

  const handlePrintServiceRecord = (selectedJob?: any) => {
    if (!customer) return;
    const targetJob = selectedJob || customer.past_jobs[0] || {
      jo_number: "SVC-LOG",
      mechanic_notes: "General inspection and maintenance",
      mechanic_name: "Shop Tech",
      labor_charge: 0,
      parts_charge: 0,
      total_billed: 0,
      items_used: []
    };

    const docHtml = getRepairReportDocumentHtml({
      settings,
      jobNumber: targetJob.jo_number || targetJob.job_id || "JO-101",
      customerName: customer.customer_name,
      customerPhone: customer.contact_number,
      motorcycleName: customer.motorcycle_model,
      plateNumber: (customer as any).plate_number || "NCR-XXXX",
      leadMechanic: targetJob.mechanic_name || (targetJob as any).lead_mechanic || "Lead Technician",
      serviceAdvisor: (targetJob as any).service_advisor || "Service Advisor",
      status: targetJob.status || "COMPLETED",
      initialDiagnosis: targetJob.mechanic_notes || (targetJob as any).complaint || "Customer requested inspection",
      workPerformed: (targetJob as any).work_done || targetJob.mechanic_notes || "Standard repair procedures executed",
      partsUsed: (targetJob.items_used || []).filter((it: any) => !((it.name || "").toLowerCase().includes("labor") || (it.name || "").toLowerCase().includes("service"))),
      laborCharges: (targetJob.items_used || []).filter((it: any) => ((it.name || "").toLowerCase().includes("labor") || (it.name || "").toLowerCase().includes("service"))).map((it: any) => ({
        name: it.name,
        amount: Number(it.price || targetJob.labor_charge || 0)
      })),
      totalParts: targetJob.parts_charge || 0,
      totalLabor: targetJob.labor_charge || 0,
      grandTotal: targetJob.total_billed || ((targetJob.parts_charge || 0) + (targetJob.labor_charge || 0)),
      releasedAt: targetJob.date_repaired || undefined,
      generatedBy: localStorage.getItem("user_email") || "Service Advisor",
      generatedDate: new Date().toLocaleString()
    });

    printIsolatedDocument(`Service-Record-${customer.customer_name.replace(/[^a-zA-Z0-9]/g, "-")}`, docHtml);
  };

  const handleExportRepairCsv = () => {
    if (!customer) return;
    const totalSpent = customer.past_jobs.reduce((sum, j) => sum + (j.total_billed || (j.parts_charge + j.labor_charge) || 0), 0);
    const csvContent = buildEnterpriseReportCsv(
      {
        appName: settings.appName || "Versiklo",
        shopDescription: settings.shopDescription || "Motorcycle Parts & Services",
        shopAddress: settings.shopAddress,
        shopTin: settings.shopTin,
        reportTitle: `Customer Repair History - ${customer.customer_name}`,
        periodLabel: `Motorcycle: ${customer.motorcycle_model} (${(customer as any).plate_number || "NCR-XXXX"})`,
        generatedBy: localStorage.getItem("user_email") || "Service Advisor",
        generatedDate: new Date().toLocaleString()
      },
      {
        headers: ["JO #", "Date", "Status", "Mechanic", "Complaint / Diagnosis", "Parts Fee (PHP)", "Labor Fee (PHP)", "Total Settlement (PHP)"],
        rows: customer.past_jobs.map((job) => [
          job.jo_number || job.job_id,
          job.date_repaired || "",
          job.status,
          job.mechanic_name || (job as any).lead_mechanic || "N/A",
          job.mechanic_notes || (job as any).complaint || "",
          Number(job.parts_charge || 0).toFixed(2),
          Number(job.labor_charge || 0).toFixed(2),
          Number(job.total_billed || (job.parts_charge + job.labor_charge) || 0).toFixed(2)
        ]),
        summaryRows: [
          ["Total Customer Lifetime Expenditure", "", "", "", "", "", "", Number(totalSpent).toFixed(2)]
        ]
      }
    );
    downloadCsvFile(`repair_history_${customer.customer_name.toLowerCase().replace(/[^a-z0-9]/g, "_")}.csv`, csvContent);
  };

  useEffect(() => {
    loadCustomerLog();
  }, [customerId]);

  const loadCustomerLog = async () => {
    setLoading(true);
    let matched: CustomerHistoryRecord | null = null;

    try {
      const res = await apiClient.get<CustomerHistoryRecord[]>("/repairs/customer-history");
      if (Array.isArray(res.data) && res.data.length > 0) {
        matched = res.data.find((c) => c.customer_id === customerId) || null;
      }
    } catch (e) {
      // ignore
    }

    if (!matched) {
      try {
        const stored = localStorage.getItem("motoshop_customer_histories");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            matched = parsed.find((c: any) => c.customer_id === customerId) || null;
          }
        }
      } catch (e) {}
    }

    if (matched) {
      try {
        const storedSales = localStorage.getItem("motoshop_sales_logs");
        const salesList: any[] = storedSales ? JSON.parse(storedSales) : [];
        const enriched = JSON.parse(JSON.stringify(matched)) as CustomerHistoryRecord;

        enriched.past_jobs = enriched.past_jobs.map((job) => {
          // Find matching sales log by job_order_id, jo_number, or customer_name
          const matchedTx = salesList.find((tx) =>
            (tx.job_order_id && (tx.job_order_id === job.job_id || tx.job_order_id === job.jo_number)) ||
            (tx.customer_name && tx.customer_name.trim().toLowerCase() === enriched.customer_name.trim().toLowerCase())
          );

          let items = Array.isArray(job.items_used) ? [...job.items_used] : [];
          if (matchedTx && Array.isArray(matchedTx.items) && matchedTx.items.length > 0) {
            items = matchedTx.items.map((it: any) => ({
              name: it.name,
              qty: Number(it.qty) || 1,
              price: Number(it.price) || 0
            }));
          }

          // Calculate parts subtotal and labor/service subtotal
          let partsTotal = 0;
          let laborTotal = 0;

          items.forEach((it) => {
            const nameLower = (it.name || "").toLowerCase();
            const isService =
              nameLower.includes("labor") ||
              nameLower.includes("service") ||
              nameLower.includes("repair") ||
              nameLower.includes("overhaul") ||
              nameLower.includes("tune-up") ||
              nameLower.includes("inspection") ||
              nameLower.includes("cleaning") ||
              nameLower.includes("checkup") ||
              nameLower.includes("adjustment") ||
              nameLower.includes("change");

            const lineVal = (it.price || 0) * (it.qty || 1);
            if (isService) {
              laborTotal += lineVal;
            } else {
              partsTotal += lineVal;
            }
          });

          // Fallback to existing charges if no item lines matched that category
          if (laborTotal === 0 && job.labor_charge > 0) {
            laborTotal = job.labor_charge;
          }
          if (partsTotal === 0 && job.parts_charge > 0) {
            partsTotal = job.parts_charge;
          }

          const totalServiceBilled = matchedTx
            ? Number(matchedTx.total ?? matchedTx.subtotal ?? (laborTotal + partsTotal))
            : (laborTotal + partsTotal);

          return {
            ...job,
            items_used: items,
            labor_charge: laborTotal,
            parts_charge: partsTotal,
            total_billed: totalServiceBilled,
            invoice_no: matchedTx?.invoice_no
          };
        });

        matched = enriched;
      } catch (err) {
        console.error("Error synchronizing customer log values:", err);
      }
    }

    setCustomer(matched);
    setLoading(false);
  };

  const handleResumeRepair = (record: CustomerHistoryRecord) => {
    if (record.active_status === "ACTIVE_REPAIR") return;
    router.push(`/repairs/board?resume_customer=${encodeURIComponent(record.customer_name)}&model=${encodeURIComponent(record.motorcycle_model)}`);
  };

  if (loading) {
    return (
      <div className="p-4 sm:p-6 bg-zinc-950 min-h-screen text-zinc-100">
        <DetailViewSkeleton hasTable={true} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-[70vh] p-8 flex flex-col items-center justify-center font-sans text-zinc-200 bg-zinc-950">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-zinc-100 mb-1">Customer Record Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">Could not find repair logs matching the requested customer identifier.</p>
        <button
          onClick={() => router.push("/repairs/history")}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-none"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Repair History</span>
        </button>
      </div>
    );
  }

  const isActive = customer.active_status === "ACTIVE_REPAIR";

  return (
    <>
      <div className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-24 touch-pan-y bg-zinc-950 text-zinc-100 print:hidden">
      <div className="w-full space-y-6 md:space-y-8 animate-profile-enter">
        
        {/* Top Action & Navigation Bar (Preserved on Desktop >= md, Hidden on Mobile < md) */}
        <div className="w-full hidden md:flex flex-row items-center justify-between gap-4 no-print">
          <button
            onClick={() => router.push("/repairs/history")}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-none active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Repair History</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={handleExportRepairCsv}
              className="px-3.5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-none active:scale-[0.98]"
              title="Export repair logs as RFC 4180 CSV"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Export CSV</span>
            </button>

            <button
              onClick={() => handlePrintServiceRecord()}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-2 text-xs font-bold shadow-none active:scale-[0.98]"
            >
              <Printer className="w-4 h-4 text-emerald-400" />
              <span>Print Service Record</span>
            </button>

            {isActive ? (
              <button
                disabled
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-bold flex items-center gap-2 cursor-not-allowed shadow-none"
              >
                <Lock className="w-4 h-4" />
                <span>Active in Repair</span>
              </button>
            ) : (
              <button
                onClick={() => handleResumeRepair(customer)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-none border border-emerald-500/30 active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Job</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Customer Profile & Detailed Service Record View */}
        <div className="w-full space-y-6">
          
          {/* Customer Profile Header (Card-Free Canvas on Mobile, Structured Panel on Desktop) */}
          <div className="bg-transparent md:bg-zinc-900 border-0 md:border md:border-zinc-800 rounded-none md:rounded-3xl p-0 md:p-8 shadow-none space-y-5">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-5 pb-5 border-b border-zinc-800/80">
              <div className="flex items-center gap-3.5 sm:gap-4">
                <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-emerald-400 font-black text-lg sm:text-xl md:text-2xl shrink-0">
                  {customer.customer_name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="text-lg sm:text-xl md:text-3xl font-black text-zinc-100 truncate">{customer.customer_name}</h1>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 shrink-0">
                        <Wrench className="w-3 h-3" /> Active in Repair
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold bg-zinc-900 text-zinc-400 border border-zinc-800 shrink-0">
                        <CheckCircle className="w-3 h-3 text-zinc-500" /> Ready for Service
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-zinc-400 mt-1 flex items-center gap-2.5 sm:gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-zinc-300">
                      <Bike className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      <span className="truncate">{customer.motorcycle_model}</span>
                    </span>
                    <span className="text-zinc-700 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 font-mono text-zinc-400">
                      <Phone className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                      {customer.contact_number}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stats Chips (Desktop Boxed vs Mobile Grid) */}
              <div className="grid grid-cols-2 sm:flex sm:items-center gap-2 sm:gap-6 bg-zinc-900/80 md:bg-zinc-950 p-3 sm:p-3.5 px-3.5 sm:px-6 rounded-xl md:rounded-2xl border border-zinc-800/80 shrink-0">
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Total Sessions</span>
                  <span className="font-mono text-lg sm:text-2xl font-black text-zinc-100">{customer.total_repair_sessions}</span>
                </div>
                <div className="hidden sm:block w-px h-8 bg-zinc-800" />
                <div>
                  <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Last Serviced</span>
                  <span className="font-mono text-xs sm:text-sm font-bold text-zinc-300">{new Date(customer.last_service_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-zinc-400">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-emerald-500" />
                <span className="font-medium">Chronological Service Records ({customer.past_jobs.length} completed logs)</span>
              </span>
              <span className="text-zinc-500 text-[11px] font-mono">Customer ID: {customer.customer_id}</span>
            </div>
          </div>

          {/* Detailed Itemized Job Order Logs (Card-Free Timeline on Mobile, Structured Panels on Desktop) */}
          <div className="space-y-6">
            {customer.past_jobs.map((job) => {
              const totalCost = job.total_billed !== undefined 
                ? job.total_billed 
                : (job.labor_charge + job.parts_charge);

              return (
                <div
                  key={job.job_id}
                  className="bg-transparent md:bg-zinc-900 border-b md:border border-zinc-800/80 md:border-zinc-800 rounded-none md:rounded-3xl p-0 md:p-8 pb-6 md:pb-8 shadow-none space-y-4 sm:space-y-5 relative"
                >
                  {/* Job Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pb-3 sm:pb-4 border-b border-zinc-800/60">
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <span className="font-mono text-emerald-400 font-bold bg-zinc-900 border border-zinc-800 px-2.5 sm:px-3 py-1 rounded-lg sm:rounded-xl text-xs sm:text-sm">
                        {job.jo_number}
                      </span>
                      <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                        Repaired on {new Date(job.date_repaired).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-zinc-400">
                        Mechanic: <span className="font-bold text-zinc-200">{job.mechanic_name}</span>
                      </span>
                      <span className={clsx(
                        "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        job.status === "COMPLETED" || job.status === "RELEASED"
                          ? "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                          : "bg-zinc-900 text-zinc-300 border-zinc-700"
                      )}>
                        {job.status}
                      </span>
                    </div>
                  </div>

                  {/* Mechanic Diagnostic & Inspection Notes */}
                  {job.mechanic_notes && (
                    <div className="p-3.5 sm:p-4 bg-zinc-900/60 md:bg-zinc-950 rounded-xl md:rounded-2xl border border-zinc-800/80 space-y-1">
                      <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-emerald-500" />
                        Diagnostic Notes & Service Summary
                      </span>
                      <p className="text-xs text-zinc-300 leading-relaxed italic">
                        "{job.mechanic_notes}"
                      </p>
                    </div>
                  )}

                  {/* Itemized Parts & Labor Products Applied */}
                  {job.items_used && job.items_used.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-zinc-500" />
                        Itemized Products & Services Availed ({job.items_used.length})
                      </span>

                      {/* Desktop / Tablet Table View */}
                      <div className="hidden sm:block rounded-xl md:rounded-2xl border border-zinc-800 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-zinc-950 text-zinc-400 text-xs font-semibold uppercase tracking-wider border-b border-zinc-800">
                            <tr>
                              <th className="p-3 px-4 font-bold">Item / Service Description</th>
                              <th className="p-3 px-4 text-center font-bold">Type</th>
                              <th className="p-3 px-4 text-center font-bold">Qty</th>
                              <th className="p-3 px-4 text-right font-bold">Unit Price</th>
                              <th className="p-3 px-4 text-right font-bold">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/40">
                            {job.items_used.map((it, i) => {
                              const nameLower = (it.name || "").toLowerCase();
                              const isService =
                                nameLower.includes("labor") ||
                                nameLower.includes("service") ||
                                nameLower.includes("repair") ||
                                nameLower.includes("overhaul") ||
                                nameLower.includes("tune-up") ||
                                nameLower.includes("inspection") ||
                                nameLower.includes("cleaning") ||
                                nameLower.includes("checkup") ||
                                nameLower.includes("wiring");

                              return (
                                <tr key={i} className="hover:bg-zinc-800/40 transition-colors">
                                  <td className="p-3 px-4 font-bold text-zinc-200">{it.name}</td>
                                  <td className="p-3 px-4 text-center">
                                    <span className={clsx(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase border",
                                      isService 
                                        ? "bg-zinc-900 text-zinc-300 border-zinc-700" 
                                        : "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                                    )}>
                                      {isService ? "Labor Service" : "Part Product"}
                                    </span>
                                  </td>
                                  <td className="p-3 px-4 text-center text-xs font-mono text-zinc-400">{it.qty}</td>
                                  <td className="p-3 px-4 text-right text-xs font-mono text-zinc-400">₱{it.price.toFixed(2)}</td>
                                  <td className="p-3 px-4 text-right font-mono font-bold text-zinc-100 text-sm">
                                    ₱{(it.qty * it.price).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      {/* Mobile Compact Borderless Item Rows (< sm) */}
                      <div className="block sm:hidden divide-y divide-zinc-800/80 rounded-xl bg-zinc-900/50 border border-zinc-800/80 overflow-hidden">
                        {job.items_used.map((it, i) => {
                          const nameLower = (it.name || "").toLowerCase();
                          const isService =
                            nameLower.includes("labor") ||
                            nameLower.includes("service") ||
                            nameLower.includes("repair") ||
                            nameLower.includes("overhaul") ||
                            nameLower.includes("tune-up") ||
                            nameLower.includes("inspection") ||
                            nameLower.includes("cleaning") ||
                            nameLower.includes("checkup") ||
                            nameLower.includes("wiring");

                          return (
                            <div key={i} className="p-2.5 flex items-center justify-between gap-3 text-xs">
                              <div className="min-w-0">
                                <div className="font-bold text-zinc-200 truncate">{it.name}</div>
                                <div className="text-[11px] text-zinc-400 flex items-center gap-2 mt-0.5 font-mono">
                                  <span>Qty: {it.qty}</span>
                                  <span>•</span>
                                  <span>₱{it.price.toFixed(2)}</span>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <span className={clsx(
                                  "px-1.5 py-0.5 rounded text-[9px] font-bold uppercase block mb-1 border",
                                  isService 
                                    ? "bg-zinc-900 text-zinc-400 border-zinc-700" 
                                    : "bg-emerald-950/60 text-emerald-400 border-emerald-800/80"
                                )}>
                                  {isService ? "Labor" : "Part"}
                                </span>
                                <span className="font-mono font-bold text-zinc-100">
                                  ₱{(it.qty * it.price).toFixed(2)}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Financial Settlement Breakdown */}
                  <div className="p-3.5 sm:p-4 bg-zinc-900/60 md:bg-zinc-950 rounded-xl md:rounded-2xl border border-zinc-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Service Labor</span>
                        <span className="font-mono text-zinc-200 font-bold text-sm">₱{job.labor_charge.toFixed(2)}</span>
                      </div>
                      <div className="w-px h-6 bg-zinc-800 hidden sm:block" />
                      <div>
                        <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Parts & Materials</span>
                        <span className="font-mono text-zinc-200 font-bold text-sm">₱{job.parts_charge.toFixed(2)}</span>
                      </div>
                      {job.invoice_no && (
                        <>
                          <div className="w-px h-6 bg-zinc-800 hidden sm:block" />
                          <div>
                            <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Invoice Synced</span>
                            <span className="font-mono text-emerald-400 font-bold text-xs">{job.invoice_no}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-left sm:text-right border-t sm:border-t-0 border-zinc-800/80 pt-2 sm:pt-0 flex sm:flex-col justify-between sm:justify-center items-center sm:items-end">
                      <span className="text-zinc-400 block text-[10px] uppercase font-bold">Total Service Billed</span>
                      <span className="font-mono text-emerald-400 font-black text-base sm:text-lg">₱{totalCost.toFixed(2)}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>

      {/* Mobile Floating Action Button & Actions Sheet (< md) */}
      <FloatingProfileActionsButton
        onClick={() => setIsMobileActionsOpen(true)}
        label="Actions"
      />

      <MobileProfileActionsSheet
        isOpen={isMobileActionsOpen}
        onClose={() => setIsMobileActionsOpen(false)}
        title={customer.customer_name}
        subtitle={`${customer.motorcycle_model} • ${customer.contact_number}`}
        actions={[
          {
            id: "back",
            label: "Back to Customer Records",
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => router.push("/repairs/history"),
          },
          ...(!isActive ? [
            {
              id: "start-job",
              label: "Start Job",
              icon: <Play className="w-4 h-4 fill-current" />,
              variant: "primary" as const,
              onClick: () => handleResumeRepair(customer),
            }
          ] : []),
          {
            id: "export-csv",
            label: "Export CSV",
            icon: <Download className="w-4 h-4" />,
            onClick: () => handleExportRepairCsv(),
          },
          {
            id: "print",
            label: "Print Service Record",
            icon: <Printer className="w-4 h-4" />,
            onClick: () => handlePrintServiceRecord(),
          }
        ]}
      />
      </div>

      {/* Native Print Fallback Container */}
      {customer && (
        <div className="hidden print:block w-full bg-white text-zinc-950">
          <PrintableRepairReportDocument
            settings={settings}
            jobNumber={customer.past_jobs[0]?.jo_number || customer.past_jobs[0]?.job_id || "JO-101"}
            customerName={customer.customer_name}
            customerPhone={customer.contact_number}
            motorcycleName={customer.motorcycle_model}
            plateNumber={(customer as any).plate_number || "NCR-XXXX"}
            leadMechanic={customer.past_jobs[0]?.mechanic_name || (customer.past_jobs[0] as any)?.lead_mechanic || "Lead Technician"}
            serviceAdvisor={(customer.past_jobs[0] as any)?.service_advisor || "Service Advisor"}
            status={customer.past_jobs[0]?.status || "COMPLETED"}
            initialDiagnosis={customer.past_jobs[0]?.mechanic_notes || (customer.past_jobs[0] as any)?.complaint || "Customer requested inspection"}
            workPerformed={(customer.past_jobs[0] as any)?.work_done || customer.past_jobs[0]?.mechanic_notes || "Standard repair procedures executed"}
            partsUsed={(customer.past_jobs[0]?.items_used || []).filter((it: any) => !((it.name || "").toLowerCase().includes("labor") || (it.name || "").toLowerCase().includes("service")))}
            laborCharges={(customer.past_jobs[0]?.items_used || []).filter((it: any) => ((it.name || "").toLowerCase().includes("labor") || (it.name || "").toLowerCase().includes("service"))).map((it: any) => ({
              name: it.name,
              amount: Number(it.price || customer.past_jobs[0]?.labor_charge || 0)
            }))}
            totalParts={customer.past_jobs[0]?.parts_charge || 0}
            totalLabor={customer.past_jobs[0]?.labor_charge || 0}
            grandTotal={customer.past_jobs[0]?.total_billed || ((customer.past_jobs[0]?.parts_charge || 0) + (customer.past_jobs[0]?.labor_charge || 0))}
            releasedAt={customer.past_jobs[0]?.date_repaired || undefined}
            generatedBy={localStorage.getItem("user_email") || "Service Advisor"}
            generatedDate={new Date().toLocaleString()}
          />
        </div>
      )}
    </>
  );
}

export default function CustomerRepairHistoryLogsPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 bg-zinc-950 min-h-screen text-zinc-100">
        <DetailViewSkeleton hasTable={true} />
      </div>
    }>
      <CustomerRepairHistoryLogsContent />
    </Suspense>
  );
}
