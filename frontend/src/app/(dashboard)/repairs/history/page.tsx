"use client";

import { useEffect, useState, useMemo } from "react";
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
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

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

  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    return (
      (search.trim() ? 1 : 0) +
      (filterTab !== "ALL" ? 1 : 0) +
      (datePreset !== "ALL" || startDate || endDate ? 1 : 0)
    );
  }, [search, filterTab, datePreset, startDate, endDate]);

  const handleResetAllFilters = () => {
    setSearch("");
    setFilterTab("ALL");
    handleClearDateFilter();
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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-zinc-950 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <History className="w-8 h-8 text-cyan-400" />
            Customer Records
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Past repairs, parts used, and bikes linked to returning customers.
          </p>
        </div>

        <div className="hidden md:flex items-center gap-3">
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
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 shrink-0">
        {/* Status Tabs */}
        <div className="grid grid-cols-3 gap-1 bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-full sm:w-fit">
          <button
            onClick={() => setFilterTab("ALL")}
            className={clsx(
              "px-2 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center",
              filterTab === "ALL"
                ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <span className="truncate">All ({histories.length})</span>
          </button>

          <button
            onClick={() => setFilterTab("ACTIVE")}
            className={clsx(
              "px-2 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center",
              filterTab === "ACTIVE"
                ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Wrench className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">On Bench</span>
          </button>

          <button
            onClick={() => setFilterTab("PAST")}
            className={clsx(
              "px-2 sm:px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center",
              filterTab === "PAST"
                ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <CheckCircle className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">Completed</span>
          </button>
        </div>

        {/* Date Range Filter Controls (Hidden on Mobile) */}
        <div className="hidden md:flex flex-wrap items-center gap-2 bg-zinc-900/60 p-2 rounded-2xl border border-white/10">
          <div className="overflow-x-auto no-scrollbar overscroll-x-contain -mx-1 px-1 py-0.5">
            <div className="inline-flex items-center gap-1 min-w-max">
              <Calendar className="w-4 h-4 text-cyan-400 ml-1 mr-1 shrink-0" />
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
                      "px-3 py-1.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap shrink-0",
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
            <span className="text-zinc-500">to</span>
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

      {/* History Table Container */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Adaptive Customer Cards */}
          <div className="block md:hidden p-3 space-y-3">
            {filteredHistories.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
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
              </div>
            ) : (
              filteredHistories.map((record) => {
                const isActive = record.active_status === "ACTIVE_REPAIR";

                return (
                  <div
                    key={record.customer_id}
                    onClick={() => router.push(`/repairs/history/logs?id=${encodeURIComponent(record.customer_id)}`)}
                    className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer space-y-3 active:scale-[0.99] group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:border-cyan-500/50 transition-colors shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white group-hover:text-cyan-300 transition-colors text-sm truncate">
                            {record.customer_name}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Bike className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span className="truncate">{record.motorcycle_model}</span>
                          </div>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 shrink-0">
                          <Wrench className="w-3 h-3" /> On Bench
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                          <CheckCircle className="w-3 h-3" /> Ready
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-zinc-300">
                          {record.contact_number}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="text-[11px]">
                          {new Date(record.last_service_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0">
                        <span>Logs</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Full History Table */}
          <table className="hidden md:table w-full text-left text-sm text-zinc-300 whitespace-nowrap">
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
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400 shrink-0">
          <div>Showing {filteredHistories.length} customer record(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Accessible by Admin, Manager, and Mechanic</span>
          </div>
        </div>
      </div>

      {/* Floating Filter FAB (Mobile Only) */}
      <FloatingFilterButton
        onClick={() => setIsMobileFilterOpen(true)}
        activeCount={activeFilterCount}
      />

      {/* Mobile Slide-Up Filter Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Customer Records"
        activeCount={activeFilterCount}
        onReset={handleResetAllFilters}
      >
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Search Records</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search customer, contact, bike..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Repair Status</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                filterTab === "ALL"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ACTIVE")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                filterTab === "ACTIVE"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              On Bench
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("PAST")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                filterTab === "PAST"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Date Range Presets & Custom */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Service Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((p) => {
              const labels = { ALL: "All Time", TODAY: "Today", WEEK: "This Week", MONTH: "This Month" };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={clsx(
                    "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                    datePreset === p
                      ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                      : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
                  )}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:ring-1 focus:ring-cyan-500/50 [color-scheme:dark]"
              />
            </div>
          </div>
        </div>
      </MobileFilterSheet>
    </div>
  );
}
