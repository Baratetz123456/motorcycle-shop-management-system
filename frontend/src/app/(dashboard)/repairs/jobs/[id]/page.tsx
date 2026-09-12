"use client";

import { useEffect, useState, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Wrench, 
  User, 
  Bike, 
  Clock, 
  CheckCircle, 
  FileText, 
  ShieldCheck, 
  Trash2, 
  AlertTriangle, 
  Save, 
  Calendar,
  Layers,
  AlertCircle,
  Plus,
  Edit3,
  X,
  History,
  Tag
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { RepairStatus, RepairJob } from "@/app/(dashboard)/repairs/board/page";
import { ConfirmModal } from "@/components/ui/Modal";
import { DetailViewSkeleton } from "@/components/ui/DetailViewSkeleton";

// --- Diagnosis Log Types ---
interface DiagnosisEntry {
  id: string;
  author: string;
  text: string;
  timestamp: string;
}

// --- Cart Item (no prices) ---
interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type?: "product" | "service";
}

// --- Past Job from Customer History ---
interface PastJobRecord {
  job_id: string;
  jo_number: string;
  date_repaired: string;
  status: string;
  mechanic_name: string;
  mechanic_notes?: string;
  items_used?: { name: string; qty: number; price: number }[];
}

const STAGES: { status: RepairStatus; label: string; step: number }[] = [
  { status: "PENDING", label: "Pending Inspection", step: 1 },
  { status: "ONGOING", label: "Ongoing Repair", step: 2 },
  { status: "COMPLETED", label: "Completed Service", step: 3 },
  { status: "RELEASED", label: "Released to Customer", step: 4 },
];

// --- Helper: generate unique ID ---
function genId() {
  return `diag-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
}

export default function JobCardProfilePage() {
  const params = useParams();
  const router = useRouter();
  const jobIdParam = params?.id as string;

  const [job, setJob] = useState<RepairJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mechanicsList, setMechanicsList] = useState<{ id: string; name: string }[]>([]);
  const [userRole, setUserRole] = useState<string>("mechanic");
  const [userName, setUserName] = useState<string>("Mechanic");

  // Mechanic reassignment
  const [assignedMechanic, setAssignedMechanic] = useState("");
  const [isSavingMechanic, setIsSavingMechanic] = useState(false);
  const [mechanicSaveSuccess, setMechanicSaveSuccess] = useState(false);

  // Diagnosis Log
  const [diagnosisLog, setDiagnosisLog] = useState<DiagnosisEntry[]>([]);
  const [newDiagnosisText, setNewDiagnosisText] = useState("");
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");

  // Cart items (no prices shown)
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Past customer history
  const [pastHistory, setPastHistory] = useState<PastJobRecord[]>([]);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Mobile Tab Navigation State
  const [mobileTab, setMobileTab] = useState<"overview" | "diagnosis" | "parts" | "history">("overview");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const r = localStorage.getItem("user_role") || "mechanic";
      setUserRole(r);
      const name = localStorage.getItem("user_name") || localStorage.getItem("user_email") || "Mechanic";
      setUserName(name);
    }
    fetchMechanics();
    loadJobDetails();
  }, [jobIdParam]);

  const fetchMechanics = async () => {
    try {
      const res = await apiClient.get<any>("/auth/users?page_size=50");
      const userList = Array.isArray(res.data)
        ? res.data
        : (Array.isArray(res.data?.items) ? res.data.items : []);

      if (userList.length > 0) {
        const mechs = userList
          .filter((u: any) => u.role === "mechanic" || u.role === "admin" || u.role === "manager")
          .map((u: any) => ({
            id: u.id,
            name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email,
          }));
        if (mechs.length > 0) {
          setMechanicsList(mechs);
          return;
        }
      }
    } catch (e) {
      // Graceful fallback to default mechanics list on network or offline fallback
    }

    setMechanicsList([
      { id: "mech-1", name: "Mike Smith" },
      { id: "mech-2", name: "Dave Wilson" },
      { id: "mech-3", name: "Alex Johnson" },
    ]);
  };

  const loadJobDetails = async () => {
    setLoading(true);
    setError(null);

    let foundJob: RepairJob | null = null;

    // 1. Check backend
    try {
      const res = await apiClient.get<any[]>("/repairs/jobs");
      if (Array.isArray(res.data)) {
        const raw = res.data.find(
          (j) => j.id === jobIdParam || j.jo_number === jobIdParam
        );
        if (raw) {
          const isPaid = Boolean(
            raw.is_paid ||
            (typeof window !== "undefined" && (
              localStorage.getItem(`motoshop_job_paid_${raw.id}`) === "true" ||
              localStorage.getItem(`motoshop_job_paid_${raw.jo_number}`) === "true"
            ))
          );
          foundJob = {
            id: raw.id,
            jo_number: raw.jo_number,
            customer: raw.customer_name || "Walk-in Customer",
            motorcycle: raw.motorcycle_id || "Motorcycle",
            mechanic: raw.mechanic_name || "Shop Mechanic",
            mechanic_id: raw.mechanic_id || "mech-1",
            mechanic_notes: raw.mechanic_notes || "",
            labor_charge: Number(raw.labor_charge || 0),
            parts_charge: Number(raw.parts_charge || 0),
            status: (raw.status || "PENDING") as RepairStatus,
            is_paid: isPaid,
            created_at: raw.created_at || new Date().toISOString(),
          };
        }
      }
    } catch (e) {
      console.warn("Error fetching jobs from server", e);
    }

    // 2. Fallback to localStorage
    if (!foundJob && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("motoshop_jobs");
        if (stored) {
          const parsed: RepairJob[] = JSON.parse(stored);
          const match = parsed.find(
            (j) => j.id === jobIdParam || j.jo_number === jobIdParam
          );
          if (match) {
            const isPaid = Boolean(
              match.is_paid ||
              localStorage.getItem(`motoshop_job_paid_${match.id}`) === "true" ||
              localStorage.getItem(`motoshop_job_paid_${match.jo_number}`) === "true"
            );
            foundJob = { ...match, is_paid: isPaid };
          }
        }
      } catch (e) {}
    }

    if (foundJob) {
      setJob(foundJob);
      setAssignedMechanic(foundJob.mechanic || "Shop Mechanic");
      loadDiagnosisLog(foundJob.id, foundJob.jo_number, foundJob.mechanic_notes);
      loadCartItems(foundJob.id, foundJob.jo_number);
      loadPastHistory(foundJob.customer, foundJob.motorcycle, foundJob.id);
    } else {
      setError(`Job Card "${jobIdParam}" could not be found.`);
    }

    setLoading(false);
  };

  // --- Diagnosis Log Persistence ---
  const getDiagnosisStorageKey = (id: string) => `motoshop_job_diagnosis_${id}`;

  const loadDiagnosisLog = (id: string, joNumber: string, backendNotes?: string) => {
    if (typeof window === "undefined") return;
    
    const key = getDiagnosisStorageKey(id);
    try {
      const stored = localStorage.getItem(key);
      if (stored) {
        const parsed: DiagnosisEntry[] = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setDiagnosisLog(parsed);
          return;
        }
      }
    } catch (e) {}

    // Migrate from old single-note format if diagnosis log doesn't exist yet
    const legacyNote = localStorage.getItem(`motoshop_job_notes_${id}`) ||
                       localStorage.getItem(`motoshop_job_notes_${joNumber}`) ||
                       backendNotes;
    if (legacyNote && legacyNote.trim()) {
      const migrated: DiagnosisEntry[] = [{
        id: genId(),
        author: "Mechanic",
        text: legacyNote.trim(),
        timestamp: new Date().toISOString(),
      }];
      setDiagnosisLog(migrated);
      localStorage.setItem(key, JSON.stringify(migrated));
    } else {
      setDiagnosisLog([]);
    }
  };

  const persistDiagnosisLog = (entries: DiagnosisEntry[], jobId: string, joNumber: string) => {
    if (typeof window === "undefined") return;
    localStorage.setItem(getDiagnosisStorageKey(jobId), JSON.stringify(entries));

    // Sync latest combined notes to the old single-note key (for Kanban card preview)
    const latestText = entries.length > 0 ? entries[entries.length - 1].text : "";
    localStorage.setItem(`motoshop_job_notes_${jobId}`, latestText);
    localStorage.setItem(`motoshop_job_notes_${joNumber}`, latestText);

    // Also update motoshop_jobs in localStorage for Kanban card preview consistency
    try {
      const stored = localStorage.getItem("motoshop_jobs");
      if (stored) {
        const parsed: RepairJob[] = JSON.parse(stored);
        const updated = parsed.map((j) =>
          j.id === jobId || j.jo_number === joNumber
            ? { ...j, mechanic_notes: latestText }
            : j
        );
        localStorage.setItem("motoshop_jobs", JSON.stringify(updated));
      }
    } catch (e) {}

    // Sync latest to backend via PUT
    syncNotesToBackend(jobId, latestText);
  };

  const syncNotesToBackend = async (jobId: string, notes: string) => {
    try {
      await apiClient.put(`/repairs/jobs/${jobId}`, {
        mechanic_notes: notes,
        mechanic_name: assignedMechanic,
        labor_charge: job?.labor_charge || 0,
      });
    } catch (e) {
      console.warn("Backend sync for diagnosis notes failed", e);
    }
  };

  // --- Diagnosis CRUD ---
  const handleAddDiagnosis = () => {
    if (!newDiagnosisText.trim() || !job) return;
    const entry: DiagnosisEntry = {
      id: genId(),
      author: userName,
      text: newDiagnosisText.trim(),
      timestamp: new Date().toISOString(),
    };
    const updated = [...diagnosisLog, entry];
    setDiagnosisLog(updated);
    setNewDiagnosisText("");
    persistDiagnosisLog(updated, job.id, job.jo_number);
  };

  const handleEditDiagnosis = (entryId: string) => {
    if (!editingText.trim() || !job) return;
    const updated = diagnosisLog.map((e) =>
      e.id === entryId
        ? { ...e, text: editingText.trim(), timestamp: new Date().toISOString() }
        : e
    );
    setDiagnosisLog(updated);
    setEditingEntryId(null);
    setEditingText("");
    persistDiagnosisLog(updated, job.id, job.jo_number);
  };

  const handleDeleteDiagnosis = (entryId: string) => {
    if (!job) return;
    const updated = diagnosisLog.filter((e) => e.id !== entryId);
    setDiagnosisLog(updated);
    persistDiagnosisLog(updated, job.id, job.jo_number);
  };

  // --- Mechanic Reassignment ---
  const handleSaveMechanic = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setIsSavingMechanic(true);
    setMechanicSaveSuccess(false);

    try {
      await apiClient.put(`/repairs/jobs/${job.id}`, {
        mechanic_notes: diagnosisLog.length > 0 ? diagnosisLog[diagnosisLog.length - 1].text : "",
        mechanic_name: assignedMechanic,
        labor_charge: job.labor_charge || 0,
      });
    } catch (e) {
      console.warn("Backend mechanic update failed", e);
    }

    // Update localStorage
    try {
      const stored = localStorage.getItem("motoshop_jobs");
      if (stored) {
        const parsed: RepairJob[] = JSON.parse(stored);
        const updated = parsed.map((j) =>
          j.id === job.id || j.jo_number === job.jo_number
            ? { ...j, mechanic: assignedMechanic }
            : j
        );
        localStorage.setItem("motoshop_jobs", JSON.stringify(updated));
      }
    } catch (e) {}

    setJob((prev) => prev ? { ...prev, mechanic: assignedMechanic } : null);
    setIsSavingMechanic(false);
    setMechanicSaveSuccess(true);
    setTimeout(() => setMechanicSaveSuccess(false), 4000);
  };

  // --- Cart Items (for parts/services display without prices) ---
  const loadCartItems = (id: string, joNumber: string) => {
    if (typeof window === "undefined") return;
    try {
      const stored = localStorage.getItem(`motoshop_cart_${id}`) || 
                     localStorage.getItem(`motoshop_cart_${joNumber}`);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setCartItems(parsed);
          return;
        }
      }
    } catch (e) {}
    setCartItems([]);
  };

  // --- Past Customer History ---
  const loadPastHistory = (customerName: string, motorcycleModel: string, currentJobId: string) => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem("motoshop_customer_histories");
      if (!raw) { setPastHistory([]); return; }
      
      const allHistories = JSON.parse(raw);
      if (!Array.isArray(allHistories)) { setPastHistory([]); return; }

      const matched = allHistories.find(
        (h: any) =>
          h.customer_name?.toLowerCase() === customerName.toLowerCase() &&
          h.motorcycle_model?.toLowerCase() === motorcycleModel.toLowerCase()
      );

      if (matched && Array.isArray(matched.past_jobs)) {
        // Filter out the current job to avoid showing it as "past"
        const filtered = matched.past_jobs.filter(
          (pj: any) => pj.job_id !== currentJobId && pj.jo_number !== currentJobId
        );
        setPastHistory(filtered);
      } else {
        setPastHistory([]);
      }
    } catch (e) {
      setPastHistory([]);
    }
  };

  // --- Computed ---
  const isPaid = useMemo(() => {
    if (!job) return false;
    return Boolean(
      job.is_paid ||
      (typeof window !== "undefined" && (
        localStorage.getItem(`motoshop_job_paid_${job.id}`) === "true" ||
        localStorage.getItem(`motoshop_job_paid_${job.jo_number}`) === "true"
      ))
    );
  }, [job]);

  const canDelete = useMemo(() => {
    if (isPaid) return false;
    if (userRole === "cashier") return false;
    return true;
  }, [isPaid, userRole]);

  // --- Delete Job Order ---
  const handleConfirmDelete = async () => {
    if (!job || !canDelete) {
      setDeleteError("You are not authorized to delete this job order or it is already paid.");
      return;
    }
    setIsDeleting(true);
    setDeleteError(null);

    const targetId = job.id;
    const joNumber = job.jo_number;

    try {
      await apiClient.delete(`/repairs/jobs/${targetId}`);
    } catch (e: any) {
      const status = e?.response?.status;
      const detailMsg = e?.response?.data?.detail;
      if (status === 403 || status === 400) {
        setDeleteError(detailMsg || "Cannot delete this job order.");
        setIsDeleting(false);
        return;
      }
    }

    // Purge local states
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_job_ids") || "[]");
      if (!deletedIds.includes(targetId)) deletedIds.push(targetId);
      if (joNumber && !deletedIds.includes(joNumber)) deletedIds.push(joNumber);
      localStorage.setItem("motoshop_deleted_job_ids", JSON.stringify(deletedIds));

      const stored = localStorage.getItem("motoshop_jobs");
      if (stored) {
        const parsed: RepairJob[] = JSON.parse(stored);
        const filtered = parsed.filter((j) => j.id !== targetId && j.jo_number !== joNumber);
        localStorage.setItem("motoshop_jobs", JSON.stringify(filtered));
      }
    } catch (e) {}

    localStorage.removeItem(`motoshop_job_paid_${targetId}`);
    localStorage.removeItem(`motoshop_cart_${targetId}`);
    localStorage.removeItem(`motoshop_job_notes_${targetId}`);
    localStorage.removeItem(getDiagnosisStorageKey(targetId));
    if (joNumber) {
      localStorage.removeItem(`motoshop_job_paid_${joNumber}`);
      localStorage.removeItem(`motoshop_cart_${joNumber}`);
      localStorage.removeItem(`motoshop_job_notes_${joNumber}`);
    }

    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    router.push("/repairs/board");
  };

  // ========== RENDER ==========

  if (loading) {
    return (
      <div className="p-4 sm:p-6">
        <DetailViewSkeleton hasTable={true} />
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white border border-slate-200 rounded-3xl text-center space-y-6 shadow-sm">
        <div className="w-14 h-14 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto border border-rose-200">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-slate-900">Job Card Not Found</h2>
          <p className="text-sm text-slate-500">{error || "The requested repair job order does not exist."}</p>
        </div>
        <button
          onClick={() => router.push("/repairs/board")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 dark:bg-zinc-900 dark:border dark:border-lime-500/60 dark:text-lime-400 dark:hover:bg-zinc-800 font-bold text-sm transition-colors shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workshop Board
        </button>
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.status === job.status);

  return (
    <div className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-16 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-zinc-100">
      <div className="w-full space-y-8 animate-profile-enter">

        {/* ============ TOP NAVIGATION & ACTION BAR ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push("/repairs/board")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:text-slate-900 dark:hover:text-white transition-colors bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 px-4 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800/60 self-start shadow-xs group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Workshop Board</span>
          </button>

          {canDelete && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/30 hover:bg-rose-100 dark:hover:bg-rose-900/40 text-rose-700 dark:text-rose-400 hover:text-rose-800 border border-rose-200 dark:border-rose-800/50 text-xs font-bold transition-all self-start sm:self-auto shadow-xs"
              title="Cancel or remove this job card"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Job Card</span>
            </button>
          )}
        </div>

        {/* ============ MAIN HEADER BANNER ============ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-200 dark:border-zinc-800">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-zinc-100 tracking-tight flex items-center gap-3">
                <Wrench className="w-8 h-8 text-lime-600 dark:text-lime-400 shrink-0" />
                <span className="font-mono text-lime-700 dark:text-lime-400">{job.jo_number}</span>
              </h1>

              {/* Status Badges (read-only) */}
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  job.status === "PENDING" && "bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border-amber-200 dark:border-amber-800/50",
                  job.status === "ONGOING" && "bg-blue-50 dark:bg-blue-950/30 text-blue-800 dark:text-blue-400 border-blue-200 dark:border-blue-800/50",
                  job.status === "COMPLETED" && "bg-purple-50 dark:bg-purple-950/30 text-purple-800 dark:text-purple-400 border-purple-200 dark:border-purple-800/50",
                  job.status === "RELEASED" && "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800/50"
                )}>
                  {job.status}
                </span>

                {isPaid ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    PAID
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 border border-amber-200 dark:border-amber-800/50 uppercase tracking-wider">
                    Unpaid Cart
                  </span>
                )}
              </div>
            </div>
            <p className="text-slate-500 dark:text-zinc-400 text-xs sm:text-sm mt-1.5">
              Workshop Job Order profile • Detailed diagnostics, mechanic notes, and bike service history
            </p>
          </div>
        </div>

        {/* ============ MOBILE CARD-FREE TABBED CANVAS (< md) ============ */}
        <div className="block md:hidden space-y-5">
          {/* Edge-to-Edge Sticky Tab Navigation Bar */}
          <div className="sticky top-0 z-20 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-md -mx-4 px-4 py-2 border-b border-slate-200 dark:border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar shadow-xs">
            {[
              { id: "overview", label: "Overview", icon: User },
              { id: "diagnosis", label: "Diagnosis", icon: FileText, count: diagnosisLog.length },
              { id: "parts", label: "Parts & Services", icon: Wrench, count: cartItems.length },
              { id: "history", label: "History", icon: History, count: pastHistory.length },
            ].map((tab) => {
              const isActive = mobileTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id as any)}
                  className={clsx(
                    "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0",
                    isActive
                      ? "bg-lime-500 text-zinc-950 dark:bg-zinc-900 dark:border dark:border-lime-500/60 dark:text-lime-400 shadow-xs font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-zinc-100 bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                  {tab.count !== undefined && (
                    <span
                      className={clsx(
                        "px-1.5 py-0.2 rounded-full text-[10px] font-mono",
                        isActive ? "bg-zinc-950 text-lime-400 dark:bg-lime-500 dark:text-zinc-950 font-extrabold" : "bg-slate-200 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300"
                      )}
                    >
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {mobileTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Stage Stepper Banner (Card-free / Edge-to-edge canvas) */}
              <div className="py-2 border-b border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-lime-600" />
                    Stage Progression
                  </span>
                  <span className="font-mono text-[11px] text-lime-700 font-bold">
                    Step {currentStageIndex + 1} of {STAGES.length}
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden border border-slate-300">
                  <div
                    className="bg-lime-500 h-full transition-all duration-300"
                    style={{ width: `${((currentStageIndex + 1) / STAGES.length) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 pt-1">
                  <span>Current Stage:</span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg border border-slate-200">
                    {STAGES[currentStageIndex]?.label || job.status}
                  </span>
                </div>
              </div>

              {/* Edge-to-edge Key-Value List Rows */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                  Customer & Service Details
                </h3>

                {/* Row: Customer */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <User className="w-4 h-4 text-lime-600" />
                    Customer
                  </span>
                  <span className="text-sm font-bold text-slate-900 text-right">{job.customer}</span>
                </div>

                {/* Row: Motorcycle */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Bike className="w-4 h-4 text-lime-600" />
                    Motorcycle Unit
                  </span>
                  <span className="text-sm font-bold text-slate-900 text-right">{job.motorcycle}</span>
                </div>

                {/* Row: Intake Date */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-slate-400" />
                    Intake Date
                  </span>
                  <span className="text-xs font-mono text-slate-700 text-right">
                    {new Date(job.created_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {/* Row: Lead Mechanic */}
                <div className="flex items-center justify-between py-3 border-b border-slate-100">
                  <span className="text-xs text-slate-500 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-purple-600" />
                    Lead Mechanic
                  </span>
                  <span className="text-sm font-bold text-purple-800 text-right">{job.mechanic}</span>
                </div>
              </div>

              {/* Inline Mechanic Reassignment */}
              <div className="pt-2 space-y-3">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-purple-600" />
                  Reassign Mechanic
                </label>
                <form onSubmit={handleSaveMechanic} className="space-y-3">
                  <select
                    value={assignedMechanic}
                    onChange={(e) => setAssignedMechanic(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-3 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-lime-500/50 shadow-xs"
                  >
                    {mechanicsList.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center justify-between">
                    {mechanicSaveSuccess ? (
                      <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Saved successfully!
                      </span>
                    ) : <span />}
                    <button
                      type="submit"
                      disabled={isSavingMechanic}
                      className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors ml-auto shadow-xs"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>{isSavingMechanic ? "Saving..." : "Save Mechanic"}</span>
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* TAB 2: DIAGNOSIS */}
          {mobileTab === "diagnosis" && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Add Note Form */}
              <div className="space-y-2.5 pb-4 border-b border-slate-200">
                <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-lime-600" />
                  Add Diagnosis Note
                </label>
                <textarea
                  rows={3}
                  placeholder="Type an observation, diagnosis finding, or service note..."
                  value={newDiagnosisText}
                  onChange={(e) => setNewDiagnosisText(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-2xl p-3 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-lime-500/50 placeholder:text-slate-400 resize-none shadow-xs"
                />
                <button
                  type="button"
                  onClick={handleAddDiagnosis}
                  disabled={!newDiagnosisText.trim()}
                  className="w-full py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:opacity-30 text-zinc-950 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Submit Diagnosis Note</span>
                </button>
              </div>

              {/* Diagnosis Entries List */}
              {diagnosisLog.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-slate-600 text-xs font-medium">No diagnosis notes recorded yet.</p>
                  <p className="text-slate-400 text-[11px]">Use the input above to document symptoms and findings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {diagnosisLog.map((entry) => {
                    const isEditing = editingEntryId === entry.id;
                    const isOwnEntry = entry.author === userName;
                    return (
                      <div
                        key={entry.id}
                        className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2 text-xs">
                            <span className="font-bold text-lime-800">{entry.author}</span>
                            <span className="text-slate-300">•</span>
                            <span className="font-mono text-[10px] text-slate-500">
                              {new Date(entry.timestamp).toLocaleString(undefined, {
                                month: "short",
                                day: "numeric",
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </span>
                          </div>

                          {isOwnEntry && !isEditing && (
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEntryId(entry.id);
                                  setEditingText(entry.text);
                                }}
                                className="p-1 rounded-lg text-slate-500 hover:text-lime-700"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteDiagnosis(entry.id)}
                                className="p-1 rounded-lg text-slate-500 hover:text-rose-600"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>

                        {isEditing ? (
                          <div className="space-y-2">
                            <textarea
                              rows={3}
                              value={editingText}
                              onChange={(e) => setEditingText(e.target.value)}
                              className="w-full bg-slate-50 border border-lime-300 rounded-xl p-2.5 text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-lime-500/50 resize-none"
                            />
                            <div className="flex items-center justify-end gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingEntryId(null);
                                  setEditingText("");
                                }}
                                className="px-3 py-1.5 text-xs text-slate-500 hover:text-slate-800"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={() => handleEditDiagnosis(entry.id)}
                                disabled={!editingText.trim()}
                                className="px-3.5 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-bold shadow-xs"
                              >
                                Save
                              </button>
                            </div>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                            {entry.text}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: PARTS & SERVICES */}
          {mobileTab === "parts" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-lime-600" />
                  Parts & Services Used
                </span>
                <span className="font-mono text-xs text-slate-500">
                  {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
                </span>
              </div>

              {cartItems.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <Wrench className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-slate-600 text-xs font-medium">No items attached yet.</p>
                  <p className="text-slate-400 text-[11px]">Parts and labor added in the POS checkout will appear here.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {cartItems.map((item, idx) => (
                    <div
                      key={item.id || idx}
                      className="flex items-center justify-between py-3 border-b border-slate-100"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0",
                            item.type === "service"
                              ? "bg-purple-50 text-purple-700 border border-purple-200"
                              : "bg-lime-50 text-lime-800 border border-lime-200"
                          )}
                        >
                          {item.type === "service" ? "Service" : "Part"}
                        </span>
                        <span className="text-xs font-bold text-slate-900 truncate">{item.name}</span>
                      </div>
                      <span className="px-2.5 py-1 rounded-lg bg-slate-100 border border-slate-200 font-mono text-xs font-bold text-slate-700 shrink-0 ml-2">
                        Qty: {item.qty}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 4: HISTORY */}
          {mobileTab === "history" && (
            <div className="space-y-4 animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
                  <History className="w-3.5 h-3.5 text-amber-600" />
                  Prior Service History
                </span>
                <span className="font-mono text-xs text-amber-800 font-bold">
                  {pastHistory.length} {pastHistory.length === 1 ? "Session" : "Sessions"}
                </span>
              </div>

              {pastHistory.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <History className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="text-slate-600 text-xs font-medium">No previous repair history found.</p>
                  <p className="text-slate-400 text-[11px]">This appears to be the customer&apos;s first service session on this motorcycle.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {pastHistory.map((pj, idx) => (
                    <div
                      key={pj.job_id || idx}
                      className="p-3.5 rounded-2xl bg-white border border-slate-200 space-y-2 shadow-xs"
                    >
                      <div className="flex items-center justify-between flex-wrap gap-1">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200">
                            {pj.jo_number}
                          </span>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                            {pj.status}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-slate-500">
                          {pj.date_repaired ? new Date(pj.date_repaired).toLocaleDateString(undefined, {
                            month: "short", day: "numeric", year: "numeric"
                          }) : "—"}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600">
                        <span className="text-purple-800 font-medium">Technician: {pj.mechanic_name}</span>
                      </div>

                      {pj.mechanic_notes && (
                        <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                          <p className="text-xs text-slate-700 italic line-clamp-2">"{pj.mechanic_notes}"</p>
                        </div>
                      )}

                      {pj.items_used && pj.items_used.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {pj.items_used.map((item, iIdx) => (
                            <span key={iIdx} className="px-2 py-0.5 rounded-lg text-[10px] font-medium bg-slate-100 text-slate-700 border border-slate-200">
                              {item.name} ×{item.qty}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ============ DESKTOP CARD-BASED LAYOUT (>= md) ============ */}
        <div className="hidden md:block space-y-8">
          {/* ============ STAGE STEPPER (read-only) ============ */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <Clock className="w-4 h-4 text-lime-600" />
              Workshop Stage Progression
            </h3>
            <span className="text-[11px] font-medium text-slate-400 italic">
              Stage changes are controlled on the Workshop Board via drag &amp; drop
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {STAGES.map((s, idx) => {
              const isCompleted = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;
              return (
                <div
                  key={s.status}
                  className={clsx(
                    "p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5 min-h-[72px]",
                    isCurrent && "bg-lime-50 border-lime-400 shadow-sm ring-1 ring-lime-400/40",
                    isCompleted && "bg-emerald-50 border-emerald-200 text-emerald-900",
                    !isCurrent && !isCompleted && "bg-slate-50 border-slate-200 text-slate-500 opacity-80"
                  )}
                >
                  <div
                    className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                      isCurrent && "bg-lime-500 text-zinc-950 font-bold shadow-xs",
                      isCompleted && "bg-emerald-500 text-white font-bold",
                      !isCurrent && !isCompleted && "bg-slate-200 text-slate-600"
                    )}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4 text-white" /> : s.step}
                  </div>
                  <div className="min-w-0">
                    <p className={clsx("text-xs font-bold truncate", isCurrent ? "text-lime-950" : isCompleted ? "text-emerald-950" : "text-slate-800")}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {isCurrent ? "Current Stage" : isCompleted ? "Completed" : "Upcoming"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ CUSTOMER & BIKE DETAILS ============ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="border-b border-slate-100 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-lime-600" />
              Customer &amp; Motorcycle Details
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Service registration, motorcycle specification, and workshop personnel attribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-lime-600" /> Customer
              </span>
              <p className="text-base font-bold text-slate-900 truncate" title={job.customer}>
                {job.customer}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">Registered Customer</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-lime-600" /> Motorcycle
              </span>
              <p className="text-base font-bold text-slate-900 truncate" title={job.motorcycle}>
                {job.motorcycle}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">Active Service Unit</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-slate-400" /> Created Date
              </span>
              <p className="text-sm font-mono text-slate-800 truncate">
                {new Date(job.created_at).toLocaleString(undefined, {
                  month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <span className="text-[10px] text-slate-400 font-mono">Workshop Intake</span>
            </div>

            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-600" /> Assigned Mechanic
              </span>
              <p className="text-base font-bold text-purple-900 truncate" title={job.mechanic}>
                {job.mechanic}
              </p>
              <span className="text-[10px] text-purple-600 font-mono">Lead Technician</span>
            </div>
          </div>

          {/* Mechanic Reassignment Bar */}
          <form onSubmit={handleSaveMechanic} className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="w-4 h-4 text-purple-600" />
                Change Assigned Mechanic:
              </label>
              <select
                value={assignedMechanic}
                onChange={(e) => setAssignedMechanic(e.target.value)}
                className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 max-w-xs shadow-xs"
              >
                {mechanicsList.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {mechanicSaveSuccess && (
                <span className="text-xs text-emerald-700 font-semibold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-600" /> Saved!
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingMechanic}
                className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:opacity-50 text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors whitespace-nowrap shadow-xs"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingMechanic ? "Saving..." : "Save Mechanic"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ============ DIAGNOSIS LOG (Add / Edit / Delete) ============ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-lime-600" />
                Technician Diagnosis Log
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Record observations, repair findings, and service notes. Each entry is timestamped and attributed.
              </p>
            </div>
            <span className="bg-lime-50 px-3 py-1 rounded-full text-xs font-mono font-bold text-lime-800 border border-lime-200">
              {diagnosisLog.length} {diagnosisLog.length === 1 ? "Entry" : "Entries"}
            </span>
          </div>

          {/* Add New Entry Form */}
          <div className="space-y-3 bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200">
            <label className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-lime-600" />
              Add New Diagnosis or Observation
            </label>
            <div className="space-y-3">
              <textarea
                rows={3}
                placeholder="Type a diagnosis note, observation, customer symptom, or workshop finding... (Press Enter to submit, Shift+Enter for new line)"
                value={newDiagnosisText}
                onChange={(e) => setNewDiagnosisText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleAddDiagnosis();
                  }
                }}
                className="w-full bg-white border border-slate-200 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 placeholder:text-slate-400 transition-all resize-none shadow-xs"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-slate-500 hidden sm:inline">
                  Attributed as <strong className="text-slate-800">{userName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAddDiagnosis}
                  disabled={!newDiagnosisText.trim()}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 disabled:opacity-30 disabled:cursor-not-allowed text-zinc-950 font-bold text-xs flex items-center gap-2 transition-colors shadow-xs"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Diagnosis Note</span>
                </button>
              </div>
            </div>
          </div>

          {/* Diagnosis Entries List */}
          {diagnosisLog.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-slate-600 text-xs font-medium">No diagnosis notes recorded yet.</p>
              <p className="text-slate-400 text-[11px]">Use the input above to document motorcycle symptoms and bench findings.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {diagnosisLog.map((entry) => {
                const isEditing = editingEntryId === entry.id;
                const isOwnEntry = entry.author === userName;

                return (
                  <div
                    key={entry.id}
                    className={clsx(
                      "p-4 sm:p-5 rounded-2xl border transition-all",
                      isEditing
                        ? "bg-lime-50/50 border-lime-400 shadow-sm"
                        : "bg-slate-50/70 border-slate-200 hover:bg-white"
                    )}
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-lime-800 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-lime-600" />
                          {entry.author}
                        </span>
                        <span className="text-slate-300">•</span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {new Date(entry.timestamp).toLocaleString(undefined, {
                            month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                          })}
                        </span>
                      </div>

                      {isOwnEntry && !isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => { setEditingEntryId(entry.id); setEditingText(entry.text); }}
                            className="p-1.5 rounded-lg hover:bg-slate-200/60 text-slate-500 hover:text-lime-700 transition-colors"
                            title="Edit this note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiagnosis(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition-colors"
                            title="Delete this note"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Entry Body */}
                    {isEditing ? (
                      <div className="space-y-3 pt-1">
                        <textarea
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          className="w-full bg-white border border-lime-300 rounded-xl p-3 text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-lime-500/50 resize-none shadow-xs"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setEditingEntryId(null); setEditingText(""); }}
                            className="px-3.5 py-1.5 rounded-lg text-slate-500 hover:text-slate-800 text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditDiagnosis(entry.id)}
                            disabled={!editingText.trim()}
                            className="px-4 py-1.5 rounded-lg bg-lime-500 hover:bg-lime-400 disabled:opacity-30 text-zinc-950 text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Edit</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-slate-800 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============ PAST CUSTOMER HISTORY (read-only) ============ */}
        {pastHistory.length > 0 && (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-600" />
                  Previous Service History
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Past repair records for <strong className="text-slate-800">{job.customer}</strong> on <strong className="text-slate-800">{job.motorcycle}</strong>. These records are read-only.
                </p>
              </div>
              <span className="bg-amber-50 px-3 py-1 rounded-full text-xs font-mono font-bold text-amber-800 border border-amber-200">
                {pastHistory.length} Past {pastHistory.length === 1 ? "Session" : "Sessions"}
              </span>
            </div>

            <div className="space-y-3">
              {pastHistory.map((pj, idx) => (
                <div
                  key={pj.job_id || idx}
                  className="p-5 rounded-2xl bg-slate-50/70 border border-slate-200 space-y-3"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs text-amber-900 bg-amber-50 px-2.5 py-1 rounded-lg border border-amber-200">
                        {pj.jo_number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-600 border border-slate-200">
                        Past Record
                      </span>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        pj.status === "RELEASED" ? "bg-emerald-50 text-emerald-800 border border-emerald-200" : "bg-slate-100 text-slate-600 border border-slate-200"
                      )}>
                        {pj.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500">
                      {pj.date_repaired ? new Date(pj.date_repaired).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric"
                      }) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span className="flex items-center gap-1.5 font-semibold text-purple-800">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-600" />
                      Technician: {pj.mechanic_name}
                    </span>
                  </div>

                  {pj.mechanic_notes && (
                    <div className="p-3.5 bg-white rounded-xl border border-slate-200">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 flex items-center gap-1 mb-1">
                        <FileText className="w-3 h-3 text-amber-600" /> Historical Diagnosis Notes
                      </span>
                      <p className="text-xs text-slate-700 italic line-clamp-3">"{pj.mechanic_notes}"</p>
                    </div>
                  )}

                  {pj.items_used && pj.items_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pj.items_used.map((item, iIdx) => (
                        <span key={iIdx} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-white text-slate-700 border border-slate-200">
                          {item.name} ×{item.qty}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ============ PARTS & SERVICES USED (no prices) ============ */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-5 h-5 text-lime-600" />
                Parts &amp; Services Applied
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Items and labor services logged to this motorcycle session.
              </p>
            </div>
            <span className="bg-slate-100 px-3 py-1 rounded-full text-xs font-mono font-bold text-slate-700 border border-slate-200">
              {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-slate-200 rounded-2xl space-y-2">
              <Layers className="w-8 h-8 text-slate-400 mx-auto" />
              <p className="text-slate-600 text-xs font-medium">
                No parts or labor services have been added to this job card yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 w-28">Type</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-center w-24">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium bg-white">
                  {cartItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/80 transition-colors">
                      <td className="p-3.5">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-block",
                          item.type === "service"
                            ? "bg-purple-50 text-purple-700 border border-purple-200"
                            : "bg-lime-50 text-lime-800 border border-lime-200"
                        )}>
                          {item.type === "service" ? "Service" : "Part"}
                        </span>
                      </td>
                      <td className="p-3.5 text-slate-900 font-semibold">{item.name}</td>
                      <td className="p-3.5 text-center font-mono text-slate-900 font-bold">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      </div>

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleConfirmDelete}
        isLoading={isDeleting}
        confirmVariant="danger"
        title="Delete Job Card?"
        confirmText="Confirm & Delete"
        message={
          <div className="space-y-3">
            <p className="text-slate-700">
              Are you sure you want to permanently remove <strong className="text-slate-900">{job.customer}</strong> ({job.jo_number}) from the workshop system?
            </p>
            {deleteError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl">
                {deleteError}
              </div>
            )}
            <p className="text-xs text-amber-800 bg-amber-50 p-3 rounded-xl border border-amber-200 text-left">
              <strong>Warning:</strong> This will delete all diagnosis records, remove the customer&apos;s active repair cart, and clear the workshop card.
            </p>
          </div>
        }
      />
    </div>
  );
}
