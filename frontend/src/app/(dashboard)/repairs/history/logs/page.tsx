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

const MOCK_CUSTOMER_HISTORIES: CustomerHistoryRecord[] = [
  {
    customer_id: "cust-101",
    customer_name: "John Doe",
    contact_number: "+1 (555) 234-5678",
    motorcycle_model: "Yamaha MT-07 (2023)",
    total_repair_sessions: 3,
    last_service_date: new Date(Date.now() - 2 * 86400000).toISOString(),
    active_status: "ACTIVE_REPAIR",
    past_jobs: [
      {
        job_id: "j-1",
        jo_number: "JO-A1B2",
        date_repaired: new Date(Date.now() - 2 * 86400000).toISOString(),
        status: "PENDING",
        mechanic_name: "Mike Smith",
        mechanic_notes: "Engine oil change & front brake pad replacement. Clearance checked.",
        labor_charge: 150.0,
        parts_charge: 65.0,
        items_used: [
          { name: "Synthetic Motor Oil 10W-40", qty: 1, price: 15.99 },
          { name: "Front Brake Pads", qty: 1, price: 34.00 },
        ],
      },
      {
        job_id: "j-10",
        jo_number: "JO-X901",
        date_repaired: new Date(Date.now() - 45 * 86400000).toISOString(),
        status: "RELEASED",
        mechanic_name: "Dave Johnson",
        mechanic_notes: "Chain tension adjustment & lubrication.",
        labor_charge: 90.0,
        parts_charge: 30.0,
        items_used: [
          { name: "Chain Lube Spray", qty: 1, price: 12.00 },
        ],
      },
    ],
  },
  {
    customer_id: "cust-102",
    customer_name: "Jane Roe",
    contact_number: "+1 (555) 876-5432",
    motorcycle_model: "Honda Click 125i (2022)",
    total_repair_sessions: 2,
    last_service_date: new Date(Date.now() - 15 * 86400000).toISOString(),
    active_status: "INACTIVE",
    past_jobs: [
      {
        job_id: "j-2",
        jo_number: "JO-C3D4",
        date_repaired: new Date(Date.now() - 15 * 86400000).toISOString(),
        status: "RELEASED",
        mechanic_name: "Mike Smith",
        mechanic_notes: "CVT belt cleaning & air filter replacement.",
        labor_charge: 80.0,
        parts_charge: 25.0,
        items_used: [
          { name: "Premium Oil Filter", qty: 1, price: 8.50 },
        ],
      },
    ],
  },
  {
    customer_id: "cust-103",
    customer_name: "Bob Lee",
    contact_number: "+1 (555) 432-1098",
    motorcycle_model: "Kawasaki Ninja 400 (2023)",
    total_repair_sessions: 4,
    last_service_date: new Date(Date.now() - 1 * 86400000).toISOString(),
    active_status: "ACTIVE_REPAIR",
    past_jobs: [
      {
        job_id: "j-3",
        jo_number: "JO-E5F6",
        date_repaired: new Date(Date.now() - 1 * 86400000).toISOString(),
        status: "COMPLETED",
        mechanic_name: "Alex Rivera",
        mechanic_notes: "Front fork oil replacement and seal inspection.",
        labor_charge: 120.0,
        parts_charge: 35.0,
        items_used: [
          { name: "Front Fork Oil (Seal Inspected)", qty: 1, price: 35.00 },
        ],
      },
    ],
  },
  {
    customer_id: "cust-104",
    customer_name: "Carlos Mendoza",
    contact_number: "+1 (555) 321-7654",
    motorcycle_model: "Ducati Panigale V4 (2023)",
    total_repair_sessions: 5,
    last_service_date: new Date(Date.now() - 12 * 86400000).toISOString(),
    active_status: "INACTIVE",
    past_jobs: [
      {
        job_id: "j-4",
        jo_number: "JO-G7H8",
        date_repaired: new Date(Date.now() - 12 * 86400000).toISOString(),
        status: "COMPLETED",
        mechanic_name: "Mike Smith",
        mechanic_notes: "Desmoservice 12,000km engine overhaul. Valves adjusted.",
        labor_charge: 500.0,
        parts_charge: 350.0,
        items_used: [
          { name: "Iridium Spark Plug", qty: 4, price: 18.25 },
          { name: "Synthetic Motor Oil 10W-40", qty: 4, price: 15.99 },
        ],
      },
    ],
  },
];

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
      matched = MOCK_CUSTOMER_HISTORIES.find((c) => c.customer_id === customerId) || null;
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
          <span>Return to Repair History & Resume Queue</span>
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
          <span>Back to Repair History & Resume Queue</span>
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
              <span>Currently Active Inline</span>
            </button>
          ) : (
            <button
              onClick={() => handleResumeRepair(customer)}
              className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
            >
              <Play className="w-4 h-4" />
              <span>Resume Repair / Put Inline</span>
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
                      <Wrench className="w-3.5 h-3.5" /> Active Inline
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
          {customer.past_jobs.map((job, idx) => {
            const totalCost = job.labor_charge + job.parts_charge;

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
                      Itemized Parts & Supplies Replaced ({job.items_used.length})
                    </span>
                    <div className="rounded-2xl border border-white/5 overflow-hidden">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-zinc-950 text-zinc-400 text-[10px] uppercase tracking-wider">
                          <tr>
                            <th className="p-3 px-4">Component / Supply Description</th>
                            <th className="p-3 px-4 text-center">Qty</th>
                            <th className="p-3 px-4 text-right">Unit Price</th>
                            <th className="p-3 px-4 text-right">Subtotal</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5 bg-zinc-900/40 font-mono">
                          {job.items_used.map((it, i) => (
                            <tr key={i} className="hover:bg-white/[0.02]">
                              <td className="p-3 px-4 font-sans text-zinc-200 font-medium">{it.name}</td>
                              <td className="p-3 px-4 text-center text-zinc-400">{it.qty}</td>
                              <td className="p-3 px-4 text-right text-zinc-400">₱{it.price.toFixed(2)}</td>
                              <td className="p-3 px-4 text-right font-bold text-zinc-100">
                                ₱{(it.price * it.qty).toFixed(2)}
                              </td>
                            </tr>
                          ))}
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
