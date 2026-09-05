"use client";

import { useState, useEffect } from "react";
import { useCheckoutSaga } from "@/hooks/useCheckoutSaga";
import { usePosStore } from "@/lib/store/pos-store";
import { CreditCard, Banknote, Loader2, CheckCircle2, XCircle, X, ArrowRight, ShieldCheck } from "lucide-react";
import clsx from "clsx";

export function CheckoutModal({ 
  disabled,
  cashierName,
  mechanicName,
  customerName,
  onPaymentSuccess
}: { 
  disabled: boolean;
  cashierName?: string;
  mechanicName?: string;
  customerName?: string;
  onPaymentSuccess?: () => void;
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

  const handleOpenModal = () => {
    resetSaga(); // Always clear previous transaction saga state when opening modal
    setIsOpen(true);
  };

  const handleCloseModal = () => {
    setIsOpen(false);
    resetSaga();
  };

  // Handle successful completion
  useEffect(() => {
    if (isSagaComplete) {
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    }
  }, [isSagaComplete, onPaymentSuccess]);

  const handleCheckout = async () => {
    try {
      await initiateCheckout({
        cashier_name: cashierName || localStorage.getItem("user_email") || "Cashier Sarah Connor",
        mechanic_name: mechanicName || "Mike Smith",
        items: cart.map(item => ({
          item_id: item.id,
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
        onClick={handleOpenModal}
        className="w-full py-4 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold rounded-xl shadow-[0_0_20px_-5px_rgba(6,182,212,0.5)] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none flex items-center justify-center gap-2"
      >
        <span>Charge</span>
        <span>₱{total.toFixed(2)}</span>
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div 
            className="absolute inset-0 bg-black/75 backdrop-blur-md transition-opacity" 
            onClick={() => !isPolling && handleCloseModal()}
          />
          
          <div className="bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl w-full max-w-md my-auto overflow-hidden relative z-10 animate-in fade-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="p-6 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between">
              <div>
                <h3 className="text-xl font-bold text-white flex items-center gap-2">
                  <CreditCard className="w-5 h-5 text-cyan-400" /> Complete Checkout Payment
                </h3>
                <p className="text-zinc-400 text-xs mt-0.5">
                  Customer: <span className="text-cyan-300 font-semibold">{customerName || "Walk-in Customer"}</span>
                </p>
              </div>

              {!isPolling && (
                <button 
                  onClick={handleCloseModal}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {/* Content Body */}
            <div className="p-6 relative min-h-[320px] flex flex-col justify-between">
              
              {/* Overlay during processing / completion / failure */}
              {(isPolling || isSagaComplete || isSagaFailed) ? (
                <div className="flex-1 flex flex-col items-center justify-center py-4 animate-in fade-in">
                  
                  {isPolling && (
                    <>
                      <Loader2 className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">Processing Transaction...</h4>
                      <p className="text-zinc-400 text-xs text-center max-w-xs">
                        Verifying stock and finalizing payment. Please wait.
                      </p>
                    </>
                  )}

                  {isSagaComplete && (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-8 h-8 text-green-500" />
                      </div>
                      <h4 className="text-xl font-bold text-white mb-1">Payment Successful!</h4>
                      <p className="text-zinc-400 text-xs mb-4">Invoice: <span className="font-mono text-cyan-400 font-bold">{transactionData?.invoice_no}</span></p>

                      <div className="bg-zinc-950/80 p-4 rounded-xl border border-white/10 text-xs w-full mb-6 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Total Paid:</span>
                          <span className="font-mono text-emerald-400 font-bold text-sm">₱{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Cashier:</span>
                          <span className="text-zinc-200 font-semibold">{cashierName || "Cashier Sarah Connor"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-zinc-400">Assigned Mechanic:</span>
                          <span className="text-purple-300 font-semibold">{mechanicName || "Mike Smith"}</span>
                        </div>
                        <div className="flex justify-between border-t border-white/5 pt-1.5">
                          <span className="text-zinc-400">Payment Method:</span>
                          <span className="font-mono font-bold text-cyan-300 uppercase">{paymentMethod}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleCloseModal}
                        className="w-full py-3.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 rounded-xl text-white font-bold transition-all shadow-lg flex items-center justify-center gap-2"
                      >
                        <span>Done / Start New Sale</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isSagaFailed && (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mb-3">
                        <XCircle className="w-8 h-8 text-red-500" />
                      </div>
                      <h4 className="text-lg font-semibold text-white mb-2">Transaction Voided</h4>
                      <p className="text-zinc-400 text-xs text-center mb-6">
                        Insufficient stock or system error.
                      </p>
                      <button 
                        onClick={handleCloseModal}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-500 rounded-xl text-white font-bold transition-colors"
                      >
                        Go Back
                      </button>
                    </div>
                  )}

                </div>
              ) : (
                /* Normal Active Checkout Form */
                <>
                  <div>
                    <div className="text-center mb-6 bg-zinc-950/60 p-4 rounded-2xl border border-white/5">
                      <span className="text-xs text-zinc-400 font-semibold uppercase tracking-wider block mb-1">Total Amount Due</span>
                      <div className="text-4xl font-black text-white">₱{total.toFixed(2)}</div>
                    </div>

                    {/* Select Payment Method */}
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-zinc-400 mb-2 uppercase tracking-wider">
                        Select Payment Method
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => setPaymentMethod("CASH")}
                          className={clsx(
                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                            paymentMethod === "CASH" 
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/20" 
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
                              ? "border-cyan-500 bg-cyan-500/10 text-cyan-300 shadow-md shadow-cyan-500/20" 
                              : "border-white/5 bg-zinc-950 text-zinc-400 hover:border-white/20 hover:bg-zinc-800"
                          )}
                        >
                          <CreditCard className="w-6 h-6" />
                          <span className="font-bold text-sm">Card Payment</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Confirm & Complete Action Button */}
                  <button 
                    type="button"
                    onClick={handleCheckout}
                    disabled={isPolling}
                    className="w-full py-4 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-blue-500 text-white text-base font-bold rounded-2xl shadow-[0_0_25px_-5px_rgba(6,182,212,0.5)] transition-all flex items-center justify-center gap-2 active:scale-95"
                  >
                    <span>Confirm & Complete Payment (₱{total.toFixed(2)})</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}

            </div>
            
          </div>
        </div>
      )}
    </>
  );
}
