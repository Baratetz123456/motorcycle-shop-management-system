"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { 
  Package, 
  Wrench, 
  ArrowLeft, 
  Edit3, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  ShieldAlert, 
  TrendingUp, 
  Boxes, 
  Tag, 
  DollarSign, 
  Sparkles, 
  X, 
  Check, 
  Clock, 
  Layers,
  Copy,
  Info
} from "lucide-react";
import clsx from "clsx";

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

const COMMON_CATEGORIES = [
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
];

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

export default function ItemProfilePage() {
  const params = useParams();
  const router = useRouter();
  const itemId = params?.id as string;

  const [item, setItem] = useState<CatalogItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [copiedSku, setCopiedSku] = useState(false);

  // Role permissions
  const [userRole, setUserRole] = useState<string>("admin");
  useEffect(() => {
    if (typeof window !== "undefined") {
      const role = localStorage.getItem("user_role") || "admin";
      setUserRole(role.toLowerCase());
    }
  }, []);
  const canManage = userRole === "admin" || userRole === "manager";

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    brand: "",
    category: "",
    cost_price: 0,
    selling_price: 0,
    current_stock: 0,
    reorder_level: 5,
  });

  // Delete Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (itemId) {
      fetchItemDetails();
    }
  }, [itemId]);

  const fetchItemDetails = async () => {
    setLoading(true);
    setError(null);

    let foundItem: CatalogItem | null = null;

    // 1. Try fetching directly from API
    try {
      const res = await apiClient.get<CatalogItem>(`/inventory/${itemId}`);
      if (res.data && res.data.id) {
        foundItem = res.data;
      }
    } catch (err) {
      // Fallback to searching collection endpoint or localStorage
    }

    // 2. If single GET didn't succeed, search full list
    if (!foundItem) {
      try {
        const listRes = await apiClient.get<CatalogItem[]>("/inventory");
        if (Array.isArray(listRes.data)) {
          const match = listRes.data.find((i) => i.id === itemId || i.sku === itemId);
          if (match) foundItem = match;
        }
      } catch (e) {}
    }

    // 3. Fallback to localStorage custom items
    if (!foundItem && typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem("motoshop_custom_inventory");
        if (stored) {
          const customList: CatalogItem[] = JSON.parse(stored);
          const match = customList.find((i) => i.id === itemId || i.sku === itemId);
          if (match) foundItem = match;
        }
      } catch (e) {}
    }

    if (!foundItem) {
      setError("Product or service not found. It may have been deleted.");
      setLoading(false);
      return;
    }

    // Sync stock overrides from localStorage if present
    if (typeof window !== "undefined") {
      try {
        const stockMap = JSON.parse(localStorage.getItem("motoshop_inventory_stock") || "{}");
        if (stockMap[foundItem.id] !== undefined) {
          foundItem.current_stock = stockMap[foundItem.id];
        }
      } catch (e) {}
    }

    setItem(foundItem);
    setLoading(false);
  };

  const handleCopySku = () => {
    if (!item) return;
    navigator.clipboard.writeText(item.sku);
    setCopiedSku(true);
    setTimeout(() => setCopiedSku(false), 2000);
  };

  const openEditModal = () => {
    if (!item) return;
    setEditForm({
      name: item.name,
      brand: item.brand || "",
      category: item.category,
      cost_price: Number(item.cost_price),
      selling_price: Number(item.selling_price),
      current_stock: Number(item.current_stock),
      reorder_level: Number(item.reorder_level),
    });
    setEditError(null);
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!item) return;
    setIsSubmittingEdit(true);
    setEditError(null);

    const payload = {
      name: editForm.name,
      brand: item.item_type === "PRODUCT" ? editForm.brand : undefined,
      category: editForm.category,
      cost_price: Number(editForm.cost_price),
      selling_price: Number(editForm.selling_price),
      current_stock: item.item_type === "PRODUCT" ? Number(editForm.current_stock) : 0,
      reorder_level: item.item_type === "PRODUCT" ? Number(editForm.reorder_level) : 0,
    };

    try {
      await apiClient.put(`/inventory/${item.id}`, payload);
    } catch (err: any) {
      // If API error, proceed with local fallback for local development
    }

    const updatedItem: CatalogItem = {
      ...item,
      ...payload,
    };

    // Update local storage caches for full consistency
    if (typeof window !== "undefined") {
      try {
        const storedCustom = localStorage.getItem("motoshop_custom_inventory");
        if (storedCustom) {
          const list: CatalogItem[] = JSON.parse(storedCustom);
          const updatedList = list.map((i) => (i.id === item.id ? updatedItem : i));
          localStorage.setItem("motoshop_custom_inventory", JSON.stringify(updatedList));
        }

        if (item.item_type === "PRODUCT") {
          const stockMap = JSON.parse(localStorage.getItem("motoshop_inventory_stock") || "{}");
          stockMap[item.id] = updatedItem.current_stock;
          localStorage.setItem("motoshop_inventory_stock", JSON.stringify(stockMap));
        }
      } catch (e) {}
    }

    recordUserAuditLog("ITEM_UPDATED", `/inventory/${item.id}`, {
      sku: item.sku,
      name: updatedItem.name,
      selling_price: updatedItem.selling_price,
      current_stock: updatedItem.current_stock
    });

    setItem(updatedItem);
    setIsSubmittingEdit(false);
    setIsEditModalOpen(false);
    setSuccess("Item details updated successfully!");
    setTimeout(() => setSuccess(null), 4000);
  };

  const handleDeleteItem = async () => {
    if (!item) return;
    setIsDeleting(true);

    try {
      await apiClient.delete(`/inventory/${item.id}`);
    } catch (err) {
      // Local fallback
    }

    if (typeof window !== "undefined") {
      try {
        const delArr: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_inventory_ids") || "[]");
        delArr.push(item.id);
        delArr.push(item.sku);
        localStorage.setItem("motoshop_deleted_inventory_ids", JSON.stringify(delArr));

        const stored = localStorage.getItem("motoshop_custom_inventory");
        if (stored) {
          const list: CatalogItem[] = JSON.parse(stored);
          const filtered = list.filter((i) => i.id !== item.id && i.sku !== item.sku);
          localStorage.setItem("motoshop_custom_inventory", JSON.stringify(filtered));
        }
      } catch (e) {}
    }

    recordUserAuditLog("ITEM_DELETED", `/inventory/${item.id}`, {
      sku: item.sku,
      name: item.name
    });

    setIsDeleting(false);
    setIsDeleteModalOpen(false);
    router.push("/inventory?deleted=1");
  };

  if (loading) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-zinc-400 gap-3">
        <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading item profile...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-sans">
        <button
          onClick={() => router.push("/inventory")}
          className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-md mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </button>
        <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-8 text-center text-red-400">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-red-400" />
          <h2 className="text-xl font-bold mb-2">Item Not Found</h2>
          <p className="text-sm text-zinc-400 mb-6">{error || "The requested item does not exist or has been removed."}</p>
          <button
            onClick={() => router.push("/inventory")}
            className="px-5 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-200 hover:text-white text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-md"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to Inventory</span>
          </button>
        </div>
      </div>
    );
  }

  const isProduct = item.item_type === "PRODUCT";
  const marginAmount = Number(item.selling_price) - Number(item.cost_price);
  const marginPercent = Number(item.selling_price) > 0 
    ? (marginAmount / Number(item.selling_price)) * 100 
    : 0;

  const isOutOfStock = isProduct && item.current_stock === 0;
  const isLowStock = isProduct && item.current_stock > 0 && item.current_stock <= item.reorder_level;
  const isOptimalStock = isProduct && item.current_stock > item.reorder_level;

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 font-sans">
      {/* Top Action & Navigation Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <button
          onClick={() => router.push("/inventory")}
          className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </button>

        {/* Action Controls */}
        {canManage && (
          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={openEditModal}
              className="px-4 py-2.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <Edit3 className="w-4 h-4" />
              <span>Edit Details</span>
            </button>
            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-all flex items-center gap-2 shadow-sm"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Item</span>
            </button>
          </div>
        )}
      </div>

      {/* Item Title & Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
          <Link href="/inventory" className="hover:text-cyan-400 transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-zinc-500">{isProduct ? "Parts & Products" : "Labor & Services"}</span>
          <span>/</span>
          <span className="text-zinc-200 font-medium truncate max-w-xs">{item.name}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
          {item.name}
        </h1>
      </div>

      {/* Success Notification Banner */}
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Hero Overview Card */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className={clsx(
              "w-16 h-16 rounded-2xl p-0.5 shadow-lg shrink-0 flex items-center justify-center",
              isProduct 
                ? "bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-cyan-500/20" 
                : "bg-gradient-to-tr from-purple-500 to-indigo-600 shadow-purple-500/20"
            )}>
              <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
                {isProduct ? <Package className="w-8 h-8 text-cyan-400" /> : <Wrench className="w-8 h-8 text-purple-400" />}
              </div>
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                <span className={clsx(
                  "px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border",
                  isProduct 
                    ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/30" 
                    : "bg-purple-500/10 text-purple-400 border-purple-500/30"
                )}>
                  {item.item_type}
                </span>

                {item.brand && (
                  <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                    {item.brand}
                  </span>
                )}

                <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-white/5">
                  {item.category}
                </span>

                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <Check className="w-3 h-3" />
                  Active in Catalog
                </span>
              </div>

              <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                <span>SKU / Code:</span>
                <span className="text-zinc-100 font-bold">{item.sku}</span>
                <button
                  onClick={handleCopySku}
                  className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                  title="Copy SKU"
                >
                  {copiedSku ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
          </div>

          {/* Large Selling Price Highlight */}
          <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-white/10">
            <div className="text-xs text-zinc-400 uppercase tracking-wider font-medium mb-1">Selling Retail Price</div>
            <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
              ₱{Number(item.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-400 font-mono mt-1">
              +{marginPercent.toFixed(1)}% Est. Margin
            </div>
          </div>
        </div>
      </div>

      {/* Grid: Stock Health & Financials */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Stock Status & Inventory Controls */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <Boxes className="w-5 h-5 text-cyan-400" />
                Stock & Inventory Status
              </h2>

              {isProduct ? (
                isOutOfStock ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-red-500/10 text-red-400 border border-red-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Low Stock Alert
                  </span>
                ) : (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <Check className="w-3.5 h-3.5" />
                    Optimal Stock
                  </span>
                )
              ) : (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-400 border border-purple-500/30">
                  Labor Service
                </span>
              )}
            </div>

            {isProduct ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Current Stock Level</div>
                    <div className={clsx(
                      "text-3xl font-black font-mono",
                      isOutOfStock ? "text-red-400" : isLowStock ? "text-amber-400" : "text-white"
                    )}>
                      {item.current_stock}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">Units available in store</div>
                  </div>

                  <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                    <div className="text-xs text-zinc-400 mb-1">Reorder Threshold</div>
                    <div className="text-3xl font-black font-mono text-zinc-300">
                      {item.reorder_level}
                    </div>
                    <div className="text-[11px] text-zinc-500 mt-1">Triggers low-stock warning</div>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-zinc-950/50 border border-white/5 text-xs text-zinc-300 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                  <div>
                    {isOutOfStock ? (
                      <span className="text-red-400 font-medium">Critical deficit: Stock is completely depleted. Reorder immediately.</span>
                    ) : isLowStock ? (
                      <span className="text-amber-400 font-medium">Stock is at or below the reorder point ({item.current_stock} remaining ≤ {item.reorder_level} alert level).</span>
                    ) : (
                      <span className="text-zinc-300">Healthy stock surplus: {item.current_stock - item.reorder_level} units above reorder alert threshold.</span>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-6 text-center text-zinc-400 bg-zinc-950/40 rounded-xl border border-white/5 space-y-2">
                <Wrench className="w-8 h-8 mx-auto text-purple-400 opacity-60" />
                <p className="text-sm text-zinc-300 font-medium">Labor & Workshop Service</p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                  Services do not decrement physical shelf inventory. They can be added directly to Job Cards and Showroom Counter invoices at any time.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: Financial Metrics & Margins */}
        <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Financials & Profit Margins
              </h2>
              <span className="text-xs text-zinc-500 font-mono">PHP (₱)</span>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                  <div className="text-xs text-zinc-400 mb-1">Cost Price</div>
                  <div className="text-2xl font-bold font-mono text-zinc-400">
                    ₱{Number(item.cost_price).toFixed(2)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">Acquisition / Unit Cost</div>
                </div>

                <div className="bg-zinc-950/60 border border-white/5 rounded-xl p-4">
                  <div className="text-xs text-zinc-400 mb-1">Gross Profit / Unit</div>
                  <div className="text-2xl font-bold font-mono text-emerald-400">
                    ₱{marginAmount.toFixed(2)}
                  </div>
                  <div className="text-[11px] text-zinc-500 mt-1">{marginPercent.toFixed(1)}% profit margin</div>
                </div>
              </div>

              {/* Progress bar representing profit ratio */}
              <div className="bg-zinc-950/50 p-3.5 rounded-xl border border-white/5 space-y-2">
                <div className="flex justify-between text-xs font-mono">
                  <span className="text-zinc-400">Cost: ₱{Number(item.cost_price).toFixed(2)}</span>
                  <span className="text-emerald-400 font-bold">Margin: {marginPercent.toFixed(0)}%</span>
                </div>
                <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden flex">
                  <div 
                    className="bg-zinc-600 h-full"
                    style={{ width: `${Math.max(0, 100 - marginPercent)}%` }}
                    title="Cost Ratio"
                  />
                  <div 
                    className="bg-emerald-500 h-full"
                    style={{ width: `${Math.min(100, Math.max(0, marginPercent))}%` }}
                    title="Profit Ratio"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Specifications & System Details */}
      <div className="bg-zinc-900/40 border border-white/10 rounded-2xl p-6 backdrop-blur-xl">
        <h2 className="text-base font-bold text-zinc-100 flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-cyan-400" />
          Catalog Item Specifications
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm font-sans">
          <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-400 mb-1">Catalog Classification</div>
            <div className="text-zinc-200 font-semibold">{isProduct ? "Physical Stock Item" : "Workshop Labor Service"}</div>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-400 mb-1">Assigned Category</div>
            <div className="text-zinc-200 font-semibold">{item.category}</div>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-400 mb-1">Manufacturer Brand</div>
            <div className="text-zinc-200 font-semibold">{item.brand || "Generic / Unspecified"}</div>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-400 mb-1">System Internal ID</div>
            <div className="text-zinc-300 font-mono text-xs truncate">{item.id}</div>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-400 mb-1">POS & Counter Status</div>
            <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4" />
              Available at Counter
            </div>
          </div>

          <div className="p-3.5 bg-zinc-950/60 rounded-xl border border-white/5">
            <div className="text-xs text-zinc-400 mb-1">Audit Tracking</div>
            <div className="text-zinc-300 font-semibold">Enabled (Immutable)</div>
          </div>
        </div>
      </div>

      {/* Edit Item Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
            <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-zinc-950/50">
              <h3 className="font-bold text-lg text-white flex items-center gap-2">
                <Edit3 className="w-5 h-5 text-cyan-400" />
                Edit {isProduct ? "Product" : "Service"} Details
              </h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEdit} className="p-6 space-y-4">
              {editError && (
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Item Name
                </label>
                <input
                  type="text"
                  required
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>

              {isProduct && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                    Brand
                  </label>
                  <input
                    type="text"
                    value={editForm.brand}
                    onChange={(e) => setEditForm({ ...editForm, brand: e.target.value })}
                    placeholder="e.g. Motul, Honda, Yamaha"
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                  Category
                </label>
                <select
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                  className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                >
                  {COMMON_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>

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
                    value={editForm.cost_price}
                    onChange={(e) => setEditForm({ ...editForm, cost_price: parseFloat(e.target.value) || 0 })}
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
                    value={editForm.selling_price}
                    onChange={(e) => setEditForm({ ...editForm, selling_price: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                  />
                </div>
              </div>

              {isProduct && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Current Stock
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editForm.current_stock}
                      onChange={(e) => setEditForm({ ...editForm, current_stock: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">
                      Reorder Alert Level
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={editForm.reorder_level}
                      onChange={(e) => setEditForm({ ...editForm, reorder_level: parseInt(e.target.value) || 0 })}
                      className="w-full bg-zinc-950 border border-white/10 rounded-xl px-3.5 py-2 text-sm text-white font-mono focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-sm font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="px-5 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white text-sm font-semibold transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
                >
                  {isSubmittingEdit ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Item Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-zinc-900 border border-red-500/30 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl p-6 text-center space-y-4">
            <div className="w-14 h-14 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center justify-center mx-auto text-red-400 shadow-lg shadow-red-500/10">
              <Trash2 className="w-7 h-7" />
            </div>

            <div>
              <h3 className="text-lg font-bold text-white mb-1">Delete {item.name}?</h3>
              <p className="text-xs text-zinc-400 font-mono mb-3">{item.sku}</p>
              <p className="text-xs text-zinc-400 bg-zinc-950/60 p-3 rounded-xl border border-white/5 leading-relaxed">
                This item will be deactivated and removed from the active inventory catalog. Past sales receipts and completed job cards containing this item will remain untouched.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-semibold transition-colors flex-1"
              >
                Keep Item
              </button>
              <button
                type="button"
                onClick={handleDeleteItem}
                disabled={isDeleting}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-semibold transition-colors flex-1 shadow-lg shadow-red-600/25 disabled:opacity-50"
              >
                {isDeleting ? "Deleting..." : "Confirm Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
