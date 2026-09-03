"use client";

import { useEffect, useState } from "react";
import { 
  Bike, 
  Search, 
  Plus, 
  User, 
  Clock, 
  Wrench, 
  CheckCircle, 
  CarFront, 
  Calendar, 
  X, 
  FileText, 
  History, 
  Phone, 
  ChevronRight,
  Layers,
  Sparkles,
  Tag
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";

export interface MotorcycleModelCategory {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  created_at?: string;
}

export interface CustomerProfile {
  id: string;
  customer_name: string;
  contact_number?: string;
  selected_model: string;
  notes?: string;
  created_at: string;
}

export interface RepairLogEntry {
  job_id: string;
  jo_number: string;
  motorcycle_model: string;
  date_repaired: string;
  status: "PENDING" | "ONGOING" | "COMPLETED" | "RELEASED";
  customer_name: string;
  mechanic_name?: string;
  labor_charge: number;
  parts_charge: number;
}

const STATIC_MODELS: MotorcycleModelCategory[] = [
  { id: "sm-1", brand: "Yamaha", model: "MT-07", year: 2023, category: "Naked Sport" },
  { id: "sm-2", brand: "Honda", model: "Click 125i", year: 2022, category: "Scooter" },
  { id: "sm-3", brand: "Kawasaki", model: "Ninja 400", year: 2023, category: "Sport" },
  { id: "sm-4", brand: "Suzuki", model: "Raider R150", year: 2024, category: "Underbone" },
  { id: "sm-5", brand: "Ducati", model: "Panigale V4", year: 2023, category: "Superbike" },
  { id: "sm-6", brand: "Honda", model: "ADV 160", year: 2023, category: "Adventure Scooter" },
];

const INITIAL_CUSTOMERS: CustomerProfile[] = [
  { id: "c-1", customer_name: "John Doe", contact_number: "+1 (555) 234-5678", selected_model: "Yamaha MT-07 (2023)", notes: "Regular oil change & tune-up", created_at: new Date(Date.now() - 30 * 86400000).toISOString() },
  { id: "c-2", customer_name: "Jane Roe", contact_number: "+1 (555) 876-5432", selected_model: "Honda Click 125i (2022)", notes: "Brake belt adjustment", created_at: new Date(Date.now() - 15 * 86400000).toISOString() },
  { id: "c-3", customer_name: "Bob Lee", contact_number: "+1 (555) 432-1098", selected_model: "Kawasaki Ninja 400 (2023)", notes: "Chain lubing & inspection", created_at: new Date(Date.now() - 5 * 86400000).toISOString() },
];

export default function MotorcycleProfilePage() {
  const [activeTab, setActiveTab] = useState<"MODELS" | "CUSTOMERS">("MODELS");
  const [models, setModels] = useState<MotorcycleModelCategory[]>(STATIC_MODELS);
  const [customers, setCustomers] = useState<CustomerProfile[]>(INITIAL_CUSTOMERS);
  const [search, setSearch] = useState("");
  
  // Modals state
  const [isAddModelModalOpen, setIsAddModelModalOpen] = useState(false);
  const [isAddCustomerModalOpen, setIsAddCustomerModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerProfile | null>(null);
  const [repairHistory, setRepairHistory] = useState<RepairLogEntry[]>([]);

  // Static Model form state
  const [modelForm, setModelForm] = useState({
    brand: "Yamaha",
    model: "",
    year: new Date().getFullYear(),
    category: "Scooter",
  });

  // Customer form state
  const [customerForm, setCustomerForm] = useState({
    customer_name: "",
    contact_number: "",
    selected_model: "Yamaha MT-07 (2023)",
    notes: "",
  });

  useEffect(() => {
    fetchModels();
  }, []);

  const fetchModels = async () => {
    try {
      const res = await apiClient.get<MotorcycleModelCategory[]>("/repairs/motorcycle-models");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setModels(res.data);
      }
    } catch (e) {
      // Fallback to static master list
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modelForm.model) return;

    try {
      const res = await apiClient.post<MotorcycleModelCategory>("/repairs/motorcycle-models", modelForm);
      setModels((prev) => [res.data, ...prev]);
    } catch (e) {
      const demo: MotorcycleModelCategory = {
        id: `sm-${Date.now()}`,
        ...modelForm,
        year: Number(modelForm.year),
      };
      setModels((prev) => [demo, ...prev]);
    } finally {
      setIsAddModelModalOpen(false);
      setModelForm({ brand: "Yamaha", model: "", year: new Date().getFullYear(), category: "Scooter" });
    }
  };

  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerForm.customer_name) return;

    const newCustomer: CustomerProfile = {
      id: `c-${Date.now()}`,
      ...customerForm,
      created_at: new Date().toISOString(),
    };

    setCustomers((prev) => [newCustomer, ...prev]);
    setIsAddCustomerModalOpen(false);
    setCustomerForm({ customer_name: "", contact_number: "", selected_model: models[0] ? `${models[0].brand} ${models[0].model} (${models[0].year})` : "Yamaha MT-07 (2023)", notes: "" });
  };

  const openCustomerLogs = async (c: CustomerProfile) => {
    setSelectedCustomer(c);
    try {
      const res = await apiClient.get<RepairLogEntry[]>(
        `/repairs/motorcycles/history/customer?customer_name=${encodeURIComponent(c.customer_name)}`
      );
      setRepairHistory(res.data);
    } catch (e) {
      setRepairHistory([
        {
          job_id: `jo-${c.id}`,
          jo_number: "JO-ACTIVE",
          motorcycle_model: c.selected_model,
          date_repaired: c.created_at,
          status: "ONGOING",
          customer_name: c.customer_name,
          mechanic_name: "Mike Smith",
          labor_charge: 120.0,
          parts_charge: 45.0,
        },
      ]);
    }
  };

  const filteredModels = models.filter((m) =>
    `${m.brand} ${m.model} ${m.category}`.toLowerCase().includes(search.toLowerCase())
  );

  const filteredCustomers = customers.filter((c) =>
    `${c.customer_name} ${c.selected_model}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Bike className="w-8 h-8 text-cyan-400" />
            Motorcycle Profiles & Customer Sessions
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Manage static motorcycle model categories and active customer repair profiles accessible by Admin, Manager, and Mechanic.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "MODELS" ? (
            <button
              onClick={() => setIsAddModelModalOpen(true)}
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              + New Static Model Category
            </button>
          ) : (
            <button
              onClick={() => setIsAddCustomerModalOpen(true)}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] flex items-center gap-2"
            >
              <User className="w-4 h-4" />
              + Register Customer Repair Profile
            </button>
          )}
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("MODELS")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "MODELS"
                ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Static Motorcycle Models ({models.length})</span>
          </button>

          <button
            onClick={() => setActiveTab("CUSTOMERS")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "CUSTOMERS"
                ? "bg-purple-500/20 text-purple-300 shadow-md border border-purple-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <User className="w-3.5 h-3.5" />
            <span>Active Customer Profiles ({customers.length})</span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder={activeTab === "MODELS" ? "Search Brand, Model..." : "Search Customer Name..."}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Main Content View */}
      {activeTab === "MODELS" ? (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredModels.map((m) => (
              <div
                key={m.id}
                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden group shadow-lg"
              >
                <div className="flex justify-between items-start mb-3">
                  <span className="text-xs font-semibold text-zinc-400 bg-zinc-800/80 px-2.5 py-1 rounded-md border border-white/5 uppercase">
                    {m.brand}
                  </span>
                  <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/30">
                    {m.year}
                  </span>
                </div>

                <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-cyan-300 transition-colors">
                  {m.model}
                </h3>
                <div className="flex items-center gap-2 text-xs text-zinc-400">
                  <Tag className="w-3.5 h-3.5 text-zinc-500" />
                  <span>Category: {m.category}</span>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 text-[11px] text-zinc-500">
                  Static Motorcycle Model Template (No engine or plate number required)
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto pr-1">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredCustomers.map((c) => (
              <div
                key={c.id}
                className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6 hover:border-purple-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden group shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="text-xs font-bold text-purple-400 bg-purple-950/80 border border-purple-500/30 px-3 py-1 rounded-lg">
                      {c.selected_model}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-white mb-1 group-hover:text-purple-300 transition-colors">
                    {c.customer_name}
                  </h3>
                  {c.contact_number && (
                    <p className="text-xs text-zinc-400 flex items-center gap-1.5 mb-3">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      {c.contact_number}
                    </p>
                  )}

                  {c.notes && (
                    <p className="text-xs text-zinc-400 italic bg-zinc-950/50 p-2.5 rounded-xl border border-white/5 mb-4">
                      "{c.notes}"
                    </p>
                  )}
                </div>

                <button
                  onClick={() => openCustomerLogs(c)}
                  className="w-full bg-zinc-800/80 hover:bg-purple-600 text-zinc-200 hover:text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-white/5 hover:border-purple-500"
                >
                  <History className="w-3.5 h-3.5" />
                  View Repair History Log
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Model Modal */}
      {isAddModelModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-cyan-400" /> Add Static Motorcycle Model
              </h3>
              <button onClick={() => setIsAddModelModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddModel} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Make / Brand *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Yamaha, Honda, Kawasaki"
                  value={modelForm.brand}
                  onChange={(e) => setModelForm({ ...modelForm, brand: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MT-07, Click 125i"
                  value={modelForm.model}
                  onChange={(e) => setModelForm({ ...modelForm, model: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Year *</label>
                  <input
                    type="number"
                    required
                    value={modelForm.year}
                    onChange={(e) => setModelForm({ ...modelForm, year: parseInt(e.target.value) || 2024 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Category</label>
                  <input
                    type="text"
                    placeholder="e.g. Scooter, Naked"
                    value={modelForm.category}
                    onChange={(e) => setModelForm({ ...modelForm, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddModelModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-cyan-600 hover:bg-cyan-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg"
                >
                  Save Model Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Customer Profile Modal */}
      {isAddCustomerModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <User className="w-5 h-5 text-purple-400" /> Register Customer Repair Profile
              </h3>
              <button onClick={() => setIsAddCustomerModalOpen(false)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCustomer} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. John Doe"
                  value={customerForm.customer_name}
                  onChange={(e) => setCustomerForm({ ...customerForm, customer_name: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Contact Number</label>
                <input
                  type="text"
                  placeholder="e.g. +1 555-0192"
                  value={customerForm.contact_number}
                  onChange={(e) => setCustomerForm({ ...customerForm, contact_number: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Select Static Motorcycle Model Category *</label>
                <select
                  value={customerForm.selected_model}
                  onChange={(e) => setCustomerForm({ ...customerForm, selected_model: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500"
                >
                  {models.map((m) => (
                    <option key={m.id} value={`${m.brand} ${m.model} (${m.year})`}>
                      {m.brand} {m.model} ({m.year}) - {m.category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Initial Service / Mechanic Notes</label>
                <textarea
                  rows={2}
                  placeholder="Service description or notes..."
                  value={customerForm.notes}
                  onChange={(e) => setCustomerForm({ ...customerForm, notes: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-purple-600 hover:bg-purple-500 text-white px-5 py-2 rounded-xl text-sm font-bold shadow-lg"
                >
                  Register Profile
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Log Drawer */}
      {selectedCustomer && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-end z-50">
          <div className="bg-zinc-900 border-l border-white/10 w-full max-w-lg h-full flex flex-col shadow-2xl">
            <div className="p-6 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white">{selectedCustomer.customer_name}</h3>
                <p className="text-xs text-purple-400 font-semibold mt-0.5">{selectedCustomer.selected_model}</p>
              </div>
              <button onClick={() => setSelectedCustomer(null)} className="text-zinc-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-3">
              {repairHistory.map((log) => (
                <div key={log.job_id} className="bg-zinc-950/80 border border-white/10 rounded-2xl p-4 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono text-cyan-400 font-bold">{log.jo_number}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                      {log.status}
                    </span>
                  </div>
                  <div className="text-sm font-semibold text-white">{log.motorcycle_model}</div>
                  <div className="flex justify-between items-center text-xs text-zinc-400 pt-2 border-t border-white/5">
                    <span>Date: {new Date(log.date_repaired).toLocaleDateString()}</span>
                    <span className="font-mono text-emerald-400 font-bold">${(log.labor_charge + log.parts_charge).toFixed(2)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
