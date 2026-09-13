"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
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
  Grid, 
  X,
  ChevronRight,
  ShieldCheck,
  Sparkles
} from "lucide-react";
import clsx from "clsx";

interface NavItem {
  label: string;
  shortLabel: string;
  href: string;
  icon: any;
  group: string;
  description?: string;
}

const PRIMARY_NAV_KEYS = ["/dashboard", "/pos", "/repairs/board", "/inventory"];

const ALL_NAV_ITEMS: NavItem[] = [
  { 
    label: "Dashboard", 
    shortLabel: "Dashboard", 
    href: "/dashboard", 
    icon: BarChart3, 
    group: "DASHBOARD",
    description: "Shop health, analytics & KPI ribbons"
  },
  { 
    label: "Showroom Counter", 
    shortLabel: "Counter", 
    href: "/pos", 
    icon: ShoppingBag, 
    group: "SHOWROOM",
    description: "Point-of-Sale terminal & cart billing"
  },
  { 
    label: "Job Cards", 
    shortLabel: "Jobs", 
    href: "/repairs/board", 
    icon: Wrench, 
    group: "WORKSHOP",
    description: "Workshop repair queue & diagnostics"
  },
  { 
    label: "Parts & Stock", 
    shortLabel: "Stock", 
    href: "/inventory", 
    icon: Package, 
    group: "PARTS",
    description: "Inventory stock counts & price list"
  },
  { 
    label: "Customer Records", 
    shortLabel: "Customers", 
    href: "/repairs/history", 
    icon: History, 
    group: "CUSTOMERS",
    description: "Customer service history & bikes"
  },
  { 
    label: "Bike Registry", 
    shortLabel: "Bikes", 
    href: "/motorcycles", 
    icon: Bike, 
    group: "CUSTOMERS",
    description: "Motorcycle models & service specs"
  },
  { 
    label: "Invoices & Receipts", 
    shortLabel: "Invoices", 
    href: "/sales", 
    icon: Receipt, 
    group: "BACK OFFICE",
    description: "Commercial invoices & sales ledger"
  },
  { 
    label: "Business Reports", 
    shortLabel: "Reports", 
    href: "/reports", 
    icon: FileSpreadsheet, 
    group: "BACK OFFICE",
    description: "Financial ledger, taxes & CSV exports"
  },
  { 
    label: "Payroll", 
    shortLabel: "Payroll", 
    href: "/payroll", 
    icon: DollarSign, 
    group: "BACK OFFICE",
    description: "Staff shift wages & labor commissions"
  },
];

export function MobileBottomNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const userRole = localStorage.getItem("user_role") as UserRole;
    if (userRole) setRole(userRole);
  }, []);

  // Close drawer on path change
  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  // Lock scroll & listen for Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setIsMoreOpen(false);
    };
    if (isMoreOpen) {
      window.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isMoreOpen]);

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

  // Determine if a "More" drawer is needed:
  // If allowedNavItems has <= 5 items, all fit directly on the dock.
  // If > 5 items, take top 4 primary items and put remaining into "More".
  const hasMoreTab = allowedNavItems.length > 5;

  const dockItems = useMemo(() => {
    if (!hasMoreTab) {
      return allowedNavItems;
    }
    const items = allowedNavItems.filter((i) => PRIMARY_NAV_KEYS.includes(i.href));
    if (items.length < 4) {
      const remaining = allowedNavItems.filter((i) => !PRIMARY_NAV_KEYS.includes(i.href));
      return [...items, ...remaining].slice(0, 4);
    }
    return items.slice(0, 4);
  }, [allowedNavItems, hasMoreTab]);

  // Secondary items (accessible in the 'More' sheet when hasMoreTab is true)
  const secondaryItems = useMemo(() => {
    if (!hasMoreTab) return [];
    const dockHrefs = new Set(dockItems.map((i) => i.href));
    return allowedNavItems.filter((i) => !dockHrefs.has(i.href));
  }, [allowedNavItems, dockItems, hasMoreTab]);

  // Check if current active page is inside the 'More' drawer
  const isMoreActive = useMemo(() => {
    if (!hasMoreTab) return false;
    return !dockItems.some((i) => i.href === activeHref);
  }, [hasMoreTab, dockItems, activeHref]);

  if (!role || allowedNavItems.length === 0) return null;

  // More Drawer Modal portaled to document.body
  const moreDrawerContent = hasMoreTab && isMoreOpen && mounted ? (
    <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end">
      {/* Backdrop with Acrylic Blur */}
      <div 
        className="fixed inset-0 bg-zinc-950/70 backdrop-blur-xs animate-in fade-in duration-200"
        onClick={() => setIsMoreOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-Up Sheet Container */}
      <div className="relative z-10 bg-white dark:bg-zinc-900 rounded-t-3xl border-t border-slate-200 dark:border-zinc-800 p-5 shadow-2xl max-h-[85vh] flex flex-col space-y-4 animate-in slide-in-from-bottom duration-250 pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        
        {/* iOS Style Tactile Grab Handle */}
        <div className="w-12 h-1.5 rounded-full bg-slate-300 dark:bg-zinc-700 mx-auto -mt-1 mb-1" />

        {/* Drawer Header */}
        <div className="flex items-center justify-between pb-3 border-b border-slate-200 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-lime-500 text-zinc-950 flex items-center justify-center font-bold shadow-xs">
              <Grid className="w-4 h-4 stroke-[2.5]" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-900 dark:text-zinc-100 tracking-tight">
                All Shop Modules
              </h3>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400">
                Precision Workshop OS • Complete Toolset
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsMoreOpen(false)}
            className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 transition-colors active:scale-95 cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 2-Column Grid of Secondary Modules */}
        <div className="overflow-y-auto space-y-2 pr-0.5 max-h-[55vh]">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {secondaryItems.map((item) => {
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
                  className={clsx(
                    "flex items-center justify-between p-3 rounded-2xl border transition-all active:scale-[0.98] group",
                    isActive
                      ? "bg-lime-50 dark:bg-lime-950/40 border-lime-500 text-lime-900 dark:text-lime-300 font-bold ring-1 ring-lime-500/30 shadow-xs"
                      : "bg-slate-50/70 dark:bg-zinc-900/60 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800/80 text-slate-800 dark:text-zinc-200"
                  )}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={clsx(
                      "w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-colors",
                      isActive 
                        ? "bg-lime-500 text-zinc-950 font-black shadow-xs" 
                        : "bg-white dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 border border-slate-200 dark:border-zinc-700"
                    )}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate leading-tight">
                        {item.label}
                      </div>
                      <div className="text-[10px] text-slate-400 dark:text-zinc-500 truncate mt-0.5 font-mono uppercase font-semibold">
                        {item.group}
                      </div>
                    </div>
                  </div>

                  <ChevronRight className={clsx(
                    "w-4 h-4 shrink-0 transition-transform group-hover:translate-x-0.5",
                    isActive ? "text-lime-700 dark:text-lime-400" : "text-slate-400 dark:text-zinc-600"
                  )} />
                </Link>
              );
            })}
          </div>

          {/* Quick Return to Docked Modules */}
          <div className="pt-2 border-t border-slate-200 dark:border-zinc-800/80">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500 px-1 block mb-1.5">
              Docked Shortcuts
            </span>
            <div className="grid grid-cols-2 gap-2">
              {dockItems.map((item) => {
                const Icon = item.icon;
                const isActive = item.href === activeHref;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setIsMoreOpen(false)}
                    className={clsx(
                      "flex items-center gap-2 p-2 rounded-xl text-xs font-semibold transition-all",
                      isActive
                        ? "bg-lime-500/15 text-lime-800 dark:text-lime-400 border border-lime-500/30"
                        : "bg-slate-100 dark:bg-zinc-800/60 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-800"
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{item.shortLabel}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer System Compliance & Legal Links */}
        <div className="pt-2 border-t border-slate-200 dark:border-zinc-800 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
          <div className="flex items-center gap-3 text-[11px]">
            <Link 
              href="/privacy" 
              onClick={() => setIsMoreOpen(false)}
              className="hover:text-lime-700 dark:hover:text-lime-400 font-medium"
            >
              Privacy Policy
            </Link>
            <span>•</span>
            <Link 
              href="/terms" 
              onClick={() => setIsMoreOpen(false)}
              className="hover:text-lime-700 dark:hover:text-lime-400 font-medium"
            >
              Terms of Service
            </Link>
          </div>

          <span className="text-[10px] font-mono text-slate-400 dark:text-zinc-500">v2.6 Precision</span>
        </div>
      </div>
    </div>
  ) : null;

  return (
    <>
      {/* Precision Acrylic Glassmorphic Dock */}
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 dark:bg-zinc-950/90 backdrop-blur-2xl border-t border-slate-200/80 dark:border-white/10 px-3 pt-1.5 pb-[calc(0.5rem+env(safe-area-inset-bottom,0px))] shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_30px_rgba(0,0,0,0.5)] select-none"
      >
        <div className="flex items-center justify-around max-w-md mx-auto w-full gap-1">
          {dockItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === activeHref;

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.label}
                aria-label={item.label}
                aria-current={isActive ? "page" : undefined}
                onClick={(e) => {
                  if (!canNavigate(item.href, pathname)) {
                    e.preventDefault();
                  }
                }}
                className="flex-1 max-w-[84px] relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 group active:scale-95 cursor-pointer"
              >
                {/* Active Pill Container */}
                <div className={clsx(
                  "flex items-center justify-center transition-all duration-200",
                  isActive
                    ? "w-12 h-8 rounded-xl bg-lime-500 text-zinc-950 font-black shadow-md shadow-lime-500/25 ring-1 ring-lime-600/30"
                    : "w-10 h-7 rounded-lg text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-100 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900"
                )}>
                  <Icon className={clsx("transition-transform duration-200", isActive ? "w-4 h-4 stroke-[2.5]" : "w-5 h-5")} />
                </div>

                {/* Micro-Label for Immediate Clarity */}
                <span className={clsx(
                  "text-[10px] tracking-tight mt-1 transition-all duration-150 leading-none truncate max-w-full font-medium",
                  isActive
                    ? "font-black text-lime-700 dark:text-lime-400"
                    : "text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200"
                )}>
                  {item.shortLabel}
                </span>
              </Link>
            );
          })}

          {/* 5th Tab: More Drawer Button (Only shown when > 5 allowed modules) */}
          {hasMoreTab && (
            <button
              type="button"
              onClick={() => setIsMoreOpen(true)}
              title="More navigation options"
              aria-label="More navigation options"
              className="flex-1 max-w-[84px] relative flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all duration-200 group active:scale-95 cursor-pointer"
            >
              {/* Active Pill Container */}
              <div className={clsx(
                "flex items-center justify-center transition-all duration-200",
                isMoreActive
                  ? "w-12 h-8 rounded-xl bg-lime-500 text-zinc-950 font-black shadow-md shadow-lime-500/25 ring-1 ring-lime-600/30"
                  : "w-10 h-7 rounded-lg text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-100 group-hover:bg-slate-100 dark:group-hover:bg-zinc-900"
              )}>
                <Grid className={clsx("transition-transform duration-200", isMoreActive ? "w-4 h-4 stroke-[2.5]" : "w-5 h-5")} />
              </div>

              {/* Micro-Label */}
              <span className={clsx(
                "text-[10px] tracking-tight mt-1 transition-all duration-150 leading-none truncate max-w-full font-medium",
                isMoreActive
                  ? "font-black text-lime-700 dark:text-lime-400"
                  : "text-slate-500 dark:text-zinc-400 group-hover:text-slate-900 dark:group-hover:text-zinc-200"
              )}>
                More
              </span>
            </button>
          )}
        </div>
      </nav>

      {/* Portaled More Drawer */}
      {mounted && moreDrawerContent ? createPortal(moreDrawerContent, document.body) : null}
    </>
  );
}
