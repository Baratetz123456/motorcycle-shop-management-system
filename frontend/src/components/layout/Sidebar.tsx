"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { isRouteAllowed, UserRole } from "@/lib/permissions";
import { canNavigate } from "@/lib/navigation-throttle";
import { 
  ShoppingBag, 
  Package, 
  Wrench, 
  BarChart3, 
  Bike, 
  Receipt, 
  History, 
  DollarSign, 
  FileSpreadsheet, 
  Settings,
  ShieldCheck
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: any;
  group: string;
}

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

export function Sidebar() {
  const pathname = usePathname();
  const [role, setRole] = useState<UserRole | null>(null);
  const [permissionsVersion, setPermissionsVersion] = useState<number>(0);

  const navRef = useRef<HTMLElement>(null);
  const isDraggingRef = useRef(false);
  const startYRef = useRef(0);
  const scrollTopRef = useRef(0);
  const hasDraggedRef = useRef(false);

  const syncStateFromStorage = useCallback(() => {
    const userRole = localStorage.getItem("user_role") as UserRole;
    if (userRole) {
      setRole(userRole);
    }
  }, []);

  useEffect(() => {
    syncStateFromStorage();
  }, [pathname, syncStateFromStorage]);

  useEffect(() => {
    const handlePermissionsUpdated = () => {
      setPermissionsVersion((v) => v + 1);
    };

    const handleStorageChange = () => {
      syncStateFromStorage();
      setPermissionsVersion((v) => v + 1);
    };

    window.addEventListener("permissions_updated", handlePermissionsUpdated);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("focus", handleStorageChange);

    return () => {
      window.removeEventListener("permissions_updated", handlePermissionsUpdated);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("focus", handleStorageChange);
    };
  }, [syncStateFromStorage]);

  const allowedNavItems = useMemo(() => {
    if (!role) return [];
    return ALL_NAV_ITEMS.filter((item) => isRouteAllowed(item.href, role));
  }, [role, permissionsVersion]);

  // Compute active href
  const activeHref = useMemo(() => {
    const exactMatch = allowedNavItems.find((item) => item.href === pathname);
    if (exactMatch) {
      return exactMatch.href;
    }

    if (pathname.startsWith("/repairs/jobs")) {
      return "/repairs/board";
    }

    const candidates = allowedNavItems
      .filter((item) => item.href !== "/" && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
      .sort((a, b) => b.href.length - a.href.length);

    return candidates.length > 0 ? candidates[0].href : null;
  }, [pathname, allowedNavItems]);

  const handleNavMouseDown = (e: React.MouseEvent) => {
    if (!navRef.current) return;
    isDraggingRef.current = true;
    hasDraggedRef.current = false;
    startYRef.current = e.pageY - navRef.current.offsetTop;
    scrollTopRef.current = navRef.current.scrollTop;
  };

  const handleNavMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingRef.current || !navRef.current) return;
    const y = e.pageY - navRef.current.offsetTop;
    const walk = (y - startYRef.current) * 1.5;
    if (Math.abs(y - startYRef.current) > 5) {
      hasDraggedRef.current = true;
    }
    navRef.current.scrollTop = scrollTopRef.current - walk;
  };

  const handleNavMouseUpOrLeave = () => {
    isDraggingRef.current = false;
  };

  if (!role) return null;

  return (
    <aside
      aria-label="Desktop Sidebar Navigation"
      className="hidden md:flex fixed top-16 left-0 bottom-0 w-64 bg-white dark:bg-zinc-950 border-r border-slate-200 dark:border-zinc-800 flex-col z-30 select-none shadow-xs"
    >
      {/* Dynamic Nav Items */}
      <nav
        ref={navRef}
        onMouseDown={handleNavMouseDown}
        onMouseMove={handleNavMouseMove}
        onMouseUp={handleNavMouseUpOrLeave}
        onMouseLeave={handleNavMouseUpOrLeave}
        className="flex-1 min-h-0 p-3 space-y-1 overflow-y-auto sidebar-nav-scroll touch-pan-y overscroll-contain select-none cursor-grab active:cursor-grabbing"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {allowedNavItems.map((item, idx) => {
          const Icon = item.icon;
          const isActive = item.href === activeHref;
          const prevItem = allowedNavItems[idx - 1];
          const showGroupHeader = !prevItem || prevItem.group !== item.group;

          return (
            <div key={item.href} className="space-y-1">
              {showGroupHeader && (
                <div className="pt-3 pb-1 px-3 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                  {item.group}
                </div>
              )}
              <Link
                href={item.href}
                data-active={isActive ? "true" : "false"}
                onClick={(e) => {
                  if (hasDraggedRef.current) {
                    e.preventDefault();
                    return;
                  }
                  if (!canNavigate(item.href, pathname)) {
                    e.preventDefault();
                    return;
                  }
                }}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-all relative group ${
                  isActive
                    ? "nav-active-item bg-lime-500/15 dark:bg-lime-950/30 text-lime-900 dark:text-lime-400 border border-lime-500/30 dark:border-lime-500/40 font-bold shadow-xs"
                    : "text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 hover:bg-slate-100 dark:hover:bg-zinc-900/60"
                }`}
              >
                {isActive && (
                  <span className="nav-active-bar absolute left-1.5 top-2 bottom-2 w-1 rounded-full bg-lime-600 dark:bg-lime-400" />
                )}
                <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? "text-lime-700 dark:text-lime-400" : "text-slate-400 dark:text-zinc-400 group-hover:text-slate-700 dark:group-hover:text-zinc-200"}`} />
                <span className="truncate">{item.label}</span>
              </Link>
            </div>
          );
        })}
      </nav>

      {/* Footer System Status & Legal Links */}
      <div className="shrink-0 p-3.5 border-t border-slate-200 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900/60 space-y-2">
        <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 px-1">
          <div className="flex items-center gap-1.5 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>MotoShop Engine</span>
          </div>
          <span className="font-mono text-[10px] text-slate-400 dark:text-zinc-500">v2.6</span>
        </div>

        <div className="flex items-center justify-center gap-3 pt-1 text-[10px] text-slate-500 dark:text-zinc-400 font-medium">
          <Link href="/privacy" className="hover:text-lime-700 dark:hover:text-lime-400 transition-colors">
            Privacy Policy
          </Link>
          <span className="text-slate-300 dark:text-zinc-600">•</span>
          <Link href="/terms" className="hover:text-lime-700 dark:hover:text-lime-400 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </aside>
  );
}
