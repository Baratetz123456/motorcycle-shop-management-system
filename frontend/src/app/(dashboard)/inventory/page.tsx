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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [deletedNotice, setDeletedNotice] = useState<string | null>(null);

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

  useEffect(() => {
    fetchItems();
  }, []);

  const fetchItems = async () => {
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
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full h-screen bg-zinc-950 p-6 sm:p-8 flex flex-col overflow-hidden font-sans">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
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
              className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-4 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] flex items-center gap-2 text-xs"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Deleted Item Notification Banner */}
      {deletedNotice && (
        <div className="mb-4 p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{deletedNotice}</span>
        </div>
      )}

      {/* Main Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        {/* Strictly 2 Main Filter Tabs */}
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => handleTabSwitch("PRODUCT")}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "PRODUCT"
                ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Package className="w-4 h-4" />
            <span>Parts & Products ({productCount})</span>
          </button>

          <button
            onClick={() => handleTabSwitch("SERVICE")}
            className={clsx(
              "px-5 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "SERVICE"
                ? "bg-purple-500/20 text-purple-300 shadow-md border border-purple-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Wrench className="w-4 h-4" />
            <span>Labor & Services ({serviceCount})</span>
          </button>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
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

      {/* Category Sub-Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-4 scrollbar-none">
        <span className="text-[11px] uppercase tracking-wider text-zinc-500 font-bold shrink-0 mr-1 flex items-center gap-1">
          <Filter className="w-3 h-3" /> Category:
        </span>

        <button
          onClick={() => setSelectedCategory("ALL")}
          className={clsx(
            "px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 border",
            selectedCategory === "ALL"
              ? activeTab === "PRODUCT"
                ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                : "bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm"
              : "bg-zinc-900/60 text-zinc-400 border-white/5 hover:text-zinc-200 hover:bg-zinc-800"
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
      <div className="flex-1 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
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
              {filteredItems.length === 0 ? (
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
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-zinc-400">
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
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            {/* Modal Header */}
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2.5 rounded-xl border",
                  formData.item_type === "PRODUCT" 
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                )}>
                  {formData.item_type === "PRODUCT" ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                </div>
                <div>
                  <h2 className="text-lg font-bold text-white">
                    Add New {formData.item_type === "PRODUCT" ? "Part / Product" : "Service"}
                  </h2>
                  <p className="text-xs text-zinc-400">Add an item to the workshop catalog</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateItemSubmit} className="p-6 space-y-4">
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
                      ? "bg-cyan-500 text-white shadow-md"
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
                      ? "bg-purple-600 text-white shadow-md"
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
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  >
                    {customCategories.map((c) => (
                      <option key={c} value={c}>{c}</option>
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
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
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save to Catalog"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
        <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
          <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
