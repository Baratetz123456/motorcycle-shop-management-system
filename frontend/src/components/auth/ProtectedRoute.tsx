"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isRouteAllowed, getEffectiveLandingPage, getRouteFriendlyName, UserRole } from "@/lib/permissions";
import { apiClient } from "@/lib/api-client";
import { tokenStore } from "@/lib/auth-token";
import { useIdleTimer } from "@/hooks/useIdleTimer";
import { ShieldAlert, ArrowRight, LogOut } from "lucide-react";

interface DeniedState {
  pageName: string;
  fallbackPath: string;
  fallbackName: string;
  role: string;
}

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [deniedInfo, setDeniedInfo] = useState<DeniedState | null>(null);
  const [countdown, setCountdown] = useState(2);
  const redirectedRef = useRef(false);

  // Mount 30-minute idle inactivity protection across all protected routes
  useIdleTimer();

  const verifySession = useCallback(async () => {
    let token = tokenStore.getToken();
    let role = localStorage.getItem("user_role") as UserRole | null;

    // 1. If in-memory token is absent, attempt silent refresh using HttpOnly session cookie
    if (!token) {
      try {
        const { data } = await apiClient.post("/auth/refresh");
        token = data.access_token;
        tokenStore.setToken(token);
        if (data.role) {
          role = data.role as UserRole;
          localStorage.setItem("user_role", data.role);
        }
        if (data.user_id) {
          localStorage.setItem("user_id", data.user_id);
        }
        if (data.first_name || data.last_name) {
          const fullName = [data.first_name, data.last_name].filter(Boolean).join(" ");
          localStorage.setItem("user_name", fullName);
        }
      } catch (err) {
        // 2. Transitional fallback: check if user has a legacy localStorage token to upgrade
        const legacyToken = localStorage.getItem("auth_token");
        if (legacyToken) {
          try {
            const upgradeRes = await apiClient.post(
              "/auth/upgrade-session",
              {},
              { headers: { Authorization: `Bearer ${legacyToken}` } }
            );
            token = upgradeRes.data.access_token;
            tokenStore.setToken(token);
            localStorage.removeItem("auth_token"); // Migration complete for this user
            if (upgradeRes.data.role) {
              role = upgradeRes.data.role as UserRole;
              localStorage.setItem("user_role", upgradeRes.data.role);
            }
          } catch (upgradeErr) {
            localStorage.removeItem("auth_token");
          }
        }
      }
    }

    // If still no token or role, user session has ended -> redirect to login
    if (!token || !role) {
      tokenStore.clearToken();
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user_role");
      localStorage.removeItem("user_id");
      localStorage.removeItem("user_email");
      localStorage.removeItem("user_name");
      router.push("/login");
      return;
    }

    // Role-based route authorization guard
    if (!isRouteAllowed(pathname, role)) {
      const pageName = getRouteFriendlyName(pathname);
      const fallbackTarget = getEffectiveLandingPage(role);
      const fallbackPath = fallbackTarget || "/login";
      const fallbackName = fallbackPath === "/login" ? "Login" : getRouteFriendlyName(fallbackPath);

      setDeniedInfo({
        pageName,
        fallbackPath,
        fallbackName,
        role: role.toUpperCase(),
      });
      setCountdown(2);
      redirectedRef.current = false;
      return;
    }

    setDeniedInfo(null);
    setIsAuthorized(true);
  }, [pathname, router]);

  useEffect(() => {
    verifySession();
  }, [verifySession]);

  // Countdown timer for automatic redirection on access denied
  useEffect(() => {
    if (!deniedInfo) return;

    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          if (!redirectedRef.current) {
            redirectedRef.current = true;
            router.push(deniedInfo.fallbackPath);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [deniedInfo, router]);

  const handleImmediateNavigate = () => {
    if (deniedInfo && !redirectedRef.current) {
      redirectedRef.current = true;
      router.push(deniedInfo.fallbackPath);
    }
  };

  const handleLogout = async () => {
    try {
      await apiClient.post("/auth/logout");
    } catch (_) {}
    tokenStore.clearToken();
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_role");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_email");
    localStorage.removeItem("user_name");
    router.push("/login");
  };

  if (deniedInfo) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-slate-900 font-sans relative overflow-hidden">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-2xl p-7 text-center shadow-xl relative z-10">
          <div className="w-14 h-14 bg-rose-50 border border-rose-200 rounded-2xl flex items-center justify-center mx-auto mb-4 text-rose-600 shadow-sm">
            <ShieldAlert className="w-7 h-7" />
          </div>

          <h2 className="text-xl font-bold text-rose-700 mb-2">Access Denied</h2>

          <div className="bg-rose-50/60 border border-rose-200 rounded-xl p-3.5 mb-5 text-sm text-slate-700 leading-relaxed">
            Role <span className="font-bold text-slate-900 px-2 py-0.5 rounded bg-white border border-rose-200 text-xs tracking-wide shadow-xs">{deniedInfo.role}</span> is not permitted to access <span className="font-bold text-slate-900">{deniedInfo.pageName}</span>.
          </div>

          <div className="space-y-3">
            <button
              onClick={handleImmediateNavigate}
              className="w-full bg-rose-600 hover:bg-rose-700 text-white font-semibold py-2.5 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 group text-sm shadow-sm"
            >
              <span>Go to {deniedInfo.fallbackName}</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
            </button>

            {deniedInfo.fallbackPath !== "/login" && (
              <button
                onClick={handleLogout}
                className="w-full bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 hover:text-slate-900 font-semibold py-2 px-4 rounded-xl transition-all flex items-center justify-center gap-2 text-xs"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100">
            <div className="flex items-center justify-between text-[11px] text-slate-500 mb-1.5 font-mono">
              <span>Auto-redirecting to {deniedInfo.fallbackName}...</span>
              <span className="text-slate-700 font-bold">{countdown}s</span>
            </div>
            <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-rose-500 h-full rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${(countdown / 2) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500">
        <div className="w-6 h-6 border-2 border-lime-600 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
