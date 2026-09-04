"use client";

import { useState, useEffect } from "react";
import { 
  Wrench, 
  User, 
  Bike, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Plus, 
  X, 
  Search, 
  History, 
  FileText, 
  Tag, 
  Play, 
  Trash2, 
  Edit3, 
  ShieldCheck,
  AlertTriangle,
  Activity,
  Lock,
  GripVertical,
  AlertCircle
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { useSearchParams } from "next/navigation";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";

export type RepairStatus = "PENDING" | "ONGOING" | "COMPLETED" | "RELEASED";

export interface RepairJob {
  id: string;
  jo_number: string;
  customer: string;
  motorcycle: string;
  mechanic: string;
  mechanic_id?: string;
  mechanic_notes?: string;
  labor_charge: number;
  parts_charge: number;
  status: RepairStatus;
  is_paid?: boolean;
  created_at: string;
}

interface MotorcycleModelOption {
  id: string;
  brand: string;
  model: string;
  year: number;
}

const DEMO_MECHANICS = [
  { id: "mech-1", name: "Mike Smith" },
  { id: "mech-2", name: "Alex Rivera" },
  { id: "mech-3", name: "Dave Johnson" },
  { id: "mech-4", name: "Sarah Connor" },
];

const INITIAL_MODELS: MotorcycleModelOption[] = [
  { id: "m-1", brand: "Yamaha", model: "Yamaha MT-07 (2023)", year: 2023 },
  { id: "m-2", brand: "Honda", model: "Honda Click 125i (2022)", year: 2022 },
  { id: "m-3", brand: "Kawasaki", model: "Kawasaki Ninja 400 (2023)", year: 2023 },
  { id: "m-4", brand: "Ducati", model: "Ducati Panigale V4 (2023)", year: 2023 },
];

const INITIAL_JOBS: RepairJob[] = [
  {
    id: "jo-1",
    jo_number: "JO-A1B2",
    customer: "John Doe",
    motorcycle: "Yamaha MT-07 (2023)",
    mechanic: "Mike Smith",
    mechanic_id: "mech-1",
    mechanic_notes: "Engine oil change & front brake pad replacement.",
    labor_charge: 0,
    parts_charge: 65.0,
    status: "ONGOING",
    is_paid: false,
    created_at: new Date().toISOString(),
  },
  {
    id: "jo-2",
    jo_number: "JO-C3D4",
    customer: "Jane Roe",
    motorcycle: "Honda Click 125i (2022)",
    mechanic: "Mike Smith",
    mechanic_id: "mech-1",
    mechanic_notes: "CVT belt inspection and cleaning.",
    labor_charge: 0,
    parts_charge: 0,
    status: "PENDING",
    is_paid: false,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: "jo-3",
    jo_number: "JO-E5F6",
    customer: "Bob Lee",
    motorcycle: "Kawasaki Ninja 400 (2023)",
    mechanic: "Alex Rivera",
    mechanic_id: "mech-2",
    mechanic_notes: "Front fork oil replacement and seal inspection.",
    labor_charge: 0,
    parts_charge: 35.0,
    status: "COMPLETED",
    is_paid: true,
    created_at: new Date(Date.now() - 7200000).toISOString(),
  },
];

export default function RepairBoardPage() {
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<RepairJob[]>(INITIAL_JOBS);
  const [modelsCatalog, setModelsCatalog] = useState<MotorcycleModelOption[]>(INITIAL_MODELS);
  
  // Modals & State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editJobModal, setEditJobModal] = useState<RepairJob | null>(null);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<RepairJob | null>(null);
  const [historyModalJob, setHistoryModalJob] = useState<RepairJob | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newCustomer, setNewCustomer] = useState("");
  const [newMotorcycleModel, setNewMotorcycleModel] = useState("Yamaha MT-07 (2023)");
  const [assignedMechanic, setAssignedMechanic] = useState("Mike Smith");

  // Edit Diagnosis & Reassignment form states
  const [editNotes, setEditNotes] = useState("");
  const [editMechanic, setEditMechanic] = useState("");

  // RBAC Role & Drag-and-Drop States
  const [userRole, setUserRole] = useState<string>("mechanic");
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<RepairStatus | null>(null);
  const [alertNotification, setAlertNotification] = useState<{
    type: "warning" | "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const r = localStorage.getItem("user_role") || "mechanic";
      setUserRole(r);
    }
  }, []);

  useEffect(() => {
    if (alertNotification) {
      const t = setTimeout(() => setAlertNotification(null), 5000);
      return () => clearTimeout(t);
    }
  }, [alertNotification]);

  useEffect(() => {
    fetchJobs();
    fetchMotorcycleModels();

    // Check query params if coming from "Resume Repair"
    const resumeCustomer = searchParams.get("resume_customer");
    const resumeModel = searchParams.get("model");
    if (resumeCustomer) {
      setNewCustomer(resumeCustomer);
      if (resumeModel) setNewMotorcycleModel(resumeModel);
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  const fetchJobs = async () => {
    let deletedSet = new Set<string>();
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_job_ids") || "[]");
      deletedSet = new Set(deletedIds);
    } catch (e) {}

    let fetchedList: RepairJob[] = [];
    let fetchSuccess = false;
    try {
      const res = await apiClient.get<any[]>("/repairs/jobs");
      if (Array.isArray(res.data)) {
        fetchSuccess = true;
        if (res.data.length > 0) {
          fetchedList = res.data
            .filter((j) => !deletedSet.has(j.id) && !deletedSet.has(j.jo_number))
            .map((j) => ({
              id: j.id,
              jo_number: j.jo_number,
              customer: j.customer_name || "Customer",
              motorcycle: j.motorcycle_id || "Motorcycle",
              mechanic: j.mechanic_name || "Mike Smith",
              mechanic_id: j.mechanic_id,
              mechanic_notes: j.mechanic_notes || "",
              labor_charge: 0,
              parts_charge: Number(j.parts_charge || 0),
              status: (j.status || "PENDING") as RepairStatus,
              is_paid: Boolean(j.is_paid),
              created_at: j.created_at || new Date().toISOString(),
            }));
        }
      }
    } catch (e) {
      console.error("Failed to fetch jobs from server", e);
    }

    if (fetchSuccess && fetchedList.length > 0) {
      // Merge with any unpersisted offline jobs if present
      const storedJobs = localStorage.getItem("motoshop_jobs");
      let localOnly: RepairJob[] = [];
      if (storedJobs) {
        try {
          const parsed: RepairJob[] = JSON.parse(storedJobs);
          if (Array.isArray(parsed)) {
            const fetchedIds = new Set(fetchedList.map((j) => j.id));
            localOnly = parsed.filter(
              (p) => String(p.id).startsWith("jo-") && !fetchedIds.has(p.id) && !deletedSet.has(p.id) && !deletedSet.has(p.jo_number)
            );
          }
        } catch (e) {
          // ignore
        }
      }
      const combined = [...localOnly, ...fetchedList];
      setJobs(combined);
      syncJobsState(combined);
      return;
    }

    const storedJobs = localStorage.getItem("motoshop_jobs");
    let mergedJobs: RepairJob[] = [];

    if (storedJobs !== null) {
      try {
        const parsed: RepairJob[] = JSON.parse(storedJobs);
        if (Array.isArray(parsed)) {
          mergedJobs = parsed.filter((p) => !deletedSet.has(p.id) && !deletedSet.has(p.jo_number));
        }
      } catch (e) {
        // ignore
      }
    } else {
      mergedJobs = INITIAL_JOBS.filter((j) => !deletedSet.has(j.id));
    }

    setJobs(mergedJobs);
  };

  const fetchMotorcycleModels = async () => {
    try {
      const res = await apiClient.get<MotorcycleModelOption[]>("/repairs/motorcycle-models");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setModelsCatalog(res.data);
      }
    } catch (e) {
      // Use fallback
    }
  };

  const syncJobsState = (updatedList: RepairJob[]) => {
    setJobs(updatedList);
    localStorage.setItem("motoshop_jobs", JSON.stringify(updatedList));

    // Update active POS repair carts list
    const activeCarts = updatedList
      .filter((j) => (j.status === "PENDING" || j.status === "ONGOING") && !j.is_paid)
      .map((j) => ({
        job_id: j.id,
        jo_number: j.jo_number,
        customer_name: j.customer,
        motorcycle_name: j.motorcycle,
        status: j.status,
        is_paid: j.is_paid,
        labor_charge: j.labor_charge,
        parts_charge: j.parts_charge,
        total_amount: j.labor_charge + j.parts_charge,
      }));
    localStorage.setItem("motoshop_active_repairs", JSON.stringify(activeCarts));
  };

  // Synchronize newly released repair job into customer repair history storage
  const syncCustomerRepairHistory = (job: RepairJob) => {
    try {
      const raw = localStorage.getItem("motoshop_customer_histories");
      let histories: any[] = raw ? JSON.parse(raw) : [];

      const custIndex = histories.findIndex(
        (h) => h.customer_name?.toLowerCase() === job.customer?.toLowerCase()
      );

      const pastJobItem = {
        job_id: job.id,
        jo_number: job.jo_number,
        date_repaired: new Date().toISOString(),
        status: "RELEASED" as const,
        mechanic_name: job.mechanic || "Mike Smith",
        mechanic_notes: job.mechanic_notes || "",
        labor_charge: job.labor_charge,
        parts_charge: job.parts_charge,
        items_used: []
      };

      if (custIndex >= 0) {
        const existing = histories[custIndex];
        const existingJobs = Array.isArray(existing.past_jobs) ? existing.past_jobs : [];
        const jobIdx = existingJobs.findIndex((pj: any) => pj.job_id === job.id || pj.jo_number === job.jo_number);
        let updatedPastJobs;
        if (jobIdx >= 0) {
          updatedPastJobs = existingJobs.map((pj: any, idx: number) =>
            idx === jobIdx ? { ...pj, status: "RELEASED" } : pj
          );
        } else {
          updatedPastJobs = [pastJobItem, ...existingJobs];
        }

        histories[custIndex] = {
          ...existing,
          active_status: "INACTIVE",
          total_repair_sessions: updatedPastJobs.length,
          last_service_date: new Date().toISOString(),
          past_jobs: updatedPastJobs
        };
      } else {
        histories.unshift({
          customer_id: `cust-${Date.now()}`,
          customer_name: job.customer,
          contact_number: "+1 (555) 234-5678",
          motorcycle_model: job.motorcycle,
          total_repair_sessions: 1,
          last_service_date: new Date().toISOString(),
          active_status: "INACTIVE",
          past_jobs: [pastJobItem]
        });
      }

      localStorage.setItem("motoshop_customer_histories", JSON.stringify(histories));
    } catch (e) {
      console.error("Failed to sync customer repair history", e);
    }
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, job: RepairJob) => {
    e.dataTransfer.setData("text/plain", job.id);
    e.dataTransfer.effectAllowed = "move";
    setDraggedJobId(job.id);
  };

  const handleDragEnd = () => {
    setDraggedJobId(null);
    setDragOverColumn(null);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: RepairStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumn !== colStatus) {
      setDragOverColumn(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: RepairStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    const jobId = e.dataTransfer.getData("text/plain") || draggedJobId;
    setDraggedJobId(null);
    if (!jobId) return;

    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // If dropped in the same column, do nothing
    if (targetJob.status === newStatus) return;

    const isPaid = Boolean(
      targetJob.is_paid || localStorage.getItem(`motoshop_job_paid_${targetJob.id}`) === "true"
    );

    // Business Rule: Can ONLY set to RELEASED when already paid!
    if (newStatus === "RELEASED" && !isPaid) {
      setAlertNotification({
        type: "warning",
        title: "Payment Required Before Release",
        message: `Job Order ${targetJob.jo_number} (${targetJob.customer}) cannot be released because it is unpaid. Complete payment at the POS checkout before releasing.`
      });
      return;
    }

    try {
      await apiClient.patch(`/repairs/jobs/${jobId}/status`, { status: newStatus });
    } catch (err: any) {
      const detailMsg = err?.response?.data?.detail || "Failed to update job status on server";
      setAlertNotification({
        type: "error",
        title: "Status Update Error",
        message: detailMsg
      });
      return;
    }

    const updated = jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: newStatus,
            is_paid: newStatus === "COMPLETED" ? true : j.is_paid
          }
        : j
    );
    syncJobsState(updated);

    // If successfully moved to RELEASED, sync customer history
    if (newStatus === "RELEASED") {
      syncCustomerRepairHistory(targetJob);
      setAlertNotification({
        type: "success",
        title: "Job Order Released",
        message: `Job Order ${targetJob.jo_number} for ${targetJob.customer} has been released and recorded in Customer Repair History.`
      });
    }
  };

  // Open Edit Diagnosis & Reassignment modal
  const handleOpenEditModal = (job: RepairJob) => {
    setEditJobModal(job);
    setEditNotes(job.mechanic_notes || "");
    setEditMechanic(job.mechanic || "Mike Smith");
  };

  // Save Diagnosis Notes & Mechanic Reassignment
  const handleSaveJobDetails = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editJobModal) return;

    let finalJobId = editJobModal.id;
    try {
      const res = await apiClient.put<any>(`/repairs/jobs/${editJobModal.id}`, {
        mechanic_notes: editNotes,
        mechanic_name: editMechanic,
        labor_charge: 0,
      });
      if (res.data?.id && res.data.id !== editJobModal.id) {
        finalJobId = res.data.id;
      }
    } catch (e) {
      // ignore network error
    }

    // Persist diagnosis note under job specific key
    localStorage.setItem(`motoshop_job_notes_${finalJobId}`, editNotes);

    const updated = jobs.map((j) =>
      j.id === editJobModal.id
        ? {
            ...j,
            id: finalJobId,
            mechanic_notes: editNotes,
            mechanic: editMechanic,
            labor_charge: 0,
          }
        : j
    );
    syncJobsState(updated);
    setEditJobModal(null);
  };

  // Remove / Cancel Job Order
  const handleConfirmRemoveJob = async () => {
    if (!deleteConfirmJob) return;
    const targetId = deleteConfirmJob.id;
    const isPaid = Boolean(
      deleteConfirmJob.is_paid || localStorage.getItem(`motoshop_job_paid_${targetId}`) === "true"
    );
    const isReleased = deleteConfirmJob.status === "RELEASED";

    // Business Rule: Paid job orders cannot be deleted by anyone (synced with sales, invoice, and inventory)
    if (isPaid) {
      setAlertNotification({
        type: "error",
        title: "Deletion Prohibited",
        message: `Cannot delete paid Job Order (${deleteConfirmJob.jo_number}) because it is already synchronized with sales management, invoice, and inventory.`
      });
      setDeleteConfirmJob(null);
      return;
    }

    try {
      await apiClient.delete(`/repairs/jobs/${targetId}`);
    } catch (e: any) {
      const status = e?.response?.status;
      const detailMsg = e?.response?.data?.detail;

      // If forbidden or rejected (e.g. backend blocked paid deletion), notify user and abort
      if (status === 403 || status === 400) {
        setAlertNotification({
          type: "error",
          title: "Deletion Prohibited",
          message: detailMsg || "Cannot delete this job order."
        });
        setDeleteConfirmJob(null);
        return;
      }

      // If 404 or other server error, proceed with local deletion so it doesn't get stuck
      console.warn("Backend job deletion note:", status, detailMsg);
    }

    const updated = jobs.filter((j) => j.id !== targetId);
    syncJobsState(updated);

    // Track deleted IDs so fetchJobs never resurrects them
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_job_ids") || "[]");
      if (!deletedIds.includes(targetId)) {
        deletedIds.push(targetId);
      }
      if (deleteConfirmJob.jo_number && !deletedIds.includes(deleteConfirmJob.jo_number)) {
        deletedIds.push(deleteConfirmJob.jo_number);
      }
      localStorage.setItem("motoshop_deleted_job_ids", JSON.stringify(deletedIds));
    } catch (e) {}

    // Clear paid status & active repair lock for history queue
    localStorage.removeItem(`motoshop_job_paid_${targetId}`);
    localStorage.removeItem(`motoshop_cart_${targetId}`);
    localStorage.removeItem(`motoshop_job_notes_${targetId}`);

    // If it's a released job deleted by admin, also remove it from customer histories
    if (isReleased) {
      try {
        const rawHistories = localStorage.getItem("motoshop_customer_histories");
        if (rawHistories) {
          const parsed = JSON.parse(rawHistories);
          if (Array.isArray(parsed)) {
            const updatedHistories = parsed.map((h: any) => {
              const pastJobs = Array.isArray(h.past_jobs)
                ? h.past_jobs.filter(
                    (pj: any) => pj.job_id !== targetId && pj.jo_number !== deleteConfirmJob.jo_number
                  )
                : [];
              return {
                ...h,
                total_repair_sessions: pastJobs.length,
                past_jobs: pastJobs
              };
            });
            localStorage.setItem("motoshop_customer_histories", JSON.stringify(updatedHistories));
          }
        }
      } catch (e) {}
    }

    setDeleteConfirmJob(null);
    setAlertNotification({
      type: "success",
      title: "Job Order Removed",
      message: `Job Order ${deleteConfirmJob.jo_number} was successfully removed.`
    });
  };

  // Create Job Order
  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer || isSubmitting) return;
    setIsSubmitting(true);

    let createdJob: RepairJob | null = null;

    try {
      const res = await apiClient.post<any>("/repairs/jobs", {
        customer_name: newCustomer,
        motorcycle_id: newMotorcycleModel,
        mechanic_name: assignedMechanic,
        mechanic_notes: "Initial repair session created.",
        labor_charge: 0.0,
        parts_charge: 0.0,
      });

      if (res.data && res.data.id) {
        createdJob = {
          id: res.data.id,
          jo_number: res.data.jo_number,
          customer: res.data.customer_name || newCustomer,
          motorcycle: res.data.motorcycle_id || newMotorcycleModel,
          mechanic: res.data.mechanic_name || assignedMechanic,
          mechanic_id: res.data.mechanic_id,
          mechanic_notes: res.data.mechanic_notes || "Initial repair session created.",
          labor_charge: 0,
          parts_charge: Number(res.data.parts_charge || 0),
          status: (res.data.status || "PENDING") as RepairStatus,
          is_paid: Boolean(res.data.is_paid),
          created_at: res.data.created_at || new Date().toISOString(),
        };
      }
    } catch (e) {
      console.error("Failed to create repair job on server", e);
    } finally {
      setIsSubmitting(false);
    }

    if (!createdJob) {
      const joNum = `JO-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      createdJob = {
        id: `jo-${Date.now()}`,
        jo_number: joNum,
        customer: newCustomer,
        motorcycle: newMotorcycleModel,
        mechanic: assignedMechanic,
        mechanic_notes: "Initial repair session created.",
        labor_charge: 0,
        parts_charge: 0,
        status: "PENDING",
        is_paid: false,
        created_at: new Date().toISOString(),
      };
    }

    syncJobsState([createdJob, ...jobs]);
    setNewCustomer("");
    setIsCreateModalOpen(false);
  };

  const columns: { title: string; status: RepairStatus; color: string; bg: string }[] = [
    { title: "Pending Queue", status: "PENDING", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { title: "Ongoing Repair", status: "ONGOING", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
    { title: "Completed (Ready)", status: "COMPLETED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { title: "Released / Done", status: "RELEASED", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  ];

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col font-sans overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-cyan-400" />
            Active Customer Repair Kanban Board
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Manage real-time repair stages with drag-and-drop, insert diagnosis notes, and synchronize with POS.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAuditOpen(true)}
            className="px-4 py-3 rounded-2xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-md"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Customer Job Order</span>
          </button>
        </div>
      </div>

      {/* Alert Notification Toast / Banner */}
      {alertNotification && (
        <div
          className={clsx(
            "mb-4 px-4 py-3 rounded-2xl border flex items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-200 shadow-xl shrink-0",
            alertNotification.type === "warning" && "bg-amber-500/10 border-amber-500/30 text-amber-300",
            alertNotification.type === "error" && "bg-red-500/10 border-red-500/30 text-red-300",
            alertNotification.type === "success" && "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
          )}
        >
          <div className="flex items-center gap-2.5">
            {alertNotification.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
            {alertNotification.type === "error" && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
            {alertNotification.type === "success" && <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />}
            <div>
              <strong className="font-bold">{alertNotification.title}: </strong>
              <span>{alertNotification.message}</span>
            </div>
          </div>
          <button
            onClick={() => setAlertNotification(null)}
            className="p-1 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Kanban Board Columns Grid */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 overflow-hidden">
        {columns.map((col) => {
          const colJobs = jobs.filter((j) => j.status === col.status);
          const isOver = dragOverColumn === col.status;
          const activeDraggedCard = draggedJobId ? jobs.find((j) => j.id === draggedJobId) : null;
          const isUnpaidAndTargetReleased =
            col.status === "RELEASED" &&
            activeDraggedCard &&
            !(
              activeDraggedCard.is_paid ||
              localStorage.getItem(`motoshop_job_paid_${activeDraggedCard.id}`) === "true"
            );

          return (
            <div
              key={col.status}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={clsx(
                "border rounded-3xl p-5 flex flex-col backdrop-blur-xl overflow-hidden shadow-2xl transition-all duration-200",
                isOver && isUnpaidAndTargetReleased
                  ? "bg-red-950/20 border-red-500/60 ring-2 ring-red-500/40"
                  : isOver
                  ? "bg-cyan-950/20 border-cyan-500/60 ring-2 ring-cyan-500/30"
                  : "bg-zinc-900/40 border-white/10"
              )}
            >
              {/* Column Header */}
              <div className={clsx("p-3.5 rounded-2xl border mb-4 flex items-center justify-between", col.bg)}>
                <div className="flex items-center gap-2">
                  <span className={clsx("font-bold text-sm uppercase tracking-wider", col.color)}>
                    {col.title}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {isOver && isUnpaidAndTargetReleased && (
                    <span className="text-[10px] font-bold text-red-400 uppercase tracking-wider animate-pulse">
                      Unpaid
                    </span>
                  )}
                  <span className="bg-zinc-950 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold text-zinc-300 border border-white/10">
                    {colJobs.length}
                  </span>
                </div>
              </div>

              {/* Job Order Cards Column Body */}
              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                {colJobs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs italic border border-dashed border-white/5 rounded-2xl p-4">
                    No active job orders in this stage.
                  </div>
                ) : (
                  colJobs.map((job) => {
                    const isPaid = Boolean(
                      job.is_paid || localStorage.getItem(`motoshop_job_paid_${job.id}`) === "true"
                    );
                    const isBeingDragged = draggedJobId === job.id;
                    const canDelete = !isPaid;

                    return (
                      <div
                        key={job.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, job)}
                        onDragEnd={handleDragEnd}
                        className={clsx(
                          "bg-zinc-950/80 border rounded-2xl p-5 space-y-3.5 shadow-lg relative group transition-all duration-300 hover:border-cyan-500/40 cursor-grab active:cursor-grabbing",
                          isPaid
                            ? "border-emerald-500/30 shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]"
                            : "border-white/10",
                          isBeingDragged && "opacity-40 border-cyan-400 border-dashed scale-[0.98]"
                        )}
                      >
                        {/* JO Badge & Payment Status Tag */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            {job.jo_number}
                          </span>

                          {isPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 uppercase tracking-wider">
                              <CheckCircle className="w-3 h-3 text-emerald-400" />
                              PAID
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                              Unpaid Cart
                            </span>
                          )}
                        </div>

                        {/* Customer & Motorcycle Info */}
                        <div>
                          <h4 className="text-base font-bold text-white flex items-center gap-2">
                            <User className="w-4 h-4 text-cyan-400 shrink-0" />
                            {job.customer}
                          </h4>
                          <p className="text-xs text-zinc-400 font-medium flex items-center gap-1.5 mt-1">
                            <Bike className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                            {job.motorcycle}
                          </p>
                        </div>

                        {/* Mechanic Diagnosis Notes */}
                        {job.mechanic_notes && (
                          <div className="p-3 bg-zinc-900/80 rounded-xl border border-white/5 space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                              <FileText className="w-3 h-3" /> Diagnosis Notes:
                            </span>
                            <p className="text-xs text-zinc-300 italic line-clamp-2">
                              "{job.mechanic_notes}"
                            </p>
                          </div>
                        )}

                        {/* Assigned Mechanic */}
                        <div className="flex justify-between items-center text-xs pt-2 border-t border-white/5 text-zinc-400">
                          <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            {job.mechanic}
                          </span>
                        </div>

                        {/* Stage Controls & Actions Bar */}
                        <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            {/* Edit Diagnosis & Reassign Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditModal(job);
                              }}
                              className="p-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-cyan-400 border border-white/10 transition-colors text-xs flex items-center gap-1"
                              title="Edit Diagnosis Notes & Reassign Mechanic"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span className="text-[10px] font-semibold">Diagnosis</span>
                            </button>

                            {/* Remove / Cancel Button or Locked Indicator */}
                            {canDelete ? (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteConfirmJob(job);
                                }}
                                className="p-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/20 text-red-400 border border-white/10 transition-colors"
                                title="Remove / Cancel Job Order"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <div
                                className="p-1.5 rounded-lg bg-emerald-950/40 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 cursor-not-allowed select-none"
                                title="Paid job orders cannot be deleted as they are synced with sales, invoices, and inventory"
                              >
                                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-[10px] font-semibold text-emerald-400">Synced</span>
                              </div>
                            )}
                          </div>

                          {/* Draggable Indicator Badge (replaces dropdown) */}
                          <div
                            className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900/80 px-2 py-1 rounded-lg border border-white/5 font-medium select-none cursor-grab"
                            title="Drag this card into another column to change status"
                          >
                            <GripVertical className="w-3 h-3 text-zinc-400" />
                            <span>Drag card</span>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal 1: Create New Job Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 bg-zinc-950/80 flex justify-between items-center">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Plus className="w-5 h-5 text-cyan-400" /> New Customer Repair Session
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Carlos Mendoza"
                  value={newCustomer}
                  onChange={(e) => setNewCustomer(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Motorcycle Profile Model *</label>
                <select
                  value={newMotorcycleModel}
                  onChange={(e) => setNewMotorcycleModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {modelsCatalog.map((m) => (
                    <option key={m.id} value={m.model}>
                      {m.brand} - {m.model} ({m.year})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5">Assigned Mechanic *</label>
                <select
                  value={assignedMechanic}
                  onChange={(e) => setAssignedMechanic(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {DEMO_MECHANICS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-2"
                >
                  {isSubmitting ? <span>Placing...</span> : <span>Place Inline for Repair</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Edit Diagnosis Notes & Reassign Mechanic Modal */}
      {editJobModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 bg-zinc-950/80 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-5 h-5 text-cyan-400" /> Edit Diagnosis Notes & Mechanic
                </h3>
                <p className="text-xs text-cyan-300 font-mono mt-0.5">{editJobModal.customer} ({editJobModal.jo_number})</p>
              </div>
              <button onClick={() => setEditJobModal(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveJobDetails} className="p-6 space-y-4 text-xs">
              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5 flex items-center gap-1 text-cyan-400">
                  <FileText className="w-3.5 h-3.5" /> Mechanic Diagnosis & Service Notes
                </label>
                <textarea
                  rows={4}
                  placeholder="Enter detailed repair diagnosis, symptoms, parts replaced, or service instructions..."
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div>
                <label className="block text-zinc-400 font-semibold mb-1.5 flex items-center gap-1 text-purple-300">
                  <ShieldCheck className="w-3.5 h-3.5" /> Reassign Mechanic
                </label>
                <select
                  value={editMechanic}
                  onChange={(e) => setEditMechanic(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl p-3 text-white text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {DEMO_MECHANICS.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-white/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditJobModal(null)}
                  className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold shadow-lg shadow-cyan-500/20"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Confirm Remove Active Customer / Cancel Job Order Modal */}
      {deleteConfirmJob && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-red-500/30 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-4 text-center">
            <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto border border-red-500/30">
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>

            <div>
              <h3 className="text-xl font-bold text-white">Remove Active Customer Job Order?</h3>
              <p className="text-xs text-zinc-400 mt-1">
                Are you sure you want to remove <strong className="text-white">{deleteConfirmJob.customer}</strong> ({deleteConfirmJob.jo_number}) from the repair board?
              </p>
            </div>

            <p className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20">
              This action will release the active session and remove the customer from the POS active carts selection bar.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmJob(null)}
                className="flex-1 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-xl text-zinc-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveJob}
                className="flex-1 py-3 bg-red-600 hover:bg-red-500 rounded-xl text-white text-xs font-bold transition-all shadow-lg"
              >
                Confirm & Remove Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Audit Drawer */}
      <ContextualAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Repair Board Audit Trail"
        subtitle="Cryptographic audit stream for repair creation, status updates, diagnosis, and commission closures"
        actionPrefix="REPAIR_"
        resourceFilter="/repairs"
      />

    </div>
  );
}
