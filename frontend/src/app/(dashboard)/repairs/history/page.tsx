"use client";

import { useEffect, useState } from "react";
import { 
  History, 
  Search, 
  Filter, 
  User, 
  Bike, 
  Calendar, 
  Wrench, 
  CheckCircle, 
  Clock, 
  CarFront, 
  X, 
  Play, 
  Phone,
  ChevronRight,
  ShieldCheck,
  Tag,
  FileText,
  Lock
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { useRouter } from "next/navigation";

export interface CustomerHistoryRecord {
  customer_id: string;
  customer_name: string;
  contact_number: string;
  motorcycle_model: string;
  total_repair_sessions: number;
  last_service_date: string;
  active_status?: "ACTIVE_REPAIR" | "INACTIVE";
  past_jobs: {
    job_id: string;
    jo_number: string;
    date_repaired: string;
    status: "PENDING" | "ONGOING" | "COMPLETED" | "RELEASED";
    mechanic_name: string;
    mechanic_notes?: string;
    labor_charge: number;
    parts_charge: number;
    items_used?: { name: string; qty: number; price: number }[];
  }[];
}

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
        status: "ONGOING",
        mechanic_name: "Alex Rivera",
        mechanic_notes: "Front fork oil replacement and seal inspection.",
        labor_charge: 120.0,
        parts_charge: 40.0,
        items_used: [
          { name: "Synthetic Motor Oil 10W-40", qty: 1, price: 15.99 },
        ],
      },
    ],
  },
  {
    customer_id: "cust-104",
    customer_name: "Alice Kim",
    contact_number: "+1 (555) 999-1122",
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

export default function CustomerRepairHistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<CustomerHistoryRecord[]>(MOCK_CUSTOMER_HISTORIES);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "PAST">("ALL");

  useEffect(() => {
    fetchCustomerHistories();
  }, []);

  const fetchCustomerHistories = async () => {
    let baseList: CustomerHistoryRecord[] = [];
    try {
      const res = await apiClient.get<CustomerHistoryRecord[]>("/repairs/customer-history");
      if (Array.isArray(res.data) && res.data.length > 0) {
        baseList = res.data;
      }
    } catch (e) {
      // Backend error or fallback
    }

    if (baseList.length === 0) {
      const stored = localStorage.getItem("motoshop_customer_histories");
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            baseList = parsed;
          }
        } catch (e) {}
      }
      if (baseList.length === 0) {
        baseList = MOCK_CUSTOMER_HISTORIES;
      }
    }

    // Merge any jobs in motoshop_jobs (especially newly RELEASED ones)
    try {
      const rawJobs = localStorage.getItem("motoshop_jobs");
      if (rawJobs) {
        const boardJobs: any[] = JSON.parse(rawJobs);
        if (Array.isArray(boardJobs)) {
          const releasedBoardJobs = boardJobs.filter((j) => j.status === "RELEASED");
          const activeBoardJobs = boardJobs.filter(
            (j) => j.status === "PENDING" || j.status === "ONGOING" || j.status === "COMPLETED"
          );

          for (const rJob of releasedBoardJobs) {
            const custIdx = baseList.findIndex(
              (c) => c.customer_name?.toLowerCase() === rJob.customer?.toLowerCase()
            );
            const jobEntry = {
              job_id: rJob.id,
              jo_number: rJob.jo_number,
              date_repaired: rJob.created_at || new Date().toISOString(),
              status: "RELEASED" as const,
              mechanic_name: rJob.mechanic || "Mike Smith",
              mechanic_notes: rJob.mechanic_notes || "",
              labor_charge: Number(rJob.labor_charge || 100),
              parts_charge: Number(rJob.parts_charge || 0),
              items_used: []
            };

            if (custIdx >= 0) {
              const cust = baseList[custIdx];
              const pastJobs = Array.isArray(cust.past_jobs) ? cust.past_jobs : [];
              const exists = pastJobs.some((pj) => pj.job_id === rJob.id || pj.jo_number === rJob.jo_number);
              if (!exists) {
                cust.past_jobs = [jobEntry, ...pastJobs];
                cust.total_repair_sessions = cust.past_jobs.length;
                cust.last_service_date = jobEntry.date_repaired;
              } else {
                cust.past_jobs = pastJobs.map((pj) =>
                  pj.job_id === rJob.id || pj.jo_number === rJob.jo_number ? { ...pj, status: "RELEASED" } : pj
                );
              }
              const customerHasActive = activeBoardJobs.some(
                (abj) => abj.customer?.toLowerCase() === cust.customer_name?.toLowerCase()
              );
              cust.active_status = customerHasActive ? "ACTIVE_REPAIR" : "INACTIVE";
            } else {
              baseList.unshift({
                customer_id: `cust-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                customer_name: rJob.customer,
                contact_number: "+1 (555) 234-5678",
                motorcycle_model: rJob.motorcycle,
                total_repair_sessions: 1,
                last_service_date: jobEntry.date_repaired,
                active_status: "INACTIVE",
                past_jobs: [jobEntry]
              });
            }
          }
        }
      }
    } catch (e) {
      console.error("Failed to merge board jobs into customer history", e);
    }

    setHistories([...baseList]);
    localStorage.setItem("motoshop_customer_histories", JSON.stringify(baseList));
  };

  const handleResumeRepair = (customer: CustomerHistoryRecord) => {
    if (customer.active_status === "ACTIVE_REPAIR") return;

    // Update customer local state to ACTIVE_REPAIR to immediately lock button
    setHistories((prev) =>
      prev.map((h) =>
        h.customer_id === customer.customer_id ? { ...h, active_status: "ACTIVE_REPAIR" } : h
      )
    );

    // Navigate to repairs board with pre-filled customer state
    router.push(`/repairs/board?resume_customer=${encodeURIComponent(customer.customer_name)}&model=${encodeURIComponent(customer.motorcycle_model)}`);
  };

  const filteredHistories = histories.filter((h) => {
    const matchesSearch =
      h.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      h.contact_number.toLowerCase().includes(search.toLowerCase()) ||
      h.motorcycle_model.toLowerCase().includes(search.toLowerCase());
    
    if (filterTab === "ACTIVE") return matchesSearch && h.active_status === "ACTIVE_REPAIR";
    if (filterTab === "PAST") return matchesSearch && h.active_status === "INACTIVE";
    return matchesSearch;
  });

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <History className="w-8 h-8 text-cyan-400" />
            Customer Repair History & Resume Queue
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Review previous mechanic notes, itemized parts used, and manage returning customer repair queues.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search Customer, Contact, Model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit mb-6">
        <button
          onClick={() => setFilterTab("ALL")}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
            filterTab === "ALL"
              ? "bg-zinc-800 text-white shadow-md border border-white/10"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <span>All Customer Histories</span>
          <span className="bg-zinc-950 px-2 py-0.5 rounded-full text-[10px] text-zinc-400">
            {histories.length}
          </span>
        </button>

        <button
          onClick={() => setFilterTab("ACTIVE")}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
            filterTab === "ACTIVE"
              ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <Wrench className="w-3.5 h-3.5" />
          <span>Active Repair Sessions</span>
        </button>

        <button
          onClick={() => setFilterTab("PAST")}
          className={clsx(
            "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
            filterTab === "PAST"
              ? "bg-purple-500/20 text-purple-300 shadow-md border border-purple-500/30"
              : "text-zinc-400 hover:text-white"
          )}
        >
          <CheckCircle className="w-3.5 h-3.5" />
          <span>Completed / Past Customers</span>
        </button>
      </div>

      {/* History Table */}
      <div className="flex-1 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer Name</th>
                <th className="px-6 py-4 font-semibold">Contact Info</th>
                <th className="px-6 py-4 font-semibold">Motorcycle Model</th>
                <th className="px-6 py-4 font-semibold text-center">Past Sessions</th>
                <th className="px-6 py-4 font-semibold">Last Service Date</th>
                <th className="px-6 py-4 font-semibold text-center">Current Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistories.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-zinc-500">
                    No customer repair history records match your query.
                  </td>
                </tr>
              ) : (
                filteredHistories.map((record) => {
                  const isActive = record.active_status === "ACTIVE_REPAIR";

                  return (
                    <tr key={record.customer_id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-zinc-100">{record.customer_name}</span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-400 font-mono">
                        {record.contact_number}
                      </td>

                      <td className="px-6 py-4 font-semibold text-zinc-200">
                        {record.motorcycle_model}
                      </td>

                      <td className="px-6 py-4 text-center font-mono">
                        <span className="bg-zinc-800 text-zinc-300 px-2.5 py-1 rounded-md text-xs font-bold border border-white/5">
                          {record.total_repair_sessions} Repairs
                        </span>
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(record.last_service_date).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Wrench className="w-3.5 h-3.5" />
                            Active Inline
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Ready for Service
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => router.push(`/repairs/history/logs?id=${encodeURIComponent(record.customer_id)}`)}
                            className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-600 text-zinc-200 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 shadow-sm"
                            title="Open Full Repair History Logs"
                          >
                            <History className="w-3.5 h-3.5" />
                            View Full Logs
                          </button>

                          {/* Disabled Button if Customer is Already Active Inline */}
                          {isActive ? (
                            <button
                              disabled
                              className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-white/10 text-zinc-500 text-xs font-bold flex items-center gap-1.5 cursor-not-allowed opacity-60"
                              title="This customer is currently active inline for repair"
                            >
                              <Lock className="w-3.5 h-3.5" />
                              Already Inline for Repair
                            </button>
                          ) : (
                            <button
                              onClick={() => handleResumeRepair(record)}
                              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                              title="Put this returning customer inline for a new repair session"
                            >
                              <Play className="w-3.5 h-3.5" />
                              Resume Repair / Put Inline
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
          <div>Showing {filteredHistories.length} customer repair history record(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Accessible by Admin, Manager, and Mechanic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
