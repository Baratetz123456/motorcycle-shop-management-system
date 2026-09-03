"use client";

import { useEffect, useState } from "react";
import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Wrench, CircleDashed, CheckCircle, CarFront, Clock, User2, History, Plus, X, Bike, Calendar, DollarSign, Tag, FileText } from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";

type JobStatus = "PENDING" | "ONGOING" | "COMPLETED" | "RELEASED";

interface JobOrder {
  id: string;
  jo_number: string;
  motorcycle: string;
  customer: string;
  mechanic: string;
  status: JobStatus;
  is_paid?: boolean;
  labor_charge: number;
}

interface MotorcycleModelOption {
  id: string;
  label: string;
}

interface RepairLogEntry {
  job_id: string;
  jo_number: string;
  motorcycle_model: string;
  date_repaired: string;
  status: JobStatus;
  customer_name: string;
  mechanic_name?: string;
  mechanic_notes?: string;
  labor_charge: number;
  parts_charge: number;
  items_used?: { name: string; qty: number; price: number }[];
}

const INITIAL_DATA: Record<JobStatus, JobOrder[]> = {
  PENDING: [
    { id: "jo-1", jo_number: "JO-A1B2", motorcycle: "Yamaha MT-07 (2023)", customer: "John Doe", mechanic: "Mike Smith", status: "PENDING", is_paid: false, labor_charge: 150 },
    { id: "jo-2", jo_number: "JO-C3D4", motorcycle: "Honda Click 125i (2022)", customer: "Jane Roe", mechanic: "Dave Johnson", status: "PENDING", is_paid: false, labor_charge: 80 },
  ],
  ONGOING: [
    { id: "jo-3", jo_number: "JO-E5F6", motorcycle: "Kawasaki Ninja 400 (2023)", customer: "Bob Lee", mechanic: "Alex Rivera", status: "ONGOING", is_paid: true, labor_charge: 120 },
  ],
  COMPLETED: [
    { id: "jo-4", jo_number: "JO-G7H8", motorcycle: "Ducati Panigale V4 (2023)", customer: "Alice Kim", mechanic: "Mike Smith", status: "COMPLETED", is_paid: true, labor_charge: 500 },
  ],
  RELEASED: []
};

const REGISTERED_MODELS: MotorcycleModelOption[] = [
  { id: "m-1", label: "Yamaha MT-07 (2023) - Naked Sport" },
  { id: "m-2", label: "Honda Click 125i (2022) - Scooter" },
  { id: "m-3", label: "Kawasaki Ninja 400 (2023) - Sport" },
  { id: "m-4", label: "Suzuki Raider R150 (2024) - Underbone" },
  { id: "m-5", label: "Ducati Panigale V4 (2023) - Superbike" },
  { id: "m-6", label: "Honda ADV 160 (2023) - Adventure Scooter" },
];

const AVAILABLE_MECHANICS = [
  { id: "mech-1", name: "Mike Smith", email: "mechanic@motoshop.com" },
  { id: "mech-2", name: "Dave Johnson", email: "dave@motoshop.com" },
  { id: "mech-3", name: "Alex Rivera", email: "alex@motoshop.com" },
  { id: "mech-4", name: "Sarah Connor", email: "sarah@motoshop.com" },
];

const COLUMNS: { id: JobStatus; title: string; icon: React.ReactNode; color: string }[] = [
  { id: "PENDING", title: "Pending", icon: <Clock className="w-5 h-5" />, color: "text-zinc-400 border-zinc-700" },
  { id: "ONGOING", title: "In Progress", icon: <Wrench className="w-5 h-5" />, color: "text-blue-400 border-blue-500/30" },
  { id: "COMPLETED", title: "Completed", icon: <CheckCircle className="w-5 h-5" />, color: "text-green-400 border-green-500/30" },
  { id: "RELEASED", title: "Released", icon: <CarFront className="w-5 h-5" />, color: "text-purple-400 border-purple-500/30" },
];

export default function RepairsKanban() {
  const [data, setData] = useState(INITIAL_DATA);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [historyModalJob, setHistoryModalJob] = useState<JobOrder | null>(null);
  const [customerLogs, setCustomerLogs] = useState<RepairLogEntry[]>([]);

  // Form state
  const [customerName, setCustomerName] = useState("");
  const [selectedModel, setSelectedModel] = useState(REGISTERED_MODELS[0].label);
  const [assignedMechanic, setAssignedMechanic] = useState("Mike Smith");

  useEffect(() => {
    const userEmail = localStorage.getItem("user_email") || "";
    const matched = AVAILABLE_MECHANICS.find((m) => m.email.toLowerCase() === userEmail.toLowerCase());
    if (matched) {
      setAssignedMechanic(matched.name);
    }
  }, []);

  const onDragEnd = async (result: DropResult) => {
    const { source, destination } = result;
    if (!destination) return;

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    const sourceStatus = source.droppableId as JobStatus;
    const destStatus = destination.droppableId as JobStatus;

    const sourceColumn = [...data[sourceStatus]];
    const destColumn = sourceStatus === destStatus ? sourceColumn : [...data[destStatus]];

    const [movedJob] = sourceColumn.splice(source.index, 1);
    movedJob.status = destStatus;
    
    destColumn.splice(destination.index, 0, movedJob);

    setData(prev => ({
      ...prev,
      [sourceStatus]: sourceColumn,
      [destStatus]: destColumn
    }));
    
    try {
      await apiClient.patch(`/repairs/jobs/${movedJob.id}/status`, { status: destStatus });
    } catch (e) {
      // Local state handles smooth experience
    }
  };

  const handleCreateJob = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName || !selectedModel) return;

    const newJob: JobOrder = {
      id: `jo-${Date.now()}`,
      jo_number: `JO-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      motorcycle: selectedModel,
      customer: customerName,
      mechanic: assignedMechanic,
      status: "PENDING",
      is_paid: false,
      labor_charge: 0,
    };

    setData((prev) => ({
      ...prev,
      PENDING: [newJob, ...prev.PENDING],
    }));

    setIsCreateModalOpen(false);
    setCustomerName("");
  };

  const openCustomerHistory = async (job: JobOrder) => {
    setHistoryModalJob(job);
    try {
      const res = await apiClient.get<RepairLogEntry[]>(
        `/repairs/motorcycles/history/customer?customer_name=${encodeURIComponent(job.customer)}`
      );
      setCustomerLogs(res.data);
    } catch (e) {
      setCustomerLogs([
        {
          job_id: job.id,
          jo_number: job.jo_number,
          motorcycle_model: job.motorcycle,
          date_repaired: new Date().toISOString(),
          status: job.status,
          customer_name: job.customer,
          mechanic_name: job.mechanic,
          mechanic_notes: "Regular maintenance, oil filter replacement and chain lubrication.",
          labor_charge: 120.0,
          parts_charge: 45.0,
          items_used: [
            { name: "Synthetic Motor Oil 10W-40", qty: 1, price: 15.99 },
            { name: "Premium Oil Filter", qty: 1, price: 8.50 },
            { name: "Chain Lube Spray", qty: 1, price: 12.00 },
          ],
        },
        {
          job_id: `jo-prev-${job.id}`,
          jo_number: `JO-PREV`,
          motorcycle_model: job.motorcycle,
          date_repaired: new Date(Date.now() - 14 * 86400000).toISOString(),
          status: "RELEASED",
          customer_name: job.customer,
          mechanic_name: "Dave Johnson",
          mechanic_notes: "Brake belt adjustment and rear brake pad check. All clearance OK.",
          labor_charge: 85.0,
          parts_charge: 25.0,
          items_used: [
            { name: "Front Brake Pads", qty: 1, price: 34.00 },
          ],
        },
      ]);
    }
  };

  return (
    <div className="h-screen bg-zinc-950 p-8 overflow-hidden flex flex-col font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-8 z-10 relative">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-500 flex items-center gap-3">
            <Wrench className="w-8 h-8 text-cyan-400" />
            Repairs Board
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Drag and drop to update job status. Displays payment completion status tags for ongoing repairs.
          </p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="bg-cyan-600 hover:bg-cyan-500 text-white px-6 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_15px_-3px_rgba(6,182,212,0.4)] flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          + New Job Order
        </button>
      </div>

      {/* Kanban Board */}
      <div className="flex-1 overflow-x-auto pb-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-6 h-full min-w-max items-start">
            {COLUMNS.map((col) => (
              <div key={col.id} className="w-[350px] flex flex-col h-full max-h-full">
                
                {/* Column Header */}
                <div className={clsx("flex items-center justify-between p-4 mb-4 rounded-xl border bg-zinc-900/50 backdrop-blur-md", col.color)}>
                  <div className="flex items-center gap-3 font-semibold">
                    {col.icon}
                    <span>{col.title}</span>
                  </div>
                  <span className="bg-zinc-800/80 px-2.5 py-0.5 rounded-full text-xs font-bold text-zinc-300">
                    {data[col.id].length}
                  </span>
                </div>

                {/* Droppable Area */}
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      className={clsx(
                        "flex-1 overflow-y-auto p-2 rounded-2xl transition-colors border border-transparent",
                        snapshot.isDraggingOver ? "bg-white/5 border-white/10 border-dashed" : "bg-transparent"
                      )}
                    >
                      {data[col.id].map((job, index) => {
                        const isJobPaid = job.is_paid || localStorage.getItem(`motoshop_job_paid_${job.id}`) === "true";

                        return (
                          <Draggable key={job.id} draggableId={job.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                className={clsx(
                                  "mb-4 bg-zinc-900/80 border border-white/10 rounded-xl p-5 hover:border-cyan-500/50 transition-colors shadow-lg backdrop-blur-md group",
                                  snapshot.isDragging && "shadow-[0_10px_30px_-10px_rgba(6,182,212,0.3)] border-cyan-500 rotate-2 scale-105 z-50 bg-zinc-800"
                                )}
                              >
                                <div className="flex justify-between items-start mb-3">
                                  <span className="font-mono text-xs text-cyan-400 bg-cyan-950/50 px-2 py-1 rounded-md border border-cyan-500/20">
                                    {job.jo_number}
                                  </span>

                                  {/* Prominent PAID Status Badge Tag */}
                                  {isJobPaid ? (
                                    <span className="inline-flex items-center gap-1 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-md shadow-sm animate-pulse">
                                      <DollarSign className="w-3 h-3" />
                                      PAID / Payment Completed
                                    </span>
                                  ) : (
                                    <span className="text-[10px] font-mono text-zinc-500 bg-zinc-950 px-2 py-0.5 rounded border border-white/5">
                                      UNPAID
                                    </span>
                                  )}
                                </div>
                                
                                <h3 className="font-bold text-zinc-100 text-base mb-1">{job.motorcycle}</h3>
                                <p className="text-zinc-400 text-xs mb-4">Customer: <strong className="text-zinc-200">{job.customer}</strong></p>
                                
                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                  <div className="flex items-center gap-2">
                                    <div className="bg-zinc-800 p-1.5 rounded-full">
                                      <User2 className="w-3 h-3 text-zinc-300" />
                                    </div>
                                    <span className="text-xs text-zinc-300 font-medium">{job.mechanic}</span>
                                  </div>

                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openCustomerHistory(job);
                                    }}
                                    className="text-xs text-cyan-400 hover:text-cyan-300 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1"
                                    title="Check repair history for this customer"
                                  >
                                    <History className="w-3 h-3" />
                                    <span>History & Notes</span>
                                  </button>
                                </div>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {/* Refined New Job Order Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Wrench className="w-5 h-5 text-cyan-400" /> Create Repair Job Order
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateJob} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Customer Full Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Pre-registered Motorcycle Model Category *
                </label>
                <select
                  value={selectedModel}
                  onChange={(e) => setSelectedModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {REGISTERED_MODELS.map((m) => (
                    <option key={m.id} value={m.label}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  Assigned Mechanic *
                </label>
                <select
                  value={assignedMechanic}
                  onChange={(e) => setAssignedMechanic(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {AVAILABLE_MECHANICS.map((mech) => (
                    <option key={mech.id} value={mech.name}>
                      {mech.name} ({mech.email})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20"
                >
                  Place Inline for Repair
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Repair History Drawer Modal with Previous Mechanic Notes & Itemized Breakdown */}
      {historyModalJob && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/80">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  <History className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">
                    Repair History & Diagnoses: {historyModalJob.customer}
                  </h3>
                  <p className="text-xs text-zinc-400">{historyModalJob.motorcycle}</p>
                </div>
              </div>
              <button onClick={() => setHistoryModalJob(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 max-h-[480px] overflow-y-auto space-y-4">
              {customerLogs.map((log) => (
                <div key={log.job_id} className="bg-zinc-950/80 border border-white/10 rounded-2xl p-5 space-y-3 shadow-lg">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-cyan-400 font-bold bg-cyan-950 px-2.5 py-1 rounded-md border border-cyan-500/20">
                      {log.jo_number}
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase">
                      {log.status}
                    </span>
                  </div>

                  <div className="text-sm font-semibold text-white">{log.motorcycle_model}</div>

                  {/* Previous Mechanic Notes */}
                  {log.mechanic_notes && (
                    <div className="p-3 bg-zinc-900/90 rounded-xl border border-white/5 space-y-1">
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block flex items-center gap-1">
                        <FileText className="w-3 h-3" /> Previous Mechanic Notes & Diagnosis
                      </span>
                      <p className="text-xs text-zinc-300 italic">"{log.mechanic_notes}"</p>
                    </div>
                  )}

                  {/* Itemized Services & Products Used */}
                  {log.items_used && log.items_used.length > 0 && (
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block flex items-center gap-1">
                        <Tag className="w-3 h-3 text-zinc-500" /> Products & Services Applied
                      </span>
                      <div className="bg-zinc-900/50 p-2.5 rounded-xl border border-white/5 space-y-1 text-xs">
                        {log.items_used.map((item, i) => (
                          <div key={i} className="flex justify-between items-center">
                            <span className="text-zinc-300">{item.name} (x{item.qty})</span>
                            <span className="font-mono text-zinc-400">₱{(item.qty * item.price).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-xs text-zinc-400 border-t border-white/5 pt-2">
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3 text-zinc-500"/> {new Date(log.date_repaired).toLocaleDateString()}</span>
                    <span>Mechanic: <strong className="text-purple-300">{log.mechanic_name}</strong></span>
                    <span className="font-mono text-emerald-400 font-bold">₱{(log.labor_charge + log.parts_charge).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="p-4 border-t border-white/10 bg-zinc-950 flex justify-end">
              <button
                onClick={() => setHistoryModalJob(null)}
                className="px-4 py-1.5 rounded-xl bg-zinc-800 text-xs font-semibold text-zinc-200 hover:bg-zinc-700 transition-colors"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
