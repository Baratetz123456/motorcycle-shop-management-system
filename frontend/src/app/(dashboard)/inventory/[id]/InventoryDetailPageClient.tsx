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
import { Modal, ModalBody, ModalFooter, ConfirmModal } from "@/components/ui/Modal";
import { FloatingProfileActionsButton, MobileProfileActionsSheet } from "@/components/ui/MobileProfileActionsSheet";

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
  const [mobileTab, setMobileTab] = useState<"overview" | "stock" | "financials" | "details">("overview");
  const [isMobileActionsOpen, setIsMobileActionsOpen] = useState(false);

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
      <div className="min-h-[80vh] flex flex-col items-center justify-center text-zinc-400 gap-3 bg-zinc-950">
        <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium">Loading item profile...</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-8 max-w-4xl mx-auto font-sans bg-zinc-950 min-h-screen">
        <button
          onClick={() => router.push("/inventory")}
          className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 transition-colors flex items-center gap-2 text-xs font-semibold w-fit mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Inventory</span>
        </button>
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center text-zinc-300">
          <ShieldAlert className="w-12 h-12 mx-auto mb-3 text-zinc-400" />
          <h2 className="text-xl font-bold mb-2 text-white">Item Not Found</h2>
          <p className="text-sm text-zinc-400 mb-6">{error || "The requested item does not exist or has been removed."}</p>
          <button
            onClick={() => router.push("/inventory")}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-all inline-flex items-center gap-2 border border-emerald-500"
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
    <div className="w-full flex-1 min-h-0 flex flex-col font-sans p-4 sm:p-6 lg:p-8 overflow-y-auto pb-16 bg-zinc-950 text-zinc-100">
      <div className="w-full space-y-8 animate-profile-enter">
        {/* Top Action & Navigation Bar (Desktop Only >= md) */}
        <div className="hidden md:flex flex-row items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap">
          <button
            onClick={() => router.push("/inventory")}
            className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white border border-zinc-700 font-bold transition-all flex items-center gap-2 text-xs w-fit active:scale-[0.98]"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden xs:inline">Back to Inventory</span>
            <span className="xs:hidden">Back</span>
          </button>

          {/* Action Controls */}
          {canManage && (
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
              <button
                onClick={openEditModal}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold border border-emerald-500 text-xs transition-all flex items-center gap-1.5 sm:gap-2 active:scale-[0.98]"
              >
                <Edit3 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Edit Details</span>
              </button>
              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-900 text-white border border-zinc-700 text-xs font-bold transition-all flex items-center gap-1.5 sm:gap-2 active:scale-[0.98]"
              >
                <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Delete Item</span>
              </button>
            </div>
          )}
        </div>

      {/* Item Title & Breadcrumb Header */}
      <div>
        <div className="flex items-center gap-2 text-xs text-zinc-400 mb-1">
          <Link href="/inventory" className="hover:text-emerald-400 font-medium transition-colors">
            Inventory
          </Link>
          <span>/</span>
          <span className="text-zinc-500">{isProduct ? "Parts & Products" : "Labor & Services"}</span>
          <span>/</span>
          <span className="text-zinc-200 font-semibold truncate max-w-xs">{item.name}</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
          {item.name}
        </h1>
      </div>

      {/* Success Notification Banner */}
      {success && (
        <div className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 text-sm flex items-center gap-3 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" />
          <span className="font-medium">{success}</span>
        </div>
      )}

        {/* ============ MOBILE CARD-FREE TABBED CANVAS (< md) ============ */}
        <div className="block md:hidden space-y-5 pb-20">
          {/* Edge-to-Edge Sticky Tab Navigation Bar */}
          <div className="sticky top-0 z-20 bg-zinc-950 -mx-4 px-4 py-2.5 border-b border-zinc-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: isProduct ? Package : Wrench },
              { id: "stock", label: "Stock & Inventory", icon: Boxes },
              { id: "financials", label: "Financials", icon: TrendingUp },
              { id: "details", label: "Specifications", icon: Layers },
            ].map((tab) => {
              const isActive = mobileTab === tab.id;
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setMobileTab(tab.id as any)}
                  className={clsx(
                    "px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0",
                    isActive
                      ? "bg-emerald-600 text-white font-bold border border-emerald-500"
                      : "text-zinc-400 hover:text-white bg-zinc-900 border border-zinc-800"
                  )}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* TAB 1: OVERVIEW */}
          {mobileTab === "overview" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Selling Price Banner */}
              <div className="py-2 border-b border-zinc-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                    Selling Retail Price
                  </span>
                  <div className="text-3xl font-black text-white font-mono tracking-tight">
                    ₱{Number(item.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-bold block">
                    Est. Margin
                  </span>
                  <span className="text-sm font-bold font-mono text-emerald-400">
                    +{marginPercent.toFixed(1)}%
                  </span>
                </div>
              </div>

              {/* Edge-to-edge Key-Value List Rows */}
              <div className="space-y-1">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-2">
                  Item Identity
                </h3>

                {/* SKU */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    <Tag className="w-4 h-4 text-emerald-500" />
                    SKU / Code
                  </span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-mono font-bold text-white">{item.sku}</span>
                    <button
                      onClick={handleCopySku}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Copy SKU"
                    >
                      {copiedSku ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                {/* Classification */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    {isProduct ? <Package className="w-4 h-4 text-emerald-500" /> : <Wrench className="w-4 h-4 text-emerald-500" />}
                    Classification
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-zinc-800 text-zinc-300 border-zinc-700">
                    {item.item_type}
                  </span>
                </div>

                {/* Category */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-zinc-500" />
                    Category
                  </span>
                  <span className="text-sm font-bold text-zinc-200">{item.category}</span>
                </div>

                {/* Brand */}
                {item.brand && (
                  <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                    <span className="text-xs text-zinc-400 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-zinc-400" />
                      Brand
                    </span>
                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-200 border border-zinc-700">
                      {item.brand}
                    </span>
                  </div>
                )}

                {/* Catalog Status */}
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    Catalog Status
                  </span>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    Active in Catalog
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: STOCK & INVENTORY */}
          {mobileTab === "stock" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {isProduct ? (
                <>
                  {/* Stock Status Badge Banner */}
                  <div className="py-2 border-b border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Boxes className="w-4 h-4 text-emerald-500" />
                      Inventory Status
                    </span>
                    {isOutOfStock ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                        Low Stock Alert
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                        Optimal Stock
                      </span>
                    )}
                  </div>

                  {/* Edge-to-edge Key-Value List Rows */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                      <span className="text-xs text-zinc-400">Current Stock Level</span>
                      <span className="text-xl font-mono font-bold text-white">
                        {item.current_stock} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                      <span className="text-xs text-zinc-400">Reorder Threshold</span>
                      <span className="text-sm font-mono font-bold text-zinc-300">
                        {item.reorder_level} units
                      </span>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                      <span className="text-xs text-zinc-400">Stock Differential</span>
                      <span className="text-xs font-mono font-medium text-zinc-300">
                        {item.current_stock > item.reorder_level 
                          ? `+${item.current_stock - item.reorder_level} surplus units`
                          : `${item.reorder_level - item.current_stock} units below reorder level`}
                      </span>
                    </div>
                  </div>

                  {/* Advisory Notice */}
                  <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                    <div>
                      {isOutOfStock ? (
                        <span className="text-zinc-300 font-medium">Critical deficit: Stock is depleted. Reorder immediately.</span>
                      ) : isLowStock ? (
                        <span className="text-zinc-300 font-medium">Stock is at or below reorder alert level ({item.current_stock} remaining Γëñ {item.reorder_level}).</span>
                      ) : (
                        <span className="text-zinc-300">Healthy surplus: {item.current_stock - item.reorder_level} units above reorder threshold.</span>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div className="py-8 text-center text-zinc-500 space-y-2">
                  <Wrench className="w-8 h-8 mx-auto text-zinc-400 opacity-60" />
                  <p className="text-sm text-zinc-200 font-medium">Workshop Labor Service</p>
                  <p className="text-xs text-zinc-400 max-w-xs mx-auto">
                    Services do not decrement shelf inventory. They can be added to POS checkouts and Job Orders at any time.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* TAB 3: FINANCIALS */}
          {mobileTab === "financials" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-emerald-500" />
                  Margins & Pricing
                </span>
                <span className="font-mono text-xs text-zinc-400 font-bold">Currency: PHP (₱)</span>
              </div>

              {/* Edge-to-edge Key-Value List Rows */}
              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Selling Price</span>
                  <span className="text-sm font-mono font-black text-white">
                    ₱{Number(item.selling_price).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Acquisition / Cost Price</span>
                  <span className="text-sm font-mono font-bold text-zinc-400">
                    ₱{Number(item.cost_price).toFixed(2)}
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Gross Profit Margin</span>
                  <span className="text-sm font-mono font-bold text-emerald-400">
                    ₱{marginAmount.toFixed(2)} ({marginPercent.toFixed(1)}%)
                  </span>
                </div>
              </div>

              {/* Profit Ratio Bar */}
              <div className="p-3.5 rounded-xl bg-zinc-900 border border-zinc-800 space-y-2">
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
          )}

          {/* TAB 4: SPECIFICATIONS & SYSTEM DETAILS */}
          {mobileTab === "details" && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div className="py-2 border-b border-zinc-800 flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-emerald-500" />
                  System Details
                </span>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Classification</span>
                  <span className="text-xs font-semibold text-zinc-200">{isProduct ? "Physical Stock Item" : "Workshop Labor Service"}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Category</span>
                  <span className="text-xs font-semibold text-zinc-200">{item.category}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Manufacturer Brand</span>
                  <span className="text-xs font-semibold text-zinc-200">{item.brand || "Generic / Unspecified"}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">System Internal ID</span>
                  <span className="text-xs font-mono text-zinc-400 truncate max-w-[160px]">{item.id}</span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">POS & Counter Status</span>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Available
                  </span>
                </div>

                <div className="flex items-center justify-between py-3 border-b border-zinc-800/80">
                  <span className="text-xs text-zinc-400">Audit Tracking</span>
                  <span className="text-xs font-semibold text-zinc-300">Enabled (Immutable)</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ============ DESKTOP CARDS CANVAS (>= md) ============ */}
        <div className="hidden md:block space-y-8">
          {/* Hero Overview Card */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl shrink-0 flex items-center justify-center bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {isProduct ? <Package className="w-8 h-8 text-emerald-500" /> : <Wrench className="w-8 h-8 text-emerald-500" />}
                </div>

                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider border bg-zinc-800 text-zinc-300 border-zinc-700">
                      {item.item_type}
                    </span>

                    {item.brand && (
                      <span className="px-2.5 py-0.5 rounded-lg text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                        {item.brand}
                      </span>
                    )}

                    <span className="px-2.5 py-0.5 rounded-lg text-xs font-medium bg-zinc-800 text-zinc-300 border border-zinc-700">
                      {item.category}
                    </span>

                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-400" />
                      Active in Catalog
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-zinc-400 text-sm font-mono">
                    <span>SKU / Code:</span>
                    <span className="text-white font-bold">{item.sku}</span>
                    <button
                      onClick={handleCopySku}
                      className="p-1 hover:bg-zinc-800 rounded text-zinc-400 hover:text-white transition-colors"
                      title="Copy SKU"
                    >
                      {copiedSku ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Large Selling Price Highlight */}
              <div className="text-left md:text-right border-t md:border-t-0 pt-4 md:pt-0 border-zinc-800">
                <div className="text-xs text-zinc-400 uppercase tracking-wider font-semibold mb-1">Selling Retail Price</div>
                <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
                  ₱{Number(item.selling_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs text-emerald-400 font-mono font-bold mt-1">
                  +{marginPercent.toFixed(1)}% Est. Margin
                </div>
              </div>
            </div>
          </div>

          {/* Grid: Stock Health & Financials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Stock Status & Inventory Controls */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Boxes className="w-5 h-5 text-emerald-500" />
                    Stock & Inventory Status
                  </h2>

                  {isProduct ? (
                    isOutOfStock ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                        Out of Stock
                      </span>
                    ) : isLowStock ? (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5 text-zinc-400" />
                        Low Stock Alert
                      </span>
                    ) : (
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5 text-zinc-400" />
                        Optimal Stock
                      </span>
                    )
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Labor Service
                    </span>
                  )}
                </div>

                {isProduct ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                        <div className="text-xs text-zinc-400 mb-1 font-medium">Current Stock Level</div>
                        <div className="text-3xl font-black font-mono text-white">
                          {item.current_stock}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1">Units available in store</div>
                      </div>

                      <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                        <div className="text-xs text-zinc-400 mb-1 font-medium">Reorder Threshold</div>
                        <div className="text-3xl font-black font-mono text-zinc-300">
                          {item.reorder_level}
                        </div>
                        <div className="text-[11px] text-zinc-500 mt-1">Triggers low-stock warning</div>
                      </div>
                    </div>

                    <div className="p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-zinc-300 flex items-start gap-2.5">
                      <Info className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                      <div>
                        {isOutOfStock ? (
                          <span className="text-zinc-300 font-medium">Critical deficit: Stock is completely depleted. Reorder immediately.</span>
                        ) : isLowStock ? (
                          <span className="text-zinc-300 font-medium">Stock is at or below the reorder point ({item.current_stock} remaining Γëñ {item.reorder_level} alert level).</span>
                        ) : (
                          <span className="text-zinc-300">Healthy stock surplus: {item.current_stock - item.reorder_level} units above reorder alert threshold.</span>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-zinc-400 bg-zinc-950 rounded-xl border border-zinc-800 space-y-2">
                    <Wrench className="w-8 h-8 mx-auto text-zinc-500 opacity-60" />
                    <p className="text-sm text-zinc-200 font-medium">Labor & Workshop Service</p>
                    <p className="text-xs text-zinc-400 max-w-sm mx-auto">
                      Services do not decrement physical shelf inventory. They can be added directly to Job Cards and Showroom Counter invoices at any time.
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Card 2: Financial Metrics & Margins */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-emerald-500" />
                    Financials & Profit Margins
                  </h2>
                  <span className="text-xs text-zinc-400 font-mono">PHP (₱)</span>
                </div>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                      <div className="text-xs text-zinc-400 mb-1 font-medium">Cost Price</div>
                      <div className="text-2xl font-bold font-mono text-zinc-300">
                        ₱{Number(item.cost_price).toFixed(2)}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">Acquisition / Unit Cost</div>
                    </div>

                    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
                      <div className="text-xs text-zinc-400 mb-1 font-medium">Gross Profit / Unit</div>
                      <div className="text-2xl font-bold font-mono text-emerald-400">
                        ₱{marginAmount.toFixed(2)}
                      </div>
                      <div className="text-[11px] text-zinc-500 mt-1">{marginPercent.toFixed(1)}% profit margin</div>
                    </div>
                  </div>

                  {/* Progress bar representing profit ratio */}
                  <div className="bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 space-y-2">
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
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6">
            <h2 className="text-base font-bold text-white flex items-center gap-2 mb-4">
              <Layers className="w-5 h-5 text-emerald-500" />
              Catalog Item Specifications
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-sm font-sans">
              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1 font-medium">Catalog Classification</div>
                <div className="text-zinc-200 font-semibold">{isProduct ? "Physical Stock Item" : "Workshop Labor Service"}</div>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1 font-medium">Assigned Category</div>
                <div className="text-zinc-200 font-semibold">{item.category}</div>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1 font-medium">Manufacturer Brand</div>
                <div className="text-zinc-200 font-semibold">{item.brand || "Generic / Unspecified"}</div>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1 font-medium">System Internal ID</div>
                <div className="text-zinc-400 font-mono text-xs truncate">{item.id}</div>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1 font-medium">POS & Counter Status</div>
                <div className="text-emerald-400 font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4" />
                  Available at Counter
                </div>
              </div>

              <div className="p-3.5 bg-zinc-950 rounded-xl border border-zinc-800">
                <div className="text-xs text-zinc-400 mb-1 font-medium">Audit Tracking</div>
                <div className="text-zinc-300 font-semibold">Enabled (Immutable)</div>
              </div>
            </div>
          </div>
        </div>

      {/* Edit Item Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        size="lg"
        title={`Edit ${isProduct ? "Product" : "Service"} Details`}
        subtitle={`Modify catalog attributes for ${item.sku}`}
        icon={<Edit3 className="w-5 h-5" />}
        preventBackdropClose={isSubmittingEdit}
      >
        <form onSubmit={handleSaveEdit}>
          <ModalBody>
            {editError && (
              <div className="p-3 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-400" />
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
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all"
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-all"
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
                className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500 transition-all cursor-pointer"
              >
                {COMMON_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat} className="bg-zinc-900 text-white">{cat}</option>
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
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
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
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
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
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
                    value={editForm.reorder_level}
                    onChange={(e) => setEditForm({ ...editForm, reorder_level: parseInt(e.target.value) || 0 })}
                    className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-emerald-500 transition-all"
                  />
                </div>
              </div>
            )}
          </ModalBody>

          <ModalFooter>
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-bold transition-all active:scale-[0.98]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmittingEdit}
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all border border-emerald-500 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmittingEdit ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Item Confirmation Modal */}
      <ConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDeleteItem}
        title={`Delete ${item.name}?`}
        description={
          <div>
            Are you sure you want to delete <span className="font-semibold text-white">{item.name}</span> (<span className="font-mono text-emerald-400 font-bold">{item.sku}</span>)?
          </div>
        }
        warningDetails="This item will be deactivated and removed from the active inventory catalog. Past sales receipts and completed job cards containing this item will remain untouched."
        confirmText="Confirm Delete"
        cancelText="Keep Item"
        confirmVariant="danger"
        isLoading={isDeleting}
        icon={<Trash2 className="w-5 h-5" />}
      />
      {/* Mobile Floating Action Button & Actions Sheet (< md) */}
      <FloatingProfileActionsButton
        onClick={() => setIsMobileActionsOpen(true)}
        label="Actions"
      />

      <MobileProfileActionsSheet
        isOpen={isMobileActionsOpen}
        onClose={() => setIsMobileActionsOpen(false)}
        title={item.name}
        subtitle={`SKU: ${item.sku} ΓÇó ${isProduct ? "Product" : "Service"}`}
        actions={[
          {
            id: "back",
            label: "Back to Inventory",
            icon: <ArrowLeft className="w-4 h-4" />,
            onClick: () => router.push("/inventory"),
          },
          ...(canManage ? [
            {
              id: "edit",
              label: "Edit Details",
              icon: <Edit3 className="w-4 h-4" />,
              variant: "primary" as const,
              onClick: openEditModal,
            },
            {
              id: "delete",
              label: "Delete Item",
              icon: <Trash2 className="w-4 h-4" />,
              variant: "danger" as const,
              onClick: () => setIsDeleteModalOpen(true),
            },
          ] : []),
        ]}
      />
      </div>
    </div>
  );
}
