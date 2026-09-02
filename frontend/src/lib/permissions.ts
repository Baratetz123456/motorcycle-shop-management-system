export type UserRole = "admin" | "cashier" | "mechanic" | "manager";

export interface UserSession {
  user_id: string;
  role: UserRole;
  email?: string;
}

export const ROLE_LANDING_PAGES: Record<UserRole, string> = {
  admin: "/reports",
  manager: "/reports",
  cashier: "/pos",
  mechanic: "/repairs/board",
};

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/pos": ["admin", "cashier"],
  "/inventory": ["admin"],
  "/repairs/board": ["admin", "mechanic"],
  "/repair-board": ["admin", "mechanic"],
  "/reports": ["admin", "cashier", "manager"],
  "/dashboard": ["admin", "cashier", "manager"],
  "/audit-logs": ["admin"],
};

export function isRouteAllowed(path: string, role: UserRole): bool {
  // Find matching route rule
  const matchedKey = Object.keys(ROUTE_PERMISSIONS).find(
    (key) => path === key || path.startsWith(`${key}/`)
  );

  if (!matchedKey) return true; // Default allow if unlisted
  return ROUTE_PERMISSIONS[matchedKey].includes(role);
}
