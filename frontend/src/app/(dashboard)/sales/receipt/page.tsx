"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  Receipt, 
  ArrowLeft, 
  Printer, 
  CheckCircle, 
  Ban, 
  UserCheck, 
  Wrench, 
  ShieldCheck, 
  History, 
  ShoppingBag, 
  CreditCard, 
  Banknote, 
  AlertCircle,
  Copy,
  Check,
  Percent
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/lib/permissions";
import { extractInvoiceLaborAndCommission, fetchStaffCompensationFromDB } from "@/lib/compensation";

interface TransactionRecord {
  id: string;
  invoice_no: string;
  created_at: string;
  customer_name?: string;
  motorcycle_name?: string;
  cashier_name?: string;
  mechanic_name?: string;
  subtotal: number;
  discount_percentage?: number;
  discount_amount?: number;
  total: number;
  amount_paid: number;
  cash_received?: number;
  cash_change?: number;
  payment_method?: string;
  status: "COMPLETED" | "VOIDED";
  items?: { name: string; qty: number; price: number }[];
}

function SalesReceiptContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const txId = searchParams.get("id") || "";

  const [transaction, setTransaction] = useState<TransactionRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>("cashier");
  const [isVoiding, setIsVoiding] = useState(false);
  const [copiedInvoice, setCopiedInvoice] = useState(false);
  const [mechanicRates, setMechanicRates] = useState<Record<string, number>>({});

  const laborAnalysis = useMemo(() => {
    if (!transaction) return null;
    return extractInvoiceLaborAndCommission(transaction.items, transaction.mechanic_name, mechanicRates);
  }, [transaction, mechanicRates]);

  useEffect(() => {
    const role = (localStorage.getItem("user_role") as UserRole) || "cashier";
    setUserRole(role);
    fetchStaffCompensationFromDB().then((data) => {
      setMechanicRates(data.mechanicRates);
    });
    loadTransaction();
  }, [txId]);

  const loadTransaction = async () => {
    setLoading(true);
    let matchedTx: TransactionRecord | null = null;

    // 1. Check direct API lookup if txId is present
    if (txId) {
      try {
        const res = await apiClient.get<TransactionRecord>(`/sales/transactions/${txId}`);
        if (res.data && res.data.invoice_no) {
          matchedTx = res.data;
        }
      } catch (e) {
        // Continue to general check
      }
    }

    // 2. Check general transactions API
    if (!matchedTx) {
      try {
        const res = await apiClient.get<TransactionRecord[]>("/sales/transactions");
        if (Array.isArray(res.data)) {
          const found = res.data.find((t) => t.id === txId || t.invoice_no === txId);
          if (found) {
            matchedTx = found;
          } else if (!txId && res.data.length > 0) {
            matchedTx = res.data[0];
          }
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Check localStorage sales logs if offline
    if (!matchedTx) {
      const stored = localStorage.getItem("motoshop_sales_logs");
      if (stored) {
        try {
          const list: TransactionRecord[] = JSON.parse(stored);
          const found = list.find((t) => t.id === txId || t.invoice_no === txId);
          if (found) matchedTx = found;
        } catch (e) {
          // ignore
        }
      }
    }

    setTransaction(matchedTx);
    setLoading(false);
  };

  const handleVoidTransaction = async () => {
    if (!transaction || userRole === "cashier" || transaction.status === "VOIDED") return;

    setIsVoiding(true);
    try {
      await apiClient.post(`/sales/transactions/${transaction.id}/void`);
    } catch (e) {
      // ignore network error
    }

    const updatedTx = { ...transaction, status: "VOIDED" as const };
    setTransaction(updatedTx);

    // Sync to local sales logs
    const stored = localStorage.getItem("motoshop_sales_logs");
    if (stored) {
      try {
        const list: TransactionRecord[] = JSON.parse(stored);
        const updatedList = list.map((t) => (t.id === transaction.id ? { ...t, status: "VOIDED" as const } : t));
        localStorage.setItem("motoshop_sales_logs", JSON.stringify(updatedList));
      } catch (e) {
        // ignore
      }
    }
    setIsVoiding(false);
  };

  const handleCopyInvoice = () => {
    if (!transaction) return;
    navigator.clipboard.writeText(transaction.invoice_no);
    setCopiedInvoice(true);
    setTimeout(() => setCopiedInvoice(false), 2000);
  };

  const isCashierReadOnly = userRole === "cashier";

  if (loading) {
    return (
      <div className="h-screen bg-zinc-950 flex flex-col items-center justify-center font-sans text-zinc-400">
        <div className="w-10 h-10 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm">Loading invoice receipt details...</p>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="h-screen bg-zinc-950 p-8 flex flex-col items-center justify-center font-sans text-zinc-100">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <h2 className="text-xl font-bold mb-1">Receipt Not Found</h2>
        <p className="text-xs text-zinc-400 mb-6">Could not find a valid transaction matching the requested ID.</p>
        <button
          onClick={() => router.push("/sales")}
          className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-white text-xs font-semibold flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sales Management</span>
        </button>
      </div>
    );
  }

  const isCompleted = transaction.status === "COMPLETED";

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans p-8 overflow-y-auto w-full">
      
      {/* Top Action & Navigation Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <button
          onClick={() => router.push("/sales")}
          className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold w-fit shadow-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Sales Management</span>
        </button>

        <div className="flex items-center gap-3">
          <button
            onClick={handleCopyInvoice}
            className="px-4 py-2.5 rounded-xl bg-zinc-900/90 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-md"
            title="Copy Invoice Number"
          >
            {copiedInvoice ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-cyan-400" />}
            <span>{copiedInvoice ? "Copied" : "Copy Invoice #"}</span>
          </button>

          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center gap-2"
          >
            <Printer className="w-4 h-4" />
            <span>Print Receipt</span>
          </button>
        </div>
      </div>

      {/* Main Official Receipt Document Container */}
      <div className="w-full bg-zinc-900/60 border border-white/10 rounded-3xl p-8 md:p-10 shadow-2xl backdrop-blur-xl relative overflow-hidden space-y-8">
        
        {/* Decorative Watermark / Accent Glow */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Receipt Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-white/10">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-md shadow-cyan-500/10">
                <Receipt className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-2xl font-black tracking-wide text-white">Sales Receipt</h1>
                <p className="text-xs text-zinc-400">Versiklo — Motorcycle Shop Management</p>
              </div>
            </div>
          </div>

          <div className="flex flex-col md:items-end gap-1.5">
            <div className="flex items-center gap-2">
              <span className="text-xs text-zinc-400">Invoice:</span>
              <span className="font-mono text-base font-black text-cyan-400">{transaction.invoice_no}</span>
            </div>
            
            <div>
              {isCompleted ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle className="w-3.5 h-3.5" />
                  STATUS: COMPLETED (PAID)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-red-500/20 text-red-400 border border-red-500/30">
                  <Ban className="w-3.5 h-3.5" />
                  STATUS: VOIDED
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Customer & Staff Details Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Left Column: Customer & Motorcycle Details */}
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-white/5 pb-2">
              Customer & Bike Profile
            </span>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Customer Name:</span>
              <span className="font-bold text-white text-sm">{transaction.customer_name || "Walk-in Customer"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Bike Model:</span>
              <span className="font-mono font-semibold text-cyan-300">{transaction.motorcycle_name || "General Bike"}</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Payment Method:</span>
              <span className="font-mono font-bold text-zinc-200 uppercase flex items-center gap-1.5">
                {transaction.payment_method === "CARD" ? <CreditCard className="w-3.5 h-3.5 text-blue-400" /> : <Banknote className="w-3.5 h-3.5 text-emerald-400" />}
                {transaction.payment_method || "CASH"}
              </span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-zinc-500">Transaction Date:</span>
              <span className="font-mono text-zinc-300">
                {new Date(transaction.created_at).toLocaleDateString()} {new Date(transaction.created_at).toLocaleTimeString()}
              </span>
            </div>
          </div>

          {/* Right Column: Staff Badges & Linked Logs */}
          <div className="p-5 rounded-2xl bg-zinc-950/80 border border-white/5 space-y-3 text-xs">
            <span className="text-[10px] font-bold text-zinc-400 uppercase tracking-wider block border-b border-white/5 pb-2">
              Staff Attribution & Linked Logs
            </span>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <span className="text-[10px] text-emerald-400 font-bold uppercase block mb-0.5 flex items-center gap-1">
                  <UserCheck className="w-3 h-3" /> Cashier
                </span>
                <span className="font-bold text-white text-xs truncate block">
                  {transaction.cashier_name || "Cashier User"}
                </span>
              </div>

              <div className="p-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20">
                <span className="text-[10px] text-purple-400 font-bold uppercase block mb-0.5 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Mechanic
                </span>
                <span className="font-bold text-white text-xs truncate block">
                  {transaction.mechanic_name || "N/A"}
                </span>
              </div>
            </div>

            {/* Quick Links to Audit Logs */}
            <div className="pt-2 grid grid-cols-3 gap-2">
              <button
                onClick={() => router.push(`/audit-logs?search=${encodeURIComponent(transaction.cashier_name || "")}`)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-left transition-all"
                title="View Cashier Audit Log"
              >
                <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Audit
                </span>
                <span className="text-[9px] text-zinc-400 block truncate">Cashier Log</span>
              </button>

              <button
                onClick={() => router.push(`/repairs/history?mechanic=${encodeURIComponent(transaction.mechanic_name || "")}`)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-left transition-all"
                title="View Mechanic Service History"
              >
                <span className="text-[10px] font-semibold text-purple-400 flex items-center gap-1">
                  <Wrench className="w-3 h-3" /> Service
                </span>
                <span className="text-[9px] text-zinc-400 block truncate">Repairs Log</span>
              </button>

              <button
                onClick={() => router.push(`/repairs/history?customer=${encodeURIComponent(transaction.customer_name || "")}`)}
                className="p-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-white/5 text-left transition-all"
                title="View Customer Lifetime History"
              >
                <span className="text-[10px] font-semibold text-cyan-400 flex items-center gap-1">
                  <History className="w-3 h-3" /> History
                </span>
                <span className="text-[9px] text-zinc-400 block truncate">Customer Log</span>
              </button>
            </div>
          </div>
        </div>

        {/* Itemized Purchased / Repair Breakdown Table */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-cyan-400" />
              Itemized Parts & Services ({transaction.items?.length || 1})
            </h3>
          </div>

          <div className="bg-zinc-950 rounded-2xl border border-white/10 overflow-hidden">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-white/10 bg-zinc-900/60 text-zinc-400 font-semibold uppercase text-xs">
                  <th className="p-4">Item Description / Service</th>
                  <th className="p-4 text-center">Quantity</th>
                  <th className="p-4 text-right">Unit Price</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 text-zinc-300">
                {(transaction.items || [
                  { name: "Repair Labor Charge", qty: 1, price: transaction.total }
                ]).map((item, idx) => (
                  <tr key={idx} className="hover:bg-zinc-900/30 transition-colors">
                    <td className="p-4">
                      <span className="font-bold text-zinc-100 block">{item.name}</span>
                    </td>
                    <td className="p-4 text-center font-mono text-xs text-zinc-400">{item.qty}</td>
                    <td className="p-4 text-right font-mono text-xs text-zinc-400">₱{item.price.toFixed(2)}</td>
                    <td className="p-4 text-right font-mono font-bold text-white">
                      ₱{(item.qty * item.price).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Financial & Settlement Breakdown */}
        <div className="p-6 bg-zinc-950 rounded-2xl border border-white/10 space-y-3 text-sm">
          <div className="flex justify-between items-center text-zinc-400">
            <span>Gross Subtotal:</span>
            <span className="font-mono text-zinc-200 text-base">₱{transaction.subtotal.toFixed(2)}</span>
          </div>

          {(transaction.discount_percentage || 0) > 0 ? (
            <div className="flex justify-between items-center text-amber-400">
              <span>Discount ({transaction.discount_percentage}%):</span>
              <span className="font-mono font-semibold">-₱{(transaction.discount_amount || 0).toFixed(2)}</span>
            </div>
          ) : (
            <div className="flex justify-between items-center text-zinc-500 text-xs">
              <span>Discount (0%):</span>
              <span className="font-mono">₱0.00</span>
            </div>
          )}

          <div className="flex justify-between items-center text-base font-bold text-white pt-2 border-t border-white/5">
            <span>Net Total Charged:</span>
            <span className="font-mono text-cyan-400 text-xl font-black">₱{transaction.total.toFixed(2)}</span>
          </div>

          <div className="flex justify-between items-center text-zinc-300">
            <span>Amount Paid:</span>
            <span className="font-mono text-emerald-400 font-bold">₱{transaction.amount_paid.toFixed(2)}</span>
          </div>

          {transaction.payment_method === "CASH" && (
            <>
              <div className="flex justify-between items-center text-zinc-400 text-xs pt-1 border-t border-white/5">
                <span>Cash Received:</span>
                <span className="font-mono text-zinc-200">₱{(transaction.cash_received || transaction.amount_paid).toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center text-cyan-400 text-sm font-bold">
                <span>Cash Change Returned:</span>
                <span className="font-mono">₱{(transaction.cash_change || 0).toFixed(2)}</span>
              </div>
            </>
          )}
        </div>

        {/* Labor Commission Deduction & Net Shop Labor Card */}
        {laborAnalysis && laborAnalysis.grossLabor > 0 && (
          <div className="p-5 bg-zinc-950 rounded-2xl border border-amber-500/20 space-y-2 text-xs">
            <div className="flex items-center justify-between border-b border-white/5 pb-2">
              <span className="font-bold text-amber-400 uppercase tracking-wider text-[10px] flex items-center gap-1.5">
                <Wrench className="w-3.5 h-3.5 text-amber-400" />
                Labor Commission Settlement (Invoice Deduction)
              </span>
              <span className="font-mono text-zinc-400 text-[11px]">
                Assigned: <span className="text-white font-semibold">{laborAnalysis.mechanicName}</span> (@{laborAnalysis.commissionRate}% Commission - Determined by Mechanic Profile)
              </span>
            </div>
            <div className="flex justify-between items-center text-zinc-300">
              <span>Gross Labor Charged to Customer:</span>
              <span className="font-mono text-zinc-100 font-semibold">₱{laborAnalysis.grossLabor.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-amber-400">
              <span>Mechanic Labor Commission Deducted ({laborAnalysis.commissionRate}%):</span>
              <span className="font-mono font-bold">-₱{laborAnalysis.commissionDeduction.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-emerald-400 font-bold pt-1.5 border-t border-white/5 text-sm">
              <span>Net Shop Labor Retained:</span>
              <span className="font-mono font-black text-base">₱{laborAnalysis.netShopLabor.toFixed(2)}</span>
            </div>
          </div>
        )}

        {/* Bottom Actions Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-4 border-t border-white/10">
          <div>
            {!isCashierReadOnly && isCompleted ? (
              <button
                onClick={handleVoidTransaction}
                disabled={isVoiding}
                className="px-4 py-2.5 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-bold transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Ban className="w-4 h-4" />
                <span>{isVoiding ? "Voiding Invoice..." : "Void Transaction"}</span>
              </button>
            ) : (
              <span className="text-[11px] text-zinc-500 italic">
                {isCashierReadOnly ? "Voiding restricted for Cashier role" : "Invoice is Voided"}
              </span>
            )}
          </div>

          <button
            onClick={() => router.push("/sales")}
            className="px-6 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white font-bold text-xs transition-colors flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Invoices</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default function SalesReceiptPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-zinc-950 flex items-center justify-center text-zinc-400 font-sans text-sm">
        Loading receipt...
      </div>
    }>
      <SalesReceiptContent />
    </Suspense>
  );
}
