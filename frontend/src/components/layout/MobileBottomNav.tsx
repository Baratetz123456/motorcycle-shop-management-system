"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isRouteAllowed, UserRole } from "@/lib/permissions";
import { canNavigate } from "@/lib/navigation-throttle";
import { 
  BarChart3, 
  ShoppingBag, 
  Wrench, 
  Package, 
  History, 
  Bike, 
  Receipt, 
  FileSpreadsheet, 
  DollarSign, 
  Settings, 
  Grid, 
  X,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  group: string;
}

const PRIMARY_NAV_KEYS = ["/reports", "/pos", "/repairs/board", "/inventory"];

const ALL_NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/reports", icon: BarChart3, group: "DASHBOARD" },
  { label: "Showroom Counter", href: "/pos", icon: ShoppingBag, group: "SHOWROOM" },
  { label: "Job Cards", href: "/repairs/board", icon: Wrench, group: "WORKSHOP" },
  { label: "Parts & Stock", href: "/inventory", icon: Package, group: "PARTS" },
  { label: "Customer Records", href: "/repairs/history", icon: History, group: "CUSTOMERS" },
  { label: "Bike Registry", href: "/motorcycles", icon: Bike, group: "CUSTOMERS" },
  { label: "Invoices & Receipts", href: "/sales", icon: Receipt, group: "BACK OFFICE" },
  { label: "Shop Reports", href: "/reports/extract", icon: FileSpreadsheet, group: "BACK OFFICE" },
  { label: "Payroll", href: "/payroll", icon: DollarSign, group: "BACK OFFICE" },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);

  useEffect(() => {
    const userRole = localStorage.getItem("user_role") as UserRole;
    if (userRole) setRole(userRole);
  }, []);

  const allowedNavItems = useMemo(() => {
    if (!role) return [];
    return ALL_NAV_ITEMS.filter((item) => isRouteAllowed(item.href, role));
  }, [role]);

  // Compute active href
  const activeHref = useMemo(() => {
    const exact = allowedNavItems.find((item) => item.href === pathname);
    if (exact) return exact.href;
    if (pathname.startsWith("/repairs/jobs")) return "/repairs/board";
    const candidates = allowedNavItems
      .filter((item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
      .sort((a, b) => b.href.length - a.href.length);
    return candidates.length > 0 ? candidates[0].href : null;
  }, [pathname, allowedNavItems]);

  // Select top 4 primary allowed items
  const primaryItems = useMemo(() => {
    const items = allowedNavItems.filter((i) => PRIMARY_NAV_KEYS.includes(i.href));
    if (items.length < 4) {
      const remaining = allowedNavItems.filter((i) => !PRIMARY_NAV_KEYS.includes(i.href));
      return [...items, ...remaining].slice(0, 4);
    }
    return items.slice(0, 4);
  }, [allowedNavItems]);

  // Check if current active page is inside the 'More' drawer
  const isMoreActive = useMemo(() => {
    return !primaryItems.some((i) => i.href === activeHref);
  }, [primaryItems, activeHref]);

  if (!role || allowedNavItems.length === 0) return null;

  return (
    <>
      {/* Sticky Bottom Bar (Icons Only - Strictly No Labels) */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-950/95 backdrop-blur-xl border-t border-slate-200 dark:border-zinc-800 px-3 py-1.5 flex items-center justify-around shadow-lg pb-[calc(0.5rem+env(safe-area-inset-bottom))]"
      >
        {primaryItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;

          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.label}
              aria-label={item.label}
              onClick={(e) => {
                if (!canNavigate(item.href, pathname)) {
                  e.preventDefault();
                }
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative ${
                isActive
                  ? "bg-lime-500 text-zinc-950 shadow-sm scale-105"
                  : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 active:scale-95"
              }`}
            >
              <Icon className="w-5 h-5" />
              {isActive && (
                <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-lime-600 dark:bg-lime-400" />
              )}
            </Link>
          );
        })}

        {/* More Options Button (Icons Only) */}
        <button
          type="button"
          onClick={() => setIsMoreOpen(true)}
          title="More navigation options"
          aria-label="More navigation options"
          className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-all relative ${
            isMoreActive
              ? "bg-lime-500 text-zinc-950 shadow-sm scale-105"
              : "text-slate-500 hover:text-slate-900 dark:text-zinc-400 dark:hover:text-zinc-100 active:scale-95"
          }`}
        >
          <Grid className="w-5 h-5" />
          {isMoreActive && (
            <span className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-lime-600 dark:bg-lime-400" />
          )}
        </button>
      </nav>

      {/* Slide-Up 'More' Menu Drawer */}
      {isMoreOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setIsMoreOpen(false)}
            aria-hidden="true"
          />

          {/* Drawer Container */}
          <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-t-3xl border-t border-slate-200 dark:border-zinc-800 p-5 shadow-2xl max-h-[80vh] flex flex-col space-y-4 animate-in slide-in-from-bottom duration-250">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-lime-500 flex items-center justify-center text-zinc-950 shadow-xs">
                  <Grid className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-zinc-100">All Modules</h3>
                  <p className="text-[11px] text-slate-500 dark:text-zinc-400">Quick access to all shop tools</p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMoreOpen(false)}
                className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors"
                aria-label="Close menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* List of All Allowed Modules */}
            <div className="overflow-y-auto space-y-1.5 pr-1 divide-y divide-slate-100 dark:divide-zinc-800">
              {allowedNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={(e) => {
                      if (!canNavigate(item.href, pathname)) {
                        e.preventDefault();
                        return;
                      }
                      setIsMoreOpen(false);
                    }}
                    className={`flex items-center justify-between p-3 rounded-xl transition-all ${
                      isActive
                        ? "bg-lime-50 dark:bg-lime-950/30 border border-lime-200 dark:border-lime-500/30 text-lime-900 dark:text-lime-400 font-bold"
                        : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800/60"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                        isActive ? "bg-lime-500 text-zinc-950 font-bold" : "bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-300"
                      }`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-zinc-100">{item.label}</div>
                        <div className="text-[10px] text-slate-400 dark:text-zinc-500 uppercase font-semibold">{item.group}</div>
                      </div>
                    </div>

                    <ChevronRight className={`w-4 h-4 ${isActive ? "text-lime-700 dark:text-lime-400" : "text-slate-400 dark:text-zinc-500"}`} />
                  </Link>
                );
              })}
            </div>

            {/* Footer Compliance Links */}
            <div className="pt-3 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
              <div className="flex items-center gap-3 text-[11px]">
                <Link 
                  href="/privacy" 
                  onClick={() => setIsMoreOpen(false)}
                  className="hover:text-lime-700 dark:hover:text-lime-400 font-medium"
                >
                  Privacy
                </Link>
                <span>•</span>
                <Link 
                  href="/terms" 
                  onClick={() => setIsMoreOpen(false)}
                  className="hover:text-lime-700 dark:hover:text-lime-400 font-medium"
                >
                  Terms
                </Link>
              </div>

              <span className="text-[10px] text-slate-400 dark:text-zinc-500">MotoShop OS v2.4</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
