export type UserRole = "admin" | "cashier" | "mechanic" | "manager";

export interface UserSession {
  user_id: string;
  role: UserRole;
  email?: string;
  first_name?: string;
  last_name?: string;
}

export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  admin: "/reports",
  manager: "/reports",
  cashier: "/pos",
  mechanic: "/repairs/board",
};

export interface ConfigurableModule {
  id: string;
  name: string;
  routes: string[];
  description: string;
}

export const CONFIGURABLE_MODULES: ConfigurableModule[] = [
  {
    id: "pos",
    name: "Showroom Counter",
    routes: ["/pos", "/pos/checkout"],
    description: "Ring up counter sales, select active customer bikes, and collect payments.",
  },
  {
    id: "sales",
    name: "Invoices & Receipts",
    routes: ["/sales"],
    description: "Inspect customer invoices, payment methods, and view receipts.",
  },
  {
    id: "inventory",
    name: "Parts & Stock",
    routes: ["/inventory"],
    description: "Manage parts catalog, service labor rates, suppliers, and stock levels.",
  },
  {
    id: "payroll",
    name: "Payroll",
    routes: ["/payroll"],
    description: "Track cashier shift hours and mechanic labor commission payouts.",
  },
  {
    id: "motorcycles",
    name: "Bike Registry",
    routes: ["/motorcycles"],
    description: "Catalog of bike makes, models, and recommended service intervals.",
  },
  {
    id: "repairs_board",
    name: "Workshop Job Cards",
    routes: ["/repairs/board", "/repair-board"],
    description: "Track bikes on the repair bench from drop-off to final invoice.",
  },
  {
    id: "repairs_history",
    name: "Customer Records",
    routes: ["/repairs/history", "/repairs/history/logs"],
    description: "Review past repair logs, parts used, and bikes linked to returning customers.",
  },
  {
    id: "reports",
    name: "Dashboard & Reports",
    routes: ["/reports", "/reports/extract", "/dashboard"],
    description: "Access shop overview numbers and export financial reports.",
  },
  {
    id: "audit_logs",
    name: "Audit Log",
    routes: ["/audit-logs"],
    description: "Review immutable history logs of all shop changes.",
  },
  {
    id: "user_management",
    name: "Staff & Users",
    routes: ["/users", "/users/register"],
    description: "Manage staff accounts, assign roles, and manage access.",
  },
];

export const DEFAULT_ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/pos": ["admin", "cashier", "manager"],
  "/pos/checkout": ["admin", "cashier", "manager"],
  "/sales": ["admin", "manager", "cashier"],
  "/inventory": ["admin", "manager"],
  "/payroll": ["admin", "manager"],
  "/reports/extract": ["admin", "manager"],
  "/motorcycles": ["admin", "manager", "mechanic"],
  "/repairs/board": ["admin", "manager", "mechanic"],
  "/repairs/history": ["admin", "manager", "mechanic"],
  "/repairs/history/logs": ["admin", "manager", "mechanic"],
  "/repair-board": ["admin", "manager", "mechanic"],
  "/reports": ["admin", "manager"],
  "/dashboard": ["admin", "manager"],
  "/audit-logs": ["admin"],
  "/users": ["admin"],
  "/users/register": ["admin"],
  "/settings": ["admin", "manager", "cashier", "mechanic"],
};

export const ROUTE_PERMISSIONS = DEFAULT_ROUTE_PERMISSIONS;

const PERMISSIONS_STORAGE_KEY = "motoshop_custom_permissions";

export function getCustomPermissions(): Record<string, UserRole[]> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PERMISSIONS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

export function saveCustomPermissions(perms: Record<string, UserRole[]>): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(PERMISSIONS_STORAGE_KEY, JSON.stringify(perms));
    window.dispatchEvent(new CustomEvent("permissions_updated", { detail: perms }));
  } catch (e) {
    console.error("Failed to save custom permissions:", e);
  }
}

export function resetCustomPermissions(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PERMISSIONS_STORAGE_KEY);
    window.dispatchEvent(new CustomEvent("permissions_updated", { detail: DEFAULT_ROUTE_PERMISSIONS }));
  } catch (e) {
    console.error("Failed to reset permissions:", e);
  }
}

export function getEffectiveRoutePermissions(): Record<string, UserRole[]> {
  const custom = getCustomPermissions();
  if (!custom) return DEFAULT_ROUTE_PERMISSIONS;
  return {
    ...DEFAULT_ROUTE_PERMISSIONS,
    ...custom,
    // Settings accessible to all authenticated roles
    "/settings": ["admin", "manager", "cashier", "mechanic"],
    // System audit logs dedicated page remains strictly admin
    "/audit-logs": ["admin"],
  };
}

export function isRouteAllowed(path: string, role: UserRole): boolean {
  if (role === "admin") return true;

  const permissions = getEffectiveRoutePermissions();
  const matchedKey = Object.keys(permissions).find(
    (key) => path === key || path.startsWith(`${key}/`)
  );

  if (!matchedKey) return true;
  return permissions[matchedKey].includes(role);
}

export const ROUTE_FRIENDLY_NAMES: Record<string, string> = {
  "/pos": "Showroom Counter",
  "/pos/checkout": "Payment Checkout",
  "/sales": "Invoices & Receipts",
  "/inventory": "Parts & Stock",
  "/payroll": "Payroll",
  "/motorcycles": "Bike Registry",
  "/repairs/board": "Workshop Job Cards",
  "/repair-board": "Workshop Job Cards",
  "/repairs/history": "Customer Records",
  "/repairs/history/logs": "Customer Service History",
  "/reports": "Dashboard",
  "/reports/extract": "Shop Reports",
  "/dashboard": "Dashboard",
  "/users": "Staff & Users",
  "/users/register": "Staff Registration",
  "/audit-logs": "Audit Log",
  "/settings": "Shop Settings",
};

export function getRouteFriendlyName(path: string): string {
  if (!path) return "Requested Page";

  const cleanPath = path.split("?")[0].replace(/\/$/, "");
  if (ROUTE_FRIENDLY_NAMES[cleanPath]) {
    return ROUTE_FRIENDLY_NAMES[cleanPath];
  }

  const matchedKey = Object.keys(ROUTE_FRIENDLY_NAMES)
    .filter((key) => key !== "/")
    .sort((a, b) => b.length - a.length)
    .find((key) => cleanPath.startsWith(`${key}/`) || cleanPath === key);

  if (matchedKey) {
    return ROUTE_FRIENDLY_NAMES[matchedKey];
  }

  const segments = cleanPath.split("/").filter(Boolean);
  if (segments.length > 0) {
    const last = segments[segments.length - 1];
    return last
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  return "Requested Page";
}

export const ROLE_FALLBACK_PRIORITY: Record<UserRole, string[]> = {
  cashier: ["/pos", "/sales", "/reports", "/repairs/board", "/motorcycles", "/inventory", "/payroll"],
  mechanic: ["/repairs/board", "/motorcycles", "/repairs/history", "/reports", "/pos", "/sales", "/inventory", "/payroll"],
  manager: ["/reports", "/pos", "/sales", "/inventory", "/repairs/board", "/motorcycles", "/payroll"],
  admin: ["/reports"],
};

export function getEffectiveLandingPage(role: UserRole): string | null {
  if (role === "admin") return "/reports";

  // Check default landing page first
  const defaultPage = ROLE_LANDING_PAGES[role];
  if (defaultPage && isRouteAllowed(defaultPage, role)) {
    return defaultPage;
  }

  // Check role-tailored fallback priority list
  const priorityList = ROLE_FALLBACK_PRIORITY[role] || [];
  for (const route of priorityList) {
    if (isRouteAllowed(route, role)) {
      return route;
    }
  }

  // Check if any other configurable operational workspace is allowed
  for (const mod of CONFIGURABLE_MODULES) {
    if (mod.id === "audit_logs" || mod.id === "user_management") continue;
    for (const route of mod.routes) {
      if (isRouteAllowed(route, role)) {
        return route;
      }
    }
  }

  // Zero accessible operational store workspaces
  return null;
}

