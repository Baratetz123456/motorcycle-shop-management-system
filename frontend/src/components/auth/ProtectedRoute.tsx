"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { isRouteAllowed, ROLE_LANDING_PAGES, UserRole } from "@/lib/permissions";
import { ShieldAlert } from "lucide-react";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [accessDeniedMessage, setAccessDeniedMessage] = useState<string | null>(null);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    const role = localStorage.getItem("user_role") as UserRole;

    if (!token || !role) {
      router.push("/login");
      return;
    }

    if (!isRouteAllowed(pathname, role)) {
      const homePath = ROLE_LANDING_PAGES[role] || "/pos";
      setAccessDeniedMessage(`Access denied: Role '${role.toUpperCase()}' is not permitted to access ${pathname}.`);
      
      // Auto-redirect to home landing page
      const timer = setTimeout(() => {
        router.push(homePath);
      }, 2500);

      return () => clearTimeout(timer);
    }

    setAccessDeniedMessage(null);
    setIsAuthorized(true);
  }, [pathname, router]);

  if (accessDeniedMessage) {
    return (
      <div className="min-h-screen bg-zinc-950 flex flex-col items-center justify-center p-6 text-zinc-100 font-sans">
        <div className="max-w-md w-full bg-red-950/40 border border-red-500/30 rounded-2xl p-6 text-center shadow-2xl backdrop-blur-xl">
          <div className="w-12 h-12 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4 text-red-400">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <h2 className="text-lg font-bold text-red-400 mb-2">Access Denied</h2>
          <p className="text-sm text-zinc-300 mb-4">{accessDeniedMessage}</p>
          <p className="text-xs text-zinc-500">Redirecting you to your home dashboard...</p>
        </div>
      </div>
    );
  }

  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center text-zinc-400">
        <div className="w-6 h-6 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
