"use client";

import { useEffect, useState } from "react";
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
  DollarSign,
  Boxes,
  Activity,
  RefreshCw,
  Edit,
  Trash2
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";
import { recordUserAuditLog } from "@/lib/audit";

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

export default function InventoryManagementPage() {
  const [items, setItems] = useState<CatalogItem[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Role-based access control
  const [userRole, setUserRole] = useState<string>("admin");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") || "admin";
      setUserRole(role.toLowerCase());
    }
  }, []);
  const canManage = userRole === "admin" || userRole === "manager";

  // Edit Modal State
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [editFormData, setEditFormData] = useState<{
    name: string;
    brand: string;
    category: string;
    cost_price: number;
    selling_price: number;
    current_stock: number;
    reorder_level: number;
  }>({
    name: "",
    brand: "",
    category: "",
    cost_price: 0,
    selling_price: 0,
    current_stock: 0,
    reorder_level: 5,
  });

  // Delete Confirmation Modal State
  const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null);

  // Categories & Category Registration State
  const [customCategories, setCustomCategories] = useState<string[]>([
    "Fluids",
    "Filters",
    "Brakes",
    "Engine",
    "Tires",
    "Maintenance",
    "Brake Service",
    "Electrical",
    "Accessories"
  ]);
  const [isRegisteringCategory, setIsRegisteringCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  // Auto-generate SKU Code or Service Code (Clean SRV- prefix for services)
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
      // empty list on error
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
      } catch (e) {
        // ignore
      }
    }
    // 3. Filter out soft-deleted items to ensure sold products/completed services aren't affected
    let deletedIdsSet = new Set<string>();
    try {
      const delArr = JSON.parse(localStorage.getItem("motoshop_deleted_inventory_ids") || "[]");
      deletedIdsSet = new Set(delArr);
    } catch (e) {}

    list = list.filter((item) => item.is_active !== false && !deletedIdsSet.has(item.id) && !deletedIdsSet.has(item.sku));

    setItems(list);
  };

  const allCategories = Array.from(
    new Set([...customCategories, ...items.map((i) => i.category)])
  ).filter(Boolean);

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

  const handleSwitchItemType = (type: "PRODUCT" | "SERVICE") => {
    setFormData((prev) => ({
      ...prev,
      item_type: type,
      sku: generateAutoCode(type),
      category: type === "PRODUCT" ? "Fluids" : "Maintenance",
      current_stock: type === "PRODUCT" ? 10 : 0,
      reorder_level: type === "PRODUCT" ? 5 : 0,
      brand: type === "PRODUCT" ? prev.brand : "",
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      
      recordUserAuditLog("INVENTORY_ITEM_CREATED", "/inventory", {
        sku: formData.sku,
        name: formData.name,
        brand: formData.brand,
        item_type: formData.item_type,
        category: formData.category,
        selling_price: formData.selling_price,
        current_stock: formData.current_stock
      });
      setIsModalOpen(false);
    } catch (err: any) {
      // Fallback update for responsive offline/demo experience
      const demoItem: CatalogItem = {
        id: `uuid-${Date.now()}`,
        ...payload,
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
        current_stock: Number(formData.current_stock),
        reorder_level: Number(formData.reorder_level),
        is_active: true,
      };
      setItems((prev) => [demoItem, ...prev]);

      try {
        const storedCustom = localStorage.getItem("motoshop_custom_inventory");
        const customList = storedCustom ? JSON.parse(storedCustom) : [];
        customList.unshift(demoItem);
        localStorage.setItem("motoshop_custom_inventory", JSON.stringify(customList));

        if (demoItem.item_type === "PRODUCT") {
          const storedInv = localStorage.getItem("motoshop_inventory_stock");
          const invMap = storedInv ? JSON.parse(storedInv) : {};
          invMap[demoItem.id] = demoItem.current_stock;
          localStorage.setItem("motoshop_inventory_stock", JSON.stringify(invMap));
        }
      } catch (e) {}

      recordUserAuditLog("INVENTORY_ITEM_CREATED", "/inventory", {
        sku: formData.sku,
        name: formData.name,
        brand: formData.brand,
        item_type: formData.item_type,
        category: formData.category,
        selling_price: formData.selling_price,
        current_stock: formData.current_stock
      });
      setIsModalOpen(false);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (item: CatalogItem) => {
    setEditingItem(item);
    setEditFormData({
      name: item.name,
      brand: item.brand || "",
      category: item.category,
      cost_price: Number(item.cost_price),
      selling_price: Number(item.selling_price),
      current_stock: Number(item.current_stock),
      reorder_level: Number(item.reorder_level),
    });
    setErrorMsg("");
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    setIsSubmitting(true);
    setErrorMsg("");

    const updatePayload = {
      name: editFormData.name,
      brand: editingItem.item_type === "PRODUCT" ? editFormData.brand : undefined,
      category: editFormData.category,
      cost_price: Number(editFormData.cost_price),
      selling_price: Number(editFormData.selling_price),
      current_stock: Number(editFormData.current_stock),
      reorder_level: Number(editFormData.reorder_level),
    };

    try {
      await apiClient.put(`/inventory/${editingItem.id}`, updatePayload);
    } catch (err: any) {
      console.warn("Backend update note, persisting locally", err);
    }

    // Update state
    const updatedItems = items.map((it) =>
      it.id === editingItem.id
        ? {
            ...it,
            ...updatePayload,
            brand: editingItem.item_type === "PRODUCT" ? editFormData.brand : undefined,
          }
        : it
    );
    setItems(updatedItems);

    // Sync localStorage motoshop_custom_inventory
    try {
      const storedCustom = localStorage.getItem("motoshop_custom_inventory");
      if (storedCustom) {
        const customList: CatalogItem[] = JSON.parse(storedCustom);
        const updatedCustom = customList.map((ci) =>
          ci.id === editingItem.id ? { ...ci, ...updatePayload } : ci
        );
        localStorage.setItem("motoshop_custom_inventory", JSON.stringify(updatedCustom));
      }
      // Sync motoshop_inventory_stock
      if (editingItem.item_type === "PRODUCT") {
        const storedInv = localStorage.getItem("motoshop_inventory_stock");
        const invMap = storedInv ? JSON.parse(storedInv) : {};
        invMap[editingItem.id] = Number(editFormData.current_stock);
        localStorage.setItem("motoshop_inventory_stock", JSON.stringify(invMap));
      }
    } catch (e) {}

    recordUserAuditLog("INVENTORY_ITEM_UPDATED", `/inventory/${editingItem.id}`, {
      id: editingItem.id,
      sku: editingItem.sku,
      name: editFormData.name,
      brand: editFormData.brand,
      selling_price: editFormData.selling_price,
      current_stock: editFormData.current_stock,
    });

    setEditingItem(null);
    setIsSubmitting(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;

    setIsSubmitting(true);

    try {
      await apiClient.delete(`/inventory/${deletingItem.id}`);
    } catch (err: any) {
      console.warn("Backend delete note, continuing soft-delete locally", err);
    }

    // Remove from active state
    setItems((prev) => prev.filter((it) => it.id !== deletingItem.id));

    // Track soft-deleted IDs in localStorage
    try {
      const delArr: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_inventory_ids") || "[]");
      if (!delArr.includes(deletingItem.id)) delArr.push(deletingItem.id);
      if (deletingItem.sku && !delArr.includes(deletingItem.sku)) delArr.push(deletingItem.sku);
      localStorage.setItem("motoshop_deleted_inventory_ids", JSON.stringify(delArr));

      // Clean from motoshop_custom_inventory
      const storedCustom = localStorage.getItem("motoshop_custom_inventory");
      if (storedCustom) {
        const customList: CatalogItem[] = JSON.parse(storedCustom);
        const updated = customList.filter((ci) => ci.id !== deletingItem.id && ci.sku !== deletingItem.sku);
        localStorage.setItem("motoshop_custom_inventory", JSON.stringify(updated));
      }
    } catch (e) {}

    recordUserAuditLog("INVENTORY_ITEM_DELETED", `/inventory/${deletingItem.id}`, {
      id: deletingItem.id,
      sku: deletingItem.sku,
      name: deletingItem.name,
      item_type: deletingItem.item_type,
    });

    setDeletingItem(null);
    setIsSubmitting(false);
  };

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase());
    const matchesTab = activeTab === "ALL" || item.item_type === activeTab;
    return matchesSearch && matchesTab;
  });

  const productCount = items.filter((i) => i.item_type === "PRODUCT").length;
  const serviceCount = items.filter((i) => i.item_type === "SERVICE").length;

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Boxes className="w-8 h-8 text-cyan-400" />
            Inventory Management
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Real-time stock valuation, automated SKU generation, cost-to-margin analytics, and POS catalog control.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAuditOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Audit Trail</span>
          </button>

          <button
            onClick={() => handleOpenModal("PRODUCT")}
            className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_-5px_rgba(6,182,212,0.4)] flex items-center gap-2 text-xs"
          >
            <Plus className="w-4 h-4" />
            + New Product
          </button>
          <button
            onClick={() => handleOpenModal("SERVICE")}
            className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white px-5 py-2.5 rounded-xl font-medium transition-all shadow-[0_0_20px_-5px_rgba(168,85,247,0.4)] flex items-center gap-2 text-xs"
          >
            <Wrench className="w-4 h-4" />
            + New Service
          </button>
        </div>
      </div>

      {/* Tabs & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        {/* Filter Tabs */}
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setActiveTab("ALL")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "ALL"
                ? "bg-zinc-800 text-white shadow-md border border-white/10"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <span>All Catalog</span>
            <span className="bg-zinc-950 px-2 py-0.5 rounded-full text-[10px] text-zinc-400">
              {items.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("PRODUCT")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "PRODUCT"
                ? "bg-cyan-500/20 text-cyan-300 shadow-md border border-cyan-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Package className="w-3.5 h-3.5" />
            <span>Products ({productCount})</span>
          </button>

          <button
            onClick={() => setActiveTab("SERVICE")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              activeTab === "SERVICE"
                ? "bg-purple-500/20 text-purple-300 shadow-md border border-purple-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Wrench className="w-3.5 h-3.5" />
            <span>Services ({serviceCount})</span>
          </button>
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search SKU, Service Code, Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Main Catalog Table */}
      <div className="flex-1 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">SKU / Item Name</th>
                <th className="px-6 py-4 font-semibold text-center">Type</th>
                <th className="px-6 py-4 font-semibold">Brand</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Cost Price</th>
                <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                <th className="px-6 py-4 font-semibold text-right">Est. Margin</th>
                <th className="px-6 py-4 font-semibold text-center">Stock Level</th>
                <th className="px-6 py-4 font-semibold text-center">POS Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={10} className="text-center py-12 text-zinc-500">
                    No matching products or services found.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const margin = item.selling_price > 0 
                    ? ((item.selling_price - item.cost_price) / item.selling_price) * 100 
                    : 0;
                  const isProduct = item.item_type === "PRODUCT";
                  const isLowStock = isProduct && item.current_stock <= item.reorder_level;

                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className={clsx(
                            "p-2.5 rounded-xl border transition-colors",
                            isProduct 
                              ? "bg-cyan-500/10 border-cyan-500/20 text-cyan-400 group-hover:border-cyan-500/50" 
                              : "bg-purple-500/10 border-purple-500/20 text-purple-400 group-hover:border-purple-500/50"
                          )}>
                            {isProduct ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                          </div>
                          <div>
                            <div className="font-bold text-zinc-100">{item.name}</div>
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">{item.sku}</div>
                          </div>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <span className={clsx(
                          "px-2.5 py-1 rounded-full text-[11px] font-bold tracking-wider uppercase border",
                          isProduct
                            ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                            : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                        )}>
                          {item.item_type}
                        </span>
                      </td>

                      {/* Brand Column */}
                      <td className="px-6 py-4">
                        {item.brand ? (
                          <span className="px-2.5 py-1 rounded-lg text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                            {item.brand}
                          </span>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">—</span>
                        )}
                      </td>

                      <td className="px-6 py-4">
                        <span className="bg-zinc-800/80 px-2.5 py-1 rounded-md text-xs font-medium border border-white/5 text-zinc-300">
                          {item.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-zinc-400">₱{Number(item.cost_price).toFixed(2)}</td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-white">₱{Number(item.selling_price).toFixed(2)}</td>

                      <td className="px-6 py-4 text-right font-mono">
                        <span className="text-emerald-400 font-medium">
                          {margin.toFixed(0)}%
                        </span>
                      </td>

                      <td className="px-6 py-4 text-center font-mono">
                        {isProduct ? (
                          <div>
                            <span className={clsx("font-bold text-base", isLowStock ? "text-amber-400" : "text-zinc-100")}>
                              {item.current_stock}
                            </span>
                            <span className="text-zinc-500 text-xs ml-1">/ {item.reorder_level}</span>
                          </div>
                        ) : (
                          <span className="text-zinc-500 text-xs italic">N/A (Labor Service)</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isProduct && isLowStock ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Low Stock
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <Check className="w-3.5 h-3.5" />
                            Available in POS
                          </span>
                        )}
                      </td>

                      {/* Actions Column */}
                      <td className="px-6 py-4 text-center">
                        {canManage ? (
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleOpenEditModal(item)}
                              className="p-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white border border-white/5 transition-all shadow-sm"
                              title="Edit item details"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setDeletingItem(item)}
                              className="p-2 rounded-xl bg-zinc-800 hover:bg-red-500/20 text-zinc-400 hover:text-red-400 border border-white/5 transition-all shadow-sm"
                              title="Delete item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : (
                          <span className="text-zinc-600 text-xs italic">View Only</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer info */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
          <div>Displaying {filteredItems.length} registered item(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Accessible by Admin & Manager</span>
            <span>• Active in Cashier POS Checkout</span>
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
                  <h3 className="text-lg font-bold text-white">
                    Register New {formData.item_type === "PRODUCT" ? "Product Item" : "Labor Service"}
                  </h3>
                  <p className="text-xs text-zinc-400">Will be available immediately for Cashier POS selection</p>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Item Type Switcher */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  Registration Category Type
                </label>
                <div className="grid grid-cols-2 gap-3 p-1 bg-zinc-950 rounded-xl border border-white/10">
                  <button
                    type="button"
                    onClick={() => handleSwitchItemType("PRODUCT")}
                    className={clsx(
                      "py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                      formData.item_type === "PRODUCT"
                        ? "bg-cyan-600 text-white shadow-md"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    Product
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSwitchItemType("SERVICE")}
                    className={clsx(
                      "py-2 px-3 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-2",
                      formData.item_type === "SERVICE"
                        ? "bg-purple-600 text-white shadow-md"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Wrench className="w-4 h-4" />
                    Service
                  </button>
                </div>
              </div>

              {/* SKU / Service Code & Name */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-400">
                      {formData.item_type === "PRODUCT" ? "SKU Code" : "Service Code"} *
                    </label>
                    <span className="text-[10px] text-cyan-400 font-mono">Auto-Generated</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex-1 bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-cyan-300 font-mono font-bold bg-cyan-500/5 select-none truncate">
                      {formData.sku}
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, sku: generateAutoCode(formData.item_type) }))}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white rounded-xl border border-white/10 transition-colors shrink-0"
                      title="Generate New Code"
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                  <span className="text-[10px] text-zinc-500 mt-1 block">
                    {formData.item_type === "PRODUCT" ? "Unique product inventory SKU" : "Unique auto-generated service code"}
                  </span>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">
                    {formData.item_type === "PRODUCT" ? "Product Title" : "Service Description"} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder={formData.item_type === "PRODUCT" ? "e.g. Brake Fluid DOT4" : "e.g. Chain Tension Adjustment"}
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Product Brand Name Field (Only for Products) */}
              {formData.item_type === "PRODUCT" && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-zinc-400">Brand Name</label>
                    <span className="text-[10px] text-zinc-500">e.g. Motul, Honda, Yamaha</span>
                  </div>
                  <input
                    type="text"
                    placeholder="Enter brand name..."
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 mb-2"
                  />
                  {/* Quick select brand pills */}
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_BRANDS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setFormData({ ...formData, brand: b })}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors",
                          formData.brand === b
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                            : "bg-zinc-950/60 text-zinc-400 border-white/5 hover:text-white hover:border-white/20"
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Dynamic Category Dropdown with Register New Category */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-semibold text-zinc-400">Category *</label>
                  {!isRegisteringCategory && (
                    <button
                      type="button"
                      onClick={() => setIsRegisteringCategory(true)}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Register New Category
                    </button>
                  )}
                </div>

                {isRegisteringCategory ? (
                  <div className="flex items-center gap-2 animate-in fade-in">
                    <input
                      type="text"
                      placeholder="Enter new category name..."
                      value={newCategoryName}
                      onChange={(e) => setNewCategoryName(e.target.value)}
                      className="flex-1 bg-zinc-950 border border-cyan-500/50 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (newCategoryName.trim()) {
                          const cat = newCategoryName.trim();
                          setCustomCategories((prev) => [...prev, cat]);
                          setFormData((prev) => ({ ...prev, category: cat }));
                          setNewCategoryName("");
                          setIsRegisteringCategory(false);
                        }
                      }}
                      className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition-all"
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsRegisteringCategory(false);
                        setNewCategoryName("");
                      }}
                      className="p-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-xl text-xs"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <select
                    value={formData.category}
                    onChange={(e) => {
                      if (e.target.value === "__NEW__") {
                        setIsRegisteringCategory(true);
                      } else {
                        setFormData({ ...formData, category: e.target.value });
                      }
                    }}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                  >
                    {allCategories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                    <option value="__NEW__" className="text-cyan-400 font-bold">
                      + Register New Category...
                    </option>
                  </select>
                )}
              </div>

              {/* Pricing */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Cost Price (₱)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.cost_price}
                    onChange={(e) => setFormData({ ...formData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Selling / Charge Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.selling_price}
                    onChange={(e) => setFormData({ ...formData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Stock Fields if Product */}
              {formData.item_type === "PRODUCT" && (
                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-white/10">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Initial Stock Qty</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.current_stock}
                      onChange={(e) => setFormData({ ...formData, current_stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Reorder Level Alert</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({ ...formData, reorder_level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white font-mono focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>
              )}

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg shadow-cyan-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? "Registering..." : "Complete Registration"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Item Modal */}
      {editingItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="p-6 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "p-2.5 rounded-xl border",
                  editingItem.item_type === "PRODUCT" 
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30"
                    : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                )}>
                  {editingItem.item_type === "PRODUCT" ? <Package className="w-5 h-5" /> : <Wrench className="w-5 h-5" />}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">
                    Edit {editingItem.item_type === "PRODUCT" ? "Product" : "Service"}
                  </h3>
                  <p className="text-xs text-zinc-400 font-mono">{editingItem.sku}</p>
                </div>
              </div>
              <button
                onClick={() => setEditingItem(null)}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {errorMsg && (
                <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                  {errorMsg}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">
                  {editingItem.item_type === "PRODUCT" ? "Product Title" : "Service Description"} *
                </label>
                <input
                  type="text"
                  required
                  value={editFormData.name}
                  onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                />
              </div>

              {editingItem.item_type === "PRODUCT" && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Brand Name</label>
                  <input
                    type="text"
                    placeholder="e.g. Motul, Honda..."
                    value={editFormData.brand}
                    onChange={(e) => setEditFormData({ ...editFormData, brand: e.target.value })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 mb-2"
                  />
                  <div className="flex flex-wrap gap-1.5">
                    {COMMON_BRANDS.map((b) => (
                      <button
                        key={b}
                        type="button"
                        onClick={() => setEditFormData({ ...editFormData, brand: b })}
                        className={clsx(
                          "px-2.5 py-1 rounded-lg text-[10px] font-bold border transition-colors",
                          editFormData.brand === b
                            ? "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-sm"
                            : "bg-zinc-950/60 text-zinc-400 border-white/5 hover:text-white hover:border-white/20"
                        )}
                      >
                        {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Category *</label>
                <select
                  value={editFormData.category}
                  onChange={(e) => setEditFormData({ ...editFormData, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500"
                >
                  {allCategories.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Cost Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.cost_price}
                    onChange={(e) => setEditFormData({ ...editFormData, cost_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Selling Price (₱) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editFormData.selling_price}
                    onChange={(e) => setEditFormData({ ...editFormData, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              {editingItem.item_type === "PRODUCT" && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Current Stock Level</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editFormData.current_stock}
                      onChange={(e) => setEditFormData({ ...editFormData, current_stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1">Reorder Alert Level</label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editFormData.reorder_level}
                      onChange={(e) => setEditFormData({ ...editFormData, reorder_level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl py-2 px-3 text-sm text-white focus:outline-none focus:border-cyan-500 font-mono"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold transition-all shadow-lg shadow-cyan-600/30 disabled:opacity-50"
                >
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {deletingItem && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Delete {deletingItem.item_type === "PRODUCT" ? "Product" : "Service"}?</h3>
                <p className="text-xs text-zinc-400">This item will be removed from active inventory and POS catalog.</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Code:</span>
                <span className="font-mono font-bold text-cyan-300">{deletingItem.sku}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Name:</span>
                <span className="font-bold text-white">{deletingItem.name}</span>
              </div>
              {deletingItem.brand && (
                <div className="flex justify-between text-zinc-400">
                  <span>Brand:</span>
                  <span className="font-bold text-cyan-400">{deletingItem.brand}</span>
                </div>
              )}
              <div className="flex justify-between text-zinc-400">
                <span>Selling Price:</span>
                <span className="font-mono font-bold text-emerald-400">₱{Number(deletingItem.selling_price).toFixed(2)}</span>
              </div>
              {deletingItem.item_type === "PRODUCT" && (
                <div className="flex justify-between text-zinc-400">
                  <span>Current Stock:</span>
                  <span className="font-bold text-white">{deletingItem.current_stock} units</span>
                </div>
              )}
            </div>

            <p className="text-[11px] text-zinc-500">
              Note: Historical sales transactions, invoices, and completed customer repair records retain their snapshots and remain completely unaffected.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeletingItem(null)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center gap-2 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                <span>{isSubmitting ? "Deleting..." : "Confirm Delete"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Audit Drawer */}
      <ContextualAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="Inventory Activity & Stock Audit"
        subtitle="Cryptographic audit stream for product creation, catalog edits, and stock deductions"
        actionPrefix="INVENTORY_"
        resourceFilter="/inventory"
      />
    </div>
  );
}
