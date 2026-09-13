"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { apiClient } from "@/lib/api-client";
import { tokenStore } from "@/lib/auth-token";
import { recordUserAuditLog } from "@/lib/audit";
import { UserRole, getEffectiveLandingPage, getRouteFriendlyName } from "@/lib/permissions";
import { syncUserPreferences, getAppTheme, applyThemeToDocument, getAppMode, applyModeToDocument } from "@/lib/theme";
import { 
  KeyRound, 
  Mail, 
  ShieldAlert, 
  ArrowRight, 
  Wrench, 
  Sparkles, 
  CheckCircle2, 
  Bike,
  Check,
  Activity,
  Layers,
  ShoppingBag,
  Coins
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("admin@motoshop.com");
  const [password, setPassword] = useState("admin123");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    // Show banner if redirected due to idle inactivity or session expiry
    if (searchParams.get("inactivity") === "1") {
      setError("Your session expired due to 30 minutes of inactivity. Please sign in again.");
    } else if (searchParams.get("expired") === "1") {
      setError("Your session has expired. Please sign in to continue.");
    }

    // Check if user already has an active session cookie on mount
    const checkActiveSession = async () => {
      // If user arrived with inactivity or expired flag, session is terminated - do not attempt refresh
      if (searchParams.get("inactivity") === "1" || searchParams.get("expired") === "1") {
        return;
      }

      // If user has no active user_role indicator in localStorage, they are logged out - do not trigger 401
      const existingRole = localStorage.getItem("user_role");
      if (!existingRole) {
        return;
      }

      try {
        const { data } = await apiClient.post("/auth/refresh");
        if (data.access_token && data.role) {
          tokenStore.setToken(data.access_token);
          localStorage.setItem("user_role", data.role);
          if (data.user_id) localStorage.setItem("user_id", data.user_id);
          if (data.avatar) localStorage.setItem("user_avatar", data.avatar);
          const target = getEffectiveLandingPage(data.role as UserRole);
          if (target) {
            router.push(target);
          }
        }
      } catch (_) {
        // Active session cookie expired or invalid - clear local state cleanly
        tokenStore.clearToken();
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_avatar");
      }
    };

    checkActiveSession();
  }, [router, searchParams]);

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

      const { access_token, role, user_id, first_name, last_name, avatar, theme, display_mode } = response.data;
      const userRole = role as UserRole;

      // Determine effective fallback landing page
      const effectiveLanding = getEffectiveLandingPage(userRole);

      if (!effectiveLanding && userRole !== "admin") {
        // Zero operational store workspaces accessible - terminate session and block
        tokenStore.clearToken();
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_role");
        localStorage.removeItem("user_id");
        localStorage.removeItem("user_email");
        localStorage.removeItem("user_name");
        localStorage.removeItem("user_avatar");
        try {
          await apiClient.post("/auth/logout").catch(() => {});
        } catch (e) {}

        setError(`Access Denied: Your assigned role (${userRole.toUpperCase()}) currently has no accessible store workspaces. Please contact a system administrator.`);
        return;
      }

      // 1. Store access token strictly in React memory (ephemeral, destroyed on tab close)
      tokenStore.setToken(access_token);

      // 2. Remove legacy insecure localStorage token if present
      localStorage.removeItem("auth_token");

      // 3. Store non-sensitive user metadata for UI rendering
      localStorage.setItem("user_role", userRole);
      localStorage.setItem("user_id", user_id);
      localStorage.setItem("user_email", email);
      if (avatar) {
        localStorage.setItem("user_avatar", avatar);
      }
      const fullName = [first_name, last_name].filter(Boolean).join(" ");
      localStorage.setItem("user_name", fullName || email.split("@")[0]);

      // 4. Sync Account Personal Theme & Display Mode
      if (theme || display_mode) {
        syncUserPreferences(theme, display_mode, user_id);
      } else {
        applyThemeToDocument(getAppTheme(user_id));
        applyModeToDocument(getAppMode(user_id));
      }

      recordUserAuditLog("USER_LOGIN", "/login", { email: email, role: userRole });

      const landingPage = effectiveLanding || "/reports";
      const friendlyName = getRouteFriendlyName(landingPage);
      setSuccess(`Authenticated as ${userRole.toUpperCase()}! Redirecting to ${friendlyName}...`);
      
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
    <div className="min-h-screen flex bg-slate-50 text-slate-900 font-sans selection:bg-lime-500/30 selection:text-lime-950">
      {/* Left Showcase Banner (Desktop Only) */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-5/12 relative flex-col justify-between p-12 xl:p-16 bg-white border-r border-slate-200 overflow-hidden">
        {/* Subtle Background Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03] pointer-events-none"
          style={{
            backgroundImage: "radial-gradient(#0f172a 1px, transparent 1px)",
            backgroundSize: "28px 28px"
          }}
        />

        {/* Top Branding */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <BrandLogo size="lg" variant="lime-on-dark" />
            <div>
              <span className="text-xl font-extrabold tracking-tight text-slate-900 block">MotoShop Pro</span>
              <span className="text-[10px] font-mono text-lime-700 font-bold tracking-wider uppercase">
                Motorcycle Shop OS
              </span>
            </div>
          </div>
        </div>

        {/* Center Presentation */}
        <div className="relative z-10 my-auto py-12 space-y-8">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-lime-50 border border-lime-200 text-lime-800 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-lime-700" />
              <span>Workshop Management Platform</span>
            </div>
            <h1 className="text-3xl xl:text-4xl font-black tracking-tight text-slate-900 leading-tight">
              Precision tools for <br />
              <span className="text-lime-700">motorcycle shops</span> & dealers.
            </h1>
            <p className="text-sm text-slate-600 leading-relaxed max-w-md">
              Streamline repair bay dispatches, counter POS checkouts, inventory stock catalogs, and mechanic commissions with zero friction.
            </p>
          </div>

          {/* Feature Badges */}
          <div className="space-y-3 pt-2">
            {[
              {
                icon: Layers,
                title: "Dynamic Repair Stage Kanban",
                desc: "Live technician job cards & multi-bay tracking",
              },
              {
                icon: ShoppingBag,
                title: "Rapid Counter Point of Sale",
                desc: "Instant checkout & thermal receipt engine",
              },
              {
                icon: Coins,
                title: "Transparent Commission Payouts",
                desc: "Automated mechanic splits & shop P&L ledgers",
              },
            ].map((feat, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-8 h-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 mt-0.5 text-lime-700">
                  <feat.icon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">{feat.title}</div>
                  <div className="text-[11px] text-slate-500">{feat.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Status Indicator */}
        <div className="relative z-10 pt-6 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-mono text-[11px] text-slate-600 font-semibold">All Microservices Online</span>
          </div>
          <span className="font-mono text-[11px] font-semibold text-slate-400">v2.6.4</span>
        </div>
      </div>

      {/* Right Form Area (Card-Free, Borderless & Seamless) */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-12 lg:p-16 min-h-screen overflow-y-auto">
        {/* Mobile Header Branding (Hidden on desktop) */}
        <div className="lg:hidden flex items-center gap-3 pt-4 pb-8">
          <BrandLogo size="md" variant="lime-on-dark" />
          <div>
            <span className="text-lg font-extrabold text-slate-900 block">MotoShop Pro</span>
            <span className="text-[10px] font-mono text-lime-700 uppercase font-bold">Motorcycle Shop OS</span>
          </div>
        </div>

        {/* Main Card-Free Form Flow */}
        <div className="my-auto max-w-md w-full mx-auto space-y-8 py-6">
          {/* Header */}
          <div className="space-y-2">
            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900">
              Sign In
            </h2>
            <p className="text-sm text-slate-600">
              Enter your credentials to access your workshop bench.
            </p>
          </div>

          {/* Feedback Alerts */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-3 animate-in fade-in">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5 text-rose-600" />
              <div className="font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs sm:text-sm flex items-center gap-3 animate-in fade-in">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <div className="font-medium">{success}</div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label 
                htmlFor="email-input" 
                className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@motoshop.com"
                  className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all font-sans shadow-sm"
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label 
                  htmlFor="password-input" 
                  className="block text-xs font-bold text-slate-700 uppercase tracking-wider"
                >
                  Password
                </label>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  id="password-input"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-white border border-slate-300 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:border-lime-500 focus:ring-2 focus:ring-lime-500/20 transition-all font-sans shadow-sm"
                />
              </div>
            </div>

            <button
              id="login-button"
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl text-sm transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2 group disabled:bg-slate-100 disabled:text-slate-400 disabled:border-slate-200 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-zinc-950/30 border-t-zinc-950 rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials for All 4 Roles */}
          <div className="pt-6 border-t border-slate-200 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="font-bold flex items-center gap-1.5 text-slate-800">
                <Sparkles className="w-3.5 h-3.5 text-lime-700" /> Quick Demo Profiles
              </span>
              <span className="text-[11px] text-slate-500 font-medium">Click to autofill</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {[
                { role: "Admin", email: "admin@motoshop.com", pass: "admin123", color: "text-lime-800", border: "hover:border-lime-500" },
                { role: "Cashier", email: "cashier@motoshop.com", pass: "cashier123", color: "text-emerald-800", border: "hover:border-emerald-500" },
                { role: "Mechanic", email: "mechanic@motoshop.com", pass: "mechanic123", color: "text-amber-800", border: "hover:border-amber-500" },
                { role: "Manager", email: "manager@motoshop.com", pass: "manager123", color: "text-purple-800", border: "hover:border-purple-500" },
              ].map((item) => (
                <button
                  key={item.role}
                  type="button"
                  onClick={() => fillQuickCredentials(item.email, item.pass)}
                  className={`text-left p-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 ${item.border} transition-all group shadow-sm`}
                >
                  <div className={`text-xs font-bold ${item.color} flex items-center justify-between`}>
                    <span>{item.role}</span>
                    <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all text-slate-500" />
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono mt-0.5 truncate">
                    {item.email}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Legal Compliance Footer */}
        <div className="pt-8 pb-4 flex items-center justify-center gap-4 text-xs text-slate-500 font-medium">
          <Link href="/privacy" className="hover:text-lime-700 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-slate-300">•</span>
          <Link href="/terms" className="hover:text-lime-700 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-600">
          <div className="w-6 h-6 border-2 border-lime-500 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
