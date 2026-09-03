"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiClient } from "@/lib/api-client";
import { recordUserAuditLog } from "@/lib/audit";
import { ROLE_LANDING_PAGES, UserRole } from "@/lib/permissions";
import { KeyRound, Mail, ShieldAlert, ArrowRight, Wrench, Sparkles, CheckCircle2, UserCheck } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("admin@motoshop.com");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // If already logged in, redirect to role home
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("user_role") as UserRole;
    if (token && role && ROLE_LANDING_PAGES[role]) {
      router.push(ROLE_LANDING_PAGES[role]);
    }
  }, [router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await apiClient.post("/auth/login", {
        email,
        password,
      });

      const { access_token, role, user_id } = response.data;
      const userRole = role as UserRole;

      localStorage.setItem("auth_token", access_token);
      localStorage.setItem("user_role", userRole);
      localStorage.setItem("user_id", user_id);
      localStorage.setItem("user_email", email);

      recordUserAuditLog("USER_LOGIN", "/login", { email: email, role: userRole });

      const landingPage = ROLE_LANDING_PAGES[userRole] || "/reports";
      setSuccess(`Authenticated as ${userRole.toUpperCase()}! Redirecting to ${landingPage}...`);
      
      setTimeout(() => {
        router.push(landingPage);
      }, 800);
    } catch (err: any) {
      console.error("Login error:", err);
      const detail = err.response?.data?.detail;
      if (typeof detail === "string") {
        setError(detail);
      } else if (Array.isArray(detail) && detail.length > 0) {
        setError(detail[0].msg || "Invalid credentials");
      } else {
        setError("Failed to log in. Please ensure services are running.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const fillQuickCredentials = (userEmail: string, userPass: string) => {
    setEmail(userEmail);
    setPassword(userPass);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-zinc-100 relative overflow-hidden font-sans">
      <div className="absolute top-1/4 -left-32 w-96 h-96 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md p-6 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 p-0.5 shadow-lg shadow-cyan-500/20 mb-4 flex items-center justify-center">
            <div className="w-full h-full bg-zinc-950 rounded-[14px] flex items-center justify-center">
              <Wrench className="w-8 h-8 text-cyan-400" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-400 to-indigo-400">
            MotoShop Enterprise
          </h1>
          <p className="text-sm text-zinc-400 mt-1">Role-Based POS & Management System</p>
        </div>

        <div className="bg-zinc-900/70 border border-white/10 backdrop-blur-2xl rounded-2xl p-6 shadow-2xl">
          <h2 className="text-lg font-semibold text-zinc-100 mb-6 flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-cyan-400" />
            Sign in to your account
          </h2>

          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-start gap-2.5">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {success && (
            <div className="mb-4 p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 shrink-0" />
              <div>{success}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@motoshop.com"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-zinc-400 mb-1.5 uppercase tracking-wider">
                Password
              </label>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                <input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 transition-all"
                />
              </div>
            </div>

            <button
              id="login-button"
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-2.5 px-4 rounded-xl shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for All 4 Roles */}
          <div className="mt-6 pt-4 border-t border-white/10">
            <p className="text-xs text-zinc-400 mb-2.5 flex items-center gap-1.5 font-medium">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> Select Role Demo Login:
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => fillQuickCredentials("admin@motoshop.com", "admin123")}
                className="text-left text-xs bg-zinc-950/80 hover:bg-zinc-800 border border-white/5 rounded-lg p-2.5 transition-all group"
              >
                <div className="font-semibold text-cyan-400">Admin</div>
                <div className="text-[10px] text-zinc-400 font-mono">admin@motoshop.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials("cashier@motoshop.com", "cashier123")}
                className="text-left text-xs bg-zinc-950/80 hover:bg-zinc-800 border border-white/5 rounded-lg p-2.5 transition-all group"
              >
                <div className="font-semibold text-emerald-400">Cashier</div>
                <div className="text-[10px] text-zinc-400 font-mono">cashier@motoshop.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials("mechanic@motoshop.com", "mechanic123")}
                className="text-left text-xs bg-zinc-950/80 hover:bg-zinc-800 border border-white/5 rounded-lg p-2.5 transition-all group"
              >
                <div className="font-semibold text-amber-400">Mechanic</div>
                <div className="text-[10px] text-zinc-400 font-mono">mechanic@motoshop.com</div>
              </button>
              <button
                type="button"
                onClick={() => fillQuickCredentials("manager@motoshop.com", "manager123")}
                className="text-left text-xs bg-zinc-950/80 hover:bg-zinc-800 border border-white/5 rounded-lg p-2.5 transition-all group"
              >
                <div className="font-semibold text-purple-400">Manager</div>
                <div className="text-[10px] text-zinc-400 font-mono">manager@motoshop.com</div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
