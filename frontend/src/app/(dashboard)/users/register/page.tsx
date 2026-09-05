"use client";

import { useState } from "react";
import { apiClient } from "@/lib/api-client";
import { 
  UserPlus, 
  User, 
  Mail, 
  Lock, 
  ShieldCheck, 
  ArrowLeft, 
  CheckCircle2, 
  ShieldAlert, 
  Sparkles,
  Percent,
  DollarSign
} from "lucide-react";
import Link from "next/link";
import { saveStaffCompensationToDB } from "@/lib/compensation";

export default function RegisterUserPage() {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState("cashier");
  const [password, setPassword] = useState("Welcome123!");
  const [commissionRate, setCommissionRate] = useState<number>(40);
  const [baseWage, setBaseWage] = useState<number>(650);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    const commRateToSave = role === "mechanic" ? commissionRate : undefined;
    const baseWageToSave = role === "cashier" ? baseWage : undefined;

    try {
      const response = await apiClient.post("/auth/users/register", {
        first_name: firstName,
        last_name: lastName,
        email,
        role,
        password,
        commission_rate: commRateToSave,
        base_wage: baseWageToSave,
      });

      // Update compensation store cache
      if (response.data && response.data.id) {
        await saveStaffCompensationToDB(
          {
            id: response.data.id,
            first_name: firstName,
            last_name: lastName,
            email,
            role,
          },
          commRateToSave,
          baseWageToSave
        );
      }

      setSuccess(`User '${firstName} ${lastName}' (${email}) registered successfully and saved to database as ${role.toUpperCase()}!`);
      setFirstName("");
      setLastName("");
      setEmail("");
      setRole("cashier");
      setCommissionRate(40);
      setBaseWage(650);
    } catch (err: any) {
      console.error("Register user error:", err);
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        setError(detail[0].msg || "Validation error");
      } else {
        setError("Failed to register user. Please check form inputs.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 p-8 font-sans text-zinc-100 w-full overflow-y-auto">
      <div className="max-w-4xl space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3">
            <UserPlus className="w-8 h-8 text-cyan-400" />
            Provision New User Account
          </h1>
          <p className="text-zinc-400 mt-1 text-sm">
            Register a new staff member, assign store roles, and set duty compensation.
          </p>
        </div>

      <div className="flex items-center">
        <Link
          href="/users"
          className="flex items-center gap-2 text-xs font-semibold text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900 border border-white/10 px-3.5 py-2 rounded-xl"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users List</span>
        </Link>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5 animate-in fade-in">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>{error}</div>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5 animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <div>{success}</div>
        </div>
      )}

      {/* Form Container */}
      <div className="bg-zinc-900/60 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Name Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                First Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="John"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Last Name <span className="text-red-400">*</span>
              </label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Doe"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
                />
              </div>
            </div>
          </div>

          {/* Email Address */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Email Address <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="john.doe@versiklo.com"
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              />
            </div>
          </div>

          {/* Role Dropdown */}
          <div>
            <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
              Assign System Role <span className="text-red-400">*</span>
            </label>
            <div className="relative">
              <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <select
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              >
                <option value="cashier">Cashier (POS Checkout & Shift Pay)</option>
                <option value="mechanic">Mechanic (Repair Board & Labor Commission)</option>
                <option value="manager">Manager (Dashboard, Reports & Financials)</option>
                <option value="admin">Admin (Full System, Financials & User Access)</option>
              </select>
            </div>
          </div>

          {/* Contextual Compensation Fields */}
          {role === "mechanic" && (
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-amber-500/20 space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-semibold text-amber-400">
                Assigned Mechanic Commission Rate (%) *
              </label>
              <div className="relative">
                <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.5"
                  required
                  value={commissionRate}
                  onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Percentage of service labor charge earned by the mechanic on completed jobs.
              </p>
            </div>
          )}

          {role === "cashier" && (
            <div className="p-4 rounded-xl bg-zinc-950/80 border border-emerald-500/20 space-y-1.5 animate-in fade-in">
              <label className="block text-xs font-semibold text-emerald-400">
                Daily Shift Wage (₱) *
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-400 select-none">
                  ₱
                </span>
                <input
                  type="number"
                  min="0"
                  step="10"
                  required
                  value={baseWage}
                  onChange={(e) => setBaseWage(parseFloat(e.target.value) || 0)}
                  className="w-full bg-zinc-900 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 font-mono focus:outline-none focus:border-cyan-500"
                />
              </div>
              <p className="text-[11px] text-zinc-500">
                Standard daily pay received per completed cashier shift.
              </p>
            </div>
          )}

          {/* Password (Pre-filled Read-Only) */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-medium text-zinc-400 uppercase tracking-wider">
                Default Temporary Password
              </label>
              <span className="text-[10px] text-cyan-400 bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Secure Default
              </span>
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                readOnly
                disabled
                value={password}
                className="w-full bg-zinc-950/40 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-400 cursor-not-allowed font-mono"
              />
            </div>
            <p className="text-[11px] text-zinc-500 mt-1.5">
              Pre-filled with default value. New users can change their password anytime via the profile menu.
            </p>
          </div>

          {/* Submit Button */}
          <div className="pt-4 flex justify-end">
            <button
              type="submit"
              disabled={isLoading}
              className="px-6 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium rounded-xl shadow-lg shadow-cyan-500/20 transition-all text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  <span>Create Account</span>
                </>
              )}
            </button>
          </div>

        </form>
      </div>
    </div>
  </div>
  );
}
