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

export const ROUTE_PERMISSIONS: Record<string, UserRole[]> = {
  "/pos": ["admin", "cashier", "manager"],
  "/sales": ["admin", "manager", "cashier"],
  "/inventory": ["admin", "manager"],
  "/motorcycles": ["admin", "manager", "mechanic"],
  "/repairs/board": ["admin", "manager", "mechanic"],
  "/repairs/history": ["admin", "manager", "mechanic"],
  "/repair-board": ["admin", "manager", "mechanic"],
  "/reports": ["admin", "cashier", "manager"],
  "/dashboard": ["admin", "cashier", "manager"],
  "/audit-logs": ["admin"],
  "/users": ["admin"],
  "/users/register": ["admin"],
};

export function isRouteAllowed(path: string, role: UserRole): boolean {
  const matchedKey = Object.keys(ROUTE_PERMISSIONS).find(
    (key) => path === key || path.startsWith(`${key}/`)
  );

  if (!matchedKey) return true;
  return ROUTE_PERMISSIONS[matchedKey].includes(role);
}
