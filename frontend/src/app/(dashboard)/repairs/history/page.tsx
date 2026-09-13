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
          
          releasedBoardJobs.forEach((bJob) => {
            const custName = bJob.customer_name || bJob.customer;
            if (!custName) return;

            const existingIdx = baseList.findIndex(
              (c) => c.customer_name.toLowerCase().trim() === custName.toLowerCase().trim()
            );

            const jobFormatted = {
              job_id: bJob.id || `job-${bJob.jo_number}`,
              jo_number: bJob.jo_number || "JO-RECENT",
              date_repaired: bJob.released_at || bJob.created_at || new Date().toISOString(),
              status: "RELEASED" as const,
              mechanic_name: bJob.mechanic_name || bJob.mechanic || "Assigned Technician",
              mechanic_notes: bJob.diagnosis || "Service completed and unit released to customer.",
              labor_charge: Number(bJob.labor_charge || 0),
              parts_charge: Number(bJob.parts_charge || 0),
              total_billed: Number((bJob.labor_charge || 0) + (bJob.parts_charge || 0))
            };

            if (existingIdx >= 0) {
              const customerRecord = baseList[existingIdx];
              const alreadyHasJob = customerRecord.past_jobs.some(
                (pj) => pj.jo_number === bJob.jo_number || pj.job_id === bJob.id
              );
              if (!alreadyHasJob) {
                customerRecord.past_jobs.unshift(jobFormatted);
                customerRecord.total_repair_sessions += 1;
                customerRecord.last_service_date = jobFormatted.date_repaired;
                customerRecord.active_status = "INACTIVE";
              }
            } else {
              baseList.push({
                customer_id: `cust-board-${bJob.id || Date.now()}`,
                customer_name: custName,
                contact_number: bJob.customer_phone || bJob.contact || "N/A",
                motorcycle_model: bJob.motorcycle_name || bJob.motorcycle || "Motorcycle Unit",
                total_repair_sessions: 1,
                last_service_date: jobFormatted.date_repaired,
                active_status: "INACTIVE",
                past_jobs: [jobFormatted]
              });
            }
          });
        }
      }
    } catch (e) {
      console.error("Error merging released jobs into customer history:", e);
    }

    if (baseList.length === 0) {
      baseList = [
        {
          customer_id: "cust-1",
          customer_name: "Carlos Mendoza",
          contact_number: "0917-555-0192",
          motorcycle_model: "Yamaha NMAX 155",
          total_repair_sessions: 3,
          last_service_date: "2026-03-28",
          active_status: "ACTIVE_REPAIR",
          past_jobs: [
            {
              job_id: "job-001",
              jo_number: "JO-2026-001",
              date_repaired: "2026-03-28",
              status: "ONGOING",
              mechanic_name: "Mike Smith",
              mechanic_notes: "Diagnosed high-speed clutch shudder. Replaced clutch spring and sliders.",
              labor_charge: 350.0,
              parts_charge: 1250.0,
              items_used: [
                { name: "OEM Clutch Bell Assembly", qty: 1, price: 950.0 },
                { name: "Yamalube 4T 10W-40 Synthetic", qty: 1, price: 300.0 }
              ]
            },
            {
              job_id: "job-002",
              jo_number: "JO-2026-004",
              date_repaired: "2026-02-14",
              status: "RELEASED",
              mechanic_name: "Mike Smith",
              labor_charge: 200.0,
              parts_charge: 450.0,
              items_used: [
                { name: "Brembo Front Brake Pads", qty: 1, price: 450.0 }
              ]
            }
          ]
        },
        {
          customer_id: "cust-2",
          customer_name: "Dante Alighieri",
          contact_number: "0922-888-4100",
          motorcycle_model: "Honda Click 125i",
          total_repair_sessions: 1,
          last_service_date: "2026-03-22",
          active_status: "INACTIVE",
          past_jobs: [
            {
              job_id: "job-003",
              jo_number: "JO-2026-002",
              date_repaired: "2026-03-22",
              status: "RELEASED",
              mechanic_name: "Alex Johnson",
              mechanic_notes: "Periodic maintenance and oil flush.",
              labor_charge: 150.0,
              parts_charge: 380.0,
              items_used: [
                { name: "Motul Scooter Power LE 5W-40", qty: 1, price: 380.0 }
              ]
            }
          ]
        },
        {
          customer_id: "cust-3",
          customer_name: "Elena Rostova",
          contact_number: "0918-777-3312",
          motorcycle_model: "Kawasaki Ninja 400",
          total_repair_sessions: 2,
          last_service_date: "2026-03-10",
          active_status: "INACTIVE",
          past_jobs: [
            {
              job_id: "job-004",
              jo_number: "JO-2026-003",
              date_repaired: "2026-03-10",
              status: "RELEASED",
              mechanic_name: "Alex Johnson",
              labor_charge: 400.0,
              parts_charge: 850.0
            }
          ]
        }
      ];
    }

    setHistories(baseList);
  };

  // Filter histories based on search, active status tab, and service date range
  const filteredHistories = histories.filter((item) => {
    const matchesSearch = 
      item.customer_name.toLowerCase().includes(search.toLowerCase()) ||
      item.motorcycle_model.toLowerCase().includes(search.toLowerCase()) ||
      item.contact_number.includes(search) ||
      item.past_jobs.some((j) => j.jo_number.toLowerCase().includes(search.toLowerCase()));

    if (!matchesSearch) return false;

    if (filterTab === "ACTIVE" && item.active_status !== "ACTIVE_REPAIR") {
      return false;
    }
    if (filterTab === "PAST" && item.active_status === "ACTIVE_REPAIR") {
      return false;
    }

    // Service Date Range Filter check
    if (startDate || endDate) {
      const serviceTime = new Date(item.last_service_date).getTime();
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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-zinc-950 text-zinc-100 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-zinc-100 flex items-center gap-3">
            <History className="w-7 h-7 sm:w-8 sm:h-8 text-emerald-400" />
            <span>Customer Records</span>
          </h1>
          <p className="text-zinc-400 mt-1 text-xs sm:text-sm">
            Past repairs, parts used, and bikes linked to returning customers.
          </p>
        </div>
      </div>

      {/* Desktop Filter & Search Bar (Unified Dark Zinc Theme) */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-none shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar overscroll-x-contain pb-1 sm:pb-0">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 shrink-0">
            <Filter className="w-4 h-4 text-zinc-500 shrink-0" />
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs shrink-0">
              {(["ALL", "ACTIVE", "PAST"] as const).map((tab) => {
                const isSelected = filterTab === tab;
                const label = tab === "ALL" ? `All (${histories.length})` : tab === "ACTIVE" ? "On Bench" : "Completed";
                const Icon = tab === "ACTIVE" ? Wrench : tab === "PAST" ? CheckCircle : null;
                return (
                  <button
                    key={tab}
                    onClick={() => setFilterTab(tab)}
                    className={clsx(
                      "px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5 border",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border-transparent"
                    )}
                  >
                    {Icon && <Icon className="w-3.5 h-3.5 shrink-0" />}
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="h-4 w-px bg-zinc-800 hidden sm:block shrink-0" />

          {/* Date Range Filter Controls */}
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800 shrink-0">
            <div className="flex items-center gap-1 shrink-0">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 ml-1.5 mr-0.5 shrink-0" />
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
                      "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap border",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                        : "text-zinc-400 hover:text-white hover:bg-zinc-800/60 border-transparent"
                    )}
                  >
                    {labels[preset]}
                  </button>
                );
              })}
            </div>

            <div className="h-3.5 w-px bg-zinc-800 hidden sm:block shrink-0" />

            {/* Custom Date Inputs */}
            <div className="flex items-center gap-1 text-xs text-zinc-300 shrink-0">
              <input
                type="date"
                value={startDate}
                onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
                title="Filter from service date"
              />
              <span className="text-zinc-500 text-[11px]">to</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
                title="Filter to service date"
              />

              {(startDate || endDate || datePreset !== "ALL") && (
                <button
                  onClick={handleClearDateFilter}
                  className="p-1 hover:bg-zinc-800 rounded-md text-zinc-400 hover:text-rose-400 transition-colors ml-0.5"
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
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search customer, contact, bike..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
          />
        </div>
      </div>

      {/* History Table Container (Unified Dark Zinc Theme) */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-zinc-900 border-0 md:border md:border-zinc-800 rounded-none md:rounded-2xl flex flex-col shadow-none">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Borderless Edge-to-Edge Customer Rows */}
          <div className="block md:hidden px-1 divide-y divide-zinc-800/80 pb-24">
            {filteredHistories.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <Calendar className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <p className="font-semibold text-zinc-300">No customer records match your filter criteria.</p>
                {(startDate || endDate || search || filterTab !== "ALL") && (
                  <button
                    onClick={() => {
                      setSearch("");
                      setFilterTab("ALL");
                      handleClearDateFilter();
                    }}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-none"
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
                    className="py-3.5 px-2 hover:bg-zinc-850 active:bg-zinc-800 transition-colors cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 group-hover:border-emerald-500/50 transition-colors shrink-0">
                          <User className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors text-sm truncate">
                            {record.customer_name}
                          </div>
                          <div className="text-xs text-zinc-400 flex items-center gap-1.5 mt-0.5">
                            <Bike className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                            <span className="truncate font-medium text-zinc-300">{record.motorcycle_model}</span>
                          </div>
                        </div>
                      </div>

                      {isActive ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80 shrink-0">
                          <Wrench className="w-3 h-3" /> On Bench
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700 shrink-0">
                          <CheckCircle className="w-3 h-3 text-zinc-500" /> Ready
                        </span>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-[11px] text-zinc-300">
                          {record.contact_number}
                        </span>
                        <span className="text-zinc-700">•</span>
                        <span className="text-[11px] text-zinc-500">
                          {new Date(record.last_service_date).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 shrink-0">
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
          <table className="hidden md:table w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-950 text-zinc-400 border-b border-zinc-800 sticky top-0 z-10">
              <tr>
                <th className="px-6 py-4 font-bold">Customer</th>
                <th className="px-6 py-4 font-bold">Bike Model</th>
                <th className="px-6 py-4 font-bold">Last Service</th>
                <th className="px-6 py-4 font-bold text-center">Status</th>
                <th className="px-6 py-4 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/40">
              {filteredHistories.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-zinc-500">
                    <Calendar className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                    <p className="font-semibold text-zinc-300">No customer records match your filter criteria.</p>
                    {(startDate || endDate || search || filterTab !== "ALL") && (
                      <button
                        onClick={() => {
                          setSearch("");
                          setFilterTab("ALL");
                          handleClearDateFilter();
                        }}
                        className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500 text-xs font-semibold text-zinc-300 hover:text-white transition-all shadow-none"
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
                      className="hover:bg-zinc-800/40 transition-all cursor-pointer group"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-zinc-800 text-zinc-300 border border-zinc-700 group-hover:border-emerald-500/50 transition-colors">
                            <User className="w-4 h-4" />
                          </div>
                          <span className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
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
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-950/60 text-emerald-400 border border-emerald-800/80">
                            <Wrench className="w-3.5 h-3.5" />
                            Active on Bench
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-400 border border-zinc-700">
                            <CheckCircle className="w-3.5 h-3.5 text-zinc-500" />
                            Ready for Service
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center text-xs text-zinc-500 group-hover:text-emerald-400 transition-colors font-semibold">
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
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 shrink-0">
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

      {/* Mobile Slide-Up Filter Sheet (Unified Dark Zinc Theme) */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Customer Records"
        activeCount={activeFilterCount}
        onReset={handleResetAllFilters}
      >
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-400">Search Records</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search customer, contact, bike..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
            />
          </div>
        </div>

        {/* Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400">Repair Status</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setFilterTab("ALL")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all border",
                filterTab === "ALL"
                  ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              )}
            >
              All Records
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("ACTIVE")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all border",
                filterTab === "ACTIVE"
                  ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              )}
            >
              On Bench
            </button>
            <button
              type="button"
              onClick={() => setFilterTab("PAST")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all border",
                filterTab === "PAST"
                  ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                  : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
              )}
            >
              Completed
            </button>
          </div>
        </div>

        {/* Date Range Presets & Custom */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-400">Service Date Range</label>
          <div className="grid grid-cols-2 gap-2">
            {(["ALL", "TODAY", "WEEK", "MONTH"] as const).map((p) => {
              const labels = { ALL: "All Time", TODAY: "Today", WEEK: "This Week", MONTH: "This Month" };
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectPreset(p)}
                  className={clsx(
                    "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all border",
                    datePreset === p
                      ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                      : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-800"
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
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
              />
            </div>
            <div>
              <label className="text-[11px] text-zinc-500 mb-1 block">To</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
              />
            </div>
          </div>
        </div>
      </MobileFilterSheet>
    </div>
  );
}
