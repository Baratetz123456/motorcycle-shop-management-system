"use client";

import { useState, useEffect, useRef } from "react";
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
  AlertCircle,
  MousePointerClick,
  MoreVertical,
  Filter,
  Check,
  ChevronRight,
  ArrowLeft
} from "lucide-react";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { useSearchParams, useRouter } from "next/navigation";
import { getSystemSettings, SystemSettings } from "@/lib/settings";
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { recordUserAuditLog } from "@/lib/audit";
import { RepairBoardSkeleton } from "@/components/repairs/RepairBoardSkeleton";

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

export default function RepairBoardPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<RepairJob[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [modelsCatalog, setModelsCatalog] = useState<MotorcycleModelOption[]>([]);
  const [mechanicsList, setMechanicsList] = useState<{ id: string; name: string }[]>([]);
  const [settings, setSettings] = useState<SystemSettings>(getSystemSettings);
  
  // Modals & State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editJobModal, setEditJobModal] = useState<RepairJob | null>(null);
  const [deleteConfirmJob, setDeleteConfirmJob] = useState<RepairJob | null>(null);
  const [historyModalJob, setHistoryModalJob] = useState<RepairJob | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newCustomer, setNewCustomer] = useState("");
  const [newMotorcycleModel, setNewMotorcycleModel] = useState("");
  const [assignedMechanic, setAssignedMechanic] = useState("");

  // Edit Diagnosis & Reassignment form states
  const [editNotes, setEditNotes] = useState("");
  const [editMechanic, setEditMechanic] = useState("");

  // RBAC Role & Drag-and-Drop States
  const [userRole, setUserRole] = useState<string>("mechanic");
  const [draggedJobId, setDraggedJobId] = useState<string | null>(null);
  const draggedJobIdRef = useRef<string | null>(null);
  const [isOverTrash, setIsOverTrash] = useState(false);
  const [dragOverColumn, setDragOverColumn] = useState<RepairStatus | null>(null);

  // Mobile Touch Drag-and-Drop & Double-Tap
  const [touchDraggedJob, setTouchDraggedJob] = useState<RepairJob | null>(null);
  const floatingGhostRef = useRef<HTMLDivElement>(null);
  const rafIdRef = useRef<number | null>(null);
  const dragOverColumnRef = useRef<RepairStatus | null>(null);
  const touchHoldTimerRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartPosRef = useRef<{ x: number; y: number } | null>(null);
  const touchDraggedJobRef = useRef<RepairJob | null>(null);
  const lastTapTimeRef = useRef<{ [jobId: string]: number }>({});

  const [alertNotification, setAlertNotification] = useState<{
    type: "warning" | "error" | "success";
    title: string;
    message: string;
  } | null>(null);

  // Mobile View States
  const [mobileSearch, setMobileSearch] = useState("");
  const [activeMobileTab, setActiveMobileTab] = useState<RepairStatus>("PENDING");
  const [selectedMechanic, setSelectedMechanic] = useState("ALL");
  const [selectedPayment, setSelectedPayment] = useState<"ALL" | "PAID" | "UNPAID">("ALL");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [menuOpenJobId, setMenuOpenJobId] = useState<string | null>(null);
  const [statusPickerJob, setStatusPickerJob] = useState<RepairJob | null>(null);
  const [confirmMoveJob, setConfirmMoveJob] = useState<{
    job: RepairJob;
    targetStatus: RepairStatus;
    label: string;
    direction: "forward" | "backward";
  } | null>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuOpenJobId && !(e.target as HTMLElement).closest("[data-job-menu]")) {
        setMenuOpenJobId(null);
      }
    };
    window.addEventListener("click", handleClickOutside);
    return () => window.removeEventListener("click", handleClickOutside);
  }, [menuOpenJobId]);

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
    fetchMechanics();

    // Check query params if coming from "Resume Repair"
    const resumeCustomer = searchParams.get("resume_customer");
    const resumeModel = searchParams.get("model");
    if (resumeCustomer) {
      setNewCustomer(resumeCustomer);
      if (resumeModel) setNewMotorcycleModel(resumeModel);
      setIsCreateModalOpen(true);
    }

    const handleSync = () => {
      fetchJobs();
    };
    const handleSettingsUpdated = () => {
      setSettings(getSystemSettings());
    };
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    window.addEventListener("system_settings_updated", handleSettingsUpdated);
    return () => {
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
      window.removeEventListener("system_settings_updated", handleSettingsUpdated);
    };
  }, [searchParams]);

  const fetchJobs = async () => {
    try {
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
          fetchedList = res.data
            .filter((j) => !deletedSet.has(j.id) && !deletedSet.has(j.jo_number))
            .map((j) => {
              const isPaid = Boolean(
                j.is_paid ||
                (typeof window !== "undefined" && (
                  localStorage.getItem(`motoshop_job_paid_${j.id}`) === "true" ||
                  localStorage.getItem(`motoshop_job_paid_${j.jo_number}`) === "true"
                ))
              );
              return {
                id: j.id,
                jo_number: j.jo_number,
                customer: j.customer_name || "Walk-in Customer",
                motorcycle: j.motorcycle_id || "Motorcycle",
                mechanic: j.mechanic_name || "Shop Mechanic",
                mechanic_id: j.mechanic_id || "mech-1",
                mechanic_notes: j.mechanic_notes || "",
                labor_charge: Number(j.labor_charge || 0),
                parts_charge: Number(j.parts_charge || 0),
                status: (j.status || "PENDING") as RepairStatus,
                is_paid: isPaid,
                created_at: j.created_at || new Date().toISOString(),
              };
            });
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
        mergedJobs = [];
      }

      setJobs(mergedJobs);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMotorcycleModels = async () => {
    try {
      const res = await apiClient.get<MotorcycleModelOption[]>("/repairs/motorcycle-models");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setModelsCatalog(res.data);
        setNewMotorcycleModel((prev) => prev || `${res.data[0].brand} ${res.data[0].model} (${res.data[0].year})`);
      }
    } catch (e) {
      // empty
    }
  };

  const fetchMechanics = async () => {
    try {
      const res = await apiClient.get<any>("/auth/users?page_size=50");
      if (res.data?.items && Array.isArray(res.data.items)) {
        const mechs = res.data.items
          .filter((u: any) => u.role === "mechanic" || u.role === "admin" || u.role === "manager")
          .map((u: any) => ({
            id: u.id,
            name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email
          }));
        if (mechs.length > 0) {
          setMechanicsList(mechs);
          setAssignedMechanic((prev) => prev || mechs[0].name);
        }
      }
    } catch (e) {}
  };

  const syncJobsState = (updatedList: RepairJob[]) => {
    setJobs(updatedList);
    localStorage.setItem("motoshop_jobs", JSON.stringify(updatedList));

    // Update active POS repair carts list (include COMPLETED unreleased jobs ready for cashier checkout)
    const activeCarts = updatedList
      .filter((j) => j.status !== "RELEASED" && !j.is_paid)
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

  // Shared Job Stage Transition Executor (Optimistic & Zero-Lag)
  const executeMoveJob = async (jobId: string, newStatus: RepairStatus) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    // If dropped in the same column, do nothing
    if (targetJob.status === newStatus) return;

    const isPaid = Boolean(
      targetJob.is_paid ||
      (typeof window !== "undefined" && (
        localStorage.getItem(`motoshop_job_paid_${targetJob.id}`) === "true" ||
        localStorage.getItem(`motoshop_job_paid_${targetJob.jo_number}`) === "true"
      ))
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

    const previousJobs = [...jobs];
    const updated = jobs.map((j) =>
      j.id === jobId
        ? {
            ...j,
            status: newStatus,
            is_paid: isPaid,
          }
        : j
    );

    // 1. Optimistic instant local state update
    syncJobsState(updated);

    recordUserAuditLog("REPAIR_STATUS_UPDATED", `/repairs/jobs/${jobId}`, {
      job_id: jobId,
      jo_number: targetJob.jo_number,
      customer: targetJob.customer,
      motorcycle: targetJob.motorcycle,
      old_status: targetJob.status,
      new_status: newStatus,
    });

    // If successfully moved to RELEASED, sync customer history
    if (newStatus === "RELEASED") {
      syncCustomerRepairHistory(targetJob);
      setAlertNotification({
        type: "success",
        title: "Job Order Released",
        message: `Job Order ${targetJob.jo_number} for ${targetJob.customer} has been released and recorded in Customer Repair History.`
      });
    }

    // 2. Asynchronous backend synchronization in the background
    if (!String(jobId).startsWith("jo-")) {
      try {
        await apiClient.patch(`/repairs/jobs/${jobId}/status`, { status: newStatus });
      } catch (err: any) {
        // Rollback state if server request fails
        syncJobsState(previousJobs);
        const detailMsg = err?.response?.data?.detail || "Failed to update job status on server";
        setAlertNotification({
          type: "error",
          title: "Status Update Error",
          message: detailMsg
        });
      }
    }
  };

  // Shared Trash Drop Executor (used by both desktop and mobile drag)
  const executeTrashDrop = (jobId: string) => {
    const targetJob = jobs.find((j) => j.id === jobId);
    if (!targetJob) return;

    const isPaid = Boolean(
      targetJob.is_paid ||
      (typeof window !== "undefined" && (
        localStorage.getItem(`motoshop_job_paid_${targetJob.id}`) === "true" ||
        localStorage.getItem(`motoshop_job_paid_${targetJob.jo_number}`) === "true"
      ))
    );
    if (isPaid) {
      setAlertNotification({
        type: "error",
        title: "Deletion Prohibited",
        message: `Cannot delete paid Job Order (${targetJob.jo_number}) because it is already synchronized with sales, invoice, and inventory.`
      });
      return;
    }
    if (userRole === "cashier") {
      setAlertNotification({
        type: "error",
        title: "Access Denied",
        message: "Cashiers cannot delete job orders. Please contact a manager or mechanic."
      });
      return;
    }
    setDeleteConfirmJob(targetJob);
  };

  // --- Desktop Drag and drop handlers ---
  const handleDragStart = (e: React.DragEvent, job: RepairJob) => {
    e.dataTransfer.setData("text/plain", job.id);
    e.dataTransfer.effectAllowed = "move";
    draggedJobIdRef.current = job.id;

    // Use requestAnimationFrame so browser captures a clean native drag preview before applying opacity-30
    requestAnimationFrame(() => {
      setDraggedJobId(job.id);
    });
  };

  const handleDragEnd = () => {
    draggedJobIdRef.current = null;
    dragOverColumnRef.current = null;
    setDraggedJobId(null);
    setDragOverColumn(null);
    setIsOverTrash(false);
  };

  const handleDragOver = (e: React.DragEvent, colStatus: RepairStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverColumnRef.current !== colStatus) {
      dragOverColumnRef.current = colStatus;
      setDragOverColumn(colStatus);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = async (e: React.DragEvent, newStatus: RepairStatus) => {
    e.preventDefault();
    dragOverColumnRef.current = null;
    setDragOverColumn(null);
    const jobId = e.dataTransfer.getData("text/plain") || draggedJobIdRef.current || draggedJobId;
    draggedJobIdRef.current = null;
    setDraggedJobId(null);
    if (!jobId) return;
    await executeMoveJob(jobId, newStatus);
  };

  // --- Mobile Touch Event Handlers ---
  const cleanupTouchDrag = () => {
    if (touchHoldTimerRef.current) {
      clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = null;
    }
    if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    if (typeof document !== "undefined") {
      document.body.style.overflow = "";
      document.body.style.userSelect = "";
    }
    touchDraggedJobRef.current = null;
    setTouchDraggedJob(null);
    setDraggedJobId(null);
    draggedJobIdRef.current = null;
    dragOverColumnRef.current = null;
    setDragOverColumn(null);
    setIsOverTrash(false);
  };

  const startTouchDrag = (job: RepairJob, clientX: number, clientY: number) => {
    touchDraggedJobRef.current = job;
    setTouchDraggedJob(job);
    setDraggedJobId(job.id);
    draggedJobIdRef.current = job.id;
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate(40); } catch (e) {}
    }
    if (typeof document !== "undefined") {
      document.body.style.overflow = "hidden";
      document.body.style.userSelect = "none";
    }
    requestAnimationFrame(() => {
      if (floatingGhostRef.current) {
        floatingGhostRef.current.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
      }
    });
  };

  const handleCardTouchStart = (e: React.TouchEvent, job: RepairJob, isGripHandle = false) => {
    const touch = e.touches[0];
    if (!touch) return;

    // Double-tap detection (< 350ms)
    const now = Date.now();
    const lastTap = lastTapTimeRef.current[job.id] || 0;
    if (now - lastTap < 350) {
      if (touchHoldTimerRef.current) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }
      lastTapTimeRef.current[job.id] = 0;
      router.push(`/repairs/jobs/${job.id}`);
      return;
    }
    lastTapTimeRef.current[job.id] = now;

    touchStartPosRef.current = { x: touch.clientX, y: touch.clientY };

    if (isGripHandle) {
      startTouchDrag(job, touch.clientX, touch.clientY);
    } else {
      if (touchHoldTimerRef.current) clearTimeout(touchHoldTimerRef.current);
      touchHoldTimerRef.current = setTimeout(() => {
        startTouchDrag(job, touch.clientX, touch.clientY);
      }, 250);
    }
  };

  const handleCardTouchMove = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    if (!touch) return;

    // If hold timer pending, cancel if moved more than 8px (normal scroll)
    if (touchHoldTimerRef.current && touchStartPosRef.current) {
      const dx = Math.abs(touch.clientX - touchStartPosRef.current.x);
      const dy = Math.abs(touch.clientY - touchStartPosRef.current.y);
      if (dx > 8 || dy > 8) {
        clearTimeout(touchHoldTimerRef.current);
        touchHoldTimerRef.current = null;
      }
    }

    // If actively touch-dragging
    if (touchDraggedJobRef.current) {
      if (e.cancelable) e.preventDefault();
      const x = touch.clientX;
      const y = touch.clientY;

      // Direct GPU-accelerated translation without React re-render
      if (floatingGhostRef.current) {
        floatingGhostRef.current.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      }

      // Throttle collision detection to once per animation frame
      if (rafIdRef.current === null) {
        rafIdRef.current = requestAnimationFrame(() => {
          rafIdRef.current = null;
          const el = document.elementFromPoint(x, y);
          if (el) {
            const trashEl = el.closest('[data-trash-zone="true"]');
            if (trashEl) {
              setIsOverTrash(true);
              if (dragOverColumnRef.current !== null) {
                dragOverColumnRef.current = null;
                setDragOverColumn(null);
              }
              return;
            } else {
              setIsOverTrash(false);
            }

            const colEl = el.closest("[data-column-status]");
            if (colEl) {
              const status = colEl.getAttribute("data-column-status") as RepairStatus;
              if (status && dragOverColumnRef.current !== status) {
                dragOverColumnRef.current = status;
                setDragOverColumn(status);
              }
              return;
            }
          }
          if (dragOverColumnRef.current !== null) {
            dragOverColumnRef.current = null;
            setDragOverColumn(null);
          }
          setIsOverTrash(false);
        });
      }
    }
  };

  const handleCardTouchEnd = (e: React.TouchEvent) => {
    const dragged = touchDraggedJobRef.current;
    if (dragged) {
      const touch = e.changedTouches[0];
      if (touch) {
        const el = document.elementFromPoint(touch.clientX, touch.clientY);
        if (el) {
          const trashEl = el.closest('[data-trash-zone="true"]');
          if (trashEl) {
            executeTrashDrop(dragged.id);
          } else {
            const colEl = el.closest("[data-column-status]");
            if (colEl) {
              const status = colEl.getAttribute("data-column-status") as RepairStatus;
              if (status) {
                executeMoveJob(dragged.id, status);
              }
            }
          }
        }
      }
    }
    cleanupTouchDrag();
  };

  const handleCardTouchCancel = () => {
    cleanupTouchDrag();
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

    recordUserAuditLog("DIAGNOSIS_UPDATED", `/repairs/jobs/${finalJobId}`, {
      job_id: finalJobId,
      jo_number: editJobModal.jo_number,
      customer: editJobModal.customer,
      mechanic: editMechanic,
      notes_length: editNotes.length,
    });

    setEditJobModal(null);
  };

  // Remove / Cancel Job Order
  const handleConfirmRemoveJob = async () => {
    if (!deleteConfirmJob) return;
    const targetId = deleteConfirmJob.id;
    const isPaid = Boolean(
      deleteConfirmJob.is_paid ||
      (typeof window !== "undefined" && (
        localStorage.getItem(`motoshop_job_paid_${targetId}`) === "true" ||
        localStorage.getItem(`motoshop_job_paid_${deleteConfirmJob.jo_number}`) === "true"
      ))
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

    recordUserAuditLog("REPAIR_ORDER_DELETED", `/repairs/jobs/${targetId}`, {
      job_id: targetId,
      jo_number: deleteConfirmJob.jo_number,
      customer: deleteConfirmJob.customer,
      motorcycle: deleteConfirmJob.motorcycle,
    });

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

    recordUserAuditLog("REPAIR_ORDER_CREATED", `/repairs/jobs/${createdJob.id}`, {
      job_id: createdJob.id,
      jo_number: createdJob.jo_number,
      customer: createdJob.customer,
      motorcycle: createdJob.motorcycle,
      mechanic: createdJob.mechanic,
    });

    setNewCustomer("");
    setIsCreateModalOpen(false);
  };

  const columns: { title: string; status: RepairStatus; color: string; bg: string }[] = [
    { title: settings.boardPendingTitle || "New", status: "PENDING", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
    { title: settings.boardOngoingTitle || "In Progress", status: "ONGOING", color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
    { title: settings.boardCompletedTitle || "Completed", status: "COMPLETED", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { title: settings.boardReleasedTitle || "Invoiced", status: "RELEASED", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
  ];

  const getStageCount = (status: RepairStatus) => {
    return jobs.filter((j) => {
      if (j.status !== status) return false;
      if (status === "RELEASED" && settings.boardRetentionDays && settings.boardRetentionDays !== "all") {
        const retentionDays = parseInt(settings.boardRetentionDays, 10);
        if (!isNaN(retentionDays) && retentionDays > 0) {
          const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
          const jobTime = new Date(j.created_at).getTime();
          if (!isNaN(jobTime) && jobTime < cutoffTime) return false;
        }
      }
      return true;
    }).length;
  };

  const activeFilterCount =
    (selectedMechanic !== "ALL" ? 1 : 0) +
    (selectedPayment !== "ALL" ? 1 : 0) +
    (mobileSearch.trim() ? 1 : 0);

  const filteredMobileJobs = jobs.filter((j) => {
    if (j.status !== activeMobileTab) return false;

    if (j.status === "RELEASED" && settings.boardRetentionDays && settings.boardRetentionDays !== "all") {
      const retentionDays = parseInt(settings.boardRetentionDays, 10);
      if (!isNaN(retentionDays) && retentionDays > 0) {
        const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
        const jobTime = new Date(j.created_at).getTime();
        if (!isNaN(jobTime) && jobTime < cutoffTime) return false;
      }
    }

    if (mobileSearch.trim()) {
      const q = mobileSearch.toLowerCase();
      const matchJo = j.jo_number?.toLowerCase().includes(q);
      const matchCust = j.customer?.toLowerCase().includes(q);
      const matchMoto = j.motorcycle?.toLowerCase().includes(q);
      if (!matchJo && !matchCust && !matchMoto) return false;
    }

    if (selectedMechanic !== "ALL" && j.mechanic !== selectedMechanic) {
      return false;
    }

    const isPaid = Boolean(
      j.is_paid ||
      (typeof window !== "undefined" && (
        localStorage.getItem(`motoshop_job_paid_${j.id}`) === "true" ||
        localStorage.getItem(`motoshop_job_paid_${j.jo_number}`) === "true"
      ))
    );
    if (selectedPayment === "PAID" && !isPaid) return false;
    if (selectedPayment === "UNPAID" && isPaid) return false;

    return true;
  });

  if (isLoading) {
    return <RepairBoardSkeleton />;
  }

  return (
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-zinc-950 p-3 sm:p-4 md:p-6 flex flex-col font-sans overflow-visible md:overflow-hidden">
      
      {/* Top Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-white flex items-center gap-3">
            <Wrench className="w-8 h-8 text-cyan-400" />
            Workshop Job Cards
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Track every bike on the bench from drop-off to final invoice.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-5 py-3 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-sm transition-colors flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            <span>New Job Card</span>
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

      {/* Mobile-Only Tabbed Status Repair Board (< md) */}
      <div className="flex md:hidden flex-col flex-1 min-h-0 space-y-4">
        {/* Scrollable Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1 shrink-0 -mx-1 px-1">
          {columns.map((col) => {
            const count = getStageCount(col.status);
            const isActive = activeMobileTab === col.status;
            return (
              <button
                key={col.status}
                type="button"
                onClick={() => {
                  setActiveMobileTab(col.status);
                  setMenuOpenJobId(null);
                }}
                className={clsx(
                  "flex items-center gap-2 px-3.5 py-2.5 rounded-2xl font-bold text-xs whitespace-nowrap transition-all shrink-0 border",
                  isActive
                    ? "bg-lime-500 text-zinc-950 border-lime-600 shadow-sm scale-[1.02]"
                    : "bg-slate-100 text-slate-600 border-slate-200 hover:text-slate-950 hover:bg-slate-200"
                )}
              >
                <span>{col.title}</span>
                <span
                  className={clsx(
                    "px-2 py-0.5 rounded-full text-[10px] font-mono font-extrabold",
                    isActive
                      ? "bg-zinc-950 text-lime-400"
                      : "bg-white text-slate-700 border border-slate-200"
                  )}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Active Stage Job Cards List */}
        <div className="flex-1 space-y-3 pb-24">
          {filteredMobileJobs.length === 0 ? (
            <div className="text-center py-12 px-4 rounded-3xl border border-dashed border-white/10 bg-zinc-900/30 flex flex-col items-center justify-center">
              <div className="p-3.5 rounded-2xl bg-zinc-800/80 text-zinc-400 mb-3 border border-white/5">
                <Wrench className="w-6 h-6 text-zinc-500" />
              </div>
              <h3 className="text-sm font-bold text-white mb-1">
                No jobs in {columns.find((c) => c.status === activeMobileTab)?.title || activeMobileTab}
              </h3>
              <p className="text-xs text-zinc-400 max-w-xs mb-4">
                {activeFilterCount > 0
                  ? "No job cards match your active search and filter criteria."
                  : "There are currently no job cards in this stage."}
              </p>
              {activeFilterCount > 0 ? (
                <button
                  type="button"
                  onClick={() => {
                    setMobileSearch("");
                    setSelectedMechanic("ALL");
                    setSelectedPayment("ALL");
                  }}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-colors"
                >
                  Reset Filters
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-xs font-bold text-zinc-950 transition-colors flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Job Card</span>
                </button>
              )}
            </div>
          ) : (
            filteredMobileJobs.map((job) => {
              const isPaid = Boolean(
                job.is_paid ||
                (typeof window !== "undefined" && (
                  localStorage.getItem(`motoshop_job_paid_${job.id}`) === "true" ||
                  localStorage.getItem(`motoshop_job_paid_${job.jo_number}`) === "true"
                ))
              );
              const isMenuOpen = menuOpenJobId === job.id;
              const canDelete = !isPaid && userRole !== "cashier";

              return (
                <div
                  key={job.id}
                  onClick={() => router.push(`/repairs/jobs/${job.id}`)}
                  className={clsx(
                    "bg-white border rounded-2xl p-4 space-y-3 shadow-sm transition-all relative cursor-pointer active:scale-[0.99]",
                    isPaid
                      ? "border-emerald-300"
                      : "border-slate-200 hover:border-lime-500"
                  )}
                >
                  {/* Header: JO# + Payment Status Tag + 3-Dots Action Menu */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-lime-800 bg-lime-50 px-2.5 py-1 rounded-lg border border-lime-300">
                        {job.jo_number}
                      </span>
                      {isPaid ? (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 text-emerald-800 border border-emerald-200 flex items-center gap-1 uppercase tracking-wider">
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                          PAID
                        </span>
                      ) : (
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 uppercase tracking-wider">
                          Unpaid Cart
                        </span>
                      )}
                    </div>

                    {/* 3-Dots Action Menu */}
                    <div className="relative" data-job-menu="true">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenJobId(isMenuOpen ? null : job.id);
                        }}
                        className="p-1.5 rounded-xl hover:bg-white/10 text-zinc-400 hover:text-white transition-colors"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>

                      {isMenuOpen && (
                        <div
                          onClick={(e) => e.stopPropagation()}
                          className="absolute right-0 top-8 z-30 w-52 bg-zinc-900 border border-white/10 rounded-2xl p-1.5 shadow-2xl space-y-1 text-xs animate-in fade-in zoom-in-95 duration-150"
                        >
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenJobId(null);
                              router.push(`/repairs/jobs/${job.id}`);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium"
                          >
                            <FileText className="w-3.5 h-3.5 text-cyan-400" />
                            <span>View Job Details</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenJobId(null);
                              handleOpenEditModal(job);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium"
                          >
                            <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                            <span>Edit Diagnosis</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setMenuOpenJobId(null);
                              setStatusPickerJob(job);
                            }}
                            className="w-full px-3 py-2 rounded-xl text-left text-zinc-300 hover:text-white hover:bg-white/5 flex items-center gap-2 font-medium"
                          >
                            <Activity className="w-3.5 h-3.5 text-purple-400" />
                            <span>Move to Stage...</span>
                          </button>
                          {canDelete && (
                            <button
                              type="button"
                              onClick={() => {
                                setMenuOpenJobId(null);
                                setDeleteConfirmJob(job);
                              }}
                              className="w-full px-3 py-2 rounded-xl text-left text-red-400 hover:text-red-300 hover:bg-red-500/10 flex items-center gap-2 font-medium"
                            >
                              <Trash2 className="w-3.5 h-3.5 text-red-400" />
                              <span>Delete Job Card</span>
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Customer & Motorcycle */}
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <User className="w-4 h-4 text-lime-600 shrink-0" />
                      {job.customer}
                    </h4>
                    <p className="text-xs text-slate-500 font-medium flex items-center gap-1.5 mt-1">
                      <Bike className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      {job.motorcycle}
                    </p>
                  </div>

                  {/* Mechanic Diagnosis Notes (if present) */}
                  {job.mechanic_notes && (
                    <div className="p-2.5 bg-zinc-950/70 rounded-xl border border-white/5 space-y-0.5">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Diagnosis:
                      </span>
                      <p className="text-xs text-zinc-300 italic line-clamp-2">
                        "{job.mechanic_notes}"
                      </p>
                    </div>
                  )}

                  {/* Assigned Mechanic & Quick Meta */}
                  <div className="flex justify-between items-center text-xs pt-1 border-t border-white/5 text-zinc-400">
                    <span className="flex items-center gap-1.5 font-semibold text-purple-300">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      {job.mechanic}
                    </span>
                    <span className="text-[11px] text-zinc-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {new Date(job.created_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                  </div>

                  {/* Action Bar: Forward & Backward Movement */}
                  <div className="pt-2 border-t border-white/5 flex items-center gap-2">
                    {/* Stage 1: PENDING */}
                    {job.status === "PENDING" && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setConfirmMoveJob({
                            job,
                            targetStatus: "ONGOING",
                            label: "Start Repair (Move to Ongoing)",
                            direction: "forward"
                          });
                        }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                      >
                        <Play className="w-3.5 h-3.5 fill-cyan-400 text-cyan-400" />
                        <span>Start Repair</span>
                      </button>
                    )}

                    {/* Stage 2: ONGOING */}
                    {job.status === "ONGOING" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMoveJob({
                              job,
                              targetStatus: "PENDING",
                              label: "Revert to Pending Stage",
                              direction: "backward"
                            });
                          }}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-amber-400 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-[0.98]"
                          title="Revert back to Pending stage"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMoveJob({
                              job,
                              targetStatus: "COMPLETED",
                              label: "Complete Repair (Move to Completed)",
                              direction: "forward"
                            });
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                        >
                          <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Complete Repair</span>
                        </button>
                      </>
                    )}

                    {/* Stage 3: COMPLETED */}
                    {job.status === "COMPLETED" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMoveJob({
                              job,
                              targetStatus: "ONGOING",
                              label: "Revert to Ongoing Repair",
                              direction: "backward"
                            });
                          }}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-cyan-400 border border-cyan-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-[0.98]"
                          title="Revert back to Ongoing stage"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                        {isPaid ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmMoveJob({
                                job,
                                targetStatus: "RELEASED",
                                label: "Release & Handover to Customer",
                                direction: "forward"
                              });
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                          >
                            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                            <span>Release & Handover</span>
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(`/pos/checkout?job_id=${job.id}&jo_number=${encodeURIComponent(job.jo_number)}`);
                            }}
                            className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors active:scale-[0.98]"
                          >
                            <DollarSign className="w-3.5 h-3.5 text-amber-400" />
                            <span>Bill at POS</span>
                          </button>
                        )}
                      </>
                    )}

                    {/* Stage 4: RELEASED */}
                    {job.status === "RELEASED" && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmMoveJob({
                              job,
                              targetStatus: "COMPLETED",
                              label: "Revert Invoiced Job to Completed",
                              direction: "backward"
                            });
                          }}
                          className="py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center justify-center gap-1 transition-colors active:scale-[0.98]"
                          title="Revert back to Completed stage"
                        >
                          <ArrowLeft className="w-3.5 h-3.5" />
                          <span>Revert</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/repairs/jobs/${job.id}`);
                          }}
                          className="flex-1 py-2.5 px-3 rounded-xl bg-zinc-800/80 hover:bg-zinc-800 text-zinc-300 border border-white/10 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <FileText className="w-3.5 h-3.5 text-zinc-400" />
                          <span>View Details</span>
                        </button>
                      </>
                    )}

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        router.push(`/repairs/jobs/${job.id}`);
                      }}
                      className="py-2.5 px-3 rounded-xl bg-zinc-800/60 hover:bg-zinc-800 text-zinc-400 hover:text-white border border-white/5 text-xs font-semibold flex items-center gap-1 transition-colors"
                    >
                      <span>Details</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Desktop-Only Kanban Board Columns Grid (>= md) */}
      <div className="hidden md:grid md:overflow-hidden md:flex-1 md:min-h-0 grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {columns.map((col) => {
          let colJobs = jobs.filter((j) => j.status === col.status);

          // Apply retention filter to RELEASED stage if configured
          if (col.status === "RELEASED" && settings.boardRetentionDays && settings.boardRetentionDays !== "all") {
            const retentionDays = parseInt(settings.boardRetentionDays, 10);
            if (!isNaN(retentionDays) && retentionDays > 0) {
              const cutoffTime = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
              colJobs = colJobs.filter((j) => {
                const jobTime = new Date(j.created_at).getTime();
                return isNaN(jobTime) || jobTime >= cutoffTime;
              });
            }
          }

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
              data-column-status={col.status}
              onDragEnter={(e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
              className={clsx(
                "border rounded-3xl p-4 sm:p-5 flex flex-col backdrop-blur-xl overflow-visible md:overflow-hidden shadow-2xl transition-colors duration-150 md:min-h-0",
                isOver && isUnpaidAndTargetReleased
                  ? "bg-red-950/20 border-red-500/60 ring-2 ring-red-500/40"
                  : isOver
                  ? "bg-cyan-950/20 border-cyan-500/60 ring-2 ring-cyan-500/30"
                  : "bg-zinc-900/40 border-white/10"
              )}
            >
              {/* Column Header */}
              <div className={clsx("p-3.5 rounded-2xl border mb-4 flex items-center justify-between shrink-0", col.bg)}>
                <div className="flex items-center gap-2">
                  <span className={clsx("font-bold text-sm uppercase tracking-wider", col.color)}>
                    {col.title}
                  </span>
                  {col.status === "RELEASED" && (
                    <span 
                      className="text-[10px] text-zinc-400 font-normal bg-zinc-900/80 px-2 py-0.5 rounded-md border border-white/5" 
                      title="Retention period configured in Shop Settings"
                    >
                      {settings.boardRetentionDays === "all" ? "All Time" : `${settings.boardRetentionDays || 7}d`}
                    </span>
                  )}
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
              <div className="md:flex-1 md:min-h-0 overflow-visible md:overflow-y-auto space-y-4 pr-0 md:pr-1 touch-pan-y overscroll-contain scrollbar-compact">
                {colJobs.length === 0 ? (
                  <div className="text-center py-12 text-zinc-600 text-xs italic border border-dashed border-white/5 rounded-2xl p-4">
                    No job cards in this stage.
                  </div>
                ) : (
                  colJobs.map((job) => {
                    const isPaid = Boolean(
                      job.is_paid ||
                      (typeof window !== "undefined" && (
                        localStorage.getItem(`motoshop_job_paid_${job.id}`) === "true" ||
                        localStorage.getItem(`motoshop_job_paid_${job.jo_number}`) === "true"
                      ))
                    );
                    const isBeingDragged = draggedJobId === job.id;
                    const canDelete = !isPaid;

                    return (
                      <div
                        key={job.id}
                        draggable={true}
                        onDragStart={(e) => handleDragStart(e, job)}
                        onDragEnd={handleDragEnd}
                        onDoubleClick={() => router.push(`/repairs/jobs/${job.id}`)}
                        onTouchStart={(e) => handleCardTouchStart(e, job, false)}
                        onTouchMove={handleCardTouchMove}
                        onTouchEnd={handleCardTouchEnd}
                        onTouchCancel={handleCardTouchCancel}
                        style={{ touchAction: "manipulation" }}
                        title="Double-click or double-tap to open Job Card profile • Drag to move or drag to bottom to delete"
                        className={clsx(
                          "bg-zinc-950/80 border rounded-2xl p-5 space-y-3.5 shadow-lg relative group transition-colors duration-150 hover:border-cyan-500/40 cursor-grab active:cursor-grabbing select-none",
                          isPaid
                            ? "border-emerald-500/30 shadow-[0_0_20px_-5px_rgba(16,185,129,0.15)]"
                            : "border-white/10",
                          isBeingDragged && "opacity-30 border-cyan-400 border-dashed",
                          draggedJobId && !isBeingDragged && "pointer-events-none"
                        )}
                      >
                        {/* JO Badge & Payment Status Tag */}
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-bold text-xs text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                            {job.jo_number}
                          </span>

                          {isPaid ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1 uppercase tracking-wider">
                              <CheckCircle className="w-3 text-emerald-400" />
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

                        {/* Card Footer Bar: Double-Click Instruction & Drag Handle */}
                        <div className="pt-2.5 border-t border-white/5 flex items-center justify-between gap-2 select-none">
                          <div
                            className="flex items-center gap-1.5 text-[11px] text-zinc-400 font-medium group-hover:text-cyan-400/90 transition-colors pointer-events-none"
                            title="Double-click or double-tap this card to open its full profile"
                          >
                            <MousePointerClick className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                            <span>Double-click to open</span>
                          </div>

                          {/* Draggable Indicator Badge / Mobile Touch Grip */}
                          <div
                            onTouchStart={(e) => {
                              e.stopPropagation();
                              handleCardTouchStart(e, job, true);
                            }}
                            className="flex items-center gap-1 text-[10px] text-zinc-400 bg-zinc-900/90 px-2 py-1 rounded-lg border border-white/5 font-medium select-none cursor-grab active:cursor-grabbing hover:border-cyan-500/30 hover:text-cyan-300 transition-colors"
                            title="Drag this card into another column to change status, or drag to bottom trash can to delete"
                          >
                            <GripVertical className="w-3 h-3 text-zinc-400" />
                            <span>Drag</span>
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

      {/* Drag-to-Delete Trash Can Drop Zone */}
      {draggedJobId && (
        <div
          data-trash-zone="true"
          onDragEnter={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            setIsOverTrash(true);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            e.dataTransfer.dropEffect = "move";
            if (!isOverTrash) setIsOverTrash(true);
          }}
          onDragLeave={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            if (
              e.clientX < rect.left ||
              e.clientX >= rect.right ||
              e.clientY < rect.top ||
              e.clientY >= rect.bottom
            ) {
              setIsOverTrash(false);
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            setIsOverTrash(false);
            const targetId = e.dataTransfer.getData("text/plain") || draggedJobIdRef.current || draggedJobId;
            draggedJobIdRef.current = null;
            setDraggedJobId(null);
            if (!targetId) return;
            executeTrashDrop(targetId);
          }}
          className={clsx(
            "fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center justify-center gap-4 px-10 py-5 rounded-2xl border-2 backdrop-blur-xl transition-all duration-200 cursor-pointer shadow-2xl min-w-[440px] max-w-lg",
            isOverTrash
              ? "bg-red-900/95 border-red-400 scale-105 shadow-[0_0_60px_rgba(239,68,68,0.8)] ring-4 ring-red-500/40"
              : "bg-red-950/90 border-red-500/80 shadow-[0_0_40px_rgba(239,68,68,0.4)]"
          )}
        >
          <div className="p-3 rounded-xl bg-red-500/20 text-red-400 transition-transform pointer-events-none border border-red-500/30">
            <Trash2 className={clsx("w-6 h-6", isOverTrash ? "scale-125" : "animate-pulse")} />
          </div>
          <div className="pointer-events-none text-left">
            <p className="text-sm font-black text-white uppercase tracking-wider">
              {isOverTrash ? "Release to Delete Job Card" : "Drop here to delete Job Card"}
            </p>
            <p className="text-xs text-red-300 font-medium mt-0.5">
              Release card into this zone to remove from workshop
            </p>
          </div>
        </div>
      )}

      {/* Mobile Floating Ghost Card Preview */}
      {touchDraggedJob && (
        <div
          ref={floatingGhostRef}
          style={{
            transform: "translate3d(-9999px, -9999px, 0)",
            willChange: "transform",
          }}
          className="fixed top-0 left-0 -ml-36 -mt-16 z-[100] pointer-events-none w-72 p-4 rounded-2xl bg-zinc-900/95 border-2 border-cyan-500 shadow-[0_20px_50px_rgba(6,182,212,0.4)] backdrop-blur-md opacity-95 transition-none select-none"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono font-bold text-xs text-cyan-400 bg-cyan-950 px-2.5 py-0.5 rounded-lg border border-cyan-500/30">
              {touchDraggedJob.jo_number}
            </span>
            <span className="text-[10px] font-bold text-cyan-300 uppercase tracking-wider">
              Moving...
            </span>
          </div>
          <p className="text-sm font-bold text-white truncate">{touchDraggedJob.customer}</p>
          <p className="text-xs text-zinc-400 truncate mt-0.5">{touchDraggedJob.motorcycle}</p>
        </div>
      )}

      {/* Modal 1: Create New Job Order Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        size="md"
      >
        <ModalHeader
          icon={Plus}
          iconVariant="cyan"
          title="New Job Card"
          subtitle="Create a new repair job card for an incoming customer"
          onClose={() => setIsCreateModalOpen(false)}
        />
        <form onSubmit={handleCreateJob}>
          <ModalBody className="space-y-4 text-xs">
            <div>
              <label className="block text-zinc-400 font-semibold mb-1.5">Customer Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Carlos Mendoza"
                value={newCustomer}
                onChange={(e) => setNewCustomer(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            <div>
              <label className="block text-zinc-400 font-semibold mb-1.5">Bike Model *</label>
              <select
                value={newMotorcycleModel}
                onChange={(e) => setNewMotorcycleModel(e.target.value)}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
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
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              >
                {mechanicsList.length > 0 ? (
                  mechanicsList.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))
                ) : (
                  <option value="Shop Mechanic">Shop Mechanic</option>
                )}
              </select>
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsCreateModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <span>Saving...</span> : <span>Create Job Card</span>}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal 2: Edit Diagnosis Notes & Reassign Mechanic Modal */}
      <Modal
        isOpen={!!editJobModal}
        onClose={() => setEditJobModal(null)}
        size="lg"
      >
        {editJobModal && (
          <>
            <ModalHeader
              icon={Edit3}
              iconVariant="cyan"
              title="Edit Diagnosis Notes & Mechanic"
              subtitle={`${editJobModal.customer} (${editJobModal.jo_number})`}
              onClose={() => setEditJobModal(null)}
            />

            <form onSubmit={handleSaveJobDetails}>
              <ModalBody className="space-y-4 text-xs">
                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5 flex items-center gap-1 text-cyan-400">
                    <FileText className="w-3.5 h-3.5" /> Mechanic Diagnosis & Service Notes
                  </label>
                  <textarea
                    rows={4}
                    placeholder="Enter detailed repair diagnosis, symptoms, parts replaced, or service instructions..."
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-2xl p-3 text-zinc-100 text-sm placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-zinc-400 font-semibold mb-1.5 flex items-center gap-1 text-purple-300">
                    <ShieldCheck className="w-3.5 h-3.5" /> Reassign Mechanic
                  </label>
                  <select
                    value={editMechanic}
                    onChange={(e) => setEditMechanic(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-zinc-100 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  >
                    {mechanicsList.length > 0 ? (
                      mechanicsList.map((m) => (
                        <option key={m.id} value={m.name}>
                          {m.name}
                        </option>
                      ))
                    ) : (
                      <option value="Shop Mechanic">Shop Mechanic</option>
                    )}
                  </select>
                </div>
              </ModalBody>

              <ModalFooter>
                <button
                  type="button"
                  onClick={() => setEditJobModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold text-xs transition-colors"
                >
                  Save Changes
                </button>
              </ModalFooter>
            </form>
          </>
        )}
      </Modal>

      {/* Modal 3: Confirm Remove Active Customer / Cancel Job Order Modal */}
      <ConfirmModal
        isOpen={!!deleteConfirmJob}
        onClose={() => setDeleteConfirmJob(null)}
        onConfirm={handleConfirmRemoveJob}
        title="Remove Active Customer Job Order?"
        confirmText="Confirm & Remove Customer"
        confirmVariant="danger"
        message={
          deleteConfirmJob ? (
            <div className="space-y-3">
              <p className="text-zinc-300">
                Are you sure you want to remove <strong className="text-white">{deleteConfirmJob.customer}</strong> ({deleteConfirmJob.jo_number}) from the repair board?
              </p>
              <p className="text-xs text-amber-300 bg-amber-500/10 p-3 rounded-xl border border-amber-500/20 text-left">
                This action will release the active session and remove the customer from the POS active carts selection bar.
              </p>
            </div>
          ) : ""
        }
      />

      {/* Modal 4: Mobile Status Picker Modal */}
      <Modal
        isOpen={Boolean(statusPickerJob)}
        onClose={() => setStatusPickerJob(null)}
        size="sm"
      >
        <ModalHeader
          icon={Activity}
          iconVariant="cyan"
          title="Move Job Order Stage"
          subtitle={statusPickerJob ? `Select target stage for ${statusPickerJob.jo_number}` : ""}
          onClose={() => setStatusPickerJob(null)}
        />
        <ModalBody>
          <div className="space-y-2 py-2">
            {columns.map((col) => {
              const isCurrent = statusPickerJob?.status === col.status;
              return (
                <button
                  key={col.status}
                  type="button"
                  disabled={isCurrent}
                  onClick={() => {
                    if (statusPickerJob) {
                      const targetJob = statusPickerJob;
                      const targetStatus = col.status;
                      setStatusPickerJob(null);
                      setConfirmMoveJob({
                        job: targetJob,
                        targetStatus,
                        label: `Move to ${col.title}`,
                        direction: "forward"
                      });
                    }
                  }}
                  className={clsx(
                    "w-full p-3.5 rounded-2xl border text-left flex items-center justify-between transition-all",
                    isCurrent
                      ? "bg-zinc-800/40 border-white/5 opacity-50 cursor-not-allowed text-zinc-500"
                      : "bg-zinc-900/90 border-white/10 hover:border-cyan-500/40 hover:bg-zinc-900 text-white active:scale-[0.99]"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className={clsx("w-2.5 h-2.5 rounded-full", col.color.replace("text-", "bg-"))} />
                    <span className="font-bold text-xs">{col.title}</span>
                  </div>
                  {isCurrent ? (
                    <span className="text-[10px] font-mono text-zinc-500 uppercase tracking-wider">Current Stage</span>
                  ) : (
                    <ChevronRight className="w-4 h-4 text-zinc-500" />
                  )}
                </button>
              );
            })}
          </div>
        </ModalBody>
      </Modal>

      {/* Modal 5: Confirm Move / Revert Job Stage Modal */}
      <ConfirmModal
        isOpen={Boolean(confirmMoveJob)}
        onClose={() => setConfirmMoveJob(null)}
        onConfirm={() => {
          if (confirmMoveJob) {
            const { job, targetStatus } = confirmMoveJob;
            setConfirmMoveJob(null);
            executeMoveJob(job.id, targetStatus);
          }
        }}
        title={confirmMoveJob?.direction === "backward" ? "Revert Job Order Stage?" : "Advance Job Order Stage?"}
        confirmText={confirmMoveJob?.direction === "backward" ? "Confirm Revert" : "Confirm Stage Move"}
        confirmVariant={confirmMoveJob?.direction === "backward" ? "warning" : "primary"}
        message={
          confirmMoveJob ? (
            <div className="space-y-3">
              <p className="text-zinc-300 text-sm">
                Are you sure you want to move Job Order <strong className="text-white font-mono">{confirmMoveJob.job.jo_number}</strong> ({confirmMoveJob.job.customer})?
              </p>
              <div className="p-3 bg-zinc-950/80 rounded-2xl border border-white/10 flex items-center justify-between text-xs">
                <span className="text-zinc-400 font-medium">New Status:</span>
                <span className="font-bold font-mono text-cyan-300 uppercase tracking-wider bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-500/30">
                  {confirmMoveJob.targetStatus}
                </span>
              </div>
              {confirmMoveJob.direction === "backward" && (
                <p className="text-[11px] text-amber-300/90 bg-amber-500/10 p-2.5 rounded-xl border border-amber-500/20">
                  Reverting this job order will send it back to the previous workshop bench stage.
                </p>
              )}
            </div>
          ) : ""
        }
      />

      {/* Floating Filter Button & Mobile Filter Sheet */}
      <FloatingFilterButton
        onClick={() => setIsMobileFilterOpen(true)}
        activeCount={activeFilterCount}
        label="Filters"
      />

      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Workshop Jobs"
        activeCount={activeFilterCount}
        onReset={() => {
          setMobileSearch("");
          setSelectedMechanic("ALL");
          setSelectedPayment("ALL");
        }}
      >
        {/* Search Field */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Search Job Cards</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              placeholder="JO #, Customer, Motorcycle..."
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {/* Mechanic Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Assigned Mechanic</label>
          <select
            value={selectedMechanic}
            onChange={(e) => setSelectedMechanic(e.target.value)}
            className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          >
            <option value="ALL">All Mechanics</option>
            {mechanicsList.map((m) => (
              <option key={m.id} value={m.name}>
                {m.name}
              </option>
            ))}
          </select>
        </div>

        {/* Payment Status Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Payment Status</label>
          <div className="grid grid-cols-3 gap-2">
            {(["ALL", "PAID", "UNPAID"] as const).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setSelectedPayment(p)}
                className={clsx(
                  "py-2.5 px-3 rounded-xl text-xs font-bold border transition-all text-center",
                  selectedPayment === p
                    ? "bg-cyan-500/20 border-cyan-500/60 text-cyan-300"
                    : "bg-zinc-900 border-white/10 text-zinc-400 hover:text-white"
                )}
              >
                {p === "ALL" ? "All" : p === "PAID" ? "Paid" : "Unpaid"}
              </button>
            ))}
          </div>
        </div>
      </MobileFilterSheet>

    </div>
  );
}
