"use client";

import { useState, useEffect } from "react";
import { useCheckoutSaga } from "@/hooks/useCheckoutSaga";
import { usePosStore } from "@/lib/store/pos-store";
import { CreditCard, Banknote, Loader2, CheckCircle2, XCircle } from "lucide-react";
import clsx from "clsx";

export function CheckoutModal({ 
  disabled,
  cashierName,
  mechanicName,
  customerName
}: { 
  disabled: boolean;
  cashierName?: string;
  mechanicName?: string;
  customerName?: string;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  
  const { cart, getTotals, clearCart } = usePosStore();
  const { total } = getTotals();
  
  const { 
    initiateCheckout, 
    isCheckingOut, 
    sagaStatus, 
    isSagaComplete, 
    isSagaFailed,
    resetSaga,
    transactionData
  } = useCheckoutSaga();

  // Reset modal state when closed
  useEffect(() => {
    if (!isOpen) {
      setTimeout(() => resetSaga(), 300); // Wait for transition
    }
  }, [isOpen, resetSaga]);

  // Handle successful completion
  useEffect(() => {
    if (isSagaComplete) {
      setTimeout(() => {
        clearCart();
      }, 1500); // Let them see success state before clearing
    }
  }, [isSagaComplete, clearCart]);

  const handleCheckout = async () => {
    try {
      await initiateCheckout({
        cashier_name: cashierName || localStorage.getItem("user_email") || "Cashier Sarah Connor",
        mechanic_name: mechanicName || "Mike Smith",
        items: cart.map(item => ({
          item_id: item.id, // In real app, this should be valid UUID
          qty: item.qty,
          price: item.price
        })),
        amount_paid: total,
        payment_method: paymentMethod
      });
    } catch (error) {
      console.error("Checkout failed to initiate", error);
    }
  };

  const isPolling = sagaStatus === 'PENDING' || isCheckingOut;

  return (
    <>
      <button 
        disabled={disabled}
        onClick={() => setIsOpen(true)}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
      >
        <span>Charge</span>
        <span>${total.toFixed(2)}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
            onClick={() => !isPolling && setIsOpen(false)}
          />
          
          <div className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-white/5 bg-zinc-900/50 text-center">
              <h3 className="text-xl font-bold text-white">Complete Payment</h3>
              <p className="text-zinc-400 text-sm mt-1">Select method and confirm</p>
            </div>

            {/* Content Body */}
            <div className="p-6 relative">
              
              {/* Overlay during processing */}
              {(isPolling || isSagaComplete || isSagaFailed) && (
                <div className="absolute inset-0 z-20 bg-zinc-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 animate-in fade-in">
                  
                  {isPolling && (
                    <>
                      <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">Processing Transaction...</h4>
                      <p className="text-zinc-400 text-sm text-center">
                        Verifying inventory and confirming payment. Please wait.
                      </p>
                    </>
                  )}

                  {isSagaComplete && (
                    <>
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Payment Successful!</h4>
                      <div className="bg-zinc-950/80 p-3 rounded-xl border border-white/10 text-xs w-full mb-4 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Invoice No:</span>
                          <span className="font-mono text-cyan-400 font-bold">{transactionData?.invoice_no}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Cashier:</span>
                          <span className="text-emerald-400 font-semibold">{cashierName || "Cashier Sarah Connor"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Mechanic:</span>
                          <span className="text-purple-400 font-semibold">{mechanicName || "Mike Smith"}</span>
                        </div>
                      </div>
                      <button 
                        onClick={() => setIsOpen(false)}
                        className="w-full py-3 bg-white/10 hover:bg-white/20 rounded-xl text-white font-medium transition-colors"
                      >
                        New Sale
                      </button>
                    </>
                  )}

                  {isSagaFailed && (
                    <>
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-4">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Transaction Voided</h4>
                      <p className="text-zinc-400 text-sm text-center mb-6">
                        Insufficient stock or system error.
                      </p>
                      <button 
                        onClick={() => { resetSaga(); setIsOpen(false); }}
                        className="w-full py-3 bg-red-500 hover:bg-red-600 rounded-xl text-white font-medium transition-colors"
                      >
                        Go Back
                      </button>
                    </>
                  )}

                </div>
              )}

              {/* Normal Content */}
              <div className="mb-8">
                <div className="text-center mb-6">
                  <span className="text-sm text-zinc-400 font-medium uppercase tracking-wider">Amount Due</span>
                  <div className="text-4xl font-black text-white mt-1">${total.toFixed(2)}</div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => setPaymentMethod("CASH")}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      paymentMethod === "CASH" 
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" 
                        : "border-white/5 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:bg-zinc-900"
                    )}
                  >
                    <Banknote className="w-6 h-6" />
                    <span className="font-semibold">Cash</span>
                  </button>
                  <button 
                    onClick={() => setPaymentMethod("CARD")}
                    className={clsx(
                      "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                      paymentMethod === "CARD" 
                        ? "border-cyan-500 bg-cyan-500/10 text-cyan-400" 
                        : "border-white/5 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:bg-zinc-900"
                    )}
                  >
                    <CreditCard className="w-6 h-6" />
                    <span className="font-semibold">Card</span>
                  </button>
                </div>
              </div>
              
              <button 
                onClick={handleCheckout}
                disabled={isPolling}
                className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg transition-all"
              >
                Confirm Payment
              </button>
            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
