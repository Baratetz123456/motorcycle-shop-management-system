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
    <div className="w-full min-h-full md:h-full flex-1 md:min-h-0 bg-slate-50 dark:bg-zinc-950 p-3 sm:p-4 md:p-6 flex flex-col overflow-visible md:overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
            <Boxes className="w-8 h-8 text-lime-600 dark:text-lime-400" />
            Parts & Stock Catalog
          </h1>
          <p className="text-slate-500 dark:text-zinc-400 mt-1 text-sm">
            Monitor inventory quantities, reorder thresholds, and showroom service pricing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {canManage && (
            <button
              onClick={() => handleOpenModal(activeTab)}
              className="bg-lime-500 hover:bg-lime-400 text-zinc-950 px-4 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 text-xs shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Deleted Item Notification Banner */}
      {deletedNotice && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/50 text-emerald-800 dark:text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in shrink-0">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
          <span>{deletedNotice}</span>
        </div>
      )}
      {/* Desktop Filter & Search Bar */}
      <div className="hidden md:flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 p-4 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-sm shrink-0">
        <div className="flex items-center gap-3 overflow-x-auto no-scrollbar overscroll-x-contain pb-1 sm:pb-0 flex-1 min-w-0">
          {/* Main Tabs (Parts vs Services) */}
          <div className="flex bg-slate-100 dark:bg-zinc-800 p-1 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs shrink-0">
            <button
              onClick={() => handleTabSwitch("PRODUCT")}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                activeTab === "PRODUCT"
                  ? "bg-lime-500 text-zinc-950 shadow-sm font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
              )}
            >
              <Package className="w-3.5 h-3.5 shrink-0" />
              <span>Parts ({productCount})</span>
            </button>
            <button
              onClick={() => handleTabSwitch("SERVICE")}
              className={clsx(
                "px-3 py-1.5 rounded-lg font-medium transition-all whitespace-nowrap flex items-center gap-1.5",
                activeTab === "SERVICE"
                  ? "bg-lime-500 text-zinc-950 shadow-sm font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white hover:bg-white/60 dark:hover:bg-zinc-700/60"
              )}
            >
              <Wrench className="w-3.5 h-3.5 shrink-0" />
              <span>Services ({serviceCount})</span>
            </button>
          </div>

          <div className="h-4 w-px bg-slate-200 dark:bg-zinc-700 hidden sm:block shrink-0" />

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar scrollbar-none shrink-0 py-0.5">
            <button
              onClick={() => setSelectedCategory("ALL")}
              className={clsx(
                "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                selectedCategory === "ALL"
                  ? "bg-lime-50 dark:bg-lime-950/40 text-lime-900 dark:text-lime-300 border border-lime-300 dark:border-lime-700/50 shadow-xs font-bold"
                  : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent"
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
                    "px-2.5 py-1 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0",
                    isSelected
                      ? "bg-lime-50 dark:bg-lime-950/40 text-lime-900 dark:text-lime-300 border border-lime-300 dark:border-lime-700/50 shadow-xs font-bold"
                      : "text-slate-600 dark:text-zinc-400 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-zinc-800 border border-transparent"
                  )}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full lg:w-72 shrink-0">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-zinc-500" />
          <input
            type="text"
            placeholder={`Search ${activeTab === "PRODUCT" ? "parts, SKU, brand..." : "services, code..."}`}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-slate-50 dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-xl py-2 pl-10 pr-4 text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-lime-500/50 placeholder-slate-400 dark:placeholder-zinc-500"
          />
        </div>
      </div>

      {/* Streamlined Catalog Table & Mobile List */}
      <div className="md:flex-1 md:min-h-0 md:overflow-hidden bg-transparent md:bg-white md:dark:bg-zinc-900 border-0 md:border md:border-slate-200 md:dark:border-zinc-800 rounded-none md:rounded-2xl flex flex-col shadow-none md:shadow-sm">
        <div className="overflow-visible md:overflow-auto md:flex-1 md:min-h-0 touch-pan-y overscroll-contain">
          {/* Mobile View: Borderless Edge-to-Edge Catalog Rows */}
          <div className="block md:hidden px-1 divide-y divide-slate-100 dark:divide-zinc-800 pb-24">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, rIdx) => (
                <div key={rIdx} className="py-3.5 px-2 space-y-2">
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
              <div className="py-16 text-center text-slate-500 text-sm">
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
                    className="py-3.5 px-2 hover:bg-slate-50 active:bg-slate-100 transition-colors cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className={clsx(
                          "p-2 rounded-xl border shrink-0 transition-colors",
                          isProduct
                            ? "bg-lime-50 border-lime-200 text-lime-700 group-hover:border-lime-400"
                            : "bg-purple-50 border-purple-200 text-purple-700 group-hover:border-purple-400"
                        )}>
                          {isProduct ? <Package className="w-4 h-4" /> : <Wrench className="w-4 h-4" />}
                        </div>
                        <div className="min-w-0">
                          <div className="font-bold text-slate-900 group-hover:text-lime-700 transition-colors text-sm truncate">
                            {item.name}
                          </div>
                          <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                        </div>
                      </div>

                      <span className="font-mono font-bold text-slate-900 text-base shrink-0">
                        ₱{Number(item.selling_price).toFixed(2)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between pt-1 text-xs text-slate-600">
                      <div className="flex items-center gap-2 flex-wrap">
                        {item.brand && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {item.brand}
                          </span>
                        )}
                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-medium border border-slate-200 text-slate-600">
                          {item.category}
                        </span>
                        {isProduct ? (
                          isOutOfStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-rose-600" /> Out of Stock
                            </span>
                          ) : isLowStock ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-amber-600" /> Low ({item.current_stock})
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-500 font-mono">
                              Stock: <span className="font-bold text-slate-900">{item.current_stock}</span>
                            </span>
                          )
                        ) : (
                          <span className="text-purple-700 text-[10px] px-2 py-0.5 rounded-full bg-purple-50 border border-purple-200 font-medium">
                            Labor Service
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-1 text-[11px] font-semibold text-lime-700 shrink-0 ml-2">
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
          <table className="hidden md:table w-full text-left text-sm text-slate-700 whitespace-nowrap">
            <thead className="text-xs uppercase bg-slate-50 text-slate-600 border-b border-slate-200 sticky top-0 z-10 font-bold">
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
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                Array.from({ length: 7 }).map((_, rIdx) => (
                  <tr key={rIdx} className="hover:bg-slate-50/50">
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
                  <td colSpan={6} className="text-center py-16 text-slate-500">
                    <Boxes className="w-10 h-10 mx-auto text-slate-400 mb-2" />
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
                      className="hover:bg-slate-50/80 transition-all cursor-pointer group"
                    >
                      {/* 1. SKU / Item Name */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "p-2.5 rounded-xl border transition-all group-hover:scale-105",
                            isProduct 
                              ? "bg-lime-50 border-lime-200 text-lime-700 group-hover:border-lime-400" 
                              : "bg-purple-50 border-purple-200 text-purple-700 group-hover:border-purple-400"
                          )}>
                            {isProduct ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 group-hover:text-lime-700 transition-colors flex items-center gap-2">
                              {item.name}
                            </div>
                            <div className="text-xs text-slate-500 font-mono mt-0.5">{item.sku}</div>
                          </div>
                        </div>
                      </td>

                      {/* 2. Brand */}
                      <td className="px-6 py-4">
                        {item.brand ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-slate-100 text-slate-800 border border-slate-200">
                            {item.brand}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs italic">—</span>
                        )}
                      </td>

                      {/* 3. Category */}
                      <td className="px-6 py-4">
                        <span className="bg-slate-100 px-2.5 py-1 rounded-md text-xs font-medium border border-slate-200 text-slate-700">
                          {item.category}
                        </span>
                      </td>

                      {/* 4. Selling Price */}
                      <td className="px-6 py-4 text-right font-mono font-bold text-slate-900 text-base">
                        ₱{Number(item.selling_price).toFixed(2)}
                      </td>

                      {/* 5. Stock Level / Reorder Status */}
                      <td className="px-6 py-4 text-center font-mono">
                        {isProduct ? (
                          <div className="inline-flex items-center gap-2.5">
                            <div>
                              <span className={clsx(
                                "font-bold text-base", 
                                isOutOfStock ? "text-rose-700" : isLowStock ? "text-amber-700" : "text-slate-900"
                              )}>
                                {item.current_stock}
                              </span>
                              <span className="text-slate-500 text-xs ml-1">/ {item.reorder_level}</span>
                            </div>

                            {isOutOfStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-800 border border-rose-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-rose-600" />
                                Out of Stock
                              </span>
                            ) : isLowStock ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200 flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                Low Stock
                              </span>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-purple-700 text-xs px-2.5 py-1 rounded-full bg-purple-50 border border-purple-200 font-sans font-medium">
                            Labor Service
                          </span>
                        )}
                      </td>

                      {/* 6. Navigation Chevron Indicator */}
                      <td className="px-6 py-4 text-right">
                        <div className="inline-flex items-center text-xs text-slate-400 group-hover:text-lime-700 transition-colors font-medium">
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
        <div className="p-4 border-t border-slate-200 bg-slate-50/60 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-600 shrink-0">
          <div>
            Displaying <span className="font-semibold text-slate-900">{filteredItems.length}</span> {activeTab === "PRODUCT" ? "product(s)" : "service(s)"}
            {activeTab === "PRODUCT" && (
              <span className="text-slate-500 ml-2">
                (Sorted by critical deficit & proximity to reorder threshold)
              </span>
            )}
          </div>
          <div className="flex gap-4 items-center text-slate-500">
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
        iconVariant={formData.item_type === "PRODUCT" ? "lime" : "purple"}
        preventBackdropClose={isSubmitting}
      >
        <form onSubmit={handleCreateItemSubmit}>
          <ModalBody>
            {errorMsg && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Type Switcher */}
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
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
                    ? "bg-lime-500 text-zinc-950 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
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
                    ? "bg-lime-500 text-zinc-950 font-bold shadow-xs"
                    : "text-slate-600 hover:text-slate-950"
                )}
              >
                Workshop Service
              </button>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                Item Name
              </label>
              <input
                type="text"
                required
                placeholder={formData.item_type === "PRODUCT" ? "e.g. Motul 7100 10W-40 4T (1L)" : "e.g. Engine Oil Change & Filter Service"}
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  SKU / Code
                </label>
                <input
                  type="text"
                  required
                  value={formData.sku}
                  onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                >
                  {customCategories.map((c) => (
                    <option key={c} value={c} className="bg-white text-slate-900">{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {formData.item_type === "PRODUCT" && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Brand
                </label>
                <input
                  type="text"
                  placeholder="e.g. Motul, Honda, Yamaha"
                  value={formData.brand}
                  onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Cost Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.cost_price}
                  onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                  Selling Price (₱)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  required
                  value={formData.selling_price}
                  onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                />
              </div>
            </div>

            {formData.item_type === "PRODUCT" && (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Current Stock
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.current_stock}
                    onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1.5">
                    Reorder Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={formData.reorder_level}
                    onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                    className="w-full bg-white border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-lime-500/50 transition-all shadow-xs"
                  />
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
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
                <span>Save to Catalog</span>
              )}
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
          <label className="text-xs font-semibold text-slate-700">Search Catalog</label>
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder={`Search ${activeTab === "PRODUCT" ? "parts, SKU, brand..." : "services, code, title..."}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-lime-500/50"
            />
          </div>
        </div>

        {/* Catalog Type Switcher */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Catalog Section</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTabSwitch("PRODUCT")}
              className={clsx(
                "px-3 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-2",
                activeTab === "PRODUCT"
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950"
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
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950"
              )}
            >
              <Wrench className="w-4 h-4" />
              <span>Labor & Services</span>
            </button>
          </div>
        </div>

        {/* Category Filter */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700">Category</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSelectedCategory("ALL")}
              className={clsx(
                "px-3 py-2 rounded-xl text-xs font-semibold text-center transition-all",
                selectedCategory === "ALL"
                  ? "bg-lime-500 text-zinc-950 font-bold shadow-xs"
                  : "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950"
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
                    ? "bg-lime-500 text-zinc-950 font-bold shadow-xs"
                    : "bg-slate-100 border border-slate-200 text-slate-700 hover:text-slate-950"
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </MobileFilterSheet>
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
