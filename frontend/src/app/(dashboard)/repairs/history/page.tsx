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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-slate-50 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-black text-slate-900 flex items-center gap-3">
            <History className="w-8 h-8 text-lime-600" />
            Customer Records
          </h1>
          <p className="text-slate-500 mt-1 text-sm">
            Past repairs, parts used, and bikes linked to returning customers.
          </p>
        </div>
      </div>

      {/* Desktop Filter & Search Bar */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar overscroll-x-contain pb-1 sm:pb-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-slate-400 shrink-0" />
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs shrink-0">
              {(["ALL", "ACTIVE", "PAST"] as const).map((tab) => {
                const isSelected = filterTab === tab;
                const label = tab === "ALL" ? `All (${histories.length})` : tab === "ACTIVE" ? "On Bench" : "Completed";
                const Icon = tab === "ACTIVE" ? Wrench : tab === "PAST" ? CheckCircle : null;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                      isSelected
                        ? "bg-lime-500 text-zinc-950 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white/60"
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-4 w-px bg-slate-200 hidden sm:block shrink-0" />

          {/* Date Range Filter Controls */}
          <div className="flex items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl border border-slate-200 shrink-0">
            <div className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-lime-600 ml-1.5 mr-0.5 shrink-0" />
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
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap",
                      isSelected
                        ? "bg-lime-500 text-zinc-950 border border-lime-600 shadow-sm font-bold"
                        : "text-slate-600 hover:text-slate-900 hover:bg-white border border-transparent"
                    )}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            <div className="h-3.5 w-px bg-slate-200 hidden sm:block shrink-0" />

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-1 text-xs text-slate-600 shrink-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-lime-500 shadow-sm"
                title="Filter from service date"
              />
              <span className="text-slate-400 text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-lime-500 shadow-sm"
                title="Filter to service date"
              />

              {(startDate || endDate || datePreset !== "ALL") && (
                <button
                  onClick={handleClearDateFilter}
                  className="p-1 hover:bg-slate-200 rounded-md text-slate-400 hover:text-rose-600 transition-colors ml-0.5"
                  title="Clear date filter"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search customer, contact, bike..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 shadow-sm"
          />
        </div>
      </div>

      {/* History Table Container */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-white border-0 md:border md:border-slate-200 rounded-none md:rounded-2xl flex flex-col shadow-none md:shadow-sm">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Borderless Edge-to-Edge Customer Rows */}
          <div className="block md:hidden px-1 divide-y divide-slate-100 pb-24">
            {filteredHistories.length === 0 ? (
              <div className="text-center py-16 text-slate-400">
                <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                <p className="font-semibold text-slate-600">No customer records match your filter criteria.</p>
                {(startDate || endDate || search || filterTab !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterTab("ALL");
                      handleClearDateFilter();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-lime-500 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-sm"
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
                    className="py-3.5 px-2 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-lime-50 text-lime-700 border border-lime-200 group-hover:border-lime-400 transition-colors shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-lime-700 transition-colors text-sm truncate">
                            {record.customer_name}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                            <Bike className="w-3.5 h-3.5 text-lime-600 shrink-0" />
                            <span className="truncate font-medium text-slate-700">{record.motorcycle_model}</span>
                          </div>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-lime-100 text-lime-800 border border-lime-300 shrink-0">
                          <Wrench className="w-3 h-3" /> On Bench
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                          <CheckCircle className="w-3 h-3 text-slate-500" /> Ready
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-slate-700">
                          {record.contact_number}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[11px] text-slate-500">
                          {new Date(record.last_service_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-lime-700 shrink-0">
                        <span>{record.total_repair_sessions || 1} {(record.total_repair_sessions || 1) === 1 ? "Job" : "Jobs"}</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Full History Table */}
          <table className="hidden md:table w-full text-left text-sm text-slate-700 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 font-bold">Bike Model</th>
                <th className="px-6 py-4 font-bold">Last Service</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredHistories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-400">
                    <Calendar className="w-10 h-10 mx-auto text-slate-300 mb-2" />
                    <p className="font-semibold text-slate-600">No customer records match your filter criteria.</p>
                    {(startDate || endDate || search || filterTab !== "ALL") && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilterTab("ALL");
                          handleClearDateFilter();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:border-lime-500 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-all shadow-sm"
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
                      className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-lime-50 text-lime-700 border border-lime-200 group-hover:border-lime-400 transition-colors">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-slate-900 group-hover:text-lime-700 transition-colors">
                            {record.customer_name}
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 font-semibold text-slate-800">
                        {record.motorcycle_model}
                      </td>

                      <td className="px-6 py-4 text-xs text-slate-500">
                        {new Date(record.last_service_date).toLocaleDateString()}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-lime-100 text-lime-800 border border-lime-300">
                            <Wrench className="w-3.5 h-3.5" />
                            Active on Bench
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
                            Ready for Service
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center text-xs text-slate-400 group-hover:text-lime-700 transition-colors font-semibold">
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
        <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between text-xs text-slate-500 shrink-0">
          <div>Showing {filteredHistories.length} customer record(s)</div>
          <div className="flex gap-4 items-center text-slate-400">
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
          <label className="text-xs font-semibold text-slate-700">Search Records</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer, contact, bike..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-lime-500 shadow-sm"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Repair Status</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                filterTab === "ALL"
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-sm border border-lime-600"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
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
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-sm border border-lime-600"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
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
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-sm border border-lime-600"
                  : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Date Range Presets & Custom */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Service Date Range</label>
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
                      ? "bg-lime-500 text-zinc-950 font-bold shadow-sm border border-lime-600"
                      : "bg-white border border-slate-200 text-slate-700 hover:bg-slate-50"
                  )}
                >
                  {labels[p]}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">From</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-500 shadow-sm"
              />
            </div>
            <div>
              <label className="text-[11px] text-slate-500 mb-1 block">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-lime-500 shadow-sm"
              />
            </div>
          </div>
        </div>
      </MobileFilterSheet>
    </div>
  );
}
