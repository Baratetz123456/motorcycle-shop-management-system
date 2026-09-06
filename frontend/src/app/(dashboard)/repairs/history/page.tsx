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
    total_billed?: number;
    invoice_no?: string;
    items_used?: { name: string; qty: number; price: number }[];
  }[];
}

export default function CustomerRepairHistoryPage() {
  const router = useRouter();
  const [histories, setHistories] = useState<CustomerHistoryRecord[]>([]);
  const [search, setSearch] = useState("");
  const [filterTab, setFilterTab] = useState<"ALL" | "ACTIVE" | "PAST">("ALL");

  // Date Range Filter State
  type DatePreset = "ALL" | "TODAY" | "WEEK" | "MONTH" | "CUSTOM";
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [datePreset, setDatePreset] = useState<DatePreset>("ALL");

  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    const today = new Date();
    const formatYMD = (d: Date) => d.toISOString().slice(0, 10);

    if (preset === "ALL") {
      setStartDate("");
      setEndDate("");
    } else if (preset === "TODAY") {
      const todayStr = formatYMD(today);
      setStartDate(todayStr);
      setEndDate(todayStr);
    } else if (preset === "WEEK") {
      const pastWeek = new Date(today);
      pastWeek.setDate(pastWeek.getDate() - 7);
      setStartDate(formatYMD(pastWeek));
      setEndDate(formatYMD(today));
    } else if (preset === "MONTH") {
      const pastMonth = new Date(today);
      pastMonth.setDate(pastMonth.getDate() - 30);
      setStartDate(formatYMD(pastMonth));
      setEndDate(formatYMD(today));
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setDatePreset("CUSTOM");
  };

  const handleClearDateFilter = () => {
    setDatePreset("ALL");
    setStartDate("");
    setEndDate("");
  };

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
    
    if (!matchesSearch) return false;

    if (filterTab === "ACTIVE" && h.active_status !== "ACTIVE_REPAIR") return false;
    if (filterTab === "PAST" && h.active_status !== "INACTIVE") return false;

    // Date range filter against h.last_service_date
    if (startDate || endDate) {
      if (!h.last_service_date) return false;
      const serviceTime = new Date(h.last_service_date).getTime();
      if (isNaN(serviceTime)) return false;

      if (startDate) {
        const start = new Date(`${startDate}T00:00:00`).getTime();
        if (serviceTime < start) return false;
      }
      if (endDate) {
        const end = new Date(`${endDate}T23:59:59.999`).getTime();
        if (serviceTime > end) return false;
      }
    }

    return true;
  });

  return (
    <div className="w-full h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <History className="w-8 h-8 text-cyan-400" />
            Customer Records
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Past repairs, parts used, and bikes linked to returning customers.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search customer, contact, bike..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>
      </div>

      {/* Filters Bar: Status Tabs & Date Range Filter */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        {/* Status Tabs */}
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setFilterTab("ALL")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              filterTab === "ALL"
                ? "bg-zinc-800 text-white shadow-md border border-white/10"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <span>All Records</span>
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
            <span>On Bench</span>
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
            <span>Completed</span>
          </button>
        </div>

        {/* Date Range Filter Controls */}
        <div className="flex flex-wrap items-center gap-2 bg-zinc-900/60 p-2 rounded-2xl border border-white/10">
          <div className="flex items-center gap-1">
            <Calendar className="w-4 h-4 text-cyan-400 ml-1 mr-1" />
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((preset) => {
              const labels = {
                ALL: "All Time",
                TODAY: "Today",
                WEEK: "This Week",
                MONTH: "This Month",
              };
              const isSelected = datePreset === preset;
              return (
                <button
                  key={preset}
                  onClick={() => handleSelectPreset(preset)}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all",
                    isSelected
                      ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 border border-transparent"
                  )}
                >
                  {labels[preset]}
                </button>
              );
            })}
          </div>

          <div className="h-4 w-px bg-white/10 hidden sm:block" />

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-1.5 text-xs text-zinc-400">
            <input
              type="date"
              value={startDate}
              onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
              title="Filter from service date"
            />
            <span className="text-zinc-500 text-[11px]">to</span>
            <input
              type="date"
              value={endDate}
              onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
              className="bg-zinc-950 border border-white/10 rounded-xl px-2.5 py-1.5 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
              title="Filter to service date"
            />

            {(startDate || endDate || datePreset !== "ALL") && (
              <button
                onClick={handleClearDateFilter}
                className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-rose-400 transition-colors ml-0.5"
                title="Clear date filter"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="flex-1 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Customer</th>
                <th className="px-6 py-4 font-semibold">Bike Model</th>
                <th className="px-6 py-4 font-semibold">Last Service</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredHistories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-zinc-500">
                    <Calendar className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                    <p className="font-semibold text-zinc-400">No customer records match your filter criteria.</p>
                    {(startDate || endDate || search || filterTab !== "ALL") && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilterTab("ALL");
                          handleClearDateFilter();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-white/10 hover:border-cyan-500/40 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-sm"
                      >
                        <X className="w-3.5 h-3.5" />
                        <span>Reset All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredHistories.map((record) => {
                  const isActive = record.active_status === "ACTIVE_REPAIR";

                  return (
                    <tr 
                      key={record.customer_id} 
                      onClick={() => router.push(`/repairs/history/logs?id=${encodeURIComponent(record.customer_id)}`)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors">
                            {record.customer_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-semibold text-zinc-200">
                        {record.motorcycle_model}
                      </td>

                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(record.last_service_date).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                            <Wrench className="w-3.5 h-3.5" />
                            Active on Bench
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Ready for Service
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center text-xs text-zinc-500 group-hover:text-cyan-400 transition-colors font-medium">
                          <span className="hidden group-hover:inline mr-1">View Profile</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
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
          <div>Showing {filteredHistories.length} customer record(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Accessible by Admin, Manager, and Mechanic</span>
          </div>
        </div>
      </div>
    </div>
  );
}
