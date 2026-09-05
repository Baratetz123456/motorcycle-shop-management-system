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
  DollarSign, 
  ShoppingCart, 
  Receipt,
  Calendar,
  Layers,
  AlertCircle,
  Sparkles,
  Tag
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { RepairStatus, RepairJob } from "@/app/(dashboard)/repairs/board/page";

interface CartItem {
  id: string;
  name: string;
  price: number;
  qty: number;
  type?: "product" | "service";
}

const STAGES: { status: RepairStatus; label: string; step: number }[] = [
  { status: "PENDING", label: "Pending Inspection", step: 1 },
  { status: "ONGOING", label: "Ongoing Repair", step: 2 },
  { status: "COMPLETED", label: "Completed Service", step: 3 },
  { status: "RELEASED", label: "Released to Customer", step: 4 },
];

export default function JobCardProfilePage() {
  const params = useParams();
  const router = useRouter();
  const jobIdParam = params?.id as string;

  const [job, setJob] = useState<RepairJob | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mechanicsList, setMechanicsList] = useState<{ id: string; name: string }[]>([]);
  const [userRole, setUserRole] = useState<string>("mechanic");

  // Form states
  const [diagnosisNotes, setDiagnosisNotes] = useState("");
  const [assignedMechanic, setAssignedMechanic] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Cart & billing items
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  // Deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const r = localStorage.getItem("user_role") || "mechanic";
      setUserRole(r);
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

    // 1. Check if job is in backend /repairs/jobs
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

    // 2. Fallback to localStorage motoshop_jobs
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
            foundJob = {
              ...match,
              is_paid: isPaid,
            };
          }
        }
      } catch (e) {}
    }

    if (foundJob) {
      // Check for locally cached diagnosis notes
      const savedNote = localStorage.getItem(`motoshop_job_notes_${foundJob.id}`) || 
                         localStorage.getItem(`motoshop_job_notes_${foundJob.jo_number}`);
      if (savedNote) {
        foundJob.mechanic_notes = savedNote;
      }

      setJob(foundJob);
      setDiagnosisNotes(foundJob.mechanic_notes || "");
      setAssignedMechanic(foundJob.mechanic || "Shop Mechanic");

      // Load cart items for this job order if present
      loadCartItems(foundJob.id, foundJob.jo_number);
    } else {
      setError(`Job Card "${jobIdParam}" could not be found.`);
    }

    setLoading(false);
  };

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

  // Save Diagnosis Notes & Mechanic Reassignment
  const handleSaveDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!job) return;
    setIsSaving(true);
    setSaveSuccess(false);

    let finalJobId = job.id;
    try {
      const res = await apiClient.put<any>(`/repairs/jobs/${job.id}`, {
        mechanic_notes: diagnosisNotes,
        mechanic_name: assignedMechanic,
        labor_charge: job.labor_charge || 0,
      });
      if (res.data?.id && res.data.id !== job.id) {
        finalJobId = res.data.id;
      }
    } catch (e) {
      console.warn("Backend update error, saving locally", e);
    }

    // Persist diagnosis note in localStorage
    localStorage.setItem(`motoshop_job_notes_${finalJobId}`, diagnosisNotes);
    localStorage.setItem(`motoshop_job_notes_${job.jo_number}`, diagnosisNotes);

    // Update motoshop_jobs in localStorage
    try {
      const stored = localStorage.getItem("motoshop_jobs");
      if (stored) {
        const parsed: RepairJob[] = JSON.parse(stored);
        const updated = parsed.map((j) =>
          j.id === job.id || j.jo_number === job.jo_number
            ? {
                ...j,
                id: finalJobId,
                mechanic_notes: diagnosisNotes,
                mechanic: assignedMechanic,
              }
            : j
        );
        localStorage.setItem("motoshop_jobs", JSON.stringify(updated));
      }
    } catch (e) {}

    setJob((prev) =>
      prev
        ? {
            ...prev,
            id: finalJobId,
            mechanic_notes: diagnosisNotes,
            mechanic: assignedMechanic,
          }
        : null
    );

    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  // Delete Job Order
  const handleConfirmDelete = async () => {
    if (!job) return;
    if (!canDelete) {
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
      const deletedIds: string[] = JSON.parse(
        localStorage.getItem("motoshop_deleted_job_ids") || "[]"
      );
      if (!deletedIds.includes(targetId)) deletedIds.push(targetId);
      if (joNumber && !deletedIds.includes(joNumber)) deletedIds.push(joNumber);
      localStorage.setItem("motoshop_deleted_job_ids", JSON.stringify(deletedIds));

      const stored = localStorage.getItem("motoshop_jobs");
      if (stored) {
        const parsed: RepairJob[] = JSON.parse(stored);
        const filtered = parsed.filter(
          (j) => j.id !== targetId && j.jo_number !== joNumber
        );
        localStorage.setItem("motoshop_jobs", JSON.stringify(filtered));
      }
    } catch (e) {}

    localStorage.removeItem(`motoshop_job_paid_${targetId}`);
    localStorage.removeItem(`motoshop_cart_${targetId}`);
    localStorage.removeItem(`motoshop_job_notes_${targetId}`);
    if (joNumber) {
      localStorage.removeItem(`motoshop_job_paid_${joNumber}`);
      localStorage.removeItem(`motoshop_cart_${joNumber}`);
      localStorage.removeItem(`motoshop_job_notes_${joNumber}`);
    }

    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    router.push("/repairs/board");
  };

  // Financial calculations
  const laborSubtotal = useMemo(() => {
    const fromCart = cartItems
      .filter((i) => i.type === "service")
      .reduce((acc, i) => acc + i.price * i.qty, 0);
    return fromCart > 0 ? fromCart : (job?.labor_charge || 0);
  }, [cartItems, job]);

  const partsSubtotal = useMemo(() => {
    const fromCart = cartItems
      .filter((i) => i.type === "product" || !i.type)
      .reduce((acc, i) => acc + i.price * i.qty, 0);
    return fromCart > 0 ? fromCart : (job?.parts_charge || 0);
  }, [cartItems, job]);

  const grandTotal = laborSubtotal + partsSubtotal;

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
    <div className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Navigation Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/10">
        <div className="space-y-1">
          <button
            onClick={() => router.push("/repairs/board")}
            className="inline-flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-cyan-400 transition-colors mb-2 group"
          >
            <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            Back to Workshop Job Cards
          </button>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
              <Wrench className="w-7 h-7 text-cyan-400" />
              Job Card Profile: <span className="font-mono text-cyan-400">{job.jo_number}</span>
            </h1>

            {/* Status Badges */}
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
        </div>

        {/* Quick Action Buttons */}
        <div className="flex items-center gap-3 flex-wrap">
          {!isPaid ? (
            <button
              onClick={() => router.push(`/pos?resume_customer=${encodeURIComponent(job.customer)}&model=${encodeURIComponent(job.motorcycle)}`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors shadow-sm"
            >
              <ShoppingCart className="w-4 h-4 text-cyan-400" />
              Open in POS Cart
            </button>
          ) : (
            <button
              onClick={() => router.push(`/sales`)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-colors shadow-sm"
            >
              <Receipt className="w-4 h-4 text-emerald-400" />
              View Sales Invoices
            </button>
          )}

          {canDelete && (
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-red-950/40 hover:bg-red-900/50 text-red-400 border border-red-500/30 text-xs font-bold transition-colors"
              title="Cancel or remove this job card"
            >
              <Trash2 className="w-4 h-4" />
              Delete Job Card
            </button>
          )}
        </div>
      </div>

      {/* Progress Stage Stepper */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
          <Clock className="w-4 h-4 text-cyan-400" />
          Workshop Stage Progression
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STAGES.map((s, idx) => {
            const isCompleted = currentStageIndex > idx;
            const isCurrent = currentStageIndex === idx;
            return (
              <div
                key={s.status}
                className={clsx(
                  "p-4 rounded-2xl border transition-all duration-300 flex items-center gap-3.5",
                  isCurrent && "bg-cyan-950/40 border-cyan-500/60 shadow-[0_0_20px_rgba(6,182,212,0.15)] ring-1 ring-cyan-500/40",
                  isCompleted && "bg-zinc-950/60 border-emerald-500/30 text-zinc-300",
                  !isCurrent && !isCompleted && "bg-zinc-950/40 border-white/5 text-zinc-500 opacity-60"
                )}
              >
                <div
                  className={clsx(
                    "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                    isCurrent && "bg-cyan-500 text-zinc-950 shadow-md shadow-cyan-500/30",
                    isCompleted && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
                    !isCurrent && !isCompleted && "bg-zinc-800 text-zinc-500"
                  )}
                >
                  {isCompleted ? <CheckCircle className="w-4 h-4 text-emerald-400" /> : s.step}
                </div>
                <div>
                  <p className={clsx("text-xs font-bold", isCurrent ? "text-cyan-300" : "text-white")}>
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

      {/* Main Grid: Customer & Bike Info + Diagnosis & Technician Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Customer & Motorcycle Details */}
        <div className="space-y-6">
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 space-y-6 backdrop-blur-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-white/5 pb-3">
              <User className="w-4 h-4 text-cyan-400" /> Customer & Motorcycle
            </h3>

            {/* Customer Info */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Customer Name</span>
              <p className="text-base font-bold text-white flex items-center gap-2">
                <User className="w-4 h-4 text-cyan-400" />
                {job.customer}
              </p>
            </div>

            {/* Motorcycle Info */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Motorcycle Unit</span>
              <p className="text-sm font-bold text-white flex items-center gap-2">
                <Bike className="w-4 h-4 text-cyan-400" />
                {job.motorcycle}
              </p>
            </div>

            {/* Created Timestamp */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Session Created</span>
              <p className="text-xs font-mono text-zinc-300 flex items-center gap-2">
                <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                {new Date(job.created_at).toLocaleString(undefined, {
                  month: "short",
                  day: "numeric",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>

            {/* Current Mechanic */}
            <div className="space-y-1.5">
              <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider">Current Assigned Mechanic</span>
              <p className="text-sm font-bold text-purple-300 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-purple-400" />
                {job.mechanic}
              </p>
            </div>
          </div>

          {/* Quick Financial Card */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 space-y-4 backdrop-blur-md">
            <h3 className="text-sm font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-2 border-b border-white/5 pb-3">
              <DollarSign className="w-4 h-4 text-emerald-400" /> Financial Summary
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Labor Charges:</span>
                <span className="font-mono font-bold text-white">${laborSubtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Replacement Parts:</span>
                <span className="font-mono font-bold text-white">${partsSubtotal.toFixed(2)}</span>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between text-sm font-bold text-white">
                <span className="text-cyan-300">Total Billed:</span>
                <span className="font-mono text-emerald-400 text-base">${grandTotal.toFixed(2)}</span>
              </div>
            </div>

            <div className="pt-2">
              <div className={clsx(
                "p-3 rounded-xl text-xs font-semibold flex items-center justify-between border",
                isPaid 
                  ? "bg-emerald-950/40 text-emerald-300 border-emerald-500/30"
                  : "bg-amber-950/40 text-amber-300 border-amber-500/30"
              )}>
                <span>Payment Status:</span>
                <span className="font-bold">{isPaid ? "PAID & SETTLED" : "UNPAID CART"}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Diagnosis & Notes Editor (Span 2) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-cyan-400" />
                  Technician Diagnosis & Service Notes
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Record vehicle symptoms, diagnostic discoveries, service recommendations, and reassign technicians.
                </p>
              </div>
            </div>

            {saveSuccess && (
              <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center gap-2.5 text-xs text-emerald-300 font-semibold animate-in fade-in">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                Diagnosis notes and mechanic assignment successfully saved!
              </div>
            )}

            <form onSubmit={handleSaveDetails} className="space-y-5">
              <div>
                <label className="block text-zinc-300 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  Diagnosis & Inspection Notes
                </label>
                <textarea
                  rows={6}
                  placeholder="Document mechanic findings, test drive results, replaced gaskets, torque specifications, or maintenance advice for customer..."
                  value={diagnosisNotes}
                  onChange={(e) => setDiagnosisNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-4 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder:text-zinc-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-300 text-xs font-bold mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                    Assigned Mechanic
                  </label>
                  <select
                    value={assignedMechanic}
                    onChange={(e) => setAssignedMechanic(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {mechanicsList.map((m) => (
                      <option key={m.id} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 px-5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    <Save className="w-4 h-4" />
                    {isSaving ? "Saving Notes..." : "Save Diagnosis & Mechanic"}
                  </button>
                </div>
              </div>
            </form>
          </div>

          {/* Itemized Parts & Labor Table */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 backdrop-blur-md">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Layers className="w-5 h-5 text-cyan-400" />
                  Itemized Labor Services & Parts
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Items billed to this job order session via the Point of Sale system.
                </p>
              </div>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() => router.push(`/pos?resume_customer=${encodeURIComponent(job.customer)}&model=${encodeURIComponent(job.motorcycle)}`)}
                  className="px-3.5 py-1.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <ShoppingCart className="w-3.5 h-3.5" />
                  Add Items in POS
                </button>
              )}
            </div>

            {cartItems.length === 0 ? (
              <div className="text-center py-10 border border-dashed border-white/10 rounded-2xl p-6 space-y-3">
                <ShoppingCart className="w-8 h-8 text-zinc-600 mx-auto" />
                <p className="text-zinc-400 text-xs font-medium">
                  No parts or labor services have been added to this job card yet.
                </p>
                {!isPaid && (
                  <button
                    onClick={() => router.push(`/pos?resume_customer=${encodeURIComponent(job.customer)}&model=${encodeURIComponent(job.motorcycle)}`)}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-bold underline underline-offset-4"
                  >
                    Select this job order in Point of Sale to add parts and services &rarr;
                  </button>
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 font-semibold border-b border-white/10">
                    <tr>
                      <th className="p-3">Item Type</th>
                      <th className="p-3">Description</th>
                      <th className="p-3 text-right">Price</th>
                      <th className="p-3 text-center">Qty</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-medium">
                    {cartItems.map((item, idx) => (
                      <tr key={idx} className="hover:bg-white/[0.02]">
                        <td className="p-3">
                          <span className={clsx(
                            "px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider",
                            item.type === "service" 
                              ? "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                              : "bg-cyan-500/10 text-cyan-400 border border-cyan-500/20"
                          )}>
                            {item.type === "service" ? "Labor / Service" : "Part / Product"}
                          </span>
                        </td>
                        <td className="p-3 text-white font-semibold">{item.name}</td>
                        <td className="p-3 text-right font-mono text-zinc-300">${item.price.toFixed(2)}</td>
                        <td className="p-3 text-center font-mono text-zinc-300">{item.qty}</td>
                        <td className="p-3 text-right font-mono font-bold text-white">${(item.price * item.qty).toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
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
              <strong>Warning:</strong> This will delete all diagnosis records, remove the customer's active repair cart from POS, and clear the workshop card.
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
