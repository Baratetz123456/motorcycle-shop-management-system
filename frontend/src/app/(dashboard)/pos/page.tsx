"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { usePosStore } from "@/lib/store/pos-store";
import { CheckoutModal } from "@/components/pos/CheckoutModal";
import { ShoppingCart, Package, Wrench, Search, Plus, Minus, Trash2, Tag, User, Bike, Check, AlertCircle, AlertTriangle, X, ArrowRight } from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";

interface CatalogItem {
  id: string;
  sku: string;
  name: string;
  item_type: "PRODUCT" | "SERVICE";
  category?: string;
  selling_price: number;
  current_stock: number;
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

const FALLBACK_CATALOG: CatalogItem[] = [
  { id: "10000000-0000-0000-0000-000000000001", sku: "OIL-10W40", name: "Synthetic Motor Oil 10W-40", item_type: "PRODUCT", category: "Fluids", selling_price: 15.99, current_stock: 45 },
  { id: "10000000-0000-0000-0000-000000000002", sku: "FLT-001", name: "Premium Oil Filter", item_type: "PRODUCT", category: "Filters", selling_price: 8.50, current_stock: 12 },
  { id: "10000000-0000-0000-0000-000000000003", sku: "BRK-PAD-F", name: "Front Brake Pads", item_type: "PRODUCT", category: "Brakes", selling_price: 34.00, current_stock: 8 },
  { id: "10000000-0000-0000-0000-000000000004", sku: "SRV-TUN-01", name: "General Tune-Up & Inspection", item_type: "SERVICE", category: "Maintenance", selling_price: 75.00, current_stock: 0 },
  { id: "10000000-0000-0000-0000-000000000005", sku: "SRV-OIL-CHG", name: "Oil & Filter Change Service", item_type: "SERVICE", category: "Maintenance", selling_price: 30.00, current_stock: 0 },
  { id: "10000000-0000-0000-0000-000000000006", sku: "CHN-LUB", name: "Chain Lube Spray", item_type: "PRODUCT", category: "Maintenance", selling_price: 12.00, current_stock: 20 },
  { id: "10000000-0000-0000-0000-000000000007", sku: "SPK-PLG", name: "Iridium Spark Plug", item_type: "PRODUCT", category: "Engine", selling_price: 18.25, current_stock: 30 },
  { id: "10000000-0000-0000-0000-000000000008", sku: "TR-FR-120", name: "Front Tire 120/70-17", item_type: "PRODUCT", category: "Tires", selling_price: 120.00, current_stock: 4 },
];

const DEMO_ACTIVE_REPAIRS: ActiveRepairCart[] = [
  { job_id: "jo-1", jo_number: "JO-A1B2", customer_name: "John Doe", motorcycle_name: "Yamaha MT-07 (2023)", status: "ONGOING", is_paid: false, labor_charge: 150.0, parts_charge: 0, total_amount: 150.0, cart_items: [] },
  { job_id: "jo-2", jo_number: "JO-C3D4", customer_name: "Jane Roe", motorcycle_name: "Honda Click 125i (2022)", status: "PENDING", is_paid: false, labor_charge: 80.0, parts_charge: 0, total_amount: 80.0, cart_items: [] },
  { job_id: "jo-3", jo_number: "JO-E5F6", customer_name: "Bob Lee", motorcycle_name: "Kawasaki Ninja 400 (2023)", status: "ONGOING", is_paid: false, labor_charge: 120.0, parts_charge: 35.0, total_amount: 155.0, cart_items: [] },
];

export default function POSPage() {
  const router = useRouter();
  const { cart, addToCart, removeFromCart, updateQty, getTotals, clearCart } = usePosStore();
  const { subtotal, total, itemCount } = getTotals();
  const [catalog, setCatalog] = useState<CatalogItem[]>(FALLBACK_CATALOG);
  const [activeRepairs, setActiveRepairs] = useState<ActiveRepairCart[]>(DEMO_ACTIVE_REPAIRS);
  const [selectedRepair, setSelectedRepair] = useState<ActiveRepairCart | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<"ALL" | "PRODUCT" | "SERVICE">("ALL");
  const [warningMessage, setWarningMessage] = useState<string | null>(null);

  const handleProceedToCheckout = () => {
    if (!selectedRepair) {
      setWarningMessage("Please select an active customer from the Active Repair Carts bar before proceeding to checkout!");
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

  useEffect(() => {
    fetchCatalog();
    fetchActiveRepairs();
  }, []);

  const fetchCatalog = async () => {
    try {
      const res = await apiClient.get<CatalogItem[]>("/inventory");
      if (Array.isArray(res.data) && res.data.length > 0) {
        setCatalog(res.data);
      }
    } catch (e) {
      // Use fallback
    }
  };

  const fetchActiveRepairs = async () => {
    try {
      const res = await apiClient.get<ActiveRepairCart[]>("/repairs/jobs/active-carts");
      if (Array.isArray(res.data) && res.data.length > 0) {
        // Filter strictly to current active repair board customers (PENDING / ONGOING and unpaid)
        setActiveRepairs(res.data.filter((r) => (r.status === "PENDING" || r.status === "ONGOING") && !r.is_paid));
      }
    } catch (e) {
      // Use fallback active repairs
    }
  };

  const selectActiveCustomerRepair = (repair: ActiveRepairCart) => {
    setSelectedRepair(repair);
    setWarningMessage(null);
    clearCart();

    // 1. Add base labor charge to cart
    addToCart({
      id: `labor-${repair.job_id}`,
      name: `Repair Labor Fee (${repair.jo_number})`,
      price: repair.labor_charge,
    });

    // 2. Restore persistent cart items for this customer job (persisted across cashier logins)
    const storedCartStr = localStorage.getItem(`motoshop_cart_${repair.job_id}`);
    if (storedCartStr) {
      try {
        const storedItems = JSON.parse(storedCartStr);
        storedItems.forEach((item: any) => addToCart(item));
      } catch (e) {
        // ignore parse error
      }
    }
  };

  const handleAddItemToCustomerCart = async (product: CatalogItem) => {
    // MANDATORY REQUIREMENT: Require selected active customer before adding items to cart
    if (!selectedRepair) {
      setWarningMessage("Please select an active customer from the Active Repair Carts bar above before adding products or services!");
      return;
    }

    setWarningMessage(null);
    const newItem = { id: product.id, name: product.name, price: Number(product.selling_price) };
    addToCart(newItem);

    // Save item persistently in localStorage keyed by job_id so any cashier login sees it
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
    } catch (e) {
      // Local state handles smooth experience
    }
  };

  const handlePaymentCompleted = async () => {
    if (selectedRepair) {
      const jobId = selectedRepair.job_id;
      // 1. Tag job order as PAID in backend / local storage
      try {
        await apiClient.patch(`/repairs/jobs/${jobId}/payment-status`);
      } catch (e) {
        // fallback local tag
      }

      // Mark in local repairs board state
      localStorage.setItem(`motoshop_job_paid_${jobId}`, "true");

      // 2. Remove customer from active checkout carts
      setActiveRepairs((prev) => prev.filter((r) => r.job_id !== jobId));
      localStorage.removeItem(`motoshop_cart_${jobId}`);
      setSelectedRepair(null);
    }
    clearCart();
  };

  const filteredCatalog = catalog.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.sku.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = activeFilter === "ALL" || item.item_type === activeFilter;
    return matchesSearch && matchesFilter;
  });

  return (
    <div className="flex h-screen bg-zinc-950 overflow-hidden text-zinc-50 font-sans">
      
      {/* Left: Product & Service Catalog */}
      <div className="flex-1 flex flex-col">
        
        {/* Header Bar */}
        <div className="h-20 border-b border-white/10 flex items-center justify-between px-8 bg-zinc-950/80 backdrop-blur-xl z-10 sticky top-0">
          <div className="flex items-center gap-4">
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
              MotoShop POS
            </h1>
            
            {/* Catalog Filter Toggle */}
            <div className="flex bg-zinc-900 p-1 rounded-xl border border-white/10 text-xs">
              <button
                onClick={() => setActiveFilter("ALL")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all",
                  activeFilter === "ALL" ? "bg-zinc-800 text-white shadow-sm" : "text-zinc-400 hover:text-white"
                )}
              >
                All Catalog
              </button>
              <button
                onClick={() => setActiveFilter("PRODUCT")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
                  activeFilter === "PRODUCT" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30" : "text-zinc-400 hover:text-white"
                )}
              >
                <Package className="w-3.5 h-3.5" />
                Products
              </button>
              <button
                onClick={() => setActiveFilter("SERVICE")}
                className={clsx(
                  "px-3 py-1.5 rounded-lg font-semibold transition-all flex items-center gap-1.5",
                  activeFilter === "SERVICE" ? "bg-purple-500/20 text-purple-300 border border-purple-500/30" : "text-zinc-400 hover:text-white"
                )}
              >
                <Wrench className="w-3.5 h-3.5" />
                Services
              </button>
            </div>
          </div>
          
          <div className="relative w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input 
              type="text" 
              placeholder="Search product SKU, service..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-zinc-900/80 border border-white/10 rounded-full py-2 pl-9 pr-4 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
            />
          </div>
        </div>

        {/* Warning Notification Banner if No Customer Selected */}
        {warningMessage && (
          <div className="bg-amber-500/10 border-b border-amber-500/30 px-8 py-3 flex items-center justify-between text-amber-300 text-xs font-semibold animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{warningMessage}</span>
            </div>
            <button onClick={() => setWarningMessage(null)} className="text-amber-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Active Customer Repair Carts Bar (Strictly Active Repair Board Customers) */}
        <div className={clsx(
          "border-b px-8 py-3 flex items-center gap-4 overflow-x-auto transition-all duration-300",
          !selectedRepair 
            ? "bg-amber-950/20 border-amber-500/30 shadow-[inset_0_0_15px_rgba(245,158,11,0.1)]" 
            : "bg-zinc-900/90 border-white/10"
        )}>
          <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5 shrink-0">
            <User className="w-3.5 h-3.5" /> Select Active Customer Repair Cart:
          </span>

          <div className="flex gap-3 overflow-x-auto py-1">
            {activeRepairs.map((repair) => {
              const isSelected = selectedRepair?.job_id === repair.job_id;

              return (
                <button
                  key={repair.job_id}
                  onClick={() => selectActiveCustomerRepair(repair)}
                  className={clsx(
                    "px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2 border shrink-0",
                    isSelected
                      ? "bg-gradient-to-r from-cyan-600 to-blue-600 text-white border-cyan-400 shadow-md shadow-cyan-500/20 scale-105"
                      : "bg-zinc-950/80 text-zinc-300 border-white/10 hover:border-cyan-500/40 hover:bg-zinc-800"
                  )}
                >
                  <span className="font-bold">{repair.customer_name}</span>
                  <span className="text-[10px] font-mono text-zinc-400 bg-zinc-900 px-1.5 py-0.5 rounded border border-white/5">
                    {repair.jo_number}
                  </span>
                  <span className="text-[10px] text-cyan-300 font-mono font-bold">₱{repair.total_amount.toFixed(2)}</span>
                </button>
              );
            })}
          </div>

          {selectedRepair ? (
            <button
              onClick={() => {
                setSelectedRepair(null);
                clearCart();
              }}
              className="text-[11px] text-zinc-400 hover:text-red-400 underline ml-auto shrink-0"
            >
              Clear Selected Repair Cart
            </button>
          ) : (
            <span className="text-[11px] text-amber-400 font-semibold italic ml-auto shrink-0 animate-pulse">
              👈 Select customer first
            </span>
          )}
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-y-auto p-8">
          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredCatalog.map((product) => {
              const isService = product.item_type === "SERVICE";

              return (
                <div 
                  key={product.id} 
                  onClick={() => handleAddItemToCustomerCart(product)}
                  className={clsx(
                    "group relative bg-zinc-900/40 border rounded-2xl p-6 cursor-pointer overflow-hidden transition-all duration-300 hover:shadow-xl",
                    !selectedRepair && "opacity-80 border-dashed border-white/10 hover:border-amber-500/50",
                    selectedRepair && isService && "border-white/5 hover:border-purple-500/50 hover:shadow-[0_0_30px_-5px_rgba(168,85,247,0.3)]",
                    selectedRepair && !isService && "border-white/5 hover:border-cyan-500/50 hover:shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)]"
                  )}
                >
                  <div className={clsx(
                    "absolute inset-0 bg-gradient-to-br transition-all duration-500",
                    isService 
                      ? "from-purple-500/0 via-transparent to-indigo-500/0 group-hover:from-purple-500/10 group-hover:to-indigo-500/10" 
                      : "from-cyan-500/0 via-transparent to-blue-500/0 group-hover:from-cyan-500/10 group-hover:to-blue-500/10"
                  )} />
                  
                  <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className={clsx(
                      "rounded-lg p-2 border",
                      isService ? "bg-purple-500/10 text-purple-400 border-purple-500/20" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                    )}>
                      {isService ? <Wrench className="w-5 h-5" /> : <Package className="w-5 h-5" />}
                    </div>

                    <span className={clsx(
                      "text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border uppercase tracking-wider",
                      isService ? "bg-purple-950 text-purple-300 border-purple-500/30" : "bg-zinc-900 text-zinc-400 border-white/5"
                    )}>
                      {product.sku}
                    </span>
                  </div>
                  
                  <h3 className="font-semibold text-zinc-100 mb-1 relative z-10 line-clamp-2 text-sm">{product.name}</h3>
                  
                  <div className="flex items-end justify-between mt-4 relative z-10">
                    <span className="text-xl font-bold text-white">₱{Number(product.selling_price).toFixed(2)}</span>
                    <span className="text-xs text-zinc-500 font-medium">
                      {isService ? "Labor Fee" : `Stock: ${product.current_stock}`}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right: Cart Panel */}
      <div className="w-[450px] bg-zinc-900/60 border-l border-white/10 flex flex-col backdrop-blur-2xl shadow-2xl relative z-20">
        
        {/* Cart Header */}
        <div className="h-20 flex items-center justify-between px-6 border-b border-white/10 bg-zinc-900/50">
          <div className="flex items-center gap-3">
            <div className="bg-cyan-500/20 p-2 rounded-xl text-cyan-400">
              <ShoppingCart className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white">
                {selectedRepair ? `Repair Cart: ${selectedRepair.customer_name}` : "Current Order Cart"}
              </h2>
              {selectedRepair ? (
                <p className="text-xs text-cyan-400 font-mono">{selectedRepair.motorcycle_name}</p>
              ) : (
                <p className="text-xs text-amber-400">No Customer Selected</p>
              )}
            </div>
          </div>
          <span className="bg-zinc-800 text-zinc-300 text-xs font-bold px-3 py-1 rounded-full border border-white/5">
            {itemCount} Items
          </span>
        </div>

        {/* Cart List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 gap-4 opacity-50">
              <ShoppingCart className="w-16 h-16" />
              <p className="text-center text-xs">
                {!selectedRepair ? "Select an active customer from the top bar to start" : "Click products or services to add to cart"}
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.id} className="bg-zinc-950/50 border border-white/5 rounded-xl p-4 flex gap-4 group hover:border-white/10 transition-colors">
                <div className="flex-1">
                  <h4 className="text-sm font-medium text-zinc-200 line-clamp-1 mb-1">{item.name}</h4>
                  <span className="text-cyan-400 font-bold">₱{item.price.toFixed(2)}</span>
                </div>
                
                <div className="flex items-center gap-3 bg-zinc-900 rounded-lg p-1 border border-white/5">
                  <button 
                    onClick={() => updateQty(item.id, item.qty - 1)}
                    className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  <span className="w-6 text-center text-sm font-medium">{item.qty}</span>
                  <button 
                    onClick={() => updateQty(item.id, item.qty + 1)}
                    className="p-1 hover:bg-zinc-800 rounded-md transition-colors text-zinc-400 hover:text-white"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-zinc-500 hover:text-red-400 hover:bg-red-400/10 rounded-lg transition-colors ml-1"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Footer Billing */}
        <div className="p-6 bg-zinc-950/80 border-t border-white/10 backdrop-blur-xl">
          <div className="space-y-3 mb-6 text-sm">
            <div className="flex justify-between text-zinc-400">
              <span>Subtotal</span>
              <span className="font-medium text-zinc-200">₱{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-zinc-400">
              <span>Tax (0%)</span>
              <span className="font-medium text-zinc-200">₱0.00</span>
            </div>
            <div className="flex justify-between items-end pt-3 border-t border-white/5">
              <span className="text-zinc-300 font-medium">Total Charge</span>
              <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500">
                ₱{total.toFixed(2)}
              </span>
            </div>
          </div>
          
          <button
            onClick={handleProceedToCheckout}
            disabled={cart.length === 0 || !selectedRepair}
            className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-base rounded-2xl shadow-[0_0_25px_-5px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 active:scale-95"
          >
            <span>Proceed to Complete Checkout</span>
            <span className="font-mono text-cyan-200">(₱{total.toFixed(2)})</span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
