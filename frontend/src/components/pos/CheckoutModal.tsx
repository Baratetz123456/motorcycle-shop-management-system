"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useCheckoutSaga } from "@/hooks/useCheckoutSaga";
import { usePosStore } from "@/lib/store/pos-store";
import { CreditCard, Banknote, Loader2, CheckCircle2, XCircle, X, ArrowRight, ShieldCheck } from "lucide-react";
import clsx from "clsx";
import { recordUserAuditLog } from "@/lib/audit";

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
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);
  
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
      recordUserAuditLog("POS_CHECKOUT", "/pos", {
        transactionId: transactionData?.id,
        invoiceNo: transactionData?.invoice_no,
        total: transactionData?.total || total,
        paymentMethod,
        customerName: customerName || "Walk-in Customer",
      });
      if (onPaymentSuccess) {
        onPaymentSuccess();
      }
    }
  }, [isSagaComplete, onPaymentSuccess, transactionData, total, paymentMethod, customerName]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isPolling) {
        handleCloseModal();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isPolling]);

  return (
    <>
      <button
        disabled={disabled}
        onClick={handleOpenModal}
        className="w-full py-4 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl transition-all shadow-sm disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        <span>Charge</span>
        <span>₱{total.toFixed(2)}</span>
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto">
          <div 
            className="fixed inset-0" 
            onClick={() => !isPolling && handleCloseModal()}
          />
          
          <div className="bg-white border border-slate-200 rounded-3xl shadow-2xl w-full max-w-md my-auto overflow-hidden relative z-10 animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-5 border-b border-slate-200 bg-slate-50/80 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm bg-lime-50 border-lime-200 text-lime-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Complete Checkout Payment</h3>
                  <p className="text-xs text-slate-500">
                    Customer: <span className="text-lime-700 font-semibold">{customerName || "Walk-in Customer"}</span>
                  </p>
                </div>
              </div>

              {!isPolling && (
                <button 
                  onClick={handleCloseModal}
                  aria-label="Close modal"
                  className="p-1.5 rounded-xl text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors border border-transparent hover:border-slate-200"
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
                      <Loader2 className="w-12 h-12 text-lime-600 animate-spin mb-4" />
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">Processing Transaction...</h4>
                      <p className="text-slate-500 text-xs text-center max-w-xs">
                        Verifying stock and finalizing payment. Please wait.
                      </p>
                    </>
                  )}

                  {isSagaComplete && (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-16 h-16 bg-emerald-50 rounded-full border border-emerald-200 flex items-center justify-center mb-3">
                        <CheckCircle2 className="w-8 h-8 text-emerald-600" />
                      </div>
                      <h4 className="text-xl font-bold text-slate-900 mb-1">Payment Successful!</h4>
                      <p className="text-slate-500 text-xs mb-4">Invoice: <span className="font-mono text-lime-700 font-bold">{transactionData?.invoice_no}</span></p>

                      <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs w-full mb-6 space-y-2">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Total Paid:</span>
                          <span className="font-mono text-emerald-700 font-bold text-sm">₱{total.toFixed(2)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Cashier:</span>
                          <span className="text-slate-900 font-semibold">{cashierName || "Cashier Sarah Connor"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Assigned Mechanic:</span>
                          <span className="text-purple-700 font-semibold">{mechanicName || "Mike Smith"}</span>
                        </div>
                        <div className="flex justify-between border-t border-slate-200 pt-1.5">
                          <span className="text-slate-500">Payment Method:</span>
                          <span className="font-mono font-bold text-lime-700 uppercase">{paymentMethod}</span>
                        </div>
                      </div>

                      <button 
                        onClick={handleCloseModal}
                        className="w-full py-3.5 bg-lime-500 hover:bg-lime-400 rounded-xl text-zinc-950 font-bold transition-all shadow-sm flex items-center justify-center gap-2"
                      >
                        <span>Done / Start New Sale</span>
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}

                  {isSagaFailed && (
                    <div className="w-full flex flex-col items-center">
                      <div className="w-16 h-16 bg-rose-50 rounded-full border border-rose-200 flex items-center justify-center mb-3">
                        <XCircle className="w-8 h-8 text-rose-600" />
                      </div>
                      <h4 className="text-lg font-semibold text-slate-900 mb-2">Transaction Voided</h4>
                      <p className="text-slate-500 text-xs text-center mb-6">
                        Insufficient stock or system error.
                      </p>
                      <button 
                        onClick={handleCloseModal}
                        className="w-full py-3.5 bg-red-600 hover:bg-red-700 rounded-xl text-white font-bold transition-colors"
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
                    <div className="text-center mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                      <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider block mb-1">Total Amount Due</span>
                      <div className="text-4xl font-black text-slate-900">₱{total.toFixed(2)}</div>
                    </div>

                    {/* Select Payment Method */}
                    <div className="mb-6">
                      <label className="block text-xs font-semibold text-slate-500 mb-2 uppercase tracking-wider">
                        Select Payment Method
                      </label>

                      <div className="grid grid-cols-2 gap-3">
                        <button 
                          type="button"
                          onClick={() => setPaymentMethod("CASH")}
                          className={clsx(
                            "flex flex-col items-center justify-center gap-2 p-4 rounded-2xl border-2 transition-all",
                            paymentMethod === "CASH" 
                              ? "border-lime-500 bg-lime-50 text-lime-900 shadow-sm font-bold" 
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
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
                              ? "border-lime-500 bg-lime-50 text-lime-900 shadow-sm font-bold" 
                              : "border-slate-200 bg-slate-50 text-slate-600 hover:border-slate-300 hover:bg-slate-100"
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
                    className="w-full py-4 bg-lime-500 hover:bg-lime-400 text-zinc-950 text-base font-bold rounded-2xl transition-all shadow-sm flex items-center justify-center gap-2 active:scale-95 disabled:bg-slate-100 disabled:border-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed"
                  >
                    <span>Confirm & Complete Payment (₱{total.toFixed(2)})</span>
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </>
              )}

            </div>
            
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
