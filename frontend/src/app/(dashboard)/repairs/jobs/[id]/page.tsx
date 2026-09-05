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
      const res = await apiClient.get<any[]>("/users");
      if (Array.isArray(res.data)) {
        const mechs = res.data
          .filter((u) => u.role === "mechanic")
          .map((u) => ({
            id: u.id,
            name: `${u.first_name} ${u.last_name}`.trim(),
          }));
        if (mechs.length > 0) {
          setMechanicsList(mechs);
          return;
        }
      }
    } catch (e) {
      console.warn("Could not fetch mechanics list", e);
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
      <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-4">
        <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-zinc-400 text-sm font-medium">Loading Job Card details...</p>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-zinc-900/90 border border-white/10 rounded-3xl text-center space-y-6">
        <div className="w-14 h-14 bg-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto border border-red-500/30">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-white">Job Card Not Found</h2>
          <p className="text-sm text-zinc-400">{error || "The requested repair job order does not exist."}</p>
        </div>
        <button
          onClick={() => router.push("/repairs/board")}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-sm transition-colors shadow-lg shadow-cyan-500/20"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Workshop Board
        </button>
      </div>
    );
  }

  const currentStageIndex = STAGES.findIndex((s) => s.status === job.status);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 p-6 lg:p-8 font-sans flex flex-col w-full overflow-y-auto">
      <div className="w-full max-w-7xl mx-auto space-y-8 pb-16 animate-in fade-in duration-300">

        {/* ============ TOP NAVIGATION & ACTION BAR ============ */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <button
            onClick={() => router.push("/repairs/board")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 border border-white/10 px-4 py-2.5 rounded-xl hover:bg-zinc-800 self-start shadow-sm group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Back to Workshop Board</span>
          </button>

          {canDelete && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-950/40 hover:bg-red-900/60 text-red-400 hover:text-red-300 border border-red-500/30 text-xs font-bold transition-all self-start sm:self-auto shadow-md"
              title="Cancel or remove this job card"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Job Card</span>
            </button>
          )}
        </div>

        {/* ============ MAIN HEADER BANNER ============ */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
                <Wrench className="w-8 h-8 text-cyan-400 shrink-0" />
                <span className="font-mono text-cyan-400">{job.jo_number}</span>
              </h1>

              {/* Status Badges (read-only) */}
              <div className="flex items-center gap-2">
                <span className={clsx(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border",
                  job.status === "PENDING" && "bg-amber-500/10 text-amber-400 border-amber-500/30",
                  job.status === "ONGOING" && "bg-blue-500/10 text-blue-400 border-blue-500/30",
                  job.status === "COMPLETED" && "bg-purple-500/10 text-purple-400 border-purple-500/30",
                  job.status === "RELEASED" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                )}>
                  {job.status}
                </span>

                {isPaid ? (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1.5 uppercase tracking-wider">
                    <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                    PAID
                  </span>
                ) : (
                  <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                    Unpaid Cart
                  </span>
                )}
              </div>
            </div>
            <p className="text-zinc-400 text-xs sm:text-sm mt-1.5">
              Workshop Job Order profile • Detailed diagnostics, mechanic notes, and bike service history
            </p>
          </div>
        </div>

        {/* ============ STAGE STEPPER (read-only) ============ */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <Clock className="w-4 h-4 text-cyan-400" />
              Workshop Stage Progression
            </h3>
            <span className="text-[11px] font-medium text-zinc-500 italic">
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
                    isCurrent && "bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40",
                    isCompleted && "bg-zinc-950/60 border-emerald-500/30 text-zinc-300",
                    !isCurrent && !isCompleted && "bg-zinc-950/40 border-white/5 text-zinc-500 opacity-60"
                  )}
                >
                  <div
                    className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                      isCurrent && "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30",
                      isCompleted && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
                      !isCurrent && !isCompleted && "bg-zinc-800 text-zinc-500"
                    )}
                  >
                    {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : s.step}
                  </div>
                  <div className="min-w-0">
                    <p className={clsx("text-xs font-bold truncate", isCurrent ? "text-cyan-300" : "text-white")}>
                      {s.label}
                    </p>
                    <p className="text-[10px] text-zinc-400 font-mono mt-0.5">
                      {isCurrent ? "Current Stage" : isCompleted ? "Completed" : "Upcoming"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* ============ CUSTOMER & BIKE DETAILS ============ */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="border-b border-white/5 pb-4">
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <User className="w-5 h-5 text-cyan-400" />
              Customer &amp; Motorcycle Details
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Service registration, motorcycle specification, and workshop personnel attribution.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-cyan-400" /> Customer
              </span>
              <p className="text-base font-bold text-white truncate" title={job.customer}>
                {job.customer}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">Registered Customer</span>
            </div>

            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Bike className="w-3.5 h-3.5 text-cyan-400" /> Motorcycle
              </span>
              <p className="text-base font-bold text-white truncate" title={job.motorcycle}>
                {job.motorcycle}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">Active Service Unit</span>
            </div>

            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-zinc-400" /> Created Date
              </span>
              <p className="text-sm font-mono text-zinc-200 truncate">
                {new Date(job.created_at).toLocaleString(undefined, {
                  month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit",
                })}
              </p>
              <span className="text-[10px] text-zinc-500 font-mono">Workshop Intake</span>
            </div>

            <div className="bg-zinc-950/60 border border-white/5 rounded-2xl p-4 flex flex-col justify-between space-y-2">
              <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> Assigned Mechanic
              </span>
              <p className="text-base font-bold text-purple-300 truncate" title={job.mechanic}>
                {job.mechanic}
              </p>
              <span className="text-[10px] text-purple-400/70 font-mono">Lead Technician</span>
            </div>
          </div>

          {/* Mechanic Reassignment Bar */}
          <form onSubmit={handleSaveMechanic} className="pt-4 border-t border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 flex-1">
              <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5 whitespace-nowrap">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                Change Assigned Mechanic:
              </label>
              <select
                value={assignedMechanic}
                onChange={(e) => setAssignedMechanic(e.target.value)}
                className="bg-zinc-950 border border-white/10 rounded-xl px-3 py-2 text-white text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 max-w-xs"
              >
                {mechanicsList.map((m) => (
                  <option key={m.id} value={m.name}>{m.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 self-end sm:self-auto">
              {mechanicSaveSuccess && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1 animate-in fade-in">
                  <CheckCircle className="w-3.5 h-3.5" /> Saved!
                </span>
              )}
              <button
                type="submit"
                disabled={isSavingMechanic}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-purple-500/20 flex items-center gap-2 transition-all whitespace-nowrap"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSavingMechanic ? "Saving..." : "Save Mechanic"}</span>
              </button>
            </div>
          </form>
        </div>

        {/* ============ DIAGNOSIS LOG (Add / Edit / Delete) ============ */}
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-cyan-400" />
                Technician Diagnosis Log
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Record observations, repair findings, and service notes. Each entry is timestamped and attributed.
              </p>
            </div>
            <span className="bg-zinc-950 px-3 py-1 rounded-full text-xs font-mono font-bold text-cyan-400 border border-cyan-500/20">
              {diagnosisLog.length} {diagnosisLog.length === 1 ? "Entry" : "Entries"}
            </span>
          </div>

          {/* Add New Entry Form */}
          <div className="space-y-3 bg-zinc-950/60 p-4 sm:p-5 rounded-2xl border border-white/5">
            <label className="text-xs font-bold text-zinc-300 flex items-center gap-1.5">
              <Plus className="w-3.5 h-3.5 text-cyan-400" />
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
                className="w-full bg-zinc-900/90 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder:text-zinc-600 transition-all resize-none"
              />
              <div className="flex items-center justify-between">
                <span className="text-[11px] text-zinc-500 hidden sm:inline">
                  Attributed as <strong className="text-zinc-300">{userName}</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAddDiagnosis}
                  disabled={!newDiagnosisText.trim()}
                  className="ml-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-30 disabled:cursor-not-allowed text-white font-bold text-xs flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Diagnosis Note</span>
                </button>
              </div>
            </div>
          </div>

          {/* Diagnosis Entries List */}
          {diagnosisLog.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl space-y-2">
              <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 text-xs font-medium">No diagnosis notes recorded yet.</p>
              <p className="text-zinc-600 text-[11px]">Use the input above to document motorcycle symptoms and bench findings.</p>
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
                        ? "bg-cyan-950/30 border-cyan-500/40"
                        : "bg-zinc-950/60 border-white/5 hover:border-white/10"
                    )}
                  >
                    {/* Entry Header */}
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-xs">
                        <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-cyan-400" />
                          {entry.author}
                        </span>
                        <span className="text-zinc-600">•</span>
                        <span className="font-mono text-[11px] text-zinc-400">
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
                            className="p-1.5 rounded-lg hover:bg-white/5 text-zinc-400 hover:text-cyan-400 transition-colors"
                            title="Edit this note"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteDiagnosis(entry.id)}
                            className="p-1.5 rounded-lg hover:bg-red-500/10 text-zinc-400 hover:text-red-400 transition-colors"
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
                          className="w-full bg-zinc-950 border border-cyan-500/30 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                          autoFocus
                        />
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            type="button"
                            onClick={() => { setEditingEntryId(null); setEditingText(""); }}
                            className="px-3.5 py-1.5 rounded-lg text-zinc-400 hover:text-white text-xs font-semibold transition-colors"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={() => handleEditDiagnosis(entry.id)}
                            disabled={!editingText.trim()}
                            className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-30 text-white text-xs font-bold transition-colors flex items-center gap-1.5"
                          >
                            <Save className="w-3 h-3" />
                            <span>Save Edit</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <p className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">{entry.text}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ============ PAST CUSTOMER HISTORY (read-only) ============ */}
        {pastHistory.length > 0 && (
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <History className="w-5 h-5 text-amber-400" />
                  Previous Service History
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Past repair records for <strong className="text-zinc-200">{job.customer}</strong> on <strong className="text-zinc-200">{job.motorcycle}</strong>. These records are read-only.
                </p>
              </div>
              <span className="bg-amber-950/40 px-3 py-1 rounded-full text-xs font-mono font-bold text-amber-400 border border-amber-500/20">
                {pastHistory.length} Past {pastHistory.length === 1 ? "Session" : "Sessions"}
              </span>
            </div>

            <div className="space-y-3">
              {pastHistory.map((pj, idx) => (
                <div
                  key={pj.job_id || idx}
                  className="p-5 rounded-2xl bg-zinc-950/40 border border-white/5 space-y-3 opacity-90"
                >
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-xs text-amber-400 bg-amber-950/60 px-2.5 py-1 rounded-lg border border-amber-500/20">
                        {pj.jo_number}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-zinc-800 text-zinc-400 border border-white/5">
                        Past Record
                      </span>
                      <span className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                        pj.status === "RELEASED" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-zinc-800 text-zinc-400 border border-white/5"
                      )}>
                        {pj.status}
                      </span>
                    </div>
                    <span className="text-[11px] font-mono text-zinc-400">
                      {pj.date_repaired ? new Date(pj.date_repaired).toLocaleDateString(undefined, {
                        month: "short", day: "numeric", year: "numeric"
                      }) : "—"}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      Technician: {pj.mechanic_name}
                    </span>
                  </div>

                  {pj.mechanic_notes && (
                    <div className="p-3.5 bg-zinc-900/60 rounded-xl border border-white/5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1 mb-1">
                        <FileText className="w-3 h-3" /> Historical Diagnosis Notes
                      </span>
                      <p className="text-xs text-zinc-300 italic line-clamp-3">"{pj.mechanic_notes}"</p>
                    </div>
                  )}

                  {pj.items_used && pj.items_used.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {pj.items_used.map((item, iIdx) => (
                        <span key={iIdx} className="px-2.5 py-1 rounded-lg text-[10px] font-medium bg-zinc-900 text-zinc-300 border border-white/5">
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
        <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 backdrop-blur-md space-y-6">
          <div className="flex items-center justify-between border-b border-white/5 pb-4">
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <Layers className="w-5 h-5 text-cyan-400" />
                Parts &amp; Services Applied
              </h3>
              <p className="text-xs text-zinc-400 mt-0.5">
                Items and labor services logged to this motorcycle session.
              </p>
            </div>
            <span className="bg-zinc-950 px-3 py-1 rounded-full text-xs font-mono font-bold text-zinc-300 border border-white/10">
              {cartItems.length} {cartItems.length === 1 ? "Item" : "Items"}
            </span>
          </div>

          {cartItems.length === 0 ? (
            <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl space-y-2">
              <Layers className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-zinc-400 text-xs font-medium">
                No parts or labor services have been added to this job card yet.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-2xl border border-white/5">
              <table className="w-full text-left text-xs">
                <thead className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-white/10">
                  <tr>
                    <th className="p-3.5 w-28">Type</th>
                    <th className="p-3.5">Description</th>
                    <th className="p-3.5 text-center w-24">Quantity</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium bg-zinc-950/40">
                  {cartItems.map((item, idx) => (
                    <tr key={idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider inline-block",
                          item.type === "service"
                            ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                            : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                        )}>
                          {item.type === "service" ? "Service" : "Part"}
                        </span>
                      </td>
                      <td className="p-3.5 text-white font-semibold">{item.name}</td>
                      <td className="p-3.5 text-center font-mono text-zinc-200 font-bold">{item.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* ============ DELETE CONFIRMATION MODAL ============ */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-5 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-bold text-white">Delete Job Card?</h3>
              <p className="text-xs text-zinc-400">
                Are you sure you want to permanently remove <strong className="text-white">{job.customer}</strong> ({job.jo_number}) from the workshop system?
              </p>
            </div>

            {deleteError && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                {deleteError}
              </div>
            )}

            <p className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-left">
              <strong>Warning:</strong> This will delete all diagnosis records, remove the customer&apos;s active repair cart, and clear the workshop card.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 disabled:opacity-50 rounded-xl text-white text-xs font-bold transition-all shadow-lg shadow-red-600/20"
              >
                {isDeleting ? "Deleting..." : "Confirm & Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
