"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Package, 
  Wrench, 
  Search, 
  Plus, 
  Filter, 
  AlertTriangle, 
  X, 
  Check, 
  Sparkles,
  Tag, 
  Boxes, 
  Activity, 
  ChevronRight,
  CheckCircle2
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";
import { Modal, ModalBody, ModalFooter } from "@/components/ui/Modal";
import { recordUserAuditLog } from "@/lib/audit";
import { Skeleton } from "@/components/ui/Skeleton";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { FloatingFilterButton, MobileFilterSheet } from "@/components/ui/MobileFilterSheet";

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  item_type: "PRODUCT" | "SERVICE";
  category: string;
  current_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
  is_active?: boolean;
}

const COMMON_BRANDS = [
  "Motul",
  "Honda",
  "Yamaha",
  "Castrol",
  "Brembo",
  "Michelin",
  "K&N",
  "NGK",
  "Bosch",
  "Shell",
  "Akrapovič"
];

function InventoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  // Strictly two main tabs: PRODUCT and SERVICE
  const [activeTab, setActiveTab] = useState<"PRODUCT" | "SERVICE">("PRODUCT");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null);

  const activeFilterCount = useMemo(() => {
    return (search.trim() ? 1 : 0) + (selectedCategory !== "ALL" ? 1 : 0);
  }, [search, selectedCategory]);

  const handleResetAllFilters = () => {
    setSearch("");
    setSelectedCategory("ALL");
  };

  // Role-based access control
  const [userRole, setUserRole] = useState<string>("admin");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") || "admin";
      setUserRole(role.toLowerCase());
    }
  }, []);
  const canManage = userRole === "admin" || userRole === "manager";

  // Check if an item was just deleted
  useEffect(() => {
    if (searchParams.get("deleted") === "1") {
      setDeletedNotice("Item was removed successfully from the active inventory catalog.");
      const t = setTimeout(() => setDeletedNotice(null), 5000);
      return () => clearTimeout(t);
    }
  }, [searchParams]);

  // Default Categories & Category Registration State
  const [customCategories, setCustomCategories] = useState<string[]>([
    "Fluids",
    "Filters",
    "Brakes",
    "Engine",
    "Tires",
    "Maintenance",
    "Brake Service",
    "Labor",
    "Diagnostics",
    "Electrical",
    "Accessories"
  ]);
  const [isRegisteringCategory, setIsRegisteringCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Auto-generate SKU Code or Service Code
  const generateAutoCode = (type: "PRODUCT" | "SERVICE") => {
    const prefix = type === "PRODUCT" ? "SKU-PRD" : "SRV";
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${rand}`;
  };

  // New item form state
  const [formData, setFormData] = useState({
    sku: generateAutoCode("PRODUCT"),
    name: "",
    brand: "",
    item_type: "PRODUCT" as "PRODUCT" | "SERVICE",
    category: "Fluids",
    cost_price: 0,
    selling_price: 0,
    current_stock: 0,
    reorder_level: 5,
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      let list: CatalogItem[] = [];
      try {
        const res = await apiClient.get<CatalogItem[]>("/inventory");
        if (Array.isArray(res.data)) {
          list = res.data;
        }
      } catch (err) {
        // Empty list on error
      }

      const storedCustom = localStorage.getItem("motoshop_custom_inventory");
      if (storedCustom) {
        try {
          const customList: CatalogItem[] = JSON.parse(storedCustom);
          if (Array.isArray(customList) && customList.length > 0) {
            const existingIds = new Set(list.map((i) => i.id));
            const toAdd = customList.filter((ci) => !existingIds.has(ci.id));
            list = [...toAdd, ...list];
          }
        } catch (e) {}
      }

      const storedInv = localStorage.getItem("motoshop_inventory_stock");
      if (storedInv) {
        try {
          const invMap = JSON.parse(storedInv);
          list = list.map((item) => {
            if (invMap[item.id] !== undefined) {
              return { ...item, current_stock: invMap[item.id] };
            }
            return item;
          });
        } catch (e) {}
      }

      // Filter out soft-deleted items
      let deletedIdsSet = new Set<string>();
      try {
        const delArr = JSON.parse(localStorage.getItem("motoshop_deleted_inventory_ids") || "[]");
        deletedIdsSet = new Set(delArr);
      } catch (e) {}

      list = list.filter((item) => item.is_active !== false && !deletedIdsSet.has(item.id) && !deletedIdsSet.has(item.sku));
      setItems(list);
    } finally {
      setIsLoading(false);
    }
  };

  // Reset category pill when switching main tab
  const handleTabSwitch = (type: "PRODUCT" | "SERVICE") => {
    setActiveTab(type);
    setSelectedCategory("ALL");
  };

  // Dynamic category pills tailored to active tab
  const categoryPills = useMemo(() => {
    const defaultProductCats = ["Fluids", "Filters", "Brakes", "Engine", "Tires", "Electrical", "Accessories"];
    const defaultServiceCats = ["Maintenance", "Brake Service", "Labor", "Diagnostics", "Electrical"];
    const defaults = activeTab === "PRODUCT" ? defaultProductCats : defaultServiceCats;

    const currentTypeItems = items.filter((i) => i.item_type === activeTab);
    const fromItems = currentTypeItems.map((i) => i.category);

    const merged = Array.from(new Set([...defaults, ...fromItems, ...customCategories]));
    return merged.filter(Boolean);
  }, [items, activeTab, customCategories]);

  // Counts for main tabs
  const productCount = items.filter((i) => i.item_type === "PRODUCT").length;
  const serviceCount = items.filter((i) => i.item_type === "SERVICE").length;

  // Filtered & Sorted items
  const filteredItems = useMemo(() => {
    return items
      .filter((item) => {
        const q = search.toLowerCase().trim();
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          (item.brand && item.brand.toLowerCase().includes(q));

        const matchesType = item.item_type === activeTab;
        const matchesCategory = selectedCategory === "ALL" || item.category === selectedCategory;

        return matchesSearch && matchesType && matchesCategory;
      })
      .sort((a, b) => {
        if (activeTab === "PRODUCT") {
          const aIsLow = a.current_stock <= a.reorder_level;
          const bIsLow = b.current_stock <= b.reorder_level;

          // 1. Critical deficit / low-stock items appear first
          if (aIsLow && !bIsLow) return -1;
          if (!aIsLow && bIsLow) return 1;

          // 2. If both are low stock, prioritize critical out-of-stock (0) and lowest remaining stock
          if (aIsLow && bIsLow) {
            if (a.current_stock !== b.current_stock) {
              return a.current_stock - b.current_stock;
            }
            return (a.current_stock - a.reorder_level) - (b.current_stock - b.reorder_level);
          }

          // 3. If neither is low stock, sort by surplus closest to reorder alert threshold
          const surplusA = a.current_stock - a.reorder_level;
          const surplusB = b.current_stock - b.reorder_level;
          if (surplusA !== surplusB) {
            return surplusA - surplusB;
          }
          return a.name.localeCompare(b.name);
        } else {
          // Services: sort alphabetically
          return a.name.localeCompare(b.name);
        }
      });
  }, [items, search, activeTab, selectedCategory]);

  const handleOpenModal = (type: "PRODUCT" | "SERVICE" = "PRODUCT") => {
    setIsRegisteringCategory(false);
    setNewCategoryName("");
    setFormData({
      sku: generateAutoCode(type),
      name: "",
      brand: "",
      item_type: type,
      category: type === "PRODUCT" ? "Fluids" : "Maintenance",
      cost_price: 0,
      selling_price: 0,
      current_stock: type === "PRODUCT" ? 10 : 0,
      reorder_level: type === "PRODUCT" ? 5 : 0,
    });
    setErrorMsg("");
    setIsModalOpen(true);
  };

  const handleCreateItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.sku) {
      setErrorMsg("Name and SKU/Code are required.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    const payload = {
      ...formData,
      brand: formData.item_type === "PRODUCT" ? formData.brand : undefined,
    };

    try {
      const res = await apiClient.post<CatalogItem>("/inventory", payload);
      const createdItem = res.data;
      setItems((prev) => [createdItem, ...prev]);

      try {
        const storedCustom = localStorage.getItem("motoshop_custom_inventory");
        const customList = storedCustom ? JSON.parse(storedCustom) : [];
        customList.unshift(createdItem);
        localStorage.setItem("motoshop_custom_inventory", JSON.stringify(customList));

        if (createdItem.item_type === "PRODUCT") {
          const storedInv = localStorage.getItem("motoshop_inventory_stock");
          const invMap = storedInv ? JSON.parse(storedInv) : {};
          invMap[createdItem.id] = createdItem.current_stock;
          localStorage.setItem("motoshop_inventory_stock", JSON.stringify(invMap));
        }
      } catch (e) {}

      recordUserAuditLog("CREATE_ITEM", `/inventory/${createdItem.id}`, {
        id: createdItem.id,
        name: createdItem.name,
        sku: createdItem.sku,
        item_type: createdItem.item_type,
        category: createdItem.category,
        selling_price: createdItem.selling_price,
        current_stock: createdItem.current_stock,
      });

      setIsModalOpen(false);
    } catch (err: any) {
      // Fallback local persistence
      const fakeId = "mock-" + Math.random().toString(36).substring(2, 9);
      const newItem: CatalogItem = {
        ...payload,
        id: fakeId,
        is_active: true,
      };
      setItems((prev) => [newItem, ...prev]);
      try {
        const storedCustom = localStorage.getItem("motoshop_custom_inventory");
        const customList = storedCustom ? JSON.parse(storedCustom) : [];
        customList.unshift(newItem);
        localStorage.setItem("motoshop_custom_inventory", JSON.stringify(customList));
      } catch (e) {}

      recordUserAuditLog("CREATE_ITEM", `/inventory/${newItem.id}`, {
        id: newItem.id,
        name: newItem.name,
        sku: newItem.sku,
        item_type: newItem.item_type,
        category: newItem.category,
        selling_price: newItem.selling_price,
        current_stock: newItem.current_stock,
      });

      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-zinc-950 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-3">
            <Boxes className="w-8 h-8 text-cyan-400" />
            Parts & Stock Catalog
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Monitor inventory quantities, reorder thresholds, and showroom service pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAuditOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Audit Log</span>
          </button>

          {canManage && (
            <button
              onClick={() => handleOpenModal(activeTab)}
              className="bg-cyan-500 hover:bg-cyan-400 text-zinc-950 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Deleted Item Notification Banner */}
      {deletedNotice && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{deletedNotice}</span>
        </div>
      )}
      {/* Main Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 shrink-0">
        {/* Strictly 2 Main Filter Tabs */}
        <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-full sm:w-fit">
          <button
            onClick={() => handleTabSwitch("PRODUCT")}
            className={clsx(
              "px-3 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center",
              activeTab === "PRODUCT"
                ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30 font-bold"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Package className="w-4 h-4 shrink-0" />
            <span className="truncate">Parts ({productCount})</span>
          </button>

          <button
            onClick={() => handleTabSwitch("SERVICE")}
            className={clsx(
              "px-3 sm:px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 sm:gap-2 text-center",
              activeTab === "SERVICE"
                ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30 font-bold"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Wrench className="w-4 h-4 shrink-0" />
            <span className="truncate">Services ({serviceCount})</span>
          </button>
        </div>

        {/* Search Input (Hidden on Mobile) */}
        <div className="hidden md:block relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder={`Search ${activeTab === "PRODUCT" ? "parts, SKU, brand..." : "services, code, title..."}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Category Sub-Filter Pills (Hidden on Mobile) */}
      <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar pb-3 mb-4 scrollbar-none shrink-0 overscroll-x-contain">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Category:
        </span>

        <button
          onClick={() => setSelectedCategory("ALL")}
          className={clsx(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
            selectedCategory === "ALL"
              ? activeTab === "PRODUCT"
                ? "bg-cyan-500 text-zinc-950 border-cyan-500 font-bold shadow-md shadow-cyan-500/20"
                : "bg-purple-500 text-white border-purple-500 font-bold shadow-md shadow-purple-500/20"
              : "bg-zinc-900/80 text-zinc-400 border-white/10 hover:text-white hover:bg-zinc-800"
          )}
        >
          All Categories
        </button>

        {categoryPills.map((cat) => {
          const isSelected = selectedCategory === cat;
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={clsx(
                "px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
                isSelected
                  ? activeTab === "PRODUCT"
                    ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm font-semibold"
                    : "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm font-semibold"
                  : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-zinc-200 hover:bg-zinc-800"
              )}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Streamlined Catalog Table */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Adaptive Catalog Cards */}
          <div className="block md:hidden p-3 space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <div key={rIdx} className="p-4 rounded-2xl bg-zinc-950/60 border border-white/5 space-y-2.5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                    <div className="space-y-1.5 flex-1">
                      <Skeleton className="h-4 w-32 rounded" />
                      <Skeleton className="h-3 w-24 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded" />
                  </div>
                </div>
              ))
            ) : filteredItems.length === 0 ? (
              <div className="py-16 text-center text-zinc-500 text-sm">
                No matching {activeTab === "PRODUCT" ? "products" : "services"} found.
              </div>
            ) : (
              filteredItems.map((item) => {
                const isProduct = item.item_type === "PRODUCT";
                const isOutOfStock = isProduct && item.current_stock === 0;
                const isLowStock = isProduct && item.current_stock <= item.reorder_level;

                return (
                  <div
                    key={item.id}
                    onClick={() => router.push(`/inventory/${item.id}`)}
                    className="p-4 rounded-2xl bg-zinc-950/80 border border-white/10 hover:border-cyan-500/30 transition-all cursor-pointer space-y-3 active:scale-[0.99] group shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={clsx(
                          "p-2.5 rounded-xl border shrink-0 transition-colors",
                          isProduct
                            ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:border-cyan-500/50"
                            : "bg-purple-500/10 border-purple-500/20 text-purple-400 group-hover:border-purple-500/50"
                        )}>
                          {isProduct ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-white group-hover:text-cyan-400 transition-colors text-sm truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-zinc-400 font-mono mt-0.5">{item.sku}</div>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-white text-base shrink-0">
                        ₱{Number(item.selling_price).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.brand && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                            {item.brand}
                          </span>
                        )}
                        <span className="bg-zinc-900 px-2 py-0.5 rounded-md text-[10px] font-medium border border-white/5 text-zinc-400">
                          {item.category}
                        </span>
                        {isProduct ? (
                          isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3" /> Low ({item.current_stock})
                            </span>
                          ) : (
                            <span className="text-[10px] text-zinc-400 font-mono">
                              Stock: <span className="font-bold text-zinc-200">{item.current_stock}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-purple-300 text-[10px] px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/20">
                            Labor Service
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-cyan-400 shrink-0 ml-2">
                        <span>Details</span>
                        <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop View: Full Data Table */}
          <table className="hidden md:table w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU / Item Name</th>
                <th className="px-6 py-4 font-semibold">Brand</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                <th className="px-6 py-4 font-semibold text-center">
                  {activeTab === "PRODUCT" ? "Stock Level / Reorder Proximity" : "Service Type"}
                </th>
                <th className="px-6 py-4 font-semibold text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, rIdx) => (
                  <tr key={rIdx} className="hover:bg-white/[0.01]">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
                        <div className="space-y-1.5 flex-1">
                          <Skeleton className="h-4 w-36 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20 rounded" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24 rounded" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-16 rounded ml-auto" /></td>
                    <td className="px-6 py-4 text-center"><Skeleton className="h-5 w-24 rounded-full mx-auto" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-8 rounded ml-auto" /></td>
                  </tr>
                ))
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-16 text-zinc-500">
                    <Boxes className="w-10 h-10 mx-auto text-zinc-600 mb-2" />
                    No matching {activeTab === "PRODUCT" ? "products" : "services"} found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const isProduct = item.item_type === "PRODUCT";
                  const isOutOfStock = isProduct && item.current_stock === 0;
                  const isLowStock = isProduct && item.current_stock <= item.reorder_level;

                  return (
                    <tr 
                      key={item.id} 
                      onClick={() => router.push(`/inventory/${item.id}`)}
                      className="hover:bg-white/[0.04] transition-all cursor-pointer group"
                    >
                      {/* 1. SKU / Item Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "p-2.5 rounded-xl border transition-all group-hover:scale-105",
                            isProduct 
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:border-cyan-500/50" 
                              : "bg-purple-500/10 border-purple-500/20 text-purple-400 group-hover:border-purple-500/50"
                          )}>
                            {isProduct ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-100 group-hover:text-cyan-300 transition-colors flex items-center gap-2">
                              {item.name}
                            </div>
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">{item.sku}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Brand */}
                      <td className="px-6 py-4">
                        {item.brand ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                            {item.brand}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">—</span>
                        )}
                      </td>

                      {/* 3. Category */}
                      <td className="px-6 py-4">
                        <span className="bg-zinc-800/80 px-2.5 py-1 rounded-md text-xs font-medium border border-white/5 text-zinc-300">
                          {item.category}
                        </span>
                      </td>

                      {/* 4. Selling Price */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-white text-base">
                        ₱{Number(item.selling_price).toFixed(2)}
                      </td>

                      {/* 5. Stock Level / Reorder Status */}
                      <td className="px-6 py-4 text-center font-mono">
                        {isProduct ? (
                          <div className="inline-flex items-center gap-2.5">
                            <div>
                              <span className={clsx(
                                "font-bold text-base", 
                                isOutOfStock ? "text-red-400" : isLowStock ? "text-amber-400" : "text-zinc-100"
                              )}>
                                {item.current_stock}
                              </span>
                              <span className="text-zinc-500 text-xs ml-1">/ {item.reorder_level}</span>
                            </div>

                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3" />
                                Low Stock
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-zinc-400 text-xs px-2.5 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-sans">
                            Labor Service
                          </span>
                        )}
                      </td>

                      {/* 6. Navigation Chevron Indicator */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center text-xs text-zinc-500 group-hover:text-cyan-400 transition-colors font-medium">
                          <span className="hidden group-hover:inline mr-1">View Profile</span>
                          <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Info */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400 shrink-0">
          <div>
            Displaying <span className="font-semibold text-white">{filteredItems.length}</span> {activeTab === "PRODUCT" ? "product(s)" : "service(s)"}
            {activeTab === "PRODUCT" && (
              <span className="text-zinc-500 ml-2">
                (Sorted by critical deficit & proximity to reorder threshold)
              </span>
            )}
          </div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Click any row to view full profile, margins & controls</span>
          </div>
        </div>
      </div>

      {/* Registration Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        size="lg"
        title={`Add New ${formData.item_type === "PRODUCT" ? "Part / Product" : "Service"}`}
        subtitle="Add an item to the active workshop catalog"
        icon={formData.item_type === "PRODUCT" ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
        iconVariant={formData.item_type === "PRODUCT" ? "cyan" : "purple"}
        preventBackdropClose={isSubmitting}
      >
        <form onSubmit={handleCreateItemSubmit}>
          <ModalBody>
            {errorMsg && (
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Type Switcher */}
            <div className="flex bg-zinc-950 p-1 rounded-xl border border-white/10">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    item_type: "PRODUCT",
                    sku: generateAutoCode("PRODUCT"),
                    category: "Fluids",
                    current_stock: 10,
                    reorder_level: 5,
                  });
                }}
                className={clsx(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  formData.item_type === "PRODUCT"
                    ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Product / Part
              </button>
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    ...formData,
                    item_type: "SERVICE",
                    sku: generateAutoCode("SERVICE"),
                    category: "Maintenance",
                    current_stock: 0,
                    reorder_level: 0,
                    brand: "",
                  });
                }}
                className={clsx(
                  "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all",
                  formData.item_type === "SERVICE"
                    ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm"
                    : "text-zinc-400 hover:text-white"
                )}
              >
                Workshop Service
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                Item Name
              </label>
              <input
                type="text"
                required
                placeholder={formData.item_type === "PRODUCT" ? "e.g. Motul 7100 10W-40 4T (1L)" : "e.g. Engine Oil Change & Filter Service"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  SKU / Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                >
                  {customCategories.map((c) => (
                    <option key={c} value={c} className="bg-zinc-900 text-zinc-100">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.item_type === "PRODUCT" && (
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Brand
                </label>
                <input
                  type="text"
                  placeholder="e.g. Motul, Honda, Yamaha"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Cost Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Selling Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                />
              </div>
            </div>

            {formData.item_type === "PRODUCT" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
                  />
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-zinc-950 text-xs font-bold transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {isSubmitting ? <span>Saving...</span> : <span>Save to Catalog</span>}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Floating Filter FAB (Mobile Only) */}
      <FloatingFilterButton
        onClick={() => setIsMobileFilterOpen(true)}
        activeCount={activeFilterCount}
      />

      {/* Mobile Slide-Up Filter Sheet */}
      <MobileFilterSheet
        isOpen={isMobileFilterOpen}
        onClose={() => setIsMobileFilterOpen(false)}
        title="Filter Parts & Services"
        activeCount={activeFilterCount}
        onReset={handleResetAllFilters}
      >
        {/* Search */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-zinc-300">Search Catalog</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "PRODUCT" ? "parts, SKU, brand..." : "services, code, title..."}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-cyan-500/50"
            />
          </div>
        </div>

        {/* Catalog Type Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Catalog Section</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTabSwitch("PRODUCT")}
              className={clsx(
                "px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2",
                activeTab === "PRODUCT"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              <Package className="w-4 h-4" />
              <span>Parts & Products</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabSwitch("SERVICE")}
              className={clsx(
                "px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2",
                activeTab === "SERVICE"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              <Wrench className="w-4 h-4" />
              <span>Labor & Services</span>
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-300">Category</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                selectedCategory === "ALL"
                  ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                  : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
              )}
            >
              All Categories
            </button>
            {categoryPills.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={clsx(
                  "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                  selectedCategory === cat
                    ? "bg-cyan-500 text-zinc-950 font-bold shadow-md shadow-cyan-500/20"
                    : "bg-zinc-900 border border-white/10 text-zinc-400 hover:text-white"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </MobileFilterSheet>

      {/* Contextual Audit Drawer */}
      <ContextualAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Inventory Activity & Stock Audit"
        subtitle="Audit stream for product creation, catalog edits, and stock deductions"
        actionPrefix="INVENTORY_"
        resourceFilter="/inventory"
      />
    </div>
  );
}

export default function InventoryManagementPage() {
  return (
    <Suspense
      fallback={
        <div className="p-4 sm:p-6 space-y-6 max-w-7xl mx-auto w-full">
          <div className="space-y-1.5">
            <div className="h-8 w-56 bg-zinc-800/50 rounded-xl animate-shimmer" />
            <div className="h-4 w-72 bg-zinc-800/50 rounded animate-shimmer" />
          </div>
          <TableSkeleton columns={6} rows={7} />
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
