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
  Bike
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { CustomerHistoryRecord } from "../page";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";

function CustomerRepairHistoryLogsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const customerId = searchParams.get("id") || "";

  const [customer, setCustomer] = useState<CustomerHistoryRecord | null>(null);
  const [loading, setLoading] = useState(true);

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
      <div className="p-4 sm:p-6">
        <DetailViewSkeleton hasTable={true} />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="min-h-[70vh] p-8 flex flex-col items-center justify-center font-sans text-slate-800 dark:text-zinc-200 bg-slate-50 dark:bg-zinc-950">
        <AlertCircle className="w-12 h-12 text-rose-500 mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-zinc-100 mb-1">Customer Record Not Found</h2>
        <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6">Could not find repair logs matching the requested customer identifier.</p>
        <button
          onClick={() => router.push("/repairs/history")}
          className="px-5 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 text-xs font-semibold flex items-center gap-2 transition-all shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Repair History</span>
        </button>
      </div>
    );
  }

  const isActive = customer.active_status === "ACTIVE_REPAIR";

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-16 touch-pan-y bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <div className="w-full space-y-8 animate-profile-enter">
        {/* Top Action & Navigation Bar */}
        <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
          <button
            onClick={() => router.push("/repairs/history")}
            className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-sm"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Repair History</span>
          </button>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 hover:bg-slate-50 dark:hover:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 transition-colors flex items-center gap-2 text-xs font-bold shadow-sm"
            >
              <Printer className="w-4 h-4 text-lime-600 dark:text-lime-400" />
              <span>Print Service Record</span>
            </button>

            {isActive ? (
              <button
                disabled
                className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 text-slate-400 dark:text-zinc-500 text-xs font-bold flex items-center gap-2 cursor-not-allowed shadow-none"
              >
                <Lock className="w-4 h-4" />
                <span>Active in Repair</span>
              </button>
            ) : (
              <button
                onClick={() => handleResumeRepair(customer)}
                className="px-4 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 dark:bg-zinc-900 dark:border dark:border-lime-500/60 dark:text-lime-400 dark:hover:bg-zinc-800 font-bold text-xs transition-colors flex items-center gap-2 shadow-sm active:scale-[0.98]"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Start Job</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Profile & Detailed Service Record View */}
        <div className="w-full space-y-6 pb-20">
          
          {/* Customer Profile Banner (Card-Free Canvas on Mobile, Card on Desktop) */}
          <div className="bg-transparent md:bg-white md:dark:bg-zinc-900 border-0 md:border md:border-slate-200 md:dark:border-zinc-800 rounded-none md:rounded-3xl p-0 md:p-8 md:shadow-sm space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 md:w-16 md:h-16 rounded-2xl bg-lime-50 dark:bg-lime-950/40 border border-lime-200 dark:border-lime-800/50 flex items-center justify-center text-lime-700 dark:text-lime-400 font-black text-xl md:text-2xl shrink-0">
                  {customer.customer_name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h1 className="text-xl md:text-3xl font-black text-slate-900 dark:text-zinc-100">{customer.customer_name}</h1>
                    {isActive ? (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-lime-100 text-lime-800 border border-lime-300">
                        <Wrench className="w-3.5 h-3.5" /> Active in Repair
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                        <CheckCircle className="w-3.5 h-3.5 text-slate-500" /> Ready for Service
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-3 flex-wrap">
                    <span className="flex items-center gap-1 font-semibold text-slate-700">
                      <Bike className="w-3.5 h-3.5 text-lime-600" />
                      {customer.motorcycle_model}
                    </span>
                    <span className="text-slate-300 hidden sm:inline">•</span>
                    <span className="flex items-center gap-1 font-mono text-slate-500">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      {customer.contact_number}
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex sm:items-center gap-6 bg-slate-50 p-3.5 px-4 sm:px-6 rounded-xl md:rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Total Sessions</span>
                  <span className="font-mono text-xl sm:text-2xl font-black text-slate-900">{customer.total_repair_sessions}</span>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Last Serviced</span>
                  <span className="font-mono text-xs font-bold text-slate-800">{new Date(customer.last_service_date).toLocaleDateString()}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-2">
                <History className="w-4 h-4 text-lime-600" />
                <span>Chronological Service Records ({customer.past_jobs.length} completed logs)</span>
              </span>
              <span className="text-slate-400 text-[11px] font-mono">Customer ID: {customer.customer_id}</span>
            </div>
          </div>

          {/* Detailed Itemized Job Order Logs */}
          <div className="space-y-6">
            {customer.past_jobs.map((job) => {
              const totalCost = job.total_billed !== undefined 
                ? job.total_billed 
                : (job.labor_charge + job.parts_charge);

              return (
                <div
                  key={job.job_id}
                  className="bg-white border border-slate-200 rounded-2xl md:rounded-3xl p-5 md:p-8 shadow-sm space-y-5 relative overflow-hidden"
                >
                  {/* Job Order Top Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="font-mono text-lime-800 font-bold bg-lime-100 px-3 py-1.5 rounded-xl border border-lime-300 text-sm">
                        {job.jo_number}
                      </span>
                      <span className="text-xs text-slate-500 flex items-center gap-1.5 font-medium">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        Repaired on {new Date(job.date_repaired).toLocaleDateString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-600">
                        Mechanic: <span className="font-bold text-slate-900">{job.mechanic_name}</span>
                      </span>
                      <span className={clsx(
                        "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                        job.status === "COMPLETED" || job.status === "RELEASED"
                          ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                          : "bg-amber-100 text-amber-800 border-amber-300"
                      )}>
                        {job.status}
                      </span>
                    </div>
                  </div>

                  {/* Mechanic Diagnostic & Inspection Notes */}
                  {job.mechanic_notes && (
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-lime-700 uppercase tracking-wider block flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-lime-600" />
                        Diagnostic Notes & Service Summary
                      </span>
                      <p className="text-xs text-slate-700 leading-relaxed italic">
                        "{job.mechanic_notes}"
                      </p>
                    </div>
                  )}

                  {/* Itemized Parts & Labor Products Applied */}
                  {job.items_used && job.items_used.length > 0 && (
                    <div className="space-y-2">
                      <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block flex items-center gap-1.5">
                        <Tag className="w-3.5 h-3.5 text-slate-400" />
                        Itemized Products & Services Availed ({job.items_used.length})
                      </span>
                      <div className="rounded-2xl border border-slate-200 overflow-hidden">
                        <table className="w-full text-sm text-left">
                          <thead className="bg-slate-50 text-slate-500 text-xs font-semibold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                              <th className="p-3.5 px-4 font-bold">Item / Service Description</th>
                              <th className="p-3.5 px-4 text-center font-bold">Type</th>
                              <th className="p-3.5 px-4 text-center font-bold">Qty</th>
                              <th className="p-3.5 px-4 text-right font-bold">Unit Price</th>
                              <th className="p-3.5 px-4 text-right font-bold">Subtotal</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 bg-white">
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
                                <tr key={i} className="hover:bg-slate-50/80 transition-colors">
                                  <td className="p-3.5 px-4 font-bold text-slate-900">{it.name}</td>
                                  <td className="p-3.5 px-4 text-center">
                                    <span className={clsx(
                                      "px-2 py-0.5 rounded text-[10px] font-bold uppercase",
                                      isService ? "bg-indigo-50 text-indigo-700 border border-indigo-200" : "bg-lime-50 text-lime-800 border border-lime-200"
                                    )}>
                                      {isService ? "Labor Service" : "Part Product"}
                                    </span>
                                  </td>
                                  <td className="p-3.5 px-4 text-center text-xs font-mono text-slate-600">{it.qty}</td>
                                  <td className="p-3.5 px-4 text-right text-xs font-mono text-slate-600">₱{it.price.toFixed(2)}</td>
                                  <td className="p-3.5 px-4 text-right font-mono font-bold text-slate-900 text-sm">
                                    ₱{(it.qty * it.price).toFixed(2)}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Financial Charges Settlement Bar */}
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Service Labor Charge</span>
                        <span className="font-mono text-slate-900 font-bold text-sm">₱{job.labor_charge.toFixed(2)}</span>
                      </div>
                      <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                      <div>
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Parts & Materials</span>
                        <span className="font-mono text-slate-900 font-bold text-sm">₱{job.parts_charge.toFixed(2)}</span>
                      </div>
                      {job.invoice_no && (
                        <>
                          <div className="w-px h-6 bg-slate-200 hidden sm:block" />
                          <div>
                            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Invoice Synced</span>
                            <span className="font-mono text-indigo-700 font-bold text-xs">{job.invoice_no}</span>
                          </div>
                        </>
                      )}
                    </div>

                    <div className="text-right border-t sm:border-t-0 border-slate-200 pt-2 sm:pt-0">
                      <span className="text-slate-500 block text-[10px] uppercase font-bold">Total Service Billed</span>
                      <span className="font-mono text-lime-700 font-black text-lg">₱{totalCost.toFixed(2)}</span>
                    </div>
                  </div>

                </div>
              );
            })}
          </div>

        </div>
      </div>
    </div>
  );
}

export default function CustomerRepairHistoryLogsPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6">
        <DetailViewSkeleton hasTable={true} />
      </div>
    }>
      <CustomerRepairHistoryLogsContent />
    </Suspense>
  );
}
