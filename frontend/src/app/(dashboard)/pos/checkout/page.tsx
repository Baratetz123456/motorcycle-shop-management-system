"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCheckoutSaga } from "@/hooks/useCheckoutSaga";
import { usePosStore } from "@/lib/store/pos-store";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { 
  CreditCard, 
  Banknote, 
  Loader2, 
  CheckCircle2, 
  XCircle, 
  ArrowLeft, 
  ArrowRight, 
  ShieldCheck, 
  User, 
  Wrench, 
  FileText, 
  Tag, 
  ShoppingCart, 
  Percent,
  Coins,
  AlertTriangle,
  Receipt,
  RotateCcw,
  Printer
} from "lucide-react";
import clsx from "clsx";

interface ReceiptSummary {
  invoiceNo: string;
  customerName: string;
  motorcycleName: string;
  mechanicName: string;
  paymentMethod: "CASH" | "CARD";
  grossSubtotal: number;
  discountPercent: number;
  discountAmount: number;
  netTotalDue: number;
  netAmountPaid: number;
  cashReceivedVal: number;
  cashChange: number;
  items: Array<{ name: string; qty: number; price: number }>;
}

function POSCheckoutContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const jobId = searchParams.get("job_id") || "";
  const customerName = searchParams.get("customer") || "Walk-in Customer";
  const motorcycleName = searchParams.get("model") || "Standard Motorcycle";
  const mechanicName = searchParams.get("mechanic") || "Mike Smith";
  const laborFeeParam = searchParams.get("labor");
  const baseLaborPrice = laborFeeParam ? Number(laborFeeParam) : 150.0;

  const { cart, getTotals, clearCart, addToCart } = usePosStore();
  const { subtotal } = getTotals();

  // State management
  const [discountPercent, setDiscountPercent] = useState<number>(0);
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CARD">("CASH");
  const [cashReceivedInput, setCashReceivedInput] = useState<string>("");
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [invoiceNo, setInvoiceNo] = useState<string>("");
  const [receiptSummary, setReceiptSummary] = useState<ReceiptSummary | null>(null);
  const [processingError, setProcessingError] = useState<string | null>(null);

  const { initiateCheckout, isCheckingOut, resetSaga } = useCheckoutSaga();

  useEffect(() => {
    resetSaga();
    if (cart.length === 0 && jobId) {
      // Restore persistent cart items for this customer job (persisted across cashier logins)
      const storedStr = localStorage.getItem(`motoshop_cart_${jobId}`);
      if (storedStr) {
        try {
          const items = JSON.parse(storedStr);
          items.forEach((item: any) => addToCart(item));
        } catch (e) {
          // ignore
        }
      }
    }
  }, [jobId]);

  // Calculation formulas
  const discountAmount = Number((subtotal * (discountPercent / 100)).toFixed(2));
  const netTotalDue = Math.max(0, Number((subtotal - discountAmount).toFixed(2)));

  const cashReceivedVal = paymentMethod === "CASH" 
    ? Number(cashReceivedInput) || 0 
    : netTotalDue;

  const cashChange = paymentMethod === "CASH" 
    ? Math.max(0, Number((cashReceivedVal - netTotalDue).toFixed(2))) 
    : 0;

  const isCashInsufficient = paymentMethod === "CASH" && cashReceivedVal < netTotalDue;

  const handleDiscountChange = (val: number) => {
    const clamped = Math.min(100, Math.max(0, val));
    setDiscountPercent(clamped);
  };

  const handleQuickCash = (amount: number) => {
    setCashReceivedInput(amount.toString());
  };

  const handleExactCash = () => {
    setCashReceivedInput(netTotalDue.toString());
  };

  const handleExecutePayment = async () => {
    if (isCashInsufficient) return;

    setProcessingError(null);
    try {
      const cashierEmail = localStorage.getItem("user_email") || "Cashier Sarah Connor";
      
      const payload = {
        customer_id: null,
        cashier_name: cashierEmail,
        mechanic_name: mechanicName,
        job_order_id: jobId || null,
        amount_paid: netTotalDue,
        payment_method: paymentMethod,
        discount_percentage: discountPercent,
        discount_amount: discountAmount,
        cash_received: cashReceivedVal,
        cash_change: cashChange,
        items: cart.map((item) => ({
          item_id: item.id,
          qty: item.qty,
          price: item.price,
        })),
      };

      const result = await initiateCheckout(payload);
      const generatedInvoice = result?.invoice_no || `INV-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
      setInvoiceNo(generatedInvoice);

      // 1. Record completed transaction in sales logs for /sales, /dashboard & /reports
      const newTxLog = {
        id: result?.id || `tx-${Date.now()}`,
        invoice_no: generatedInvoice,
        job_order_id: jobId || undefined,
        created_at: new Date().toISOString(),
        customer_name: customerName,
        motorcycle_name: motorcycleName,
        cashier_name: cashierEmail,
        mechanic_name: mechanicName,
        subtotal: subtotal,
        discount_percentage: discountPercent,
        discount_amount: discountAmount,
        total: netTotalDue,
        amount_paid: netTotalDue,
        cash_received: cashReceivedVal,
        cash_change: cashChange,
        payment_method: paymentMethod,
        status: "COMPLETED",
        items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price }))
      };
      const storedSales = localStorage.getItem("motoshop_sales_logs");
      const salesList = storedSales ? JSON.parse(storedSales) : [];
      salesList.unshift(newTxLog);
      localStorage.setItem("motoshop_sales_logs", JSON.stringify(salesList));

      // 2. Automatically deduct product stock in inventory
      const storedInv = localStorage.getItem("motoshop_inventory_stock");
      const invMap = storedInv ? JSON.parse(storedInv) : {};
      cart.forEach(item => {
        if (item.id && !item.id.startsWith("labor-")) {
          const curr = invMap[item.id] !== undefined ? invMap[item.id] : 30;
          invMap[item.id] = Math.max(0, curr - item.qty);
        }
      });
      localStorage.setItem("motoshop_inventory_stock", JSON.stringify(invMap));

      // 3. Mark job completed & paid on Repairs Board & remove from active POS carts
      if (jobId) {
        try {
          await apiClient.patch(`/repairs/jobs/${jobId}/payment-status`);
        } catch (e) {
          // ignore network error
        }
        localStorage.setItem(`motoshop_job_paid_${jobId}`, "true");
        localStorage.setItem(`motoshop_job_status_${jobId}`, "COMPLETED");
        localStorage.removeItem(`motoshop_cart_${jobId}`);

        // Synchronize motoshop_jobs and motoshop_active_repairs in localStorage
        try {
          const storedJobsStr = localStorage.getItem("motoshop_jobs");
          if (storedJobsStr) {
            const parsed = JSON.parse(storedJobsStr);
            if (Array.isArray(parsed)) {
              const updatedJobs = parsed.map((j: any) =>
                j.id === jobId || j.jo_number === jobId ? { ...j, is_paid: true } : j
              );
              localStorage.setItem("motoshop_jobs", JSON.stringify(updatedJobs));
            }
          }
          const storedActiveStr = localStorage.getItem("motoshop_active_repairs");
          if (storedActiveStr) {
            const parsedActive = JSON.parse(storedActiveStr);
            if (Array.isArray(parsedActive)) {
              const updatedActive = parsedActive.filter(
                (r: any) => r.job_id !== jobId && r.jo_number !== jobId
              );
              localStorage.setItem("motoshop_active_repairs", JSON.stringify(updatedActive));
            }
          }
        } catch (e) {}
      }

      // 4. Record POS_CHECKOUT Audit Event in PostgreSQL DB / local audit logs
      recordUserAuditLog("POS_CHECKOUT", "/pos/checkout", {
        invoice_no: generatedInvoice,
        amount_paid: netTotalDue,
        discount_percentage: discountPercent,
        cashier: cashierEmail,
        mechanic: mechanicName,
        customer: customerName,
        payment_method: paymentMethod,
      });

      // 5. Snapshot completed transaction details into receiptSummary BEFORE clearing store cart
      const completedSummary: ReceiptSummary = {
        invoiceNo: generatedInvoice,
        customerName,
        motorcycleName,
        mechanicName,
        paymentMethod,
        grossSubtotal: subtotal,
        discountPercent,
        discountAmount,
        netTotalDue,
        netAmountPaid: netTotalDue,
        cashReceivedVal,
        cashChange,
        items: cart.map(item => ({ name: item.name, qty: item.qty, price: item.price }))
      };
      setReceiptSummary(completedSummary);
      setIsSuccess(true);
      clearCart();
    } catch (e: any) {
      setProcessingError(e?.message || "Payment execution failed. Please check network connection.");
    }
  };

  const handleReturnToPOS = () => {
    if (isSuccess) {
      clearCart();
    }
    router.push("/pos");
  };

  return (
    <div className="w-full h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans overflow-hidden">
      
      {/* Top Navigation Header */}
      <div className="h-20 border-b border-white/10 px-8 bg-zinc-950/90 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <button
            onClick={handleReturnToPOS}
            className="p-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to POS</span>
          </button>

          <div>
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
              <CreditCard className="w-8 h-8 text-cyan-400" />
              POS Checkout Payment
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Full-Page Order Settlement Workspace & Change Calculator
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <span className="bg-cyan-500/10 text-cyan-400 text-xs font-mono font-bold px-3.5 py-1.5 rounded-full border border-cyan-500/30">
            {jobId ? `JO: ${jobId.slice(0, 8)}` : "Walk-in Order"}
          </span>
          <span className="bg-purple-500/10 text-purple-300 text-xs font-semibold px-3.5 py-1.5 rounded-full border border-purple-500/30 flex items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5" />
            Mechanic: {mechanicName}
          </span>
        </div>
      </div>

      {/* Main Full-Page Content Workspace */}
      <div className="w-full flex-1 overflow-y-auto p-8">
        
        {isSuccess ? (
          /* Full-Page Official Receipt View */
          <div className="max-w-3xl mx-auto bg-zinc-900/80 border border-white/10 rounded-3xl p-8 shadow-2xl backdrop-blur-2xl animate-in fade-in zoom-in-95 duration-200 space-y-6 my-auto">
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-20 h-20 bg-emerald-500/20 rounded-full flex items-center justify-center border border-emerald-500/30 shadow-[0_0_30px_-5px_rgba(16,185,129,0.3)]">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
              <h2 className="text-3xl font-black text-white">Payment Completed Successfully!</h2>
              <p className="text-xs text-zinc-400">
                Official Receipt #: <span className="font-mono font-bold text-cyan-400 text-sm">{invoiceNo}</span>
              </p>
            </div>

            {/* Receipt Summary Grid */}
            <div className="bg-zinc-950 p-6 rounded-2xl border border-white/10 text-sm space-y-3">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <span className="text-zinc-400">Customer Name:</span>
                <span className="text-white font-bold">{receiptSummary?.customerName || customerName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Motorcycle Model:</span>
                <span className="text-zinc-200">{receiptSummary?.motorcycleName || motorcycleName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Assigned Mechanic:</span>
                <span className="text-purple-300 font-semibold">{receiptSummary?.mechanicName || mechanicName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-zinc-400">Payment Method:</span>
                <span className="font-mono text-cyan-300 font-bold uppercase">{receiptSummary?.paymentMethod || paymentMethod}</span>
              </div>

              {/* Itemized breakdown on receipt */}
              {receiptSummary?.items && receiptSummary.items.length > 0 && (
                <div className="pt-3 border-t border-white/10 space-y-1.5">
                  <span className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Purchased Items & Service Breakdown ({receiptSummary.items.length})
                  </span>
                  {receiptSummary.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-zinc-300">
                      <span>
                        {it.name} <span className="text-zinc-500 font-mono">x{it.qty}</span>
                      </span>
                      <span className="font-mono text-zinc-200">₱{(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 border-t border-white/10 space-y-2">
                <div className="flex justify-between text-zinc-400 text-xs">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono text-zinc-200 text-sm font-semibold">
                    ₱{(receiptSummary?.grossSubtotal ?? subtotal).toFixed(2)}
                  </span>
                </div>
                {(receiptSummary?.discountPercent ?? discountPercent) > 0 ? (
                  <div className="flex justify-between text-amber-400 text-xs">
                    <span>Discount ({(receiptSummary?.discountPercent ?? discountPercent)}%):</span>
                    <span className="font-mono font-semibold">
                      -₱{(receiptSummary?.discountAmount ?? discountAmount).toFixed(2)}
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-zinc-500 text-xs">
                    <span>Discount (0%):</span>
                    <span className="font-mono">₱0.00</span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-1 border-t border-white/5">
                  <span>Net Amount Paid:</span>
                  <span className="font-mono text-emerald-400 text-xl font-black">
                    ₱{(receiptSummary?.netAmountPaid ?? netTotalDue).toFixed(2)}
                  </span>
                </div>
                {(receiptSummary?.paymentMethod || paymentMethod) === "CASH" && (
                  <>
                    <div className="flex justify-between text-zinc-400 text-xs pt-1">
                      <span>Cash Tendered:</span>
                      <span className="font-mono text-zinc-200">
                        ₱{(receiptSummary?.cashReceivedVal ?? cashReceivedVal).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-cyan-400 text-sm font-bold">
                      <span>Cash Change Given:</span>
                      <span className="font-mono text-base">
                        ₱{(receiptSummary?.cashChange ?? cashChange).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 py-3.5 px-4 bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-sm rounded-2xl border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleReturnToPOS}
                className="flex-1 py-3.5 px-4 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm rounded-2xl shadow-xl transition-all flex items-center justify-center gap-2"
              >
                <span>Return to POS Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Full-Page Dual-Panel Workspace */
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full w-full">
            
            {/* Left Panel: Order Details, Itemized Cart, & Discount (Span 7) */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Active Customer & Motorcycle Metadata Card */}
              <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl space-y-3">
                <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 uppercase tracking-wider">
                  <span className="flex items-center gap-2 text-cyan-400">
                    <User className="w-4 h-4" /> Active Repair Customer
                  </span>
                  <span className="text-zinc-500">POS Session</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-xs text-zinc-500 block">Customer Name</span>
                    <span className="text-base font-bold text-white">{customerName}</span>
                  </div>
                  <div>
                    <span className="text-xs text-zinc-500 block">Motorcycle Model</span>
                    <span className="text-base font-semibold text-zinc-200">{motorcycleName}</span>
                  </div>
                </div>
              </div>

              {/* Itemized Order Table */}
              <div className="flex-1 bg-zinc-900/40 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex flex-col">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-4 flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4 text-cyan-400" /> Itemized Order Breakdown ({cart.length})
                </h3>

                <div className="flex-1 overflow-y-auto max-h-72 space-y-2 pr-1">
                  {cart.length === 0 ? (
                    <div className="text-center py-12 text-zinc-500 text-xs">
                      No items in cart. Return to POS page to add products or services.
                    </div>
                  ) : (
                    cart.map((item) => (
                      <div key={item.id} className="bg-zinc-950/60 border border-white/5 rounded-2xl p-3.5 flex justify-between items-center text-xs">
                        <div>
                          <span className="font-semibold text-zinc-200 block">{item.name}</span>
                          <span className="text-zinc-500">Qty: {item.qty} × ₱{item.price.toFixed(2)}</span>
                        </div>
                        <span className="font-mono font-bold text-white text-sm">
                          ₱{(item.qty * item.price).toFixed(2)}
                        </span>
                      </div>
                    ))
                  )}
                </div>

                {/* Percentage Discount Field & Calculations */}
                <div className="mt-6 pt-4 border-t border-white/10 space-y-4">
                  
                  {/* Percentage Discount Input */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
                        <Percent className="w-3.5 h-3.5" /> Discount Percentage (%)
                      </label>
                      <span className="text-xs text-zinc-500">Applies to total subtotal</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={discountPercent || ""}
                          onChange={(e) => handleDiscountChange(Number(e.target.value))}
                          placeholder="0"
                          className="w-full bg-zinc-950 border border-amber-500/30 rounded-2xl py-2.5 px-4 font-mono text-base font-bold text-amber-300 focus:outline-none focus:ring-2 focus:ring-amber-500/50"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500">%</span>
                      </div>

                      {/* Quick Discount Badges */}
                      <div className="flex gap-1.5">
                        {[0, 5, 10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => handleDiscountChange(pct)}
                            className={clsx(
                              "px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                              discountPercent === pct
                                ? "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-md shadow-amber-500/10"
                                : "bg-zinc-950 text-zinc-400 border-white/10 hover:text-white hover:bg-zinc-800"
                            )}
                          >
                            {pct}%
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Calculations Summary */}
                  <div className="bg-zinc-950 p-4 rounded-2xl border border-white/5 space-y-2 text-xs">
                    <div className="flex justify-between text-zinc-400">
                      <span>Gross Subtotal:</span>
                      <span className="font-mono text-zinc-200">₱{subtotal.toFixed(2)}</span>
                    </div>
                    {discountPercent > 0 && (
                      <div className="flex justify-between text-amber-400 font-semibold">
                        <span>Discount ({discountPercent}%):</span>
                        <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
                      </div>
                    )}
                    <div className="flex justify-between items-end pt-2 border-t border-white/5">
                      <span className="text-zinc-300 font-bold text-sm">Discounted Net Total Due:</span>
                      <span className="text-2xl font-black bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 to-blue-500 font-mono">
                        ₱{netTotalDue.toFixed(2)}
                      </span>
                    </div>
                  </div>

                </div>
              </div>

            </div>

            {/* Right Panel: Payment Method, Cash Received & Live Change Calculation (Span 5) */}
            <div className="lg:col-span-5 flex flex-col space-y-6">
              
              <div className="bg-zinc-900/60 border border-white/10 rounded-3xl p-6 backdrop-blur-xl flex-1 flex flex-col justify-between space-y-6">
                
                <div className="space-y-6">
                  
                  {/* Select Payment Method */}
                  <div>
                    <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                      1. Select Payment Method
                    </label>

                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CASH")}
                        className={clsx(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                          paymentMethod === "CASH"
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/20"
                            : "border-white/5 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:bg-zinc-800"
                        )}
                      >
                        <Banknote className="w-6 h-6" />
                        <span className="font-bold text-sm">Cash Payment</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setPaymentMethod("CARD")}
                        className={clsx(
                          "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                          paymentMethod === "CARD"
                            ? "border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-lg shadow-cyan-500/20"
                            : "border-white/5 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:bg-zinc-800"
                        )}
                      >
                        <CreditCard className="w-6 h-6" />
                        <span className="font-bold text-sm">Card Payment</span>
                      </button>
                    </div>
                  </div>

                  {/* Cash Received Input & Live Change (Cash Mode Only) */}
                  {paymentMethod === "CASH" ? (
                    <div className="space-y-4 animate-in fade-in">
                      
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <label className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                            <Coins className="w-4 h-4" /> 2. Cash Received from Customer (₱)
                          </label>
                          <button
                            type="button"
                            onClick={handleExactCash}
                            className="text-[11px] font-bold text-cyan-400 hover:text-cyan-300 underline"
                          >
                            Exact Amount (₱{netTotalDue.toFixed(2)})
                          </button>
                        </div>

                        <div className="relative">
                          <span className="absolute left-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500 text-lg">₱</span>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={cashReceivedInput}
                            onChange={(e) => setCashReceivedInput(e.target.value)}
                            placeholder="Enter cash tendered..."
                            className="w-full bg-zinc-950 border border-cyan-500/40 rounded-2xl py-3 pl-10 pr-4 font-mono text-xl font-bold text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50 shadow-inner"
                          />
                        </div>
                      </div>

                      {/* Quick Cash Buttons */}
                      <div>
                        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                          Quick Cash Tendered:
                        </span>
                        <div className="grid grid-cols-3 gap-2">
                          {[100, 200, 500, 1000, 2000].map((amt) => (
                            <button
                              key={amt}
                              type="button"
                              onClick={() => handleQuickCash(amt)}
                              className="py-2 rounded-xl bg-zinc-950 border border-white/10 hover:border-cyan-500/40 text-xs font-mono font-bold text-zinc-300 hover:text-white transition-all"
                            >
                              ₱{amt}
                            </button>
                          ))}
                          <button
                            type="button"
                            onClick={handleExactCash}
                            className="py-2 rounded-xl bg-cyan-950 border border-cyan-500/40 text-xs font-mono font-bold text-cyan-300 hover:text-cyan-200 transition-all"
                          >
                            Exact
                          </button>
                        </div>
                      </div>

                      {/* Live Cash Change Calculation Display */}
                      <div className={clsx(
                        "p-5 rounded-2xl border transition-all duration-300 flex justify-between items-center",
                        isCashInsufficient
                          ? "bg-red-500/10 border-red-500/30 text-red-400"
                          : "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                      )}>
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider block">
                            {isCashInsufficient ? "Insufficient Cash" : "Cash Change Due"}
                          </span>
                          <span className="text-[11px] opacity-80">
                            {isCashInsufficient ? `Need ₱${(netTotalDue - cashReceivedVal).toFixed(2)} more` : "Give to customer"}
                          </span>
                        </div>

                        <div className="text-3xl font-black font-mono">
                          ₱{cashChange.toFixed(2)}
                        </div>
                      </div>

                    </div>
                  ) : (
                    /* Card Mode Information */
                    <div className="bg-zinc-950/80 p-5 rounded-2xl border border-white/5 text-xs text-zinc-400 space-y-2">
                      <span className="font-bold text-zinc-200 block flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4 text-cyan-400" /> Card Settlement Selected
                      </span>
                      <p>Payment will be processed for the exact net total amount of <strong className="text-white">₱{netTotalDue.toFixed(2)}</strong> via card terminal.</p>
                    </div>
                  )}

                  {/* Processing Error Notice */}
                  {processingError && (
                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-400 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0" />
                      <span>{processingError}</span>
                    </div>
                  )}

                </div>

                {/* Confirm & Complete Action Button */}
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  disabled={isCheckingOut || cart.length === 0 || isCashInsufficient}
                  className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-base font-bold rounded-2xl shadow-[0_0_25px_-5px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed active:scale-95"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Confirm & Complete Payment (₱{netTotalDue.toFixed(2)})</span>
                      <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>

              </div>

            </div>

          </div>
        )}

      </div>

    </div>
  );
}

export default function POSCheckoutPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    }>
      <POSCheckoutContent />
    </Suspense>
  );
}
