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
  ShieldAlert,
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
        recordUserAuditLog("MOTORCYCLE_CREATED", "/motorcycles", {
          id: res.data.id,
          brand: res.data.brand,
          model: res.data.model,
          year: res.data.year,
          category: res.data.category,
        });
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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-slate-50 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 flex-shrink-0">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 flex items-center gap-3">
            <Bike className="w-8 h-8 text-lime-600" />
            Bike Registry
          </h1>
          <p className="text-slate-500 mt-1 text-sm max-w-2xl">
            Master catalog of bike makes, models, and service intervals.
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
            className="bg-lime-500 hover:bg-lime-400 text-zinc-950 px-5 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-sm shadow-sm"
          >
            <Plus className="w-4 h-4" />
            + Add Bike Model
          </button>
        </div>
      </div>

      {/* Alert Banner */}
      {statusMessage && (
        <div
          className={clsx(
            "mb-5 p-4 rounded-2xl flex items-center justify-between text-sm flex-shrink-0 transition-all",
            statusMessage.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-rose-50 border border-rose-200 text-rose-800"
          )}
        >
          <div className="flex items-center gap-2.5">
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-rose-600 flex-shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-slate-400 hover:text-slate-700 transition-colors ml-4"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search & Filter Controls Bar (Desktop Sales-style Toolbar Banner) */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-white border border-slate-200 rounded-2xl shadow-sm shrink-0">
        {/* Left: Filters and Sorting */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Brand Filter */}
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-600 font-medium">Brand:</span>
            <select
              value={selectedBrand}
              onChange={(e) => setSelectedBrand(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500/50 cursor-pointer"
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
            <span className="text-xs text-slate-600 font-medium">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500/50 cursor-pointer"
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
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-lime-50 border border-lime-200 text-lime-900 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-lime-500/50 cursor-pointer font-semibold"
            >
              <option value="FREQ_DESC">Service Frequency: Highest First</option>
              <option value="FREQ_ASC">Service Frequency: Lowest First</option>
              <option value="YEAR_DESC">Year: Newest First</option>
              <option value="BRAND_ASC">Brand (A-Z)</option>
            </select>
          </div>

          {/* Result Counter */}
          <span className="text-xs text-slate-500 font-mono pl-2 border-l border-slate-200 hidden sm:inline">
            {filteredAndSortedProfiles.length} {filteredAndSortedProfiles.length === 1 ? "profile" : "profiles"}
          </span>
        </div>

        {/* Right: Search */}
        <div className="relative w-full lg:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search Brand or Model..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50"
          />
        </div>
      </div>

      {/* Motorcycles Data Container */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-transparent md:bg-white border-0 md:border md:border-slate-200 rounded-none md:rounded-2xl flex flex-col shadow-none md:shadow-sm">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Borderless Edge-to-Edge List Rows */}
          <div className="block md:hidden px-1 divide-y divide-slate-100 pb-24">
            {loading ? (
              Array.from({ length: 5 }).map((_, idx) => (
                <div key={idx} className="py-3.5 px-2 space-y-2">
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-5 w-28 rounded-lg" />
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>
                  <Skeleton className="h-4 w-40 rounded" />
                  <div className="flex justify-between items-center pt-1">
                    <Skeleton className="h-4 w-24 rounded" />
                    <Skeleton className="h-4 w-20 rounded" />
                  </div>
                </div>
              ))
            ) : filteredAndSortedProfiles.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Bike className="w-8 h-8 mx-auto text-slate-400 mb-2" />
                <p className="font-semibold text-slate-700 text-sm">No motorcycle profiles found.</p>
                <p className="text-xs text-slate-500 mt-1">
                  {search || selectedBrand !== "ALL" || selectedCategory !== "ALL"
                    ? "Try resetting your search or filters."
                    : "No motorcycle profiles have been registered yet."}
                </p>
                {(search || selectedBrand !== "ALL" || selectedCategory !== "ALL") && (
                  <button
                    onClick={handleResetAllFilters}
                    className="mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 hover:text-slate-950 transition-all shadow-xs"
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
                  onClick={() => {
                    if (isAdmin) {
                      openEditModal(p);
                    }
                  }}
                  className="py-3.5 px-2 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-2 group"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-900 group-hover:text-lime-700 transition-colors">
                        {p.model}
                      </span>
                      <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 uppercase tracking-wider">
                        {p.brand}
                      </span>
                    </div>
                    <span className="text-xs font-mono font-bold text-lime-900 bg-lime-50 px-2 py-0.5 rounded border border-lime-200 shrink-0">
                      {p.year}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-600 pt-0.5">
                    <span className="inline-flex items-center gap-1.5 text-slate-600">
                      <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                      {p.category || "General"}
                    </span>
                    <span className="flex items-center gap-1.5 text-slate-800 font-mono font-medium">
                      <Wrench className="w-3.5 h-3.5 text-lime-600" />
                      {p.service_frequency} {p.service_frequency === 1 ? "Visit" : "Visits"}
                    </span>
                  </div>

                  {isAdmin && (
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(p);
                        }}
                        className="p-1.5 text-slate-500 hover:text-lime-700 hover:bg-lime-50 rounded-lg transition-all"
                        title="Edit Profile"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          openDeleteModal(p);
                        }}
                        className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                        title="Archive Profile"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Full Data Table */}
          <table className="hidden md:table w-full text-left text-sm text-slate-700 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 font-bold">
              <tr>
                <th className="px-6 py-4">Brand & Model</th>
                <th className="px-6 py-4">Model Year</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4 text-center">Service Frequency</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                Array.from({ length: 7 }).map((_, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
                    <td className="px-6 py-4">
                      <div className="space-y-1.5">
                        <Skeleton className="h-5 w-36 rounded-lg" />
                        <Skeleton className="h-3 w-20 rounded" />
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-16 rounded" />
                    </td>
                    <td className="px-6 py-4">
                      <Skeleton className="h-4 w-24 rounded" />
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Skeleton className="h-5 w-20 rounded-full mx-auto" />
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Skeleton className="h-7 w-16 rounded-lg ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredAndSortedProfiles.length === 0 ? (
                <tr>
                  <td colSpan={5} className="text-center py-16 text-slate-500">
                    <Bike className="w-10 h-10 mx-auto text-slate-400 mb-2" />
                    <p className="font-semibold text-slate-700">No motorcycle profiles found.</p>
                    <p className="text-xs text-slate-500 mt-1">
                      {search || selectedBrand !== "ALL" || selectedCategory !== "ALL"
                        ? "Try resetting your search or filters."
                        : "No motorcycle profiles have been registered yet."}
                    </p>
                    {(search || selectedBrand !== "ALL" || selectedCategory !== "ALL") && (
                      <button
                        onClick={handleResetAllFilters}
                        className="mt-4 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-xs font-semibold text-slate-800 hover:text-slate-950 transition-all shadow-xs"
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
                    onClick={() => {
                      if (isAdmin) {
                        openEditModal(p);
                      }
                    }}
                    className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-lime-50 border border-lime-200 flex items-center justify-center shrink-0 text-lime-700">
                          <Bike className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 group-hover:text-lime-700 transition-colors">
                            {p.model}
                          </div>
                          <div className="text-xs text-slate-500">
                            {p.brand}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-mono text-xs text-slate-800 bg-slate-100 px-2.5 py-1 rounded-md border border-slate-200 font-semibold">
                        {p.year}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-700">
                      <span className="inline-flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-lime-500" />
                        {p.category || "General"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200">
                        <Wrench className="w-3.5 h-3.5 text-lime-600" />
                        {p.service_frequency} {p.service_frequency === 1 ? "Visit" : "Visits"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                        {isAdmin && (
                          <>
                            <button
                              onClick={() => openEditModal(p)}
                              title="Edit Profile"
                              className="p-1.5 text-slate-400 hover:text-lime-700 hover:bg-lime-50 rounded-lg transition-all"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => openDeleteModal(p)}
                              title="Archive Profile (Soft Delete)"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                        <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-lime-700 transition-colors ml-1" />
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
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
              <label className="block text-xs font-semibold text-slate-600 mb-1">Make / Brand *</label>
              <input
                type="text"
                required
                list="brand-suggestions"
                placeholder="e.g. Yamaha, Honda, Kawasaki"
                value={formBrand}
                onChange={(e) => setFormBrand(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
              />
              <datalist id="brand-suggestions">
                {availableBrands.map((b) => (
                  <option key={b} value={b} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Model Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. MT-07, Click 125i, Ninja 400"
                value={formModel}
                onChange={(e) => setFormModel(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Model Year *</label>
                <input
                  type="number"
                  required
                  min={1970}
                  max={new Date().getFullYear() + 2}
                  value={formYear}
                  onChange={(e) => setFormYear(Number(e.target.value))}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 font-mono transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                <select
                  value={formCategory}
                  onChange={(e) => setFormCategory(e.target.value)}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
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
              className="px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-sm"
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
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Make / Brand *</label>
                  <input
                    type="text"
                    required
                    list="brand-suggestions-edit"
                    value={formBrand}
                    onChange={(e) => setFormBrand(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                  />
                  <datalist id="brand-suggestions-edit">
                    {availableBrands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 mb-1">Model Name *</label>
                  <input
                    type="text"
                    required
                    value={formModel}
                    onChange={(e) => setFormModel(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Model Year *</label>
                    <input
                      type="number"
                      required
                      min={1970}
                      max={new Date().getFullYear() + 2}
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 font-mono transition-all shadow-xs"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Category *</label>
                    <select
                      value={formCategory}
                      onChange={(e) => setFormCategory(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
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
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setSelectedProfile(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 hover:border-slate-300 dark:hover:border-zinc-600 bg-slate-100 dark:bg-zinc-800 hover:bg-slate-200 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-100 text-xs font-semibold transition-all shadow-xs active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-lime-500 hover:bg-lime-400 text-zinc-950 text-xs font-bold transition-all border border-lime-600 shadow-sm active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-3.5 h-3.5 border-2 border-zinc-950 border-t-transparent rounded-full animate-spin" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
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
              <p className="text-sm text-slate-700">
                Are you sure you want to soft-delete the profile for{" "}
                <span className="font-bold text-slate-900">
                  {selectedProfile.brand} {selectedProfile.model} ({selectedProfile.year})
                </span>
                ?
              </p>

              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 text-left">
                <p className="font-semibold mb-1">Preservation Notice:</p>
                <p className="text-slate-600">
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
          <label className="text-xs font-semibold text-slate-700">Search Brand or Model</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search Brand or Model..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-lime-500/50"
            />
          </div>
        </div>

        {/* Brand */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Brand</label>
          <select
            value={selectedBrand}
            onChange={(e) => setSelectedBrand(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-lime-500/50 cursor-pointer"
          >
            <option value="ALL">All Brands</option>
            {availableBrands.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Category</label>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-lime-500/50 cursor-pointer"
          >
            <option value="ALL">All Categories</option>
            {availableCategories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Sort */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700">Sort By</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="w-full bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3.5 py-2.5 focus:outline-none focus:ring-1 focus:ring-lime-500/50 cursor-pointer font-medium"
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
