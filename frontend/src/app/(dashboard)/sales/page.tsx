"use client";

import { useEffect, useState } from "react";
import { 
  Receipt, 
  Search, 
  Filter, 
  Calendar, 
  CheckCircle, 
  XCircle, 
  Eye, 
  Ban, 
  ShieldAlert, 
  User, 
  DollarSign, 
  CreditCard, 
  X,
  FileText,
  Wrench,
  UserCheck,
  ExternalLink,
  History,
  ShieldCheck
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";
import { UserRole } from "@/lib/permissions";
import { useRouter } from "next/navigation";

export interface TransactionRecord {
  id: string;
  invoice_no: string;
  customer_name?: string;
  cashier_name?: string;
  mechanic_name?: string;
  motorcycle_name?: string;
  subtotal: number;
  total: number;
  amount_paid: number;
  status: "COMPLETED" | "PENDING" | "VOIDED";
  payment_method: string;
  created_at: string;
  item_count: number;
  items?: {
    name: string;
    qty: number;
    price: number;
  }[];
}

const MOCK_TRANSACTIONS: TransactionRecord[] = [
  {
    id: "tx-1",
    invoice_no: "INV-A901",
    customer_name: "John Doe",
    cashier_name: "Cashier Sarah Connor",
    mechanic_name: "Mike Smith",
    motorcycle_name: "Yamaha MT-07 (2023)",
    subtotal: 165.99,
    total: 165.99,
    amount_paid: 170.00,
    status: "COMPLETED",
    payment_method: "CASH",
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
    item_count: 2,
    items: [
      { name: "Repair Labor Fee (JO-A1B2)", qty: 1, price: 150.00 },
      { name: "Synthetic Motor Oil 10W-40", qty: 1, price: 15.99 },
    ],
  },
  {
    id: "tx-2",
    invoice_no: "INV-B442",
    customer_name: "Jane Roe",
    cashier_name: "Cashier Sarah Connor",
    mechanic_name: "Dave Johnson",
    motorcycle_name: "Honda Click 125i (2022)",
    subtotal: 38.50,
    total: 38.50,
    amount_paid: 40.00,
    status: "COMPLETED",
    payment_method: "CARD",
    created_at: new Date(Date.now() - 5 * 3600000).toISOString(),
    item_count: 2,
    items: [
      { name: "Oil & Filter Change Service", qty: 1, price: 30.00 },
      { name: "Premium Oil Filter", qty: 1, price: 8.50 },
    ],
  },
  {
    id: "tx-3",
    invoice_no: "INV-C771",
    customer_name: "Bob Lee",
    cashier_name: "Admin User",
    mechanic_name: "Alex Rivera",
    motorcycle_name: "Kawasaki Ninja 400 (2023)",
    subtotal: 120.00,
    total: 120.00,
    amount_paid: 120.00,
    status: "VOIDED",
    payment_method: "CASH",
    created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
    item_count: 1,
    items: [
      { name: "Front Tire 120/70-17", qty: 1, price: 120.00 },
    ],
  },
];

export default function SalesManagementPage() {
  const router = useRouter();
  const [transactions, setTransactions] = useState<TransactionRecord[]>(MOCK_TRANSACTIONS);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "COMPLETED" | "VOIDED">("ALL");
  const [role, setRole] = useState<UserRole | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const userRole = (localStorage.getItem("user_role") as UserRole) || "cashier";
    setRole(userRole);
    fetchTransactions();
  }, []);

  const fetchTransactions = async () => {
    let list: TransactionRecord[] = MOCK_TRANSACTIONS;
    try {
      const res = await apiClient.get<TransactionRecord[]>("/sales/transactions");
      if (Array.isArray(res.data) && res.data.length > 0) {
        list = res.data;
      }
    } catch (e) {
      // Use fallback
    }

    const storedLogs = localStorage.getItem("motoshop_sales_logs");
    if (storedLogs) {
      try {
        const localList = JSON.parse(storedLogs);
        if (Array.isArray(localList) && localList.length > 0) {
          const existingIds = new Set(list.map((t) => t.id));
          const combined = [...localList.filter((t: any) => !existingIds.has(t.id)), ...list];
          setTransactions(combined);
          return;
        }
      } catch (e) {
        // ignore
      }
    }
    setTransactions(list);
  };

  const handleVoidTransaction = async (txId: string) => {
    if (role === "cashier") return; // View only for cashier

    setIsSubmitting(true);
    try {
      await apiClient.post(`/sales/transactions/${txId}/void`);
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "VOIDED" } : t))
      );
    } catch (e) {
      setTransactions((prev) =>
        prev.map((t) => (t.id === txId ? { ...t, status: "VOIDED" } : t))
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    const matchesSearch =
      t.invoice_no.toLowerCase().includes(search.toLowerCase()) ||
      (t.customer_name && t.customer_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.cashier_name && t.cashier_name.toLowerCase().includes(search.toLowerCase())) ||
      (t.mechanic_name && t.mechanic_name.toLowerCase().includes(search.toLowerCase())) ||
      t.payment_method.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const isCashierReadOnly = role === "cashier";

  return (
    <div className="h-screen bg-zinc-950 p-8 flex flex-col overflow-hidden font-sans">
      
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <Receipt className="w-8 h-8 text-cyan-400" />
            Sales Management & Invoice Receipts
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Inspect receipts featuring Cashier Name, Mechanic Name, and linked full history logs.
          </p>
        </div>

        {/* Role Badge indicator */}
        <div className="flex items-center gap-3">
          {isCashierReadOnly ? (
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" />
              Cashier View-Only Mode
            </span>
          ) : (
            <span className="px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Full Manager/Admin Control
            </span>
          )}
        </div>
      </div>

      {/* Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex bg-zinc-900/80 p-1.5 rounded-2xl border border-white/10 w-fit">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              statusFilter === "ALL"
                ? "bg-zinc-800 text-white shadow-md border border-white/10"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <span>All Invoices</span>
            <span className="bg-zinc-950 px-2 py-0.5 rounded-full text-[10px] text-zinc-400">
              {transactions.length}
            </span>
          </button>

          <button
            onClick={() => setStatusFilter("COMPLETED")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              statusFilter === "COMPLETED"
                ? "bg-emerald-500/20 text-emerald-300 shadow-md border border-emerald-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            <span>Completed</span>
          </button>

          <button
            onClick={() => setStatusFilter("VOIDED")}
            className={clsx(
              "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
              statusFilter === "VOIDED"
                ? "bg-red-500/20 text-red-300 shadow-md border border-red-500/30"
                : "text-zinc-400 hover:text-white"
            )}
          >
            <Ban className="w-3.5 h-3.5" />
            <span>Voided</span>
          </button>
        </div>

        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Invoice #, Cashier, Mechanic..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>

      {/* Transactions Table */}
      <div className="flex-1 overflow-hidden bg-zinc-900/40 border border-white/10 rounded-2xl flex flex-col backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-zinc-300 whitespace-nowrap">
            <thead className="text-xs uppercase bg-zinc-900/90 text-zinc-400 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md">
              <tr>
                <th className="px-6 py-4 font-semibold">Invoice No</th>
                <th className="px-6 py-4 font-semibold">Date & Time</th>
                <th className="px-6 py-4 font-semibold">Customer / Motorcycle</th>
                <th className="px-6 py-4 font-semibold">Cashier Name</th>
                <th className="px-6 py-4 font-semibold">Mechanic Name</th>
                <th className="px-6 py-4 font-semibold text-right">Total Amount</th>
                <th className="px-6 py-4 font-semibold text-center">Status</th>
                <th className="px-6 py-4 font-semibold text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-zinc-500">
                    No sales transactions found.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isCompleted = tx.status === "COMPLETED";

                  return (
                    <tr key={tx.id} className="hover:bg-white/[0.02] transition-colors group">
                      <td className="px-6 py-4 font-mono font-bold text-cyan-400">{tx.invoice_no}</td>

                      <td className="px-6 py-4 text-xs text-zinc-400">
                        {new Date(tx.created_at).toLocaleString()}
                      </td>

                      <td className="px-6 py-4">
                        <div className="font-semibold text-zinc-100">{tx.customer_name || "Walk-in Customer"}</div>
                        {tx.motorcycle_name && (
                          <div className="text-xs text-zinc-500 font-mono mt-0.5">{tx.motorcycle_name}</div>
                        )}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-emerald-400">
                        {tx.cashier_name || "Cashier User"}
                      </td>

                      <td className="px-6 py-4 text-xs font-medium text-purple-400">
                        {tx.mechanic_name || "N/A"}
                      </td>

                      <td className="px-6 py-4 text-right font-mono font-bold text-white text-base">
                        ₱{tx.total.toFixed(2)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        {isCompleted ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                            <CheckCircle className="w-3.5 h-3.5" />
                            Completed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500/10 text-red-400 border border-red-500/20">
                            <Ban className="w-3.5 h-3.5" />
                            Voided
                          </span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          onClick={() => router.push(`/sales/receipt?id=${encodeURIComponent(tx.id)}`)}
                          className="px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-cyan-600 text-zinc-200 hover:text-white transition-colors text-xs font-semibold flex items-center gap-1.5 mx-auto"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/10 bg-zinc-950/80 flex items-center justify-between text-xs text-zinc-400">
          <div>Displaying {filteredTransactions.length} transaction record(s)</div>
          <div className="flex gap-4 items-center text-zinc-500">
            <span>• Accessible by Admin, Manager, and Cashier (View-only)</span>
          </div>
        </div>
      </div>
    </div>
  );
}
