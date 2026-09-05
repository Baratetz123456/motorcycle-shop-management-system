import { apiClient } from "./api-client";

export interface AuditLogPayload {
  action: string;
  resource: string;
  details?: Record<string, any>;
}

export async function recordUserAuditLog(action: string, resource: string, details: Record<string, any> = {}) {
  const userEmail = typeof window !== "undefined" ? (localStorage.getItem("user_email") || "cashier@motoshop.com") : "system";
  const userRole = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "cashier") : "cashier";

  const newLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    user_id: userEmail,
    user_role: userRole,
    action,
    resource,
    details,
    ip_address: "127.0.0.1",
  };

  // 1. Post to backend API endpoint if connected
  try {
    await apiClient.post("/audit-logs", newLogEntry);
  } catch (e) {
    // Ignore network error for smooth fallback
  }

  // 2. Persist in local storage for instant dashboard auditing
  if (typeof window !== "undefined") {
    const existing = localStorage.getItem("motoshop_audit_logs");
    const list = existing ? JSON.parse(existing) : [];
    list.unshift(newLogEntry);
    localStorage.setItem("motoshop_audit_logs", JSON.stringify(list));
  }
}
