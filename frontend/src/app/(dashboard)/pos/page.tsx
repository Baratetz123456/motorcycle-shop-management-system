"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store/pos-store";
import { 
  ShoppingCart, 
  Package, 
  Wrench, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  Tag, 
  User, 
  Bike, 
  Check, 
  AlertCircle, 
  AlertTriangle, 
  X, 
  ArrowRight, 
  Activity,
  Flame,
  ArrowLeft,
  RotateCcw,
  CreditCard,
  Banknote,
  CheckCircle2,
  Lock
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { ContextualAuditDrawer } from "@/components/audit/ContextualAuditDrawer";

interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  brand?: string;
  item_type: "PRODUCT" | "SERVICE";
  category?: string;
  selling_price: number;
  current_stock: number;
  is_active?: boolean;
}

interface ActiveRepairCart {
  job_id: string;
  jo_number: string;
  customer_name: string;
  motorcycle_name: string;
  status: string;
  is_paid?: boolean;
  labor_charge: number;
  parts_charge: number;
  total_amount: number;
  cart_items?: {
    id: string;
    item_id?: string;
    item_name: string;
    item_type: string;
    qty: number;
    unit_price: number;
    total_price: number;
  }[];
}

export default function POSPage() {
  const router = useRouter();
  const { cart, addToCart, removeFromCart, updateQty, getTotals, clearCart } = usePosStore();
  const { subtotal, total, itemCount } = getTotals();

  // Page view state: "catalog" | "cart"
  const [activeView, setActiveView] = useState<"catalog" | "cart">("catalog");

  // Two filters only: "SERVICE" | "PRODUCT" (Services is default)
  const [activeFilter, setActiveFilter] = useState<"SERVICE" | "PRODUCT">("SERVICE");

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [activeRepairs, setActiveRepairs] = useState<ActiveRepairCart[]>([]);
  
  // Rule: Cashier newly logging in/visiting page has NO selected customer by default
  const [selectedRepair, setSelectedRepair] = useState<ActiveRepairCart | null>(null);
  const [isChangingCustomer, setIsChangingCustomer] = useState(false);
  const [search, setSearch] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isAuditOpen, setIsAuditOpen] = useState(false);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [frequencyMap, setFrequencyMap] = useState<Record<string, number>>({});

  // Guard: User is strictly prohibited from viewing or remaining on cart view without an active customer repair selected
  useEffect(() => {
    if (!selectedRepair && activeView === "cart") {
      setActiveView("catalog");
      setWarningMessage("Order cart view is locked: Please select an active customer repair first.");
    }
  }, [selectedRepair, activeView]);

  // Calculate item availment frequencies from live sales transactions
  useEffect(() => {
    const calcFrequencies = async () => {
      const counts: Record<string, number> = {};
      try {
        const res = await apiClient.get<any[]>("/sales/transactions");
        if (Array.isArray(res.data)) {
          res.data.forEach((tx: any) => {
            if (Array.isArray(tx.items)) {
              tx.items.forEach((it: any) => {
                const name = it.name || it.item_name;
                if (name) {
                  counts[name] = (counts[name] || 0) + (Number(it.qty) || 1);
                }
              });
            }
          });
        }
      } catch (e) {}

      try {
        const stored = localStorage.getItem("motoshop_sales_logs");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            parsed.forEach((tx: any) => {
              if (Array.isArray(tx.items)) {
                tx.items.forEach((it: any) => {
                  const name = it.name || it.item_name;
                  if (name) {
                    counts[name] = (counts[name] || 0) + (Number(it.qty) || 1);
                  }
                });
              }
            });
          }
        }
      } catch (e) {}

      setFrequencyMap(counts);
    };

    calcFrequencies();
  }, []);

  useEffect(() => {
    fetchCatalog();
    fetchActiveRepairs();

    // Synchronize catalog, stock levels, and active repair jobs whenever tab regains focus or storage changes
    const handleSync = () => {
      fetchCatalog();
      fetchActiveRepairs();
    };
    window.addEventListener("focus", handleSync);
    window.addEventListener("storage", handleSync);
    return () => {
      window.removeEventListener("focus", handleSync);
      window.removeEventListener("storage", handleSync);
    };
  }, []);

  // Keep localStorage cart items synced whenever cart changes
  useEffect(() => {
    if (selectedRepair && cart.length > 0) {
      const existingKey = `motoshop_cart_${selectedRepair.job_id}`;
      const extraItems = cart.filter((i) => !i.id.startsWith("labor-"));
      localStorage.setItem(existingKey, JSON.stringify(extraItems));
    }
  }, [cart, selectedRepair]);

  // Real-time catalog & stock synchronization with Inventory Management
  const fetchCatalog = async () => {
    let list: CatalogItem[] = [];
    try {
      const res = await apiClient.get<CatalogItem[]>("/inventory");
      if (Array.isArray(res.data) && res.data.length > 0) {
        list = res.data;
      }
    } catch (e) {
      // empty list
    }

    // 1. Merge custom inventory items created in Inventory Management
    try {
      const storedCustom = localStorage.getItem("motoshop_custom_inventory");
      if (storedCustom) {
        const customList: CatalogItem[] = JSON.parse(storedCustom);
        if (Array.isArray(customList) && customList.length > 0) {
          const existingIds = new Set(list.map((i) => i.id));
          const toAdd = customList.filter((ci) => !existingIds.has(ci.id));
          list = [...toAdd, ...list];
        }
      }
    } catch (e) {}

    // 2. Synchronize real-time stock levels with Inventory Management
    try {
      const storedInv = localStorage.getItem("motoshop_inventory_stock");
      if (storedInv) {
        const invMap = JSON.parse(storedInv);
        list = list.map((item) => {
          if (item.item_type === "PRODUCT" && invMap[item.id] !== undefined) {
            return { ...item, current_stock: Math.max(0, Number(invMap[item.id])) };
          }
          return item;
        });
      }
    } catch (e) {}

    // 3. Filter out soft-deleted items to ensure sold items / completed repair logs remain safe
    let deletedIdsSet = new Set<string>();
    try {
      const delArr = JSON.parse(localStorage.getItem("motoshop_deleted_inventory_ids") || "[]");
      deletedIdsSet = new Set(delArr);
    } catch (e) {}
    list = list.filter((item) => item.is_active !== false && !deletedIdsSet.has(item.id) && !deletedIdsSet.has(item.sku));

    setCatalog(list);
  };

  const fetchActiveRepairs = async () => {
    let deletedSet = new Set<string>();
    try {
      const deletedIds: string[] = JSON.parse(localStorage.getItem("motoshop_deleted_job_ids") || "[]");
      deletedSet = new Set(deletedIds);
    } catch (e) {}

    let apiRepairs: ActiveRepairCart[] = [];
    try {
      const res = await apiClient.get<ActiveRepairCart[]>("/repairs/jobs/active-carts");
      if (Array.isArray(res.data) && res.data.length > 0) {
        apiRepairs = res.data;
      }
    } catch (e) {
      // ignore network error
    }

    // Merge with repairs from local storage (motoshop_active_repairs / motoshop_jobs)
    let localRepairs: ActiveRepairCart[] = [];
    try {
      const storedActive = localStorage.getItem("motoshop_active_repairs");
      if (storedActive) {
        const parsed = JSON.parse(storedActive);
        if (Array.isArray(parsed)) {
          localRepairs = parsed;
        }
      }
      const storedJobs = localStorage.getItem("motoshop_jobs");
      if (storedJobs) {
        const parsedJobs: any[] = JSON.parse(storedJobs);
        if (Array.isArray(parsedJobs)) {
          const fromJobs = parsedJobs.map((j) => ({
            job_id: j.id,
            jo_number: j.jo_number,
            customer_name: j.customer || j.customer_name,
            motorcycle_name: j.motorcycle || j.motorcycle_name || j.motorcycle_id,
            status: j.status,
            is_paid: Boolean(j.is_paid),
            labor_charge: Number(j.labor_charge || 0),
            parts_charge: Number(j.parts_charge || 0),
            total_amount: Number(j.labor_charge || 0) + Number(j.parts_charge || 0),
          }));
          const existingJobIds = new Set(localRepairs.map((r) => r.job_id));
          fromJobs.forEach((fj) => {
            if (!existingJobIds.has(fj.job_id)) {
              localRepairs.push(fj);
            }
          });
        }
      }
    } catch (e) {}

    // Combine local & server repairs (API takes precedence, local fallback)
    const combinedMap = new Map<string, ActiveRepairCart>();
    localRepairs.forEach((r) => combinedMap.set(r.job_id, r));
    apiRepairs.forEach((r) => combinedMap.set(r.job_id, r));

    const finalRepairs = Array.from(combinedMap.values()).filter((r) => {
      if (deletedSet.has(r.job_id) || deletedSet.has(r.jo_number)) return false;
      const isPaidLocal = typeof window !== "undefined" && (
        localStorage.getItem(`motoshop_job_paid_${r.job_id}`) === "true" ||
        localStorage.getItem(`motoshop_job_paid_${r.jo_number}`) === "true"
      );
      if (r.is_paid || isPaidLocal) return false;
      // Exclude RELEASED repairs as they are already finalized
      if (r.status === "RELEASED") return false;
      return true;
    });

    setActiveRepairs(finalRepairs);

    // If currently selected repair is no longer active (e.g. was paid or released or deleted), reset selection
    setSelectedRepair((current) => {
      if (!current) return null;
      const stillActive = finalRepairs.find((r) => r.job_id === current.job_id);
      return stillActive || null;
    });
  };

  const selectActiveCustomerRepair = (repair: ActiveRepairCart, shouldResetCart = true) => {
    setSelectedRepair(repair);
    setIsChangingCustomer(false);
    setWarningMessage(null);
    localStorage.setItem("motoshop_selected_job_id", repair.job_id);

    // Rule: By default, Services is displayed first after cashier selects active customer
    setActiveFilter("SERVICE");

    if (shouldResetCart) {
      clearCart();

      // Rule: Base labor fee is completely removed. Only restore itemized cart items if any.
      const storedCartStr = localStorage.getItem(`motoshop_cart_${repair.job_id}`);
      if (storedCartStr) {
        try {
          const storedItems = JSON.parse(storedCartStr);
          storedItems.forEach((item: any) => addToCart(item));
        } catch (e) {
          // ignore parse error
        }
      }
    }
  };

  const handleAddItemToCustomerCart = async (product: CatalogItem) => {
    if (!selectedRepair) {
      setWarningMessage("Please select an active customer repair from the selection layout before adding products or services!");
      return;
    }

    // Protection: Out of stock products cannot be added to cart
    if (product.item_type === "PRODUCT" && product.current_stock <= 0) {
      setWarningMessage(`Product "${product.name}" is currently out of stock in inventory!`);
      return;
    }

    setWarningMessage(null);
    const newItem = { id: product.id, name: product.name, price: Number(product.selling_price) };
    addToCart(newItem);

    // Save item persistently in localStorage keyed by job_id
    const existingKey = `motoshop_cart_${selectedRepair.job_id}`;
    const stored = localStorage.getItem(existingKey);
    const itemsArr = stored ? JSON.parse(stored) : [];
    itemsArr.push(newItem);
    localStorage.setItem(existingKey, JSON.stringify(itemsArr));

    try {
      await apiClient.post(`/repairs/jobs/${selectedRepair.job_id}/cart-items`, {
        item_id: product.id,
        item_name: product.name,
        item_type: product.item_type,
        qty: 1,
        unit_price: Number(product.selling_price),
        total_price: Number(product.selling_price),
      });
    } catch (e) {}
  };

  const handleProceedToCheckout = () => {
    if (!selectedRepair) {
      setWarningMessage("Please select an active customer repair before proceeding to checkout!");
      return;
    }
    const query = new URLSearchParams({
      job_id: selectedRepair.job_id,
      customer: selectedRepair.customer_name,
      model: selectedRepair.motorcycle_name,
      mechanic: "Mike Smith",
    }).toString();
    router.push(`/pos/checkout?${query}`);
  };

  // Filter and sort catalog by frequency of availment
  const filteredCatalog = catalog
    .filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(search.toLowerCase()) ||
        item.sku.toLowerCase().includes(search.toLowerCase());
      const matchesFilter = item.item_type === activeFilter;
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const freqA = frequencyMap[a.name] || 0;
      const freqB = frequencyMap[b.name] || 0;
      return freqB - freqA; // Highest frequency first
    });

  return (
    <div className="flex flex-col min-h-screen bg-zinc-950 text-zinc-50 font-sans">
      
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-zinc-950/90 border-b border-white/10 backdrop-blur-xl px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              Versiklo POS
            </h1>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              Point of Sale
            </span>
          </div>

          {/* Audit trail quick button */}
          <button
            onClick={() => setIsAuditOpen(true)}
            className="sm:hidden p-2 rounded-xl bg-zinc-900 border border-white/10 text-zinc-300"
            title="Audit Trail"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
          </button>
        </div>

        {/* View Switcher: Catalog vs Current Order Cart (Full-page switch) */}
        <div className="flex items-center gap-2 sm:gap-4">
          <div className="flex bg-zinc-900/90 p-1 rounded-2xl border border-white/10 text-xs w-full sm:w-auto shadow-inner">
            <button
              onClick={() => setActiveView("catalog")}
              className={clsx(
                "flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                activeView === "catalog"
                  ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Package className="w-4 h-4" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => {
                if (!selectedRepair) {
                  setWarningMessage("Cannot view order cart: Please select an active customer repair first!");
                  return;
                }
                setActiveView("cart");
              }}
              disabled={!selectedRepair}
              className={clsx(
                "flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 relative",
                !selectedRepair
                  ? "opacity-50 cursor-not-allowed text-zinc-500 hover:text-zinc-500"
                  : activeView === "cart"
                    ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-500/20"
                    : "text-zinc-400 hover:text-white"
              )}
              title={!selectedRepair ? "Please select an active customer repair to view or manage the order cart" : undefined}
            >
              {!selectedRepair ? (
                <Lock className="w-4 h-4 text-zinc-500" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              <span>Current Order Cart</span>
              {selectedRepair && itemCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-zinc-950 font-mono text-[10px] font-black shadow-sm">
                  {itemCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={() => setIsAuditOpen(true)}
            className="hidden sm:flex px-3.5 py-2 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors items-center gap-1.5 text-xs font-semibold shrink-0 shadow-sm"
          >
            <Activity className="w-4 h-4 text-cyan-400" />
            <span>Audit Trail</span>
          </button>
        </div>
      </header>

      {/* Warning Notification Banner */}
      {warningMessage && (
        <div className="bg-amber-500/10 border-b border-amber-500/30 px-4 sm:px-8 py-3 flex items-center justify-between text-amber-300 text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button onClick={() => setWarningMessage(null)} className="text-amber-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: CATALOG & ACTIVE CUSTOMER SELECTION */}
      {activeView === "catalog" && (
        <main className="flex-1 flex flex-col pb-24 lg:pb-8">
          
          {/* Section: Active Customer Repair Selection */}
          <section className="border-b border-white/10 bg-zinc-900/40 p-4 sm:p-6 backdrop-blur-md">
            <div className="max-w-7xl mx-auto space-y-4">
              
              {/* If customer is already selected and NOT actively expanding selector */}
              {selectedRepair && !isChangingCustomer ? (
                <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/80 border border-cyan-500/30 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-64 h-full bg-gradient-to-l from-cyan-500/10 to-transparent pointer-events-none" />
                  
                  <div className="flex items-center gap-4 relative z-10">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 font-bold text-lg shadow-inner">
                      {selectedRepair.customer_name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="text-xs uppercase font-bold text-cyan-400 tracking-wider">Active Customer Linked</span>
                        <span className="font-mono text-[11px] bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md font-bold">
                          {selectedRepair.jo_number}
                        </span>
                        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                          {selectedRepair.status}
                        </span>
                      </div>
                      <h2 className="text-lg sm:text-xl font-black text-white mt-0.5">{selectedRepair.customer_name}</h2>
                      <p className="text-xs text-zinc-400 flex items-center gap-2 font-medium mt-0.5">
                        <Bike className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{selectedRepair.motorcycle_name}</span>
                        <span className="text-zinc-600">•</span>
                        <span>Mechanic: Mike Smith</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 relative z-10 self-end sm:self-center">
                    <button
                      onClick={() => setIsChangingCustomer(true)}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all border border-white/10"
                    >
                      Change Customer
                    </button>
                    <button
                      onClick={() => setActiveView("cart")}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white text-xs font-bold shadow-md shadow-cyan-500/20 flex items-center gap-2"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>View Cart ({itemCount})</span>
                    </button>
                  </div>
                </div>
              ) : (
                /* Unselected State: Prominent Active Customer Repair Card Grid / Carousel */
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <div>
                      <h2 className="text-sm font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Step 1: Select Active Customer Repair
                      </h2>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Choose an ongoing or returning customer job order to assign products and services before adding to cart.
                      </p>
                    </div>
                    {selectedRepair && (
                      <button
                        onClick={() => setIsChangingCustomer(false)}
                        className="text-xs text-zinc-400 hover:text-white underline self-start sm:self-auto"
                      >
                        Cancel selection change
                      </button>
                    )}
                  </div>

                  {/* Customer Repair Selection Cards (Base Labor completely removed) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
                    {activeRepairs.map((repair) => {
                      const isSelected = selectedRepair?.job_id === repair.job_id;

                      return (
                        <div
                          key={repair.job_id}
                          onClick={() => selectActiveCustomerRepair(repair)}
                          className={clsx(
                            "group p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between gap-3 relative overflow-hidden",
                            isSelected
                              ? "bg-cyan-950/40 border-cyan-400 shadow-lg shadow-cyan-500/20 ring-1 ring-cyan-400"
                              : "bg-zinc-900/80 border-white/10 hover:border-cyan-500/40 hover:bg-zinc-900"
                          )}
                        >
                          <div>
                            <div className="flex items-center justify-between gap-2 mb-2">
                              <span className="font-mono text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-950 text-cyan-400 border border-white/5">
                                {repair.jo_number}
                              </span>
                              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                                {repair.status}
                              </span>
                            </div>

                            <h3 className="font-bold text-white text-sm group-hover:text-cyan-300 transition-colors">
                              {repair.customer_name}
                            </h3>
                            <p className="text-xs text-zinc-400 flex items-center gap-1.5 mt-1">
                              <Bike className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                              <span className="truncate">{repair.motorcycle_name}</span>
                            </p>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-white/5">
                            <span className="text-[10px] text-zinc-500 uppercase font-semibold">
                              Customer Repair Session
                            </span>

                            <button
                              type="button"
                              className={clsx(
                                "px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all",
                                isSelected
                                  ? "bg-cyan-500 text-zinc-950 shadow-md"
                                  : "bg-zinc-800 group-hover:bg-cyan-600 text-zinc-200 group-hover:text-white"
                              )}
                            >
                              {isSelected ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Selected</span>
                                </>
                              ) : (
                                <span>Select</span>
                              )}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* Section: Catalog Controls (Strictly 2 Filters: Services & Products) */}
          <section className="max-w-7xl w-full mx-auto p-4 sm:p-6 space-y-6 flex-1 flex flex-col">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Exactly Two Filters: Services & Products */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 hidden sm:inline-block">Filter:</span>
                <div className="flex bg-zinc-900 p-1 rounded-2xl border border-white/10 text-xs w-full sm:w-auto shadow-inner">
                  <button
                    onClick={() => setActiveFilter("SERVICE")}
                    className={clsx(
                      "flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      activeFilter === "SERVICE"
                        ? "bg-purple-600 text-white shadow-md shadow-purple-500/20"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Services</span>
                  </button>

                  <button
                    onClick={() => setActiveFilter("PRODUCT")}
                    className={clsx(
                      "flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                      activeFilter === "PRODUCT"
                        ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20"
                        : "text-zinc-400 hover:text-white"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    <span>Products</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  placeholder={`Search ${activeFilter === "SERVICE" ? "services" : "products"} or SKU...`}
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full bg-zinc-900/90 border border-white/10 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-xs sm:text-sm text-white placeholder-zinc-500"
                />
              </div>
            </div>

            {/* If no customer selected, show clear instructions banner */}
            {!selectedRepair && (
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs font-semibold flex items-center gap-3 animate-pulse">
                <AlertCircle className="w-5 h-5 shrink-0 text-amber-400" />
                <span>Please select an active customer repair from Step 1 above to enable adding products and services to cart.</span>
              </div>
            )}

            {/* Catalog Grid (Ordered by Popularity: 'sold' for products, 'completed' for services) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 flex-1">
              {filteredCatalog.length === 0 ? (
                <div className="col-span-full py-16 flex flex-col items-center justify-center text-zinc-500 text-xs">
                  <Package className="w-12 h-12 mb-3 opacity-30" />
                  <p>No {activeFilter.toLowerCase()}s found in inventory catalog.</p>
                </div>
              ) : (
                filteredCatalog.map((product) => {
                  const isService = product.item_type === "SERVICE";
                  const cartItem = cart.find((c) => c.id === product.id);
                  const frequency = frequencyMap[product.name] || 0;
                  const isOutOfStock = !isService && product.current_stock === 0;

                  return (
                    <div
                      key={product.id}
                      className={clsx(
                        "group relative bg-zinc-900/60 border rounded-2xl p-5 flex flex-col justify-between transition-all duration-300 shadow-md",
                        !selectedRepair && "opacity-80 border-dashed border-white/10",
                        isOutOfStock && "opacity-60 border-red-500/20 bg-red-950/10",
                        selectedRepair && !isOutOfStock && isService && "border-white/10 hover:border-purple-500/50 hover:shadow-purple-500/10",
                        selectedRepair && !isOutOfStock && !isService && "border-white/10 hover:border-cyan-500/50 hover:shadow-cyan-500/10"
                      )}
                    >
                      <div>
                        {/* Top Header: Badge & Frequency Availment Indicator */}
                        <div className="flex justify-between items-start mb-3">
                          <div className={clsx(
                            "rounded-xl p-2 border",
                            isService ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                          )}>
                            {isService ? <Wrench className="w-4 h-4" /> : <Package className="w-4 h-4" />}
                          </div>

                          <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {frequency > 0 && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1" title="Historical popularity">
                                <Flame className="w-3 h-3 text-amber-400" />
                                <span>{isService ? `${frequency} completed` : `${frequency} sold`}</span>
                              </span>
                            )}
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-white/5 uppercase">
                              {product.sku}
                            </span>
                          </div>
                        </div>

                        {/* Title, Brand & Category */}
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <h3 className="font-bold text-zinc-100 text-sm line-clamp-2">{product.name}</h3>
                          {product.brand && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">
                              {product.brand}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-500 mb-4">{product.category || (isService ? "Service Labor" : "Component")}</p>
                      </div>

                      {/* Pricing & Prominent Stock Indicator */}
                      <div className="space-y-3 pt-3 border-t border-white/5">
                        <div className="flex items-end justify-between gap-2">
                          <span className="text-xl font-black text-white">₱{Number(product.selling_price).toFixed(2)}</span>
                          
                          {/* Prominent Stock Status Pill */}
                          {isService ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
                              Service Labor
                            </span>
                          ) : (
                            <span className={clsx(
                              "text-[10px] font-bold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5",
                              product.current_stock > 10 && "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
                              product.current_stock > 0 && product.current_stock <= 10 && "bg-amber-500/10 text-amber-300 border-amber-500/30",
                              product.current_stock === 0 && "bg-red-500/10 text-red-400 border-red-500/30 font-black"
                            )}>
                              <span className={clsx(
                                "w-1.5 h-1.5 rounded-full shrink-0",
                                product.current_stock > 10 && "bg-emerald-400",
                                product.current_stock > 0 && product.current_stock <= 10 && "bg-amber-400",
                                product.current_stock === 0 && "bg-red-400"
                              )} />
                              {product.current_stock > 10 && `Remaining: ${product.current_stock} in stock`}
                              {product.current_stock > 0 && product.current_stock <= 10 && `Low Stock: ${product.current_stock} left`}
                              {product.current_stock === 0 && "Out of Stock"}
                            </span>
                          )}
                        </div>

                        {/* Dynamic Add to Cart Button or Stepper */}
                        {!cartItem ? (
                          <button
                            onClick={() => handleAddItemToCustomerCart(product)}
                            disabled={!selectedRepair || isOutOfStock}
                            className={clsx(
                              "w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all",
                              !selectedRepair
                                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed border border-white/5"
                                : isOutOfStock
                                  ? "bg-red-500/10 text-red-400 border border-red-500/30 cursor-not-allowed"
                                  : isService
                                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-500/20 active:scale-95"
                                    : "bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-500/20 active:scale-95"
                            )}
                          >
                            {isOutOfStock ? (
                              <span>Out of Stock</span>
                            ) : (
                              <>
                                <Plus className="w-3.5 h-3.5" />
                                <span>Add to Cart</span>
                              </>
                            )}
                          </button>
                        ) : (
                          <div className="w-full flex items-center justify-between bg-zinc-950 p-1 rounded-xl border border-cyan-500/30 shadow-inner">
                            <button
                              onClick={() => {
                                if (cartItem.qty <= 1) {
                                  removeFromCart(cartItem.id);
                                } else {
                                  updateQty(cartItem.id, cartItem.qty - 1);
                                }
                              }}
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
                              title="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>

                            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-cyan-300">
                              <span>{cartItem.qty}</span>
                              <span className="text-[10px] text-zinc-500 font-sans uppercase">in cart</span>
                            </div>

                            <button
                              onClick={() => {
                                if (!isService && product.current_stock !== undefined && cartItem.qty >= product.current_stock) {
                                  setWarningMessage(`Cannot add more than available stock (${product.current_stock}) for ${product.name}!`);
                                  return;
                                }
                                updateQty(cartItem.id, cartItem.qty + 1);
                              }}
                              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
                              title="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          {/* Sticky Bottom Action Bar for Mobile Screens (Only visible when customer is selected) */}
          {selectedRepair && cart.length > 0 && (
            <div className="fixed bottom-0 inset-x-0 p-3 bg-zinc-950/95 backdrop-blur-2xl border-t border-white/10 z-30 lg:hidden shadow-2xl">
              <button
                onClick={() => setActiveView("cart")}
                className="w-full py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 text-white font-bold text-sm shadow-lg shadow-cyan-500/20 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" />
                  <span>View Order Cart ({itemCount})</span>
                </div>
                <div className="flex items-center gap-2 font-mono">
                  <span>₱{total.toFixed(2)}</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </button>
            </div>
          )}
        </main>
      )}

      {/* VIEW 2: CURRENT ORDER CART (FULL PAGE) */}
      {activeView === "cart" && (
        <main className="flex-1 max-w-6xl w-full mx-auto p-4 sm:p-8 space-y-6 pb-20">
          
          {/* Top Bar: Return to Catalog */}
          <div className="flex items-center justify-between gap-4 pb-4 border-b border-white/10">
            <button
              onClick={() => setActiveView("catalog")}
              className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Services & Products Catalog</span>
            </button>

            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsClearConfirmOpen(true)}
                disabled={cart.length === 0}
                className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-red-500/20 hover:text-red-400 text-zinc-400 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart</span>
              </button>
            </div>
          </div>

          {/* Connected Customer Info Banner */}
          {selectedRepair ? (
            <div className="bg-gradient-to-r from-zinc-900 to-zinc-900/60 border border-cyan-500/30 rounded-3xl p-6 backdrop-blur-xl shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center font-bold text-xl">
                  {selectedRepair.customer_name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-black text-white">{selectedRepair.customer_name}</h2>
                    <span className="font-mono text-xs bg-cyan-950 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-md font-bold">
                      {selectedRepair.jo_number}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-400 flex items-center gap-2 mt-1">
                    <Bike className="w-3.5 h-3.5 text-cyan-400" />
                    <span>{selectedRepair.motorcycle_name}</span>
                    <span className="text-zinc-600">•</span>
                    <span>Mechanic: Mike Smith</span>
                  </p>
                </div>
              </div>

              <div className="flex sm:flex-col items-center sm:items-end justify-between gap-1 bg-zinc-950/60 sm:bg-transparent p-3 sm:p-0 rounded-xl border sm:border-0 border-white/5">
                <span className="text-zinc-400 text-xs">Customer Status</span>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/30">
                  {selectedRepair.status}
                </span>
              </div>
            </div>
          ) : (
            <div className="p-5 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-amber-300 text-xs font-semibold flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
                <span>No active customer selected. Please select a customer repair session to link this order.</span>
              </div>
              <button
                onClick={() => setActiveView("catalog")}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 text-zinc-950 font-bold text-xs shrink-0"
              >
                Select Customer
              </button>
            </div>
          )}

          {/* Cart Items List */}
          <div className="bg-zinc-900/60 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-xl">
            <div className="p-5 border-b border-white/10 flex items-center justify-between">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-cyan-400" />
                <span>Current Order Items ({itemCount})</span>
              </h3>
              <button
                onClick={() => setActiveView("catalog")}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Services / Products</span>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="py-20 flex flex-col items-center justify-center text-zinc-500 text-center px-4 space-y-3">
                <ShoppingCart className="w-16 h-16 opacity-30 text-zinc-400" />
                <h4 className="text-base font-bold text-zinc-300">Your order cart is empty</h4>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Switch back to the catalog to choose from available services and products for this customer.
                </p>
                <button
                  onClick={() => setActiveView("catalog")}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 text-white font-bold text-xs shadow-md mt-2"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-zinc-950/80 text-zinc-400 uppercase text-[10px] tracking-wider border-b border-white/5">
                    <tr>
                      <th className="p-4 px-6 font-semibold">Item / Service Description</th>
                      <th className="p-4 px-4 font-semibold text-center">Type</th>
                      <th className="p-4 px-4 font-semibold text-right">Unit Price</th>
                      <th className="p-4 px-6 font-semibold text-center">Quantity</th>
                      <th className="p-4 px-6 font-semibold text-right">Subtotal</th>
                      <th className="p-4 px-4 font-semibold text-center">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 font-mono">
                    {cart.map((item) => {
                      const isService = item.id.startsWith("labor-") || item.name.toLowerCase().includes("service") || item.name.toLowerCase().includes("tune-up") || item.name.toLowerCase().includes("cleaning");
                      const lineTotal = item.price * item.qty;

                      return (
                        <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                          <td className="p-4 px-6 font-sans">
                            <span className="font-bold text-zinc-100 text-sm block">{item.name}</span>
                          </td>

                          <td className="p-4 px-4 text-center font-sans">
                            <span className={clsx(
                              "px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                              isService
                                ? "bg-purple-500/10 text-purple-300 border-purple-500/30"
                                : "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                            )}>
                              {isService ? "Service" : "Product"}
                            </span>
                          </td>

                          <td className="p-4 px-4 text-right text-zinc-300">
                            ₱{item.price.toFixed(2)}
                          </td>

                          <td className="p-4 px-6">
                            <div className="flex items-center justify-center gap-2">
                              <div className="flex items-center gap-2 bg-zinc-950 p-1 rounded-xl border border-white/10">
                                <button
                                  onClick={() => {
                                    if (item.qty <= 1) {
                                      removeFromCart(item.id);
                                    } else {
                                      updateQty(item.id, item.qty - 1);
                                    }
                                  }}
                                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                >
                                  <Minus className="w-3.5 h-3.5" />
                                </button>
                                <span className="w-6 text-center font-bold text-zinc-100 text-xs">{item.qty}</span>
                                <button
                                  onClick={() => updateQty(item.id, item.qty + 1)}
                                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-400 hover:text-white transition-colors"
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className="p-4 px-6 text-right font-bold text-white text-sm">
                            ₱{lineTotal.toFixed(2)}
                          </td>

                          <td className="p-4 px-4 text-center">
                            <button
                              onClick={() => removeFromCart(item.id)}
                              className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors"
                              title="Remove item"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Cart Financial Summary & Complete Checkout Bar */}
          {cart.length > 0 && (
            <div className="bg-zinc-900/80 border border-white/10 rounded-3xl p-6 md:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="space-y-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 block">
                  Settlement Breakdown
                </span>
                <div className="flex items-center gap-6 text-xs text-zinc-300 font-mono">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Subtotal</span>
                    <span className="text-base font-bold text-zinc-200">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="w-px h-8 bg-white/10" />
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase">Tax (0%)</span>
                    <span className="text-base font-bold text-zinc-400">₱0.00</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="text-left sm:text-right">
                  <span className="text-zinc-400 block text-[11px] uppercase font-bold">Net Total Due</span>
                  <span className="text-3xl sm:text-4xl font-black font-mono bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
                    ₱{total.toFixed(2)}
                  </span>
                </div>

                <button
                  onClick={handleProceedToCheckout}
                  disabled={!selectedRepair}
                  className="px-8 py-4 rounded-2xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black text-sm shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-3 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <span>Proceed to Complete Payment</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Confirmation Modal for Clearing Cart */}
      {isClearConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 text-red-400">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear Current Order Cart?</h3>
                <p className="text-xs text-zinc-400">This action will remove all items from the current cart.</p>
              </div>
            </div>

            <div className="bg-zinc-950 p-4 rounded-xl border border-white/5 space-y-2 text-xs">
              <div className="flex justify-between text-zinc-400">
                <span>Active Customer:</span>
                <span className="font-bold text-white">{selectedRepair?.customer_name || "N/A"}</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Items to Remove:</span>
                <span className="font-bold text-white">{itemCount} items</span>
              </div>
              <div className="flex justify-between text-zinc-400">
                <span>Cart Order Total:</span>
                <span className="font-bold font-mono text-emerald-400">₱{total.toFixed(2)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setIsClearConfirmOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  clearCart();
                  if (selectedRepair) {
                    localStorage.removeItem(`motoshop_cart_${selectedRepair.job_id}`);
                  }
                  setIsClearConfirmOpen(false);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-600/30 flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Yes, Clear Cart</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Contextual Audit Drawer */}
      <ContextualAuditDrawer
        isOpen={isAuditOpen}
        onClose={() => setIsAuditOpen(false)}
        title="POS & Checkout Audit Trail"
        subtitle="Cryptographic audit stream for cashier checkout transactions and active cart events"
        actionPrefix="POS_"
        resourceFilter="/pos"
      />
    </div>
  );
}
