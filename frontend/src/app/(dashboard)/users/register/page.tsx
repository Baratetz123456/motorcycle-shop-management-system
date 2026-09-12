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
  DollarSign,
  Briefcase
} from "lucide-react";
import Link from "next/link";
import { saveStaffCompensationToDB } from "@/lib/compensation";
import { recordUserAuditLog } from "@/lib/audit";

const getRoleDutiesSummary = (role: string) => {
  switch (role.toLowerCase()) {
    case "mechanic":
      return {
        title: "Mechanic Duties & Scope",
        badge: "Repair & Service",
        duties: [
          "Access to Repair Board job queue and motorcycle work orders",
          "Update diagnostic notes and mark services as completed",
          "Earns designated commission on service labor charges",
        ],
      };
    case "cashier":
      return {
        title: "Cashier Duties & Scope",
        badge: "POS & Billing",
        duties: [
          "Operate POS terminal, customer lookups, and sales checkout",
          "Issue sales receipts and process transactions",
          "Compensated based on designated daily shift wage",
        ],
      };
    case "manager":
      return {
        title: "Manager Duties & Scope",
        badge: "Operations & Auditing",
        duties: [
          "Full oversight of store sales, repairs, and inventory stock levels",
          "Review financial summary reports and export business analytics",
          "Audit staff transaction records and operational activity logs",
        ],
      };
    case "admin":
      return {
        title: "Administrator Duties & Scope",
        badge: "Complete System Control",
        duties: [
          "Full administrative authority across all store modules and settings",
          "Provision staff user accounts, assign roles, and manage profiles",
          "Authorize inventory modifications and oversee system security",
        ],
      };
    default:
      return {
        title: "Staff Member Scope",
        badge: "Standard Access",
        duties: ["Standard store access according to assigned permissions"],
      };
  }
};

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

  const roleSummary = getRoleDutiesSummary(role);

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
      recordUserAuditLog("CREATE_USER", `/users/${response.data?.id || ""}`, {
        userId: response.data?.id,
        name: `${firstName} ${lastName}`,
        email,
        role,
      });
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
    <div className="min-h-full bg-slate-50 text-slate-900 flex flex-col font-sans p-3 sm:p-4 md:p-6 lg:p-8 overflow-y-auto w-full">
      {/* Top Action & Navigation Bar */}
      <div className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <Link
          href="/settings?tab=users"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 hover:text-slate-900 transition-colors bg-white border border-slate-200 px-4 py-2.5 rounded-xl hover:bg-slate-50 self-start shadow-sm"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Users List</span>
        </Link>

        <div className="flex items-center gap-2 text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-3.5 py-1.5 rounded-xl self-start sm:self-auto shadow-sm">
          <ShieldCheck className="w-4 h-4 text-lime-600" />
          <span>Admin & Manager Workspace</span>
        </div>
      </div>

      {/* Main Form Document Container */}
      <div className="w-full space-y-6">
        {/* Alerts */}
        {error && (
          <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-start gap-2.5 animate-in fade-in shadow-sm">
            <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
            <div>{error}</div>
          </div>
        )}

        {success && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-2.5 animate-in fade-in shadow-sm">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
            <div className="font-medium">{success}</div>
          </div>
        )}

        {/* Document Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-8 md:p-10 shadow-sm space-y-8">
          {/* Top Banner with Icon & Title */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-lime-50 border border-lime-200 flex items-center justify-center text-lime-700 font-bold text-2xl">
                <UserPlus className="w-8 h-8" />
              </div>
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <h1 className="text-2xl md:text-3xl font-black text-slate-900">
                    Provision New User Account
                  </h1>
                  <span className="px-2.5 py-1 text-xs font-bold rounded-lg border uppercase tracking-wider bg-lime-100 text-lime-800 border-lime-300">
                    Staff Onboarding
                  </span>
                </div>
                <p className="text-sm text-slate-500 mt-1">
                  Register a new staff member, assign store roles, and set duty compensation.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-slate-50 p-3 px-5 rounded-2xl border border-slate-200 self-start md:self-auto">
              <span className="text-[10px] text-slate-500 uppercase tracking-wider block font-semibold">Security:</span>
              <span className="font-mono text-xs text-slate-700 font-semibold">RBAC Protected</span>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Two-Column Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
              
              {/* Left Column: Staff Identity & Account Security */}
              <div className="space-y-6">
                {/* Staff Identity */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                    <User className="w-4 h-4 text-lime-600" />
                    Staff Identity & Contact
                  </h3>

                  {/* Name Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                        First Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          placeholder="John"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 shadow-sm"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                        Last Name <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          placeholder="Doe"
                          className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 shadow-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Email Address */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                      Email Address <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="john.doe@versiklo.com"
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500 shadow-sm"
                      />
                    </div>
                  </div>
                </div>

                {/* Account Security */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Lock className="w-4 h-4 text-lime-600" />
                      Account Security
                    </h3>
                    <span className="text-[10px] text-lime-800 bg-lime-100 border border-lime-300 px-2.5 py-0.5 rounded-full flex items-center gap-1 font-bold">
                      <Sparkles className="w-3 h-3" /> Secure Default
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                      Default Temporary Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input
                        type="text"
                        readOnly
                        disabled
                        value={password}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-500 cursor-not-allowed font-mono shadow-inner"
                      />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">
                      Pre-filled with default value. New users can change their password anytime via their profile settings.
                    </p>
                  </div>
                </div>
              </div>

              {/* Right Column: Role, Compensation & Duties Summary */}
              <div className="space-y-6">
                {/* Store Role & Duty Compensation */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-4">
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2 border-b border-slate-200 pb-3">
                    <ShieldCheck className="w-4 h-4 text-lime-600" />
                    Store Role & Compensation
                  </h3>

                  {/* Role Dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-2 uppercase tracking-wider">
                      Operational Role <span className="text-rose-500">*</span>
                    </label>
                    <div className="relative">
                      <ShieldCheck className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <select
                        value={role}
                        onChange={(e) => setRole(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-lime-500 cursor-pointer shadow-sm"
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
                    <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-amber-800 uppercase tracking-wider">
                          Mechanic Commission Rate (%) *
                        </label>
                        <span className="text-[10px] text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300 font-bold">
                          Labor Share
                        </span>
                      </div>
                      <div className="relative">
                        <Percent className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-600" />
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.5"
                          required
                          value={commissionRate}
                          onChange={(e) => setCommissionRate(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-amber-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-sm"
                        />
                      </div>
                      <p className="text-xs text-slate-600">
                        Percentage of service labor charge earned by the mechanic on completed jobs.
                      </p>
                    </div>
                  )}

                  {role === "cashier" && (
                    <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 space-y-2 animate-in fade-in">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-bold text-emerald-800 uppercase tracking-wider">
                          Daily Shift Wage (₱) *
                        </label>
                        <span className="text-[10px] text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300 font-bold">
                          PHP / Day
                        </span>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-emerald-700 select-none">
                          ₱
                        </span>
                        <input
                          type="number"
                          min="0"
                          step="10"
                          required
                          value={baseWage}
                          onChange={(e) => setBaseWage(parseFloat(e.target.value) || 0)}
                          className="w-full bg-white border border-emerald-300 rounded-xl py-2.5 pl-10 pr-4 text-sm text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
                        />
                      </div>
                      <p className="text-xs text-slate-600">
                        Standard daily pay received per completed cashier shift.
                      </p>
                    </div>
                  )}
                </div>

                {/* Role Duties & Access Summary */}
                <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 space-y-3.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Briefcase className="w-4 h-4 text-lime-600" />
                      {roleSummary.title}
                    </h3>
                    <span className="text-[10px] text-lime-800 bg-lime-100 border border-lime-300 px-2.5 py-0.5 rounded-full font-bold">
                      {roleSummary.badge}
                    </span>
                  </div>

                  <ul className="space-y-2.5 text-xs text-slate-600">
                    {roleSummary.duties.map((duty, idx) => (
                      <li key={idx} className="flex items-start gap-2.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-lime-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed text-slate-700 font-medium">{duty}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

            </div>

            {/* Form Actions Footer (Full-Width Across Both Columns) */}
            <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-200">
              <Link
                href="/settings?tab=users"
                className="w-full sm:w-auto px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors border border-slate-200 text-center shadow-sm"
              >
                Cancel
              </Link>
              <button
                type="submit"
                disabled={isLoading}
                className="w-full sm:w-auto px-6 py-2.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl transition-all text-xs flex items-center justify-center gap-2 border border-lime-600 shadow-sm active:scale-[0.98]"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
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
