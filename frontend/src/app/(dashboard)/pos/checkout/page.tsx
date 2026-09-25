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
  Printer,
  Bike
} from "lucide-react";
import clsx from "clsx";
import { v4 as uuidv4 } from "uuid";
import { getSystemSettings } from "@/lib/settings";
import { getInvoiceDocumentHtml } from "@/components/documents/PrintableInvoiceDocument";
import { printIsolatedDocument } from "@/components/documents/printUtils";

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
        id: result?.id || uuidv4(),
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
      router.push("/pos");
    } else {
      router.push(jobId ? `/pos?job_id=${encodeURIComponent(jobId)}&view=cart` : "/pos");
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptSummary) return;
    const docHtml = getInvoiceDocumentHtml({
      invoiceNo: receiptSummary.invoiceNo,
      jobOrderNumber: jobId || undefined,
      createdAt: new Date().toISOString(),
      status: "COMPLETED",
      customerName: receiptSummary.customerName,
      customerPhone: undefined,
      motorcycleName: receiptSummary.motorcycleName,
      plateNumber: undefined,
      cashierName: undefined,
      mechanicName: receiptSummary.mechanicName,
      paymentMethod: receiptSummary.paymentMethod,
      items: receiptSummary.items.map((it) => ({
        name: it.name,
        qty: it.qty,
        price: it.price
      })),
      subtotal: receiptSummary.grossSubtotal,
      discountPercentage: receiptSummary.discountPercent,
      discountAmount: receiptSummary.discountAmount,
      total: receiptSummary.netTotalDue,
      amountPaid: receiptSummary.netAmountPaid,
      cashReceived: receiptSummary.cashReceivedVal,
      cashChange: receiptSummary.cashChange,
      settings: getSystemSettings()
    });
    printIsolatedDocument(`Invoice-${receiptSummary.invoiceNo}`, docHtml);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans w-full max-w-full overflow-x-hidden">
      
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-30 border-b border-zinc-800 px-4 sm:px-8 py-3.5 bg-zinc-950 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            onClick={handleReturnToPOS}
            aria-label="Return to POS Cart"
            data-testid="return-to-pos-button"
            className="p-2 sm:px-3 sm:py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-bold shrink-0"
          >
            <ArrowLeft className="w-4 h-4 text-zinc-400" />
            <span className="hidden sm:inline">Return to POS Cart</span>
            <span className="sm:hidden">Back</span>
          </button>

          <div className="min-w-0">
            <h1 className="text-base sm:text-xl font-black text-white flex items-center gap-2 truncate">
              <CreditCard className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>Checkout Payment</span>
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className="bg-zinc-800 text-zinc-300 text-[10px] sm:text-xs font-mono font-bold px-2.5 sm:px-3 py-1 rounded-md border border-zinc-700">
            {jobId ? (jobId.startsWith("job-") || jobId.startsWith("JO-") ? jobId : `JO: ${jobId.slice(0, 8)}`) : "Walk-in Order"}
          </span>
          <span className="hidden md:flex bg-zinc-800 text-zinc-300 text-xs font-semibold px-3 py-1 rounded-md border border-zinc-700 items-center gap-1.5">
            <Wrench className="w-3.5 h-3.5 text-zinc-400" />
            <span>Mechanic: {mechanicName}</span>
          </span>
        </div>
      </header>

      {/* Main Content Workspace */}
      <div className="w-full flex-1">
        
        {isSuccess ? (
          /* Full-Page Official Receipt View (Card-Free, Clean Canvas) */
          <div className="max-w-2xl mx-auto py-6 sm:py-12 px-4 sm:px-6 space-y-6 animate-in fade-in duration-200">
            <div className="flex flex-col items-center text-center space-y-2 pb-6 border-b border-zinc-800">
              <div className="w-16 h-16 bg-zinc-900 rounded-2xl flex items-center justify-center border border-zinc-800">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">Payment Completed!</h2>
              <p className="text-xs text-zinc-400">
                Official Receipt #: <span className="font-mono font-bold text-white text-sm">{invoiceNo}</span>
              </p>
            </div>

            {/* Receipt Breakdown (Card-Free with hairline dividers) */}
            <div className="divide-y divide-zinc-800 text-sm">
              <div className="flex justify-between items-center py-2.5">
                <span className="text-zinc-400 text-xs">Customer:</span>
                <span className="text-white font-bold">{receiptSummary?.customerName || customerName}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-zinc-400 text-xs">Motorcycle:</span>
                <span className="text-zinc-200">{receiptSummary?.motorcycleName || motorcycleName}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-zinc-400 text-xs">Assigned Mechanic:</span>
                <span className="text-zinc-200 font-semibold">{receiptSummary?.mechanicName || mechanicName}</span>
              </div>
              <div className="flex justify-between items-center py-2.5">
                <span className="text-zinc-400 text-xs">Payment Method:</span>
                <span className="font-mono text-zinc-200 font-bold uppercase">{receiptSummary?.paymentMethod || paymentMethod}</span>
              </div>

              {receiptSummary?.items && receiptSummary.items.length > 0 && (
                <div className="py-3 space-y-1.5">
                  <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                    Purchased Items & Services ({receiptSummary.items.length})
                  </span>
                  {receiptSummary.items.map((it, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs text-zinc-300">
                      <span>
                        {it.name} <span className="text-zinc-500 font-mono">×{it.qty}</span>
                      </span>
                      <span className="font-mono text-zinc-200">₱{(it.price * it.qty).toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              )}

              <div className="py-3 space-y-2">
                <div className="flex justify-between text-zinc-400 text-xs">
                  <span>Gross Subtotal:</span>
                  <span className="font-mono text-zinc-200 text-sm font-semibold">
                    ₱{(receiptSummary?.grossSubtotal ?? subtotal).toFixed(2)}
                  </span>
                </div>
                {(receiptSummary?.discountPercent ?? discountPercent) > 0 && (
                  <div className="flex justify-between text-amber-400 text-xs">
                    <span>Discount ({(receiptSummary?.discountPercent ?? discountPercent)}%):</span>
                    <span className="font-mono font-semibold">
                      -₱{(receiptSummary?.discountAmount ?? discountAmount).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-base font-bold text-white pt-2 border-t border-white/5">
                  <span>Net Amount Paid:</span>
                  <span className="font-mono text-emerald-400 text-2xl font-black">
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
                      <span className="font-mono text-base font-black">
                        ₱{(receiptSummary?.cashChange ?? cashChange).toFixed(2)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <button
                type="button"
                onClick={handlePrintReceipt}
                className="flex-1 py-3.5 px-4 bg-zinc-900 hover:bg-zinc-800 text-white font-bold text-sm rounded-xl border border-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-4 h-4 text-cyan-400" />
                <span>Print Official Receipt</span>
              </button>

              <button
                type="button"
                onClick={handleReturnToPOS}
                className="flex-1 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm rounded-xl transition-all flex items-center justify-center gap-2 border border-emerald-500"
              >
                <span>Return to POS</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          /* Card-Free Canvas Workspace */
          <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 py-4 sm:py-6 px-4 sm:px-8">
            
            {/* Left Panel: Order Details, Itemized Cart, & Discount (Span 7) */}
            <div className="lg:col-span-7 flex flex-col space-y-6">
              
              {/* Active Customer & Motorcycle Metadata Strip (Card-Free) */}
              <div className="pb-5 border-b border-zinc-800 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-zinc-300 font-bold text-base shrink-0">
                    {customerName.split(" ").map((n) => n[0]).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs uppercase font-bold text-zinc-400 tracking-wider">Active Customer</span>
                      <span className="font-mono text-[10px] bg-zinc-800 text-zinc-300 border border-zinc-700 px-1.5 py-0.5 rounded font-bold">
                        {jobId ? (jobId.startsWith("job-") || jobId.startsWith("JO-") ? jobId : `JO: ${jobId.slice(0, 8)}`) : "Walk-in"}
                      </span>
                    </div>
                    <h2 className="text-lg font-black text-white mt-0.5 truncate">{customerName}</h2>
                    <p className="text-xs text-zinc-400 flex items-center gap-2 font-medium mt-0.5 truncate">
                      <Bike className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                      <span className="truncate">{motorcycleName}</span>
                      <span className="text-zinc-600">•</span>
                      <span>Mechanic: {mechanicName}</span>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleReturnToPOS}
                  className="hidden sm:flex px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold border border-zinc-800 transition-colors items-center gap-1.5 shrink-0"
                >
                  <ArrowLeft className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Edit Cart</span>
                </button>
              </div>

              {/* Itemized Order Breakdown (Card-Free List with Hairline Dividers) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-2">
                    <ShoppingCart className="w-4 h-4 text-emerald-400" />
                    <span>Itemized Order Breakdown ({cart.length})</span>
                  </h3>
                  <span className="text-xs text-zinc-500 font-mono">
                    {cart.reduce((sum, item) => sum + item.qty, 0)} total items
                  </span>
                </div>

                <div className="divide-y divide-zinc-805 border-t border-b border-zinc-800 max-h-80 overflow-y-auto">
                  {cart.length === 0 ? (
                    <div className="text-center py-10 text-zinc-500 text-xs">
                      No items in cart. Click Return to POS Cart to add products or services.
                    </div>
                  ) : (
                    cart.map((item) => {
                      const isService = item.id.startsWith("labor-") || item.name.toLowerCase().includes("service") || item.name.toLowerCase().includes("tune-up") || item.name.toLowerCase().includes("cleaning");
                      return (
                        <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-zinc-100 text-sm truncate">{item.name}</span>
                              <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border bg-zinc-800 text-zinc-300 border-zinc-700">
                                {isService ? "Service" : "Part"}
                              </span>
                            </div>
                            <span className="text-xs text-zinc-400 font-mono mt-0.5 block">
                              {item.qty} × ₱{item.price.toFixed(2)}
                            </span>
                          </div>

                          <span className="font-mono font-bold text-white text-sm shrink-0">
                            ₱{(item.qty * item.price).toFixed(2)}
                          </span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* Percentage Discount & Subtotal Section (Card-Free) */}
              <div className="pt-2 space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" /> Discount Percentage (%)
                    </label>
                    <span className="text-xs text-zinc-500">Applies to subtotal</span>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 flex-wrap sm:flex-nowrap">
                    <div className="relative flex-1 min-w-[120px]">
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={discountPercent || ""}
                        onChange={(e) => handleDiscountChange(Number(e.target.value))}
                        placeholder="0"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-2.5 px-4 font-mono text-base font-bold text-zinc-100 focus:outline-none focus:border-emerald-500"
                      />
                      <span className="absolute right-4 top-1/2 -translate-y-1/2 font-bold text-zinc-500">%</span>
                    </div>

                    {/* Quick Discount Badges */}
                    <div className="flex gap-1.5 shrink-0">
                      {[0, 5, 10, 15, 20].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => handleDiscountChange(pct)}
                          className={clsx(
                            "px-2.5 sm:px-3 py-2 rounded-xl text-xs font-bold transition-all border",
                            discountPercent === pct
                              ? "bg-emerald-600 text-white border-emerald-500 font-bold"
                              : "bg-zinc-900 text-zinc-400 border-zinc-800 hover:text-white hover:bg-zinc-800"
                          )}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Calculations Summary Strip */}
                <div className="pt-3 border-t border-zinc-800 space-y-2 text-xs">
                  <div className="flex justify-between text-zinc-400">
                    <span>Gross Subtotal:</span>
                    <span className="font-mono text-zinc-200 font-semibold">₱{subtotal.toFixed(2)}</span>
                  </div>
                  {discountPercent > 0 && (
                    <div className="flex justify-between text-zinc-300 font-semibold">
                      <span>Discount ({discountPercent}%):</span>
                      <span className="font-mono">-₱{discountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-end pt-2 border-t border-zinc-800">
                    <span className="text-zinc-300 font-bold text-sm">Discounted Net Total Due:</span>
                    <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono">
                      ₱{netTotalDue.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

            </div>

            {/* Right Panel: Payment Method, Cash Received & Live Change Calculation (Span 5) */}
            <div className="lg:col-span-5 lg:border-l lg:border-zinc-800 lg:pl-10 flex flex-col space-y-6">
              
              {/* Select Payment Method */}
              <div>
                <label className="block text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3">
                  1. Payment Method
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CASH")}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-2 p-3.5 sm:p-4 rounded-xl border transition-all",
                      paymentMethod === "CASH"
                        ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <Banknote className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="font-bold text-xs sm:text-sm">Cash Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod("CARD")}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-2 p-3.5 sm:p-4 rounded-xl border transition-all",
                      paymentMethod === "CARD"
                        ? "border-emerald-500 bg-emerald-600 text-white font-bold"
                        : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                    )}
                  >
                    <CreditCard className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="font-bold text-xs sm:text-sm">Card Payment</span>
                  </button>
                </div>
              </div>

              {/* Cash Tendered Input & Live Change (Cash Mode Only) */}
              {paymentMethod === "CASH" ? (
                <div className="space-y-4 animate-in fade-in">
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-zinc-300 flex items-center gap-1.5">
                        <Coins className="w-4 h-4 text-emerald-400" /> 2. Cash Received from Customer (₱)
                      </label>
                      <button
                        type="button"
                        onClick={handleExactCash}
                        className="text-[11px] font-bold text-zinc-400 hover:text-white underline"
                      >
                        Exact Amount
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
                        placeholder="0.00"
                        className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-10 pr-4 font-mono text-xl font-bold text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  {/* Quick Cash Buttons */}
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 block mb-2">
                      Quick Cash Presets:
                    </span>
                    <div className="grid grid-cols-3 gap-2">
                      {[100, 200, 500, 1000, 2000].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => handleQuickCash(amt)}
                          className="py-2 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono font-bold text-zinc-300 hover:text-white transition-all"
                        >
                          ₱{amt}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={handleExactCash}
                        className="py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-xs font-mono font-bold text-zinc-200 hover:text-white transition-all"
                      >
                        Exact (₱{netTotalDue.toFixed(0)})
                      </button>
                    </div>
                  </div>

                  {/* Live Cash Change Calculation */}
                  <div className={clsx(
                    "p-4 rounded-xl border transition-all duration-300 flex justify-between items-center",
                    isCashInsufficient
                      ? "bg-zinc-900 border-zinc-800 text-zinc-300"
                      : "bg-zinc-900 border-zinc-800 text-emerald-400"
                  )}>
                    <div>
                      <span className="text-xs font-bold uppercase tracking-wider block">
                        {isCashInsufficient ? "Insufficient Cash" : "Cash Change Due"}
                      </span>
                      <span className="text-[11px] opacity-80">
                        {isCashInsufficient ? `Need ₱${(netTotalDue - cashReceivedVal).toFixed(2)} more` : "Give to customer"}
                      </span>
                    </div>

                    <div className="text-2xl sm:text-3xl font-black font-mono">
                      ₱{cashChange.toFixed(2)}
                    </div>
                  </div>

                </div>
              ) : (
                /* Card Mode Information */
                <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-900 text-xs text-zinc-400 space-y-1.5">
                  <span className="font-bold text-zinc-200 block flex items-center gap-1.5">
                    <CreditCard className="w-4 h-4 text-emerald-400" /> Card Settlement Selected
                  </span>
                  <p>Payment will be processed for the exact net total amount of <strong className="text-white font-mono">₱{netTotalDue.toFixed(2)}</strong> via card terminal.</p>
                </div>
              )}

              {/* Processing Error Notice */}
              {processingError && (
                <div className="p-3 bg-zinc-900 border border-zinc-800 rounded-xl text-xs text-zinc-300 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 text-zinc-400" />
                  <span>{processingError}</span>
                </div>
              )}

              {/* Confirm & Complete Action Button (Inline at Bottom, scrolls naturally) */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={handleExecutePayment}
                  data-testid="record-payment-button"
                  disabled={isCheckingOut || cart.length === 0 || isCashInsufficient}
                  className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm sm:text-base font-black rounded-xl transition-all flex items-center justify-center gap-2 disabled:bg-zinc-900 disabled:border-zinc-800 disabled:text-zinc-600 disabled:cursor-not-allowed active:scale-95 border border-emerald-500"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Payment...</span>
                    </>
                  ) : (
                    <>
                      <span>Record Payment (₱{netTotalDue.toFixed(2)})</span>
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
        <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    }>
      <POSCheckoutContent />
    </Suspense>
  );
}
