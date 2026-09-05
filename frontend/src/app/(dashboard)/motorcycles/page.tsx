"use client";

import { useEffect, useState, useMemo } from "react";
import { 
  Bike, 
  Search, 
  Plus, 
  Wrench, 
  X, 
  Pencil, 
  Trash2, 
  Filter, 
  ArrowUpDown,
  AlertTriangle,
  Sparkles,
  CheckCircle2,
  Calendar,
  Layers,
  ShieldAlert
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";

export interface MotorcycleProfile {
  id: string;
  brand: string;
  model: string;
  year: number;
  category: string;
  is_active?: boolean;
  service_frequency: number;
  created_at?: string;
}

const CATEGORY_PRESETS = [
  "Scooter",
  "Underbone",
  "Sport",
  "Cruiser",
  "Touring",
  "Naked",
  "Dual-Sport",
  "General"
];

const BRAND_PRESETS = [
  "Yamaha",
  "Honda",
  "Kawasaki",
  "Suzuki",
  "Ducati",
  "KTM",
  "BMW",
  "Harley-Davidson",
  "Triumph",
  "Other"
];

export default function MotorcycleProfilesPage() {
  const [profiles, setProfiles] = useState<MotorcycleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"FREQ_DESC" | "FREQ_ASC" | "YEAR_DESC" | "BRAND_ASC">("FREQ_DESC");
  const [userRole, setUserRole] = useState<string>("");

  // Modals
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<MotorcycleProfile | null>(null);

  // Form states
  const [formBrand, setFormBrand] = useState("Yamaha");
  const [formModel, setFormModel] = useState("");
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formCategory, setFormCategory] = useState("Scooter");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    const role = localStorage.getItem("user_role") || "";
    setUserRole(role.toLowerCase());
    fetchProfiles();
  }, []);

  const fetchProfiles = async () => {
    setLoading(true);
    try {
      const res = await apiClient.get<MotorcycleProfile[]>("/repairs/motorcycle-models");
      if (Array.isArray(res.data)) {
        setProfiles(res.data);
      }
    } catch (e: any) {
      console.error("Failed to load motorcycle profiles:", e);
      setStatusMessage({
        type: "error",
        text: e.response?.data?.detail || "Could not fetch motorcycle profiles. Please try again."
      });
    } finally {
      setLoading(false);
    }
  };

  // Derive unique brands and categories for dropdowns
  const availableBrands = useMemo(() => {
    const fromProfiles = profiles.map(p => p.brand).filter(Boolean);
    const combined = Array.from(new Set([...BRAND_PRESETS.slice(0, 5), ...fromProfiles]));
    return combined.sort();
  }, [profiles]);

  const availableCategories = useMemo(() => {
    const fromProfiles = profiles.map(p => p.category).filter(Boolean);
    const combined = Array.from(new Set([...CATEGORY_PRESETS, ...fromProfiles]));
    return combined.sort();
  }, [profiles]);

  // Filter & sort profiles
  const filteredAndSortedProfiles = useMemo(() => {
    return profiles
      .filter((p) => {
        const matchesSearch = 
          search.trim() === "" ||
          `${p.brand} ${p.model}`.toLowerCase().includes(search.toLowerCase());
        const matchesCategory = 
          selectedCategory === "ALL" || 
          (p.category || "General").toLowerCase() === selectedCategory.toLowerCase();
        const matchesBrand = 
          selectedBrand === "ALL" || 
          p.brand.toLowerCase() === selectedBrand.toLowerCase();
        return matchesSearch && matchesCategory && matchesBrand;
      })
      .sort((a, b) => {
        if (sortBy === "FREQ_DESC") {
          return (b.service_frequency || 0) - (a.service_frequency || 0);
        }
        if (sortBy === "FREQ_ASC") {
          return (a.service_frequency || 0) - (b.service_frequency || 0);
        }
        if (sortBy === "YEAR_DESC") {
          return b.year - a.year;
        }
        if (sortBy === "BRAND_ASC") {
          const brandComp = a.brand.localeCompare(b.brand);
          if (brandComp !== 0) return brandComp;
          return a.model.localeCompare(b.model);
        }
        return 0;
      });
  }, [profiles, search, selectedCategory, selectedBrand, sortBy]);

  // Open Edit Modal
  const openEditModal = (profile: MotorcycleProfile) => {
    setSelectedProfile(profile);
    setFormBrand(profile.brand);
    setFormModel(profile.model);
    setFormYear(profile.year);
    setFormCategory(profile.category || "General");
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (profile: MotorcycleProfile) => {
    setSelectedProfile(profile);
    setIsDeleteModalOpen(true);
  };

  // Handle Register
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formModel.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.post<MotorcycleProfile>("/repairs/motorcycle-models", {
        brand: formBrand.trim(),
        model: formModel.trim(),
        year: Number(formYear),
        category: formCategory.trim()
      });
      if (res.data) {
        setProfiles((prev) => [res.data, ...prev]);
        setStatusMessage({
          type: "success",
          text: `Motorcycle profile "${res.data.brand} ${res.data.model}" successfully registered.`
        });
      }
      setIsRegisterModalOpen(false);
      setFormModel("");
    } catch (e: any) {
      console.error("Failed to register motorcycle profile:", e);
      setStatusMessage({
        type: "error",
        text: e.response?.data?.detail || "Failed to register motorcycle profile. Please verify your inputs."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Edit
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !formModel.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const res = await apiClient.put<MotorcycleProfile>(`/repairs/motorcycle-models/${selectedProfile.id}`, {
        brand: formBrand.trim(),
        model: formModel.trim(),
        year: Number(formYear),
        category: formCategory.trim()
      });
      if (res.data) {
        setProfiles((prev) =>
          prev.map((p) => (p.id === selectedProfile.id ? res.data : p))
        );
        setStatusMessage({
          type: "success",
          text: `Motorcycle profile "${res.data.brand} ${res.data.model}" updated successfully.`
        });
      }
      setIsEditModalOpen(false);
      setSelectedProfile(null);
    } catch (e: any) {
      console.error("Failed to update motorcycle profile:", e);
      setStatusMessage({
        type: "error",
        text: e.response?.data?.detail || "Failed to update profile. Only Admins can modify motorcycle profiles."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Soft Delete
  const handleDelete = async () => {
    if (!selectedProfile) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      await apiClient.delete(`/repairs/motorcycle-models/${selectedProfile.id}`);
      setProfiles((prev) => prev.filter((p) => p.id !== selectedProfile.id));
      setStatusMessage({
        type: "success",
        text: `Motorcycle profile "${selectedProfile.brand} ${selectedProfile.model}" has been archived.`
      });
      setIsDeleteModalOpen(false);
      setSelectedProfile(null);
    } catch (e: any) {
      console.error("Failed to delete motorcycle profile:", e);
      setStatusMessage({
        type: "error",
        text: e.response?.data?.detail || "Failed to delete profile. Admin privileges are required."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isAdmin = userRole === "admin";

  return (
    <div className="w-full h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Bike className="w-8 h-8 text-cyan-400" />
            Motorcycle Profiles
          </h1>
          <p className="text-zinc-400 mt-1 text-sm max-w-2xl">
            Browse motorcycle specifications, filter by brand and category, and monitor service frequency across all customer models.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormBrand("Yamaha");
              setFormModel("");
              setFormYear(new Date().getFullYear());
              setFormCategory("Scooter");
              setIsRegisterModalOpen(true);
            }}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] flex items-center gap-2 text-sm"
          >
            <Plus className="w-4 h-4" />
            + Register Motorcycle Profile
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={clsx(
            "mb-5 p-4 rounded-2xl flex items-center justify-between text-sm flex-shrink-0 transition-all",
            statusMessage.type === "success"
              ? "bg-emerald-950/40 border border-emerald-500/30 text-emerald-300"
              : "bg-rose-950/40 border border-rose-500/30 text-rose-300"
          )}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls Bar */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-4 mb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-shrink-0 backdrop-blur-md">
        {/* Search */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Brand or Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>

        {/* Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-zinc-950/80 border border-white/10 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="ALL">All Brands</option>
              {availableBrands.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-zinc-950/80 border border-white/10 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              {availableCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Sort By Frequency & Spec */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-3.5 h-3.5 text-zinc-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-zinc-950/80 border border-cyan-500/30 text-cyan-300 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer font-medium"
            >
              <option value="FREQ_DESC">Service Frequency: Highest First</option>
              <option value="FREQ_ASC">Service Frequency: Lowest First</option>
              <option value="YEAR_DESC">Year: Newest First</option>
              <option value="BRAND_ASC">Brand (A-Z)</option>
            </select>
          </div>

          {/* Result Counter */}
          <span className="text-xs text-zinc-500 font-mono pl-2 border-l border-white/10 hidden sm:inline">
            {filteredAndSortedProfiles.length} {filteredAndSortedProfiles.length === 1 ? "profile" : "profiles"}
          </span>
        </div>
      </div>

      {/* Main Grid: Motorcycle Profile Cards */}
      <div className="flex-1 overflow-y-auto pr-1">
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((idx) => (
              <div
                key={idx}
                className="bg-zinc-900/30 border border-white/5 rounded-2xl p-6 h-48 animate-pulse flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-5 bg-zinc-800 rounded w-1/3" />
                  <div className="h-8 bg-zinc-800 rounded w-3/4" />
                </div>
                <div className="h-10 bg-zinc-800 rounded w-full" />
              </div>
            ))}
          </div>
        ) : filteredAndSortedProfiles.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-zinc-900/30 border border-white/5 rounded-3xl">
            <Bike className="w-16 h-16 text-zinc-600 mb-4 stroke-1" />
            <h3 className="text-lg font-bold text-white mb-1">No Motorcycle Profiles Found</h3>
            <p className="text-sm text-zinc-400 max-w-md mb-6">
              {search || selectedBrand !== "ALL" || selectedCategory !== "ALL"
                ? "No profiles match your current search and filter combination. Try resetting your filters."
                : "No motorcycle profiles have been registered yet. Get started by registering your shop's first profile."}
            </p>
            {(search || selectedBrand !== "ALL" || selectedCategory !== "ALL") ? (
              <button
                onClick={() => {
                  setSearch("");
                  setSelectedBrand("ALL");
                  setSelectedCategory("ALL");
                }}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold rounded-xl transition-all"
              >
                Reset All Filters
              </button>
            ) : (
              <button
                onClick={() => setIsRegisterModalOpen(true)}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
              >
                <Plus className="w-4 h-4" /> Register First Profile
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredAndSortedProfiles.map((p) => (
              <div
                key={p.id}
                className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 hover:border-cyan-500/50 transition-all duration-300 backdrop-blur-md relative overflow-hidden group shadow-lg flex flex-col justify-between"
              >
                {/* Top: Brand & Year Badges + Admin Action Controls */}
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-zinc-300 bg-zinc-800/90 px-3 py-1 rounded-md border border-white/10 uppercase tracking-wider">
                        {p.brand}
                      </span>
                      <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-md border border-cyan-500/30">
                        {p.year}
                      </span>
                    </div>

                    {/* Admin Action Controls */}
                    {isAdmin && (
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(p)}
                          title="Edit Profile"
                          className="p-1.5 text-zinc-400 hover:text-cyan-300 hover:bg-cyan-950/50 rounded-lg transition-all"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openDeleteModal(p)}
                          title="Archive Profile (Soft Delete)"
                          className="p-1.5 text-zinc-400 hover:text-rose-400 hover:bg-rose-950/50 rounded-lg transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Model Headline */}
                  <h3 className="text-2xl font-bold text-white mb-1 group-hover:text-cyan-300 transition-colors truncate">
                    {p.model}
                  </h3>
                </div>

                {/* Service Frequency Metric Display */}
                <div className="mt-5 pt-3 border-t border-white/5">
                  <div className="flex items-center justify-between p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20">
                    <span className="text-xs font-medium text-zinc-400 flex items-center gap-2">
                      <Wrench className="w-4 h-4 text-cyan-400" />
                      Service Frequency:
                    </span>
                    <span className="text-sm font-mono font-bold text-cyan-300">
                      {p.service_frequency} {p.service_frequency === 1 ? "Visit" : "Visits"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Register Motorcycle Profile */}
      {isRegisterModalOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/60">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Bike className="w-5 h-5 text-cyan-400" /> Register Motorcycle Profile
              </h3>
              <button
                onClick={() => setIsRegisterModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Make / Brand *</label>
                <input
                  type="text"
                  required
                  list="brand-suggestions"
                  placeholder="e.g. Yamaha, Honda, Kawasaki"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <datalist id="brand-suggestions">
                  {availableBrands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. MT-07, Click 125i, Ninja 400"
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Model Year *</label>
                  <input
                    type="number"
                    required
                    min={1970}
                    max={new Date().getFullYear() + 2}
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsRegisterModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Registering..." : "Save Motorcycle Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Edit Motorcycle Profile (Admin Only) */}
      {isEditModalOpen && selectedProfile && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between bg-zinc-950/60">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Pencil className="w-5 h-5 text-cyan-400" /> Edit Motorcycle Profile
              </h3>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setSelectedProfile(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEdit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Make / Brand *</label>
                <input
                  type="text"
                  required
                  list="brand-suggestions-edit"
                  value={formBrand}
                  onChange={(e) => setFormBrand(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
                <datalist id="brand-suggestions-edit">
                  {availableBrands.map((b) => (
                    <option key={b} value={b} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Model Name *</label>
                <input
                  type="text"
                  required
                  value={formModel}
                  onChange={(e) => setFormModel(e.target.value)}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Model Year *</label>
                  <input
                    type="number"
                    required
                    min={1970}
                    max={new Date().getFullYear() + 2}
                    value={formYear}
                    onChange={(e) => setFormYear(Number(e.target.value))}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Category *</label>
                  <select
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {CATEGORY_PRESETS.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedProfile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Updating..." : "Update Profile"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Destructive Soft Delete Confirmation (Admin Only) */}
      {isDeleteModalOpen && selectedProfile && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
          <div className="bg-zinc-900 border border-rose-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className="p-5 border-b border-rose-500/20 flex items-center justify-between bg-rose-950/30">
              <h3 className="text-lg font-bold text-rose-400 flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-rose-400" /> Soft-Delete Motorcycle Profile
              </h3>
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setSelectedProfile(null);
                }}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-zinc-300">
                Are you sure you want to soft-delete the profile for{" "}
                <span className="font-bold text-white">
                  {selectedProfile.brand} {selectedProfile.model} ({selectedProfile.year})
                </span>
                ?
              </p>

              <div className="p-3.5 bg-rose-950/20 border border-rose-500/20 rounded-xl text-xs text-rose-300">
                <p className="font-semibold mb-1">Preservation Notice:</p>
                <p className="text-zinc-400">
                  This profile will be archived and hidden from the active catalog. Historical repair job orders, invoices, and customer service records will remain fully intact.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => {
                    setIsDeleteModalOpen(false);
                    setSelectedProfile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-all"
                >
                  Keep Profile
                </button>
                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={isSubmitting}
                  className="bg-rose-600 hover:bg-rose-500 text-white px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-[0_0_15px_-3px_rgba(244,63,94,0.4)] disabled:opacity-50"
                >
                  {isSubmitting ? "Archiving..." : "Yes, Soft-Delete Profile"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
