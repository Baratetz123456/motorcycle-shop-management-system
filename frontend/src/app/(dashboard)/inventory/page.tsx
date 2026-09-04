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
  RefreshCw
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";
import { recordUserAuditLog } from "@/lib/audit";

export interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  item_type: "PRODUCT" | "SERVICE";
  category: string;
  current_stock: number;
  reorder_level: number;
  cost_price: number;
  selling_price: number;
}

const INITIAL_CATALOG: CatalogItem[] = [
  { id: "uuid-1", sku: "OIL-10W40", name: "Synthetic Motor Oil 10W-40", item_type: "PRODUCT", category: "Fluids", current_stock: 45, reorder_level: 20, cost_price: 10.00, selling_price: 15.99 },
  { id: "uuid-2", sku: "FLT-001", name: "Premium Oil Filter", item_type: "PRODUCT", category: "Filters", current_stock: 12, reorder_level: 15, cost_price: 4.50, selling_price: 8.50 },
  { id: "uuid-3", sku: "BRK-PAD-F", name: "Front Brake Pads", item_type: "PRODUCT", category: "Brakes", current_stock: 8, reorder_level: 10, cost_price: 20.00, selling_price: 34.00 },
  { id: "uuid-4", sku: "SRV-TUN-01", name: "General Tune-Up & Inspection", item_type: "SERVICE", category: "Maintenance", current_stock: 0, reorder_level: 0, cost_price: 25.00, selling_price: 75.00 },
  { id: "uuid-5", sku: "SRV-OIL-CHG", name: "Oil & Filter Change Service", item_type: "SERVICE", category: "Maintenance", current_stock: 0, reorder_level: 0, cost_price: 10.00, selling_price: 30.00 },
  { id: "uuid-6", sku: "SRV-BRK-SRV", name: "Brake Cleaning & Overhaul", item_type: "SERVICE", category: "Brake Service", current_stock: 0, reorder_level: 0, cost_price: 15.00, selling_price: 50.00 },
  { id: "uuid-7", sku: "SPK-PLG", name: "Iridium Spark Plug", item_type: "PRODUCT", category: "Engine", current_stock: 30, reorder_level: 20, cost_price: 8.00, selling_price: 18.25 },
  { id: "uuid-8", sku: "TR-FR-120", name: "Front Tire 120/70-17", item_type: "PRODUCT", category: "Tires", current_stock: 4, reorder_level: 5, cost_price: 80.00, selling_price: 120.00 },
];

export default function InventoryManagementPage() {
  const [items, setItems] = useState<CatalogItem[]>(INITIAL_CATALOG);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

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

  // Auto-generate SKU Code or Service Code
  const generateAutoCode = (type: "PRODUCT" | "SERVICE") => {
    const prefix = type === "PRODUCT" ? "SKU-PRD" : "SRV-MNT";
    const rand = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `${prefix}-${rand}`;
  };

  // New item form state
  const [formData, setFormData] = useState({
    sku: generateAutoCode("PRODUCT"),
    name: "",
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
    let list: CatalogItem[] = INITIAL_CATALOG;
    try {
      const res = await apiClient.get<CatalogItem[]>("/inventory");
      if (Array.isArray(res.data) && res.data.length > 0) {
        list = res.data;
      }
    } catch (err) {
      // Use local state fallback
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

    try {
      const res = await apiClient.post<CatalogItem>("/inventory", formData);
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
        item_type: formData.item_type,
        category: formData.category,
        selling_price: formData.selling_price,
        current_stock: formData.current_stock
      });
      setIsModalOpen(false);
    } catch (err: any) {
      // Fallback update for responsive demo experience
      const demoItem: CatalogItem = {
        id: `uuid-${Date.now()}`,
        ...formData,
        cost_price: Number(formData.cost_price),
        selling_price: Number(formData.selling_price),
        current_stock: Number(formData.current_stock),
        reorder_level: Number(formData.reorder_level),
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
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold text-right">Cost Price</th>
                <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                <th className="px-6 py-4 font-semibold text-right">Est. Margin</th>
                <th className="px-6 py-4 font-semibold text-center">Stock Level</th>
                <th className="px-6 py-4 font-semibold text-center">POS Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500">
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
                            <div className="font-semibold text-zinc-100">{item.name}</div>
                            <div className="text-xs text-zinc-500 font-mono mt-0.5">{item.sku}</div>
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

                      <td className="px-6 py-4">
                        <span className="bg-zinc-800/80 px-2.5 py-1 rounded-md text-xs font-medium border border-white/5 text-zinc-300">
                          {item.category}
                        </span>
                      </td>

                      <td className="px-6 py-4 text-right font-mono text-zinc-400">${item.cost_price.toFixed(2)}</td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-white">${item.selling_price.toFixed(2)}</td>

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
                    Product Part / Fluid
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
                    Labor Service
                  </button>
                </div>
              </div>

              {/* SKU & Name with Auto-Generation */}
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
                  <span className="text-[10px] text-zinc-500 mt-1 block">Unique system-assigned code</span>
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
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Cost Price ($)</label>
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
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Selling / Charge Price ($) *</label>
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
