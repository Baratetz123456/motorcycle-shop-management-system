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
  ArrowUpDown,
  AlertTriangle,
  CheckCircle2,
  ChevronRight
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { Modal, ModalHeader, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { recordUserAuditLog } from "@/lib/audit";
import { Skeleton } from "@/components/ui/Skeleton";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

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

function getMotorcycleImage(category = "", model = "", brand = "") {
  const norm = `${category} ${model} ${brand}`.toLowerCase();
  if (
    norm.includes("scooter") ||
    norm.includes("nmax") ||
    norm.includes("click") ||
    norm.includes("vespa") ||
    norm.includes("aerox") ||
    norm.includes("pcx") ||
    norm.includes("mio") ||
    norm.includes("beat") ||
    norm.includes("burgman") ||
    norm.includes("fazzio")
  ) {
    return "/images/banners/bikes/scooter.jpg";
  }
  if (
    norm.includes("sport") ||
    norm.includes("ninja") ||
    norm.includes("panigale") ||
    norm.includes("cbr") ||
    norm.includes("r3") ||
    norm.includes("r15") ||
    norm.includes("r1") ||
    norm.includes("r6") ||
    norm.includes("gsx") ||
    norm.includes("rc200") ||
    norm.includes("rc390") ||
    norm.includes("superbike") ||
    norm.includes("zx-")
  ) {
    return "/images/banners/bikes/sportbike.jpg";
  }
  if (
    norm.includes("naked") ||
    norm.includes("mt-") ||
    norm.includes("mt0") ||
    norm.includes("duke") ||
    norm.includes("z400") ||
    norm.includes("z650") ||
    norm.includes("z900") ||
    norm.includes("cb650") ||
    norm.includes("monster") ||
    norm.includes("street triple")
  ) {
    return "/images/banners/bikes/naked.jpg";
  }
  if (
    norm.includes("underbone") ||
    norm.includes("raider") ||
    norm.includes("sniper") ||
    norm.includes("wave") ||
    norm.includes("smash") ||
    norm.includes("winner") ||
    norm.includes("fury") ||
    norm.includes("xrm")
  ) {
    return "/images/banners/bikes/underbone.jpg";
  }
  if (
    norm.includes("adventure") ||
    norm.includes("adv") ||
    norm.includes("gs") ||
    norm.includes("v-strom") ||
    norm.includes("versys") ||
    norm.includes("tenere") ||
    norm.includes("crf") ||
    norm.includes("klx") ||
    norm.includes("enduro") ||
    norm.includes("rally") ||
    norm.includes("touring") ||
    norm.includes("dual")
  ) {
    return "/images/banners/bikes/adventure.jpg";
  }
  if (
    norm.includes("cruiser") ||
    norm.includes("rebel") ||
    norm.includes("harley") ||
    norm.includes("vulcan") ||
    norm.includes("shadow") ||
    norm.includes("bolt") ||
    norm.includes("classic") ||
    norm.includes("bobber") ||
    norm.includes("scrambler")
  ) {
    return "/images/banners/bikes/cruiser.jpg";
  }
  return "/images/banners/bikes/general.jpg";
}

export default function MotorcycleProfilesPage() {
  const [profiles, setProfiles] = useState<MotorcycleProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [selectedBrand, setSelectedBrand] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<"FREQ_DESC" | "FREQ_ASC" | "YEAR_DESC" | "BRAND_ASC">("FREQ_DESC");
  const [userRole, setUserRole] = useState<string>("");
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  const activeFilterCount = useMemo(() => {
    return (
      (search.trim() ? 1 : 0) +
      (selectedBrand !== "ALL" ? 1 : 0) +
      (selectedCategory !== "ALL" ? 1 : 0) +
      (sortBy !== "FREQ_DESC" ? 1 : 0)
    );
  }, [search, selectedBrand, selectedCategory, sortBy]);

  const handleResetAllFilters = () => {
    setSearch("");
    setSelectedBrand("ALL");
    setSelectedCategory("ALL");
    setSortBy("FREQ_DESC");
  };

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
          (p.brand || "").toLowerCase() === selectedBrand.toLowerCase();

        return matchesSearch && matchesCategory && matchesBrand;
      })
      .sort((a, b) => {
        if (sortBy === "FREQ_DESC") return (b.service_frequency || 0) - (a.service_frequency || 0);
        if (sortBy === "FREQ_ASC") return (a.service_frequency || 0) - (b.service_frequency || 0);
        if (sortBy === "YEAR_DESC") return b.year - a.year;
        if (sortBy === "BRAND_ASC") return a.brand.localeCompare(b.brand);
        return 0;
      });
  }, [profiles, search, selectedCategory, selectedBrand, sortBy]);

  // Open Edit Modal with Profile Data
  const openEditModal = (profile: MotorcycleProfile) => {
    setSelectedProfile(profile);
    setFormBrand(profile.brand);
    setFormModel(profile.model);
    setFormYear(profile.year);
    setFormCategory(profile.category || "Scooter");
    setIsEditModalOpen(true);
  };

  // Open Delete Modal
  const openDeleteModal = (profile: MotorcycleProfile) => {
    setSelectedProfile(profile);
    setIsDeleteModalOpen(true);
  };

  // Handle New Motorcycle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBrand.trim() || !formModel.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        brand: formBrand.trim(),
        model: formModel.trim(),
        year: Number(formYear),
        category: formCategory,
        is_active: true
      };

      const res = await apiClient.post<MotorcycleProfile>("/repairs/motorcycle-models", payload);
      if (res.data && res.data.id) {
        setProfiles((prev) => [res.data, ...prev]);
        recordUserAuditLog("MOTORCYCLE_CREATED", `/motorcycles/${res.data.id}`, {
          id: res.data.id,
          brand: res.data.brand,
          model: res.data.model,
          year: res.data.year,
          category: res.data.category,
        });
        setStatusMessage({
          type: "success",
          text: `Motorcycle profile "${res.data.brand} ${res.data.model}" registered successfully.`
        });
        setIsRegisterModalOpen(false);
        setFormModel("");
      }
    } catch (e: any) {
      console.error("Failed to register motorcycle profile:", e);
      setStatusMessage({
        type: "error",
        text: e.response?.data?.detail || "Failed to register motorcycle profile. Please check the inputs."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle Profile Update
  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile || !formBrand.trim() || !formModel.trim()) return;

    setIsSubmitting(true);
    setStatusMessage(null);
    try {
      const payload = {
        brand: formBrand.trim(),
        model: formModel.trim(),
        year: Number(formYear),
        category: formCategory,
        is_active: selectedProfile.is_active ?? true
      };

      const res = await apiClient.put<MotorcycleProfile>(`/repairs/motorcycle-models/${selectedProfile.id}`, payload);
      if (res.data) {
        setProfiles((prev) => prev.map((p) => (p.id === selectedProfile.id ? { ...p, ...res.data } : p)));
        recordUserAuditLog("MOTORCYCLE_UPDATED", `/motorcycles/${selectedProfile.id}`, {
          id: selectedProfile.id,
          brand: res.data.brand,
          model: res.data.model,
          year: res.data.year,
          category: res.data.category,
        });
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
      recordUserAuditLog("MOTORCYCLE_DELETED", `/motorcycles/${selectedProfile.id}`, {
        id: selectedProfile.id,
        brand: selectedProfile.brand,
        model: selectedProfile.model,
        year: selectedProfile.year,
        action: "soft_delete",
      });
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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-zinc-950 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans text-zinc-100">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Bike className="w-8 h-8 text-emerald-400" />
            Bike Registry
          </h1>
          <p className="text-zinc-400 mt-1 text-sm max-w-2xl">
            Master catalog of motorcycle makes, models, and service intervals.
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
            className="bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-sm border border-emerald-500/30"
          >
            <Plus className="w-4 h-4" />
            Add Bike Model
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={clsx(
            "mb-5 p-4 rounded-2xl flex items-center justify-between text-sm flex-shrink-0 transition-all",
            statusMessage.type === "success"
              ? "bg-emerald-950/80 border border-emerald-800/80 text-emerald-300"
              : "bg-rose-950/80 border border-rose-800/80 text-rose-300"
          )}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-400 flex-shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-zinc-400 hover:text-white transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls Bar (Unified Dark Zinc Toolbar) */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-zinc-900 border border-zinc-800 rounded-2xl shadow-sm shrink-0">
        {/* Left: Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-zinc-400 font-medium">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
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
              className="bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer"
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
              className="bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 cursor-pointer font-semibold"
            >
              <option value="FREQ_DESC">Service Frequency: Highest First</option>
              <option value="FREQ_ASC">Service Frequency: Lowest First</option>
              <option value="YEAR_DESC">Year: Newest First</option>
              <option value="BRAND_ASC">Brand (A-Z)</option>
            </select>
          </div>

          {/* Result Counter */}
          <span className="text-xs text-zinc-500 font-mono pl-2 border-l border-zinc-800 hidden sm:inline">
            {filteredAndSortedProfiles.length} {filteredAndSortedProfiles.length === 1 ? "profile" : "profiles"}
          </span>
        </div>

        {/* Right: Search */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
          <input
            type="text"
            placeholder="Search Brand or Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          />
        </div>
      </div>

      {/* Motorcycles Data Container (Aligned with Customer Records Table) */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-zinc-900 border-0 md:border md:border-zinc-800 rounded-none md:rounded-2xl flex flex-col shadow-none">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Borderless Edge-to-Edge Motorcycle Rows */}
          <div className="block md:hidden px-1 divide-y divide-zinc-800/80 pb-24">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="py-3.5 px-2 space-y-2">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-14 h-12 rounded-xl bg-zinc-800 shrink-0" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-32 rounded bg-zinc-800" />
                      <Skeleton className="h-3 w-20 rounded bg-zinc-800" />
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1">
                    <Skeleton className="h-3 w-20 rounded bg-zinc-800" />
                    <Skeleton className="h-3 w-16 rounded bg-zinc-800" />
                  </div>
                </div>
              ))
            ) : filteredAndSortedProfiles.length === 0 ? (
              <div className="text-center py-16 text-zinc-500">
                <Bike className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                <p className="font-semibold text-zinc-300 text-sm">No motorcycle profiles found.</p>
                <p className="text-xs text-zinc-500 mt-1">
                  {search || selectedBrand !== "ALL" || selectedCategory !== "ALL"
                    ? "Try resetting your search or filters."
                    : "No motorcycle profiles have been registered yet."}
                </p>
                {(search || selectedBrand !== "ALL" || selectedCategory !== "ALL") && (
                  <button
                    onClick={handleResetAllFilters}
                    className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-xs"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            ) : (
              filteredAndSortedProfiles.map((p) => (
                <div
                  key={p.id}
                  onClick={() => openEditModal(p)}
                  className="py-3.5 px-2 hover:bg-zinc-850 active:bg-zinc-800 transition-colors cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center gap-3">
                    {/* Realistic Photographic Bike Thumbnail */}
                    <div className="w-14 h-12 rounded-xl overflow-hidden relative border border-zinc-800 shrink-0 bg-zinc-950">
                      <img
                        src={getMotorcycleImage(p.category, p.model, p.brand)}
                        alt={p.model}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-sm text-zinc-100 group-hover:text-emerald-400 transition-colors truncate">
                          {p.model}
                        </span>
                        <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/60 shrink-0">
                          {p.year}
                        </span>
                      </div>
                      <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-950 px-2 py-0.5 rounded border border-zinc-800 uppercase tracking-wider inline-block mt-1">
                        {p.brand}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-xs text-zinc-400 pt-1">
                    <span className="inline-flex items-center gap-1.5 text-zinc-400">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      {p.category || "General"}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="flex items-center gap-1 text-[11px] font-mono font-medium text-zinc-300">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                        {p.service_frequency} {p.service_frequency === 1 ? "Visit" : "Visits"}
                      </span>
                      <ChevronRight className="w-3.5 h-3.5 text-zinc-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Full Data Table with Photographic Thumbnails */}
          <table className="hidden md:table w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-950 text-zinc-400 border-b border-zinc-800 sticky top-0 z-10 font-bold tracking-wider">
              <tr>
                <th className="px-6 py-4 font-bold">Brand & Model</th>
                <th className="px-6 py-4 font-bold">Model Year</th>
                <th className="px-6 py-4 font-bold">Category</th>
                <th className="px-6 py-4 font-bold text-center">Service Frequency</th>
                <th className="px-6 py-4 font-bold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 bg-zinc-900/40">
              {loading ? (
                Array.from({ length: 7 }).map((_, rIdx) => (
                  <tr key={rIdx} className="hover:bg-zinc-800/40">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-14 h-10 rounded-lg bg-zinc-800" />
                        <div className="space-y-1.5">
                          <Skeleton className="h-5 w-36 rounded-lg bg-zinc-800" />
                          <Skeleton className="h-3 w-20 rounded bg-zinc-800" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16 rounded bg-zinc-800" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24 rounded bg-zinc-800" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Skeleton className="h-5 w-20 rounded-full mx-auto bg-zinc-800" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Skeleton className="h-7 w-16 rounded-lg ml-auto bg-zinc-800" />
                    </td>
                  </tr>
                ))
              ) : filteredAndSortedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-zinc-500">
                    <Bike className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                    <p className="font-semibold text-zinc-300">No motorcycle profiles found.</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {search || selectedBrand !== "ALL" || selectedCategory !== "ALL"
                        ? "Try resetting your search or filters."
                        : "No motorcycle profiles have been registered yet."}
                    </p>
                    {(search || selectedBrand !== "ALL" || selectedCategory !== "ALL") && (
                      <button
                        onClick={handleResetAllFilters}
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-200 hover:text-white transition-all shadow-xs"
                      >
                        <X className="w-4 h-4" />
                        <span>Reset All Filters</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredAndSortedProfiles.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => openEditModal(p)}
                    className="hover:bg-zinc-800/40 transition-all cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        {/* Photographic Motorcycle Preview Thumbnail */}
                        <div className="w-14 h-10 rounded-lg overflow-hidden relative border border-zinc-800 shrink-0 bg-zinc-950 group-hover:border-zinc-700 transition-colors">
                          <img
                            src={getMotorcycleImage(p.category, p.model, p.brand)}
                            alt={p.model}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                            loading="lazy"
                          />
                        </div>
                        <div>
                          <div className="font-bold text-zinc-100 group-hover:text-emerald-400 transition-colors">
                            {p.model}
                          </div>
                          <div className="text-xs text-zinc-400">
                            {p.brand}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-zinc-300 bg-zinc-950 px-2.5 py-1 rounded-md border border-zinc-800 font-semibold">
                        {p.year}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-zinc-300">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                        {p.category || "General"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-zinc-950 text-zinc-300 border border-zinc-800">
                        <Wrench className="w-3.5 h-3.5 text-emerald-400" />
                        {p.service_frequency} {p.service_frequency === 1 ? "Visit" : "Visits"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="inline-flex items-center text-xs text-zinc-500 group-hover:text-emerald-400 transition-colors font-semibold">
                        <span className="hidden group-hover:inline mr-1">{isAdmin ? "Edit Profile" : "View Profile"}</span>
                        <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Footer (Matching Customer Records) */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs text-zinc-500 shrink-0">
          <div>Showing {filteredAndSortedProfiles.length} motorcycle profile(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Accessible by Admin, Manager, and Mechanic</span>
          </div>
        </div>
      </div>

      {/* Modal: Register Motorcycle Profile */}
      <Modal
        isOpen={isRegisterModalOpen}
        onClose={() => setIsRegisterModalOpen(false)}
        size="md"
      >
        <ModalHeader
          icon={Bike}
          iconVariant="lime"
          title="Add Bike Model"
          subtitle="Register a new motorcycle model in the catalog"
          onClose={() => setIsRegisterModalOpen(false)}
        />

        <form onSubmit={handleRegister}>
          <ModalBody className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Make / Brand *</label>
              <input
                type="text"
                required
                list="brand-suggestions"
                placeholder="e.g. Yamaha, Honda, Kawasaki"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-xs"
              />
              <datalist id="brand-suggestions">
                {availableBrands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-300 mb-1">Model Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. MT-07, Click 125i, Ninja 400"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Model Year *</label>
                <input
                  type="number"
                  required
                  min={1970}
                  max={new Date().getFullYear() + 2}
                  value={formYear}
                  onChange={(e) => setFormYear(Number(e.target.value))}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-300 mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-xs"
                >
                  {CATEGORY_PRESETS.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsRegisterModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm border border-emerald-500/30"
            >
              {isSubmitting ? "Saving..." : "Save Bike Model"}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Modal: Edit Motorcycle Profile (Admin Only) */}
      <Modal
        isOpen={isEditModalOpen && !!selectedProfile}
        onClose={() => {
          setIsEditModalOpen(false);
          setSelectedProfile(null);
        }}
        size="md"
      >
        {selectedProfile && (
          <>
            <ModalHeader
              icon={Pencil}
              iconVariant="lime"
              title="Edit Bike Model"
              subtitle={`${selectedProfile.brand} ${selectedProfile.model} (${selectedProfile.year})`}
              onClose={() => {
                setIsEditModalOpen(false);
                setSelectedProfile(null);
              }}
            />

            <form onSubmit={handleEdit}>
              <ModalBody className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Make / Brand *</label>
                  <input
                    type="text"
                    required
                    list="brand-suggestions-edit"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-xs"
                  />
                  <datalist id="brand-suggestions-edit">
                    {availableBrands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-300 mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Model Year *</label>
                    <input
                      type="number"
                      required
                      min={1970}
                      max={new Date().getFullYear() + 2}
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 font-mono transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-300 mb-1">Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all shadow-xs"
                    >
                      {CATEGORY_PRESETS.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </ModalBody>

              <ModalFooter className="sm:justify-between">
                {isAdmin ? (
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setIsDeleteModalOpen(true);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-rose-900/60 hover:border-rose-700 bg-rose-950/40 hover:bg-rose-900/50 active:bg-rose-900/70 text-rose-300 hover:text-rose-200 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-xs"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>Archive Profile</span>
                  </button>
                ) : (
                  <div />
                )}
                <div className="flex flex-col-reverse sm:flex-row items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditModalOpen(false);
                      setSelectedProfile(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all shadow-xs"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-500/30 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Saving...</span>
                      </>
                    ) : (
                      <span>Save Changes</span>
                    )}
                  </button>
                </div>
              </ModalFooter>
            </form>
          </>
        )}
      </Modal>

      {/* Modal: Destructive Soft Delete Confirmation (Admin Only) */}
      <ConfirmModal
        isOpen={isDeleteModalOpen && !!selectedProfile}
        onClose={() => {
          setIsDeleteModalOpen(false);
          setSelectedProfile(null);
        }}
        onConfirm={handleDelete}
        isLoading={isSubmitting}
        confirmVariant="danger"
        title="Archive Bike Model"
        confirmText="Yes, Soft-Delete Profile"
        cancelText="Keep Profile"
        message={
          selectedProfile ? (
            <div className="space-y-4">
              <p className="text-sm text-zinc-300">
                Are you sure you want to soft-delete the profile for{" "}
                <span className="font-bold text-white">
                  {selectedProfile.brand} {selectedProfile.model} ({selectedProfile.year})
                </span>
                ?
              </p>

              <div className="p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl text-xs text-rose-300 text-left">
                <p className="font-semibold mb-1">Preservation Notice:</p>
                <p className="text-zinc-400">
                  This profile will be archived and hidden from the active catalog. Historical repair job orders, invoices, and customer service records will remain fully intact.
                </p>
              </div>
            </div>
          ) : ""
        }
      />

      {/* Floating Filter FAB (Mobile Only) */}
      <FloatingFilterButton
        onClick={() => setIsMobileFilterOpen(true)}
        activeCount={activeFilterCount}
      />

      {/* Mobile Slide-Up Filter Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Bike Models"
        activeCount={activeFilterCount}
        onReset={handleResetAllFilters}
      >
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Search Brand or Model</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder="Search Brand or Model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Brand</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="ALL">All Brands</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 text-zinc-200 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-zinc-950 border border-zinc-800 text-emerald-400 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-emerald-500/50 cursor-pointer font-medium"
          >
            <option value="FREQ_DESC">Service Frequency: Highest First</option>
            <option value="FREQ_ASC">Service Frequency: Lowest First</option>
            <option value="YEAR_DESC">Year: Newest First</option>
            <option value="BRAND_ASC">Brand (A-Z)</option>
          </select>
        </div>
      </MobileFilterSheet>
    </div>
  );
}
