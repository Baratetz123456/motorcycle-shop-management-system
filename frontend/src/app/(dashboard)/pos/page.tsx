"use client";

import { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Lock,
  Loader2
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { ConfirmModal } from "@/components/ui/Modal";
import { PosCatalogCardsSkeleton, PosRepairsCardsSkeleton } from "@/components/pos/PosSkeleton";
import { CategoryCardBanner } from "@/components/pos/CategoryCardBanner";
import { CustomerBikeCardBanner } from "@/components/pos/CustomerBikeCardBanner";
import { FloatingFilterFab, MobilePosFilterSheet } from "@/components/pos/MobilePosFilterSheet";

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



function POSPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { cart, addToCart, removeFromCart, updateQty, getTotals, clearCart } = usePosStore();
  const { subtotal, total, itemCount } = getTotals();

  // Page view state: "catalog" | "cart"
  const [activeView, setActiveView] = useState<"catalog" | "cart">("catalog");

  // Two filters only: "SERVICE" | "PRODUCT" (Services is default)
  const [activeFilter, setActiveFilter] = useState<"SERVICE" | "PRODUCT">("SERVICE");

  // Sub-filter pill state
  const [activeSubFilter, setActiveSubFilter] = useState<string>("ALL");

  const [catalog, setCatalog] = useState<CatalogItem[]>([]);
  const [activeRepairs, setActiveRepairs] = useState<ActiveRepairCart[]>([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState<boolean>(true);
  const [isLoadingRepairs, setIsLoadingRepairs] = useState<boolean>(true);
  
  // Rule: Cashier newly logging in/visiting page has NO selected customer by default
  const [selectedRepair, setSelectedRepair] = useState<ActiveRepairCart | null>(null);
  const [isChangingCustomer, setIsChangingCustomer] = useState(false);
  const [search, setSearch] = useState("");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);
  const [isClearConfirmOpen, setIsClearConfirmOpen] = useState(false);
  const [frequencyMap, setFrequencyMap] = useState<Record<string, number>>({});
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Auto-restore customer and cart view if specified in query params (e.g. returning from checkout)
  useEffect(() => {
    const queryJobId = searchParams.get("job_id");
    const queryView = searchParams.get("view");

    if (queryJobId && activeRepairs.length > 0) {
      const match = activeRepairs.find(
        (r) => r.job_id === queryJobId || r.jo_number === queryJobId
      );
      if (match) {
        selectActiveCustomerRepair(match, false);
        if (queryView === "cart") {
          setActiveView("cart");
        }
      }
    }
  }, [searchParams, activeRepairs]);

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
    try {
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
    } finally {
      setIsLoadingCatalog(false);
    }
  };

  const fetchActiveRepairs = async () => {
    try {
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
    } finally {
      setIsLoadingRepairs(false);
    }
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

  const handleChangeCustomer = () => {
    if (selectedRepair && cart.length > 0) {
      const existingKey = `motoshop_cart_${selectedRepair.job_id}`;
      const extraItems = cart.filter((i) => !i.id.startsWith("labor-"));
      localStorage.setItem(existingKey, JSON.stringify(extraItems));
    }
    setIsChangingCustomer(true);
    setActiveView("catalog");
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

  // Dynamically derive sub-category filter pills from loaded catalog items for activeFilter
  const dynamicSubCategories = useMemo(() => {
    const itemsForType = catalog.filter(
      (i) => (i.item_type || "PRODUCT").toUpperCase() === activeFilter.toUpperCase()
    );
    const counts: Record<string, number> = {};
    itemsForType.forEach((i) => {
      const cat = i.category?.trim() || (activeFilter === "SERVICE" ? "General Service" : "General Parts");
      counts[cat] = (counts[cat] || 0) + 1;
    });
    const cats = Object.keys(counts).sort((a, b) => a.localeCompare(b));
    return [
      { id: "ALL", label: `All ${activeFilter === "SERVICE" ? "Services" : "Parts"}`, count: itemsForType.length },
      ...cats.map((c) => ({ id: c, label: c, count: counts[c] })),
    ];
  }, [catalog, activeFilter]);

  // Filter and sort catalog with resilient case-insensitive matching and dynamic categories
  const filteredCatalog = useMemo(() => {
    const q = search.toLowerCase().trim();
    return catalog
      .filter((item) => {
        const matchesSearch =
          !q ||
          item.name.toLowerCase().includes(q) ||
          item.sku.toLowerCase().includes(q) ||
          (item.category && item.category.toLowerCase().includes(q)) ||
          (item.brand && item.brand.toLowerCase().includes(q));

        const matchesFilter = (item.item_type || "PRODUCT").toUpperCase() === activeFilter.toUpperCase();

        const itemCat = (item.category?.trim() || (activeFilter === "SERVICE" ? "General Service" : "General Parts")).toLowerCase();
        const matchesSubFilter =
          activeSubFilter === "ALL" ||
          itemCat === activeSubFilter.toLowerCase().trim();

        return matchesSearch && matchesFilter && matchesSubFilter;
      })
      .sort((a, b) => {
        const freqA = frequencyMap[a.name] || 0;
        const freqB = frequencyMap[b.name] || 0;
        return freqB - freqA; // Highest frequency first
      });
  }, [catalog, search, activeFilter, activeSubFilter, frequencyMap]);

  return (
    <div className="flex flex-col min-h-full bg-zinc-950 text-zinc-50 font-sans w-full max-w-full overflow-x-hidden">
      
      {/* Top Main Navigation Header */}
      <header className="sticky top-0 z-30 bg-zinc-950 border-b border-zinc-800 px-4 sm:px-8 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h1 className="text-xl sm:text-2xl font-black text-white">
              Showroom Counter
            </h1>
            <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2.5 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
              Counter Sales
            </span>
          </div>
        </div>

        {/* View Switcher: Catalog vs Current Order (Desktop only, mobile uses direct workflow) */}
        <div className="hidden md:flex items-center gap-2 sm:gap-4">
          <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 text-xs w-full sm:w-auto">
            <button
              onClick={() => setActiveView("catalog")}
              className={clsx(
                "flex-1 sm:flex-none px-4 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2",
                activeView === "catalog"
                  ? "bg-emerald-600 text-white font-bold"
                  : "text-zinc-400 hover:text-white"
              )}
            >
              <Package className="w-4 h-4" />
              <span>Catalog</span>
            </button>

            <button
              onClick={() => {
                if (!selectedRepair) {
                  setWarningMessage("Cannot review order: Please select an active customer bike first!");
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
                    ? "bg-emerald-600 text-white font-bold"
                    : "text-zinc-400 hover:text-white"
              )}
              title={!selectedRepair ? "Please select an active customer bike to review order" : undefined}
            >
              {!selectedRepair ? (
                <Lock className="w-4 h-4 text-zinc-500" />
              ) : (
                <ShoppingCart className="w-4 h-4" />
              )}
              <span>Review Order</span>
              {selectedRepair && itemCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500 text-white font-mono text-[10px] font-black">
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Warning Notification Banner */}
      {warningMessage && (
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 sm:px-8 py-3 flex items-center justify-between text-zinc-300 text-xs font-semibold animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-zinc-400 shrink-0" />
            <span>{warningMessage}</span>
          </div>
          <button onClick={() => setWarningMessage(null)} className="text-zinc-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* VIEW 1: CATALOG & ACTIVE CUSTOMER SELECTION */}
      {activeView === "catalog" && (
        <main className="flex-1 flex flex-col pb-24 lg:pb-8">
          
          {/* Section: Active Customer Repair Selection */}
          <section className={clsx(
            "border-b border-zinc-800 transition-all",
            selectedRepair && !isChangingCustomer 
              ? "sticky top-0 z-20 bg-zinc-950 p-3 sm:p-5 hidden md:block" 
              : "bg-zinc-900 p-3 sm:p-6"
          )}>
            <div className="w-full space-y-4">
              
              {/* If customer is already selected and NOT actively expanding selector (Desktop Only) */}
              {selectedRepair && !isChangingCustomer ? (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-3 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 relative overflow-hidden">
                  <div className="flex items-center gap-3 sm:gap-4 relative z-10 min-w-0">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-sm sm:text-lg shrink-0">
                      {selectedRepair.customer_name.split(" ").map((n) => n[0]).join("")}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] sm:text-xs uppercase font-bold text-zinc-400 tracking-wider">Active Customer</span>
                        <span className="font-mono text-[10px] sm:text-[11px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 sm:px-2 py-0.5 rounded-md font-bold">
                          {selectedRepair.jo_number}
                        </span>
                        <span className="text-[9px] sm:text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700">
                          {selectedRepair.status}
                        </span>
                      </div>
                      <h2 className="text-base sm:text-xl font-black text-white mt-0.5 truncate">{selectedRepair.customer_name}</h2>
                      <p className="text-xs text-zinc-400 flex items-center gap-2 font-medium mt-0.5 truncate">
                        <Bike className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                        <span className="truncate">{selectedRepair.motorcycle_name}</span>
                        <span className="text-zinc-600 hidden sm:inline">•</span>
                        <span className="hidden sm:inline">Mechanic: Mike Smith</span>
                      </p>
                    </div>
                  </div>

                  {/* Desktop Only: Change Customer & View Cart buttons */}
                  <div className="hidden md:flex items-center gap-3 relative z-10 self-end sm:self-center">
                    <button
                      onClick={handleChangeCustomer}
                      className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-bold transition-all border border-zinc-700"
                    >
                      Change Customer
                    </button>
                    <button
                      onClick={() => setActiveView("cart")}
                      className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-bold transition-all flex items-center gap-2 border border-emerald-500"
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
                      <h2 className="text-xs sm:text-sm font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                        <User className="w-4 h-4" />
                        Step 1: Select Active Customer Repair
                      </h2>
                      <p className="text-[11px] sm:text-xs text-zinc-400 mt-0.5">
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

                  {/* Customer Repair Selection Cards (2 columns on mobile, 4 columns on desktop) */}
                  {isLoadingRepairs ? (
                    <div className="pt-1">
                      <PosRepairsCardsSkeleton count={4} />
                    </div>
                  ) : activeRepairs.length === 0 ? (
                    <div className="p-8 text-center bg-zinc-900/40 border border-zinc-800 rounded-2xl text-zinc-500 text-xs flex flex-col items-center justify-center">
                      <User className="w-8 h-8 mb-2 opacity-30 text-zinc-400" />
                      <p>No active customer job orders found.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-3 pt-1" data-testid="customer-repair-cards-grid">
                      {activeRepairs.map((repair) => {
                        const isSelected = selectedRepair?.job_id === repair.job_id;

                        return (
                          <div
                            key={repair.job_id}
                            data-testid="customer-repair-card"
                            onClick={() => selectActiveCustomerRepair(repair)}
                            className={clsx(
                              "group rounded-2xl border transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden",
                              isSelected
                                ? "bg-emerald-950/40 border-emerald-500 ring-1 ring-emerald-500 shadow-none"
                                : "bg-zinc-900 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900"
                            )}
                          >
                            {/* Bike Category Artwork Top Banner */}
                            <CustomerBikeCardBanner motorcycleName={repair.motorcycle_name} />

                            <div className="p-3 sm:p-4 flex-1 flex flex-col justify-between gap-2.5 sm:gap-3">
                              <div>
                                <div className="flex items-center justify-between gap-1 mb-1.5 sm:mb-2">
                                  <span className="font-mono text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded bg-zinc-950 text-emerald-400 border border-zinc-800 truncate">
                                    {repair.jo_number}
                                  </span>
                                  <span className="text-[8px] sm:text-[10px] font-bold uppercase tracking-wider px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 truncate">
                                    {repair.status}
                                  </span>
                                </div>

                                <h3 className="font-bold text-white text-xs sm:text-sm group-hover:text-emerald-300 transition-colors line-clamp-1">
                                  {repair.customer_name}
                                </h3>
                                <p className="text-[10px] sm:text-xs text-zinc-400 flex items-center gap-1 mt-1 truncate">
                                  <Bike className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-zinc-500 shrink-0" />
                                  <span className="truncate">{repair.motorcycle_name}</span>
                                </p>
                              </div>

                              <div className="flex items-center justify-between pt-2 sm:pt-3 border-t border-zinc-800">
                                <span className="text-[9px] sm:text-[10px] text-zinc-500 uppercase font-semibold">
                                  Charges
                                </span>
                                <span className="text-[11px] sm:text-xs font-mono font-bold text-emerald-400">
                                  ₱{repair.total_amount.toLocaleString("en-PH", { minimumFractionDigits: 2 })}
                                </span>
                              </div>

                              <div className="pt-1">
                                <button
                                  type="button"
                                  className={clsx(
                                    "w-full py-1 sm:py-1.5 px-2 sm:px-3 rounded-xl text-[10px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1 border",
                                    isSelected
                                      ? "bg-emerald-600 text-white border-emerald-500 shadow-none"
                                      : "bg-zinc-800 text-zinc-300 border-zinc-700 group-hover:bg-zinc-700 group-hover:text-white"
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
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          </section>

          {/* Section: Catalog Controls (Strictly 2 Filters: Services & Products) */}
          <section className={clsx(
            "w-full p-4 sm:p-8 space-y-6 flex-1 flex flex-col",
            (!selectedRepair || isChangingCustomer) && "hidden md:flex"
          )}>
            
            {/* Inline Controls (Desktop Only: Hidden on Mobile) */}
            <div className="hidden md:flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              
              {/* Exactly Two Filters: Services & Products */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 hidden sm:inline-block">Filter:</span>
                <div className="flex bg-zinc-900 p-1 rounded-2xl border border-zinc-800 text-xs w-full sm:w-auto shadow-none">
                  <button
                    onClick={() => {
                      setActiveFilter("SERVICE");
                      setActiveSubFilter("ALL");
                    }}
                    className={clsx(
                      "flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border",
                      activeFilter === "SERVICE"
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                        : "text-zinc-400 hover:text-white border-transparent"
                    )}
                  >
                    <Wrench className="w-4 h-4" />
                    <span>Services</span>
                  </button>

                  <button
                    onClick={() => {
                      setActiveFilter("PRODUCT");
                      setActiveSubFilter("ALL");
                    }}
                    className={clsx(
                      "flex-1 sm:flex-none px-5 py-2 rounded-xl font-bold transition-all flex items-center justify-center gap-2 border",
                      activeFilter === "PRODUCT"
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                        : "text-zinc-400 hover:text-white border-transparent"
                    )}
                  >
                    <Package className="w-4 h-4" />
                    <span>Parts</span>
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
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-2xl py-2.5 pl-10 pr-4 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-xs sm:text-sm text-white placeholder-zinc-500 shadow-none"
                />
              </div>
            </div>

            {/* Sub-Filter Category Pills (Desktop Only: Hidden on Mobile) */}
            <div className="hidden md:flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 scrollbar-none pt-1 overscroll-x-contain">
              {dynamicSubCategories.map((pill) => {
                const isSelected = activeSubFilter === pill.id;
                return (
                  <button
                    key={pill.id}
                    onClick={() => setActiveSubFilter(pill.id)}
                    className={clsx(
                      "px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 shrink-0 border",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                        : "bg-zinc-900 text-zinc-400 hover:text-white border-zinc-800"
                    )}
                  >
                    <span>{pill.label}</span>
                    {pill.count !== undefined && (
                      <span className={clsx(
                        "text-[10px] font-mono font-bold px-1.5 py-0.2 rounded-full",
                        isSelected ? "bg-emerald-700 text-white" : "bg-zinc-800 text-zinc-400"
                      )}>
                        {pill.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* If no customer selected, show clear instructions banner */}
            {!selectedRepair && (
              <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl text-zinc-300 text-xs font-semibold flex items-center gap-3">
                <AlertCircle className="w-5 h-5 shrink-0 text-zinc-400" />
                <span>Please select an active customer repair from Step 1 above to enable adding products and services to cart.</span>
              </div>
            )}

            {/* Catalog Grid (2 columns on mobile, 3-4 columns on desktop) */}
            {isLoadingCatalog ? (
              <div className="flex-1 pt-1">
                <PosCatalogCardsSkeleton count={8} />
              </div>
            ) : (
              <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 sm:gap-4 md:gap-6 flex-1" data-testid="catalog-cards-grid">
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
                        data-testid="pos-catalog-card"
                        className={clsx(
                          "group relative bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col justify-between transition-all duration-300",
                          !selectedRepair && "opacity-80 border-dashed border-zinc-800",
                          isOutOfStock && "opacity-60 border-zinc-800"
                        )}
                      >
                        {/* Top Category Image Banner (SVG illustration matching dark zinc theme) */}
                        <CategoryCardBanner
                          category={product.category}
                          itemType={product.item_type}
                          name={product.name}
                          brand={product.brand}
                        />

                        {/* Card Body */}
                        <div className="p-3 sm:p-5 flex-1 flex flex-col justify-between">
                          <div>
                            {/* Top Details: Frequency indicator & SKU */}
                            <div className="flex items-center justify-between gap-1.5 mb-2">
                              <span className="text-[9px] sm:text-[10px] font-mono font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-950 text-zinc-400 border border-zinc-800 uppercase truncate">
                                {product.sku}
                              </span>

                              {frequency > 0 && (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 flex items-center gap-1 shrink-0" title="Historical popularity">
                                  <Flame className="w-3 h-3 text-zinc-400" />
                                  <span className="hidden sm:inline">{isService ? `${frequency} completed` : `${frequency} sold`}</span>
                                  <span className="sm:hidden">{frequency}</span>
                                </span>
                              )}
                            </div>

                            {/* Product / Service Title & Brand */}
                            <h3 className="font-bold text-zinc-100 text-xs sm:text-sm line-clamp-2 mb-1" title={product.name}>
                              {product.name}
                            </h3>
                            {product.brand && (
                              <span className="inline-block text-[9px] sm:text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-zinc-800 text-zinc-300 border border-zinc-700 mb-2">
                                {product.brand}
                              </span>
                            )}
                          </div>

                          {/* Pricing & Stock Status */}
                          <div className="space-y-2 sm:space-y-3 pt-2 sm:pt-3 border-t border-zinc-800 mt-2">
                            <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-1 sm:gap-2">
                              <span className="text-base sm:text-xl font-black text-white">
                                ₱{Number(product.selling_price).toFixed(2)}
                              </span>
                              
                              {/* Stock Status Pill */}
                              {isService ? (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full bg-zinc-800 text-zinc-300 border border-zinc-700 self-start sm:self-auto">
                                  Service Labor
                                </span>
                              ) : (
                                <span className="text-[9px] sm:text-[10px] font-bold px-1.5 sm:px-2 py-0.5 rounded-full border border-zinc-700 bg-zinc-800 text-zinc-300 flex items-center gap-1 self-start sm:self-auto truncate">
                                  <span className="w-1.5 h-1.5 rounded-full shrink-0 bg-zinc-400" />
                                  <span className="truncate">
                                    {product.current_stock > 10 && `${product.current_stock} in stock`}
                                    {product.current_stock > 0 && product.current_stock <= 10 && `${product.current_stock} left`}
                                    {product.current_stock === 0 && "Out of Stock"}
                                  </span>
                                </span>
                              )}
                            </div>

                            {/* Dynamic Add to Cart Button or Stepper */}
                            {!selectedRepair ? (
                              <button
                                type="button"
                                onClick={() => {
                                  setWarningMessage("Please select an active customer repair from Step 1 above to begin adding items!");
                                  window.scrollTo({ top: 0, behavior: "smooth" });
                                }}
                                className="w-full py-2 px-2 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all bg-zinc-900 hover:bg-zinc-800 text-zinc-400 border border-zinc-800 cursor-pointer truncate"
                                title="Please select an active customer repair before adding or modifying items"
                              >
                                <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                                <span className="truncate">Select Customer</span>
                              </button>
                            ) : !cartItem ? (
                              <button
                                onClick={() => handleAddItemToCustomerCart(product)}
                                disabled={isOutOfStock}
                                className={clsx(
                                  "w-full py-2 px-2 sm:px-4 rounded-xl font-bold text-[11px] sm:text-xs flex items-center justify-center gap-1.5 transition-all truncate",
                                  isOutOfStock
                                    ? "bg-zinc-900 text-zinc-500 border border-zinc-800 cursor-not-allowed"
                                    : "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 active:scale-95"
                                )}
                              >
                                {isOutOfStock ? (
                                  <span>Out of Stock</span>
                                ) : (
                                  <>
                                    <Plus className="w-3.5 h-3.5 shrink-0" />
                                    <span>Add to Cart</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <div className="w-full flex items-center justify-between p-1 rounded-xl bg-zinc-950 border border-zinc-700">
                                <button
                                  onClick={() => {
                                    if (cartItem.qty <= 1) {
                                      removeFromCart(cartItem.id);
                                    } else {
                                      updateQty(cartItem.id, cartItem.qty - 1);
                                    }
                                  }}
                                  className="p-1 sm:p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-300 hover:text-white transition-colors"
                                  title="Decrease quantity"
                                >
                                  <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>

                                <div className="flex items-center gap-1 text-[11px] sm:text-xs font-mono font-bold text-zinc-200">
                                  <span>{cartItem.qty}</span>
                                  <span className="text-[9px] sm:text-[10px] text-zinc-500 font-sans uppercase hidden sm:inline">in cart</span>
                                </div>

                                <button
                                  onClick={() => {
                                    if (!isService && product.current_stock !== undefined && cartItem.qty >= product.current_stock) {
                                      setWarningMessage(`Cannot add more than available stock (${product.current_stock}) for ${product.name}!`);
                                      return;
                                    }
                                    updateQty(cartItem.id, cartItem.qty + 1);
                                  }}
                                  disabled={!isService && product.current_stock !== undefined && cartItem.qty >= product.current_stock}
                                  className={clsx(
                                    "p-1 sm:p-1.5 rounded-lg transition-colors",
                                    !isService && product.current_stock !== undefined && cartItem.qty >= product.current_stock
                                      ? "text-zinc-600 cursor-not-allowed"
                                      : "hover:bg-zinc-800 text-zinc-300 hover:text-white"
                                  )}
                                  title="Increase quantity"
                                >
                                  <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            )}
          </section>

          {/* Floating Action Button (FAB) for Mobile Catalog Filter (Positioned above the cart FAB) */}
          {selectedRepair && activeView === "catalog" && (
            <FloatingFilterFab
              onClick={() => setIsMobileFilterOpen(true)}
              hasActiveFilters={Boolean(search.trim()) || activeFilter === "PRODUCT" || activeSubFilter !== "ALL"}
            />
          )}

          {/* Mobile Filter Slide-up Sheet */}
          <MobilePosFilterSheet
            isOpen={isMobileFilterOpen}
            onClose={() => setIsMobileFilterOpen(false)}
            search={search}
            onSearchChange={setSearch}
            activeFilter={activeFilter}
            onFilterChange={(type) => {
              setActiveFilter(type);
              setActiveSubFilter("ALL");
            }}
            subFilters={dynamicSubCategories}
            activeSubFilter={activeSubFilter}
            onSubFilterChange={setActiveSubFilter}
            onReset={() => {
              setSearch("");
              setActiveFilter("SERVICE");
              setActiveSubFilter("ALL");
            }}
            totalResults={filteredCatalog.length}
          />

          {/* Floating Action Button (FAB) for View Cart on Mobile (56px circular, icon-only) */}
          {selectedRepair && activeView === "catalog" && (
            <div className="fixed bottom-20 right-4 z-40 md:hidden animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setActiveView("cart")}
                className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500 transition-all transform active:scale-95 flex items-center justify-center"
                aria-label="View Cart"
                data-testid="view-cart-fab"
              >
                <ShoppingCart className="w-6 h-6 text-white" />
              </button>
            </div>
          )}
        </main>
      )}

      {/* VIEW 2: CURRENT ORDER CART (FULL PAGE) */}
      {activeView === "cart" && (
        <main className="flex-1 w-full p-4 sm:p-8 space-y-6 pb-24">
          
          {/* Combined Sticky Top Header: Navigation, Clear Cart, and Active Customer Details */}
          <div className="sticky top-0 z-20 bg-zinc-950 border-b border-zinc-800 -mx-4 sm:-mx-8 px-4 sm:px-8 py-3 sm:py-3.5 space-y-2.5 -mt-4 sm:-mt-8">
            {/* Top Row: Back to Catalog & Clear Cart (Top-Right) */}
            <div className="flex items-center justify-between gap-3">
              <button
                onClick={() => setActiveView("catalog")}
                className="px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4 text-zinc-400" />
                <span className="hidden sm:inline">Back to Services & Products Catalog</span>
                <span className="sm:hidden">Back to Catalog</span>
              </button>

              <button
                onClick={() => setIsClearConfirmOpen(true)}
                disabled={cart.length === 0}
                data-testid="top-clear-cart-button"
                className="px-3 py-1.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart</span>
              </button>
            </div>

            {/* Bottom Row: Connected Customer Info Banner (Card-Free, Minimalist Layout) */}
            {selectedRepair ? (
              <div className="flex items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-xs sm:text-base shrink-0">
                    {selectedRepair.customer_name.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm sm:text-base font-black text-white truncate">{selectedRepair.customer_name}</span>
                      <span className="font-mono text-[10px] sm:text-xs bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded-md font-bold">
                        {selectedRepair.jo_number}
                      </span>
                    </div>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 mt-0.5 truncate">
                      <Bike className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{selectedRepair.motorcycle_name}</span>
                      <span className="text-zinc-600 hidden sm:inline">•</span>
                      <span className="hidden sm:inline">Mechanic: Mike Smith</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="hidden sm:inline-block px-2.5 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-zinc-800 text-zinc-300 border border-zinc-700">
                    {selectedRepair.status}
                  </span>
                  <button
                    onClick={handleChangeCustomer}
                    className="px-2.5 sm:px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all flex items-center gap-1.5"
                  >
                    <User className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Change Customer</span>
                    <span className="sm:hidden">Change</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-300 text-xs font-semibold flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-zinc-400 shrink-0" />
                  <span>No active customer selected. Please select a customer repair session to link this order.</span>
                </div>
                <button
                  onClick={() => setActiveView("catalog")}
                  className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shrink-0 border border-emerald-500"
                >
                  Select Customer
                </button>
              </div>
            )}
          </div>

          {/* Cart Items Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-bold text-sm sm:text-base text-white flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-zinc-400" />
                <span>Order Items ({itemCount})</span>
              </h3>
              <button
                onClick={() => setActiveView("catalog")}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add More Services / Products</span>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="py-16 flex flex-col items-center justify-center text-zinc-500 text-center px-4 space-y-3 border border-zinc-800 rounded-2xl bg-zinc-900/40">
                <ShoppingCart className="w-12 h-12 opacity-30 text-zinc-400" />
                <h4 className="text-sm font-bold text-zinc-300">Your order cart is empty</h4>
                <p className="text-xs text-zinc-500 max-w-sm">
                  Switch back to the catalog to choose from available services and products for this customer.
                </p>
                <button
                  onClick={() => setActiveView("catalog")}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs transition-all mt-2 border border-emerald-500"
                >
                  Browse Catalog
                </button>
              </div>
            ) : (
              <>
                {/* Mobile View (< md): Card-Free Edge-to-Edge List with Hairline Dividers */}
                <div className="md:hidden divide-y divide-zinc-800 border-t border-b border-zinc-800">
                  {cart.map((item) => {
                    const isService = item.id.startsWith("labor-") || item.name.toLowerCase().includes("service") || item.name.toLowerCase().includes("tune-up") || item.name.toLowerCase().includes("cleaning");
                    const lineTotal = item.price * item.qty;

                    return (
                      <div key={item.id} className="py-3.5 flex flex-col gap-2">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-zinc-100 text-sm">{item.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-zinc-800 text-zinc-300 border-zinc-700">
                                {isService ? "Service" : "Part"}
                              </span>
                            </div>
                            <div className="text-xs text-zinc-400 font-mono mt-0.5">
                              ₱{item.price.toFixed(2)} each
                            </div>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="p-1.5 text-zinc-400 hover:text-white active:bg-zinc-800 rounded-lg transition-colors"
                            title="Remove item"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                          {/* Quantity Stepper */}
                          <div className="flex items-center gap-2.5 bg-zinc-900 border border-zinc-800 rounded-xl px-2 py-1">
                            <button
                              onClick={() => {
                                if (item.qty <= 1) {
                                  removeFromCart(item.id);
                                } else {
                                  updateQty(item.id, item.qty - 1);
                                }
                              }}
                              className="p-1 text-zinc-400 hover:text-white rounded-lg active:bg-zinc-800 transition-colors"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="font-mono font-bold text-white text-xs min-w-[20px] text-center">
                              {item.qty}
                            </span>
                            <button
                              onClick={() => updateQty(item.id, item.qty + 1)}
                              className="p-1 text-zinc-400 hover:text-white rounded-lg active:bg-zinc-800 transition-colors"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="text-right">
                            <span className="text-[10px] text-zinc-500 uppercase block font-semibold">Subtotal</span>
                            <span className="font-mono font-bold text-sm text-emerald-400">
                              ₱{lineTotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop View (>= md): Clean Structured Table Layout */}
                <div className="hidden md:block bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-950 text-zinc-400 uppercase text-xs font-semibold tracking-wider border-b border-zinc-800">
                      <tr>
                        <th className="p-4 px-6 font-semibold">Item / Service Description</th>
                        <th className="p-4 px-4 font-semibold text-center">Type</th>
                        <th className="p-4 px-4 font-semibold text-right">Unit Price</th>
                        <th className="p-4 px-6 font-semibold text-center">Quantity</th>
                        <th className="p-4 px-6 font-semibold text-right">Subtotal</th>
                        <th className="p-4 px-4 font-semibold text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800 font-mono">
                      {cart.map((item) => {
                        const isService = item.id.startsWith("labor-") || item.name.toLowerCase().includes("service") || item.name.toLowerCase().includes("tune-up") || item.name.toLowerCase().includes("cleaning");
                        const lineTotal = item.price * item.qty;

                        return (
                          <tr key={item.id} className="hover:bg-zinc-800/40 transition-colors">
                            <td className="p-4 px-6 font-sans">
                              <span className="font-bold text-zinc-100 text-sm block">{item.name}</span>
                            </td>

                            <td className="p-4 px-4 text-center font-sans">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase border bg-zinc-800 text-zinc-300 border-zinc-700">
                                {isService ? "Service" : "Product"}
                              </span>
                            </td>

                            <td className="p-4 px-4 text-right text-zinc-300">
                              ₱{item.price.toFixed(2)}
                            </td>

                            <td className="p-4 px-6">
                              <div className="flex items-center justify-center gap-2">
                                <div className="flex items-center gap-2 p-1 rounded-xl border bg-zinc-950 border-zinc-800">
                                  <button
                                    onClick={() => {
                                      if (item.qty <= 1) {
                                        removeFromCart(item.id);
                                      } else {
                                        updateQty(item.id, item.qty - 1);
                                      }
                                    }}
                                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                    title="Decrease quantity"
                                  >
                                    <Minus className="w-3.5 h-3.5" />
                                  </button>
                                  <span className="w-6 text-center font-bold text-zinc-100 text-xs">
                                    {item.qty}
                                  </span>
                                  <button
                                    onClick={() => updateQty(item.id, item.qty + 1)}
                                    className="p-1 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors"
                                    title="Increase quantity"
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
                                className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
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
              </>
            )}
          </div>

          {/* Cart Financial Summary & Complete Checkout Bar (Sticky Bottom) */}
          {cart.length > 0 && (
            <div className="sticky bottom-0 z-30 bg-zinc-950 border-t border-zinc-800 p-4 sm:p-6 -mx-4 sm:-mx-8 mt-8">
              <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center justify-between sm:justify-start sm:gap-8">
                  <div>
                    <span className="text-zinc-500 block text-[10px] uppercase font-bold tracking-wider">Subtotal</span>
                    <span className="text-sm font-bold text-zinc-300 font-mono">₱{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="w-px h-8 bg-zinc-800 hidden sm:block" />
                  <div>
                    <span className="text-zinc-400 block text-[10px] uppercase font-bold tracking-wider">Net Total Due</span>
                    <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 w-full sm:w-auto">
                  <button
                    onClick={() => setIsClearConfirmOpen(true)}
                    disabled={cart.length === 0}
                    data-testid="bottom-clear-cart-button"
                    className="hidden sm:flex px-4 py-3 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-bold transition-all items-center justify-center gap-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Clear Cart</span>
                  </button>

                  <button
                    onClick={handleProceedToCheckout}
                    disabled={!selectedRepair || cart.length === 0}
                    data-testid="proceed-to-payment-button"
                    className="w-full sm:w-auto flex-1 sm:flex-none px-6 sm:px-8 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-black text-sm transition-all flex items-center justify-center gap-2 active:scale-95 border border-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span>Proceed to Payment</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      )}

      {/* Confirmation Modal for Clearing Cart */}
      <ConfirmModal
        isOpen={isClearConfirmOpen}
        onClose={() => setIsClearConfirmOpen(false)}
        onConfirm={() => {
          clearCart();
          if (selectedRepair) {
            localStorage.removeItem(`motoshop_cart_${selectedRepair.job_id}`);
          }
          setIsClearConfirmOpen(false);
        }}
        title="Clear Current Order Cart?"
        description="This action will remove all items and services from the current checkout session."
        warningDetails={
          <div className="space-y-1.5 font-mono">
            <div className="flex justify-between text-zinc-400">
              <span>Customer:</span>
              <span className="font-bold text-white font-sans">{selectedRepair?.customer_name || "Walk-in Customer"}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Items to remove:</span>
              <span className="font-bold text-white">{itemCount} items</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Total value:</span>
              <span className="font-bold text-emerald-400">₱{total.toFixed(2)}</span>
            </div>
          </div>
        }
        confirmText="Yes, Clear Cart"
        cancelText="Keep Cart"
        confirmVariant="danger"
        icon={<Trash2 className="w-5 h-5" />}
      />
    </div>
  );
}

export default function POSPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    }>
      <POSPageContent />
    </Suspense>
  );
}
