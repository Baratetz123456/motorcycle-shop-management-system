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
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-400">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading customer repair history logs...</p>
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold mb-1">Customer Record Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">Could not find repair logs matching the requested customer identifier.</p>
        <button
          onClick={() => router.push("/repairs/history")}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Repair History</span>
        </button>
      </div>
    );
  }

  const isActive = customer.active_status === "ACTIVE_REPAIR";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans p-6 md:p-10 overflow-y-auto">
      {/* Top Action & Navigation Bar */}
      <div className="max-w-5xl w-full mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8 no-print">
        <button
          onClick={() => router.push("/repairs/history")}
          className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Repair History</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={() => window.print()}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-200 transition-colors flex items-center gap-2 text-xs font-bold shadow-md"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>Print Service Record</span>
          </button>

          {isActive ? (
            <button
              disabled
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 text-zinc-500 text-xs font-bold flex items-center gap-2 cursor-not-allowed opacity-60"
            >
              <Lock className="w-4 h-4" />
              <span>Active in Repair</span>
            </button>
          ) : (
            <button
              onClick={() => handleResumeRepair(customer)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Resume Repair</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Profile & Detailed Service Record View */}
      <div className="max-w-5xl w-full mx-auto space-y-6">
        
        {/* Customer Profile Banner Card */}
        <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-bold text-2xl shadow-inner">
                {customer.customer_name.split(" ").map((n) => n[0]).join("")}
              </div>
              <div>
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl md:text-3xl font-black text-white">{customer.customer_name}</h1>
                  {isActive ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      <Wrench className="w-3.5 h-3.5" /> Active in Repair
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                      <CheckCircle className="w-3.5 h-3.5" /> Ready for Service
                    </span>
                  )}
                </div>
                <p className="text-xs text-zinc-400 mt-1 flex items-center gap-3">
                  <span className="flex items-center gap-1 font-mono text-zinc-300">
                    <Bike className="w-3.5 h-3.5 text-cyan-400" />
                    {customer.motorcycle_model}
                  </span>
                  <span className="text-zinc-600">•</span>
                  <span className="flex items-center gap-1 font-mono text-zinc-400">
                    <Phone className="w-3.5 h-3.5 text-zinc-500" />
                    {customer.contact_number}
                  </span>
                </p>
              </div>
            </div>

            <div className="flex sm:items-center gap-6 bg-zinc-950/80 p-4 px-6 rounded-2xl border border-white/5">
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Total Sessions</span>
                <span className="font-mono text-2xl font-black text-cyan-400">{customer.total_repair_sessions}</span>
              </div>
              <div className="w-px h-8 bg-white/10" />
              <div>
                <span className="text-[10px] text-zinc-500 uppercase tracking-wider block font-semibold">Last Serviced</span>
                <span className="font-mono text-xs font-bold text-zinc-200">{new Date(customer.last_service_date).toLocaleDateString()}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-2">
              <History className="w-4 h-4 text-cyan-400" />
              <span>Chronological Service Records ({customer.past_jobs.length} completed logs)</span>
            </span>
            <span className="text-zinc-500 text-[11px] font-mono">Customer ID: {customer.customer_id}</span>
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
                className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-xl space-y-6 relative overflow-hidden"
              >
                {/* Job Order Top Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-cyan-400 font-bold bg-cyan-950/80 px-3 py-1.5 rounded-xl border border-cyan-500/30 text-sm">
                      {job.jo_number}
                    </span>
                    <span className="text-xs text-zinc-400 flex items-center gap-1.5 font-medium">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Repaired on {new Date(job.date_repaired).toLocaleDateString()}
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400">
                      Mechanic: <span className="font-semibold text-purple-300">{job.mechanic_name}</span>
                    </span>
                    <span className={clsx(
                      "px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border",
                      job.status === "COMPLETED" || job.status === "RELEASED"
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                    )}>
                      {job.status}
                    </span>
                  </div>
                </div>

                {/* Mechanic Diagnostic & Inspection Notes */}
                {job.mechanic_notes && (
                  <div className="p-4 bg-zinc-950/80 rounded-2xl border border-white/5 space-y-1.5">
                    <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      Diagnostic Notes & Service Summary
                    </span>
                    <p className="text-xs text-zinc-200 leading-relaxed italic">
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
                    <div className="rounded-2xl border border-white/5 overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="p-3 px-4">Item / Service Description</th>
                            <th className="p-3 px-4 text-center">Type</th>
                            <th className="p-3 px-4 text-center">Qty</th>
                            <th className="p-3 px-4 text-right">Unit Price</th>
                            <th className="p-3 px-4 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-zinc-900/40 font-mono">
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
                              nameLower.includes("adjustment") ||
                              nameLower.includes("change");

                            return (
                              <tr key={i} className="hover:bg-white/[0.02]">
                                <td className="p-3 px-4 font-sans text-zinc-200 font-medium">{it.name}</td>
                                <td className="p-3 px-4 text-center font-sans">
                                  <span className={clsx(
                                    "px-2 py-0.5 rounded text-[10px] font-semibold border",
                                    isService
                                      ? "bg-purple-500/10 text-purple-300 border-purple-500/20"
                                      : "bg-cyan-500/10 text-cyan-300 border-cyan-500/20"
                                  )}>
                                    {isService ? "Service" : "Product"}
                                  </span>
                                </td>
                                <td className="p-3 px-4 text-center text-zinc-400">{it.qty}</td>
                                <td className="p-3 px-4 text-right text-zinc-400">₱{it.price.toFixed(2)}</td>
                                <td className="p-3 px-4 text-right font-bold text-zinc-100">
                                  ₱{(it.price * it.qty).toFixed(2)}
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
                <div className="p-4 bg-zinc-950/80 rounded-2xl border border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                  <div className="flex flex-wrap items-center gap-6">
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Service Labor Charge</span>
                      <span className="font-mono text-cyan-300 font-bold text-sm">₱{job.labor_charge.toFixed(2)}</span>
                    </div>
                    <div className="w-px h-6 bg-white/10 hidden sm:block" />
                    <div>
                      <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Parts & Materials</span>
                      <span className="font-mono text-zinc-200 font-bold text-sm">₱{job.parts_charge.toFixed(2)}</span>
                    </div>
                    {job.invoice_no && (
                      <>
                        <div className="w-px h-6 bg-white/10 hidden sm:block" />
                        <div>
                          <span className="text-zinc-500 block text-[10px] uppercase font-semibold">Invoice Synced</span>
                          <span className="font-mono text-purple-300 font-bold text-xs">{job.invoice_no}</span>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="text-right border-t sm:border-t-0 border-white/5 pt-2 sm:pt-0">
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold">Total Service Billed</span>
                    <span className="font-mono text-emerald-400 font-black text-lg">₱{totalCost.toFixed(2)}</span>
                  </div>
                </div>

              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}

export default function CustomerRepairHistoryLogsPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-400">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading service record...</p>
      </div>
    }>
      <CustomerRepairHistoryLogsContent />
    </Suspense>
  );
}
