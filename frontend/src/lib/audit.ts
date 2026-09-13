import { apiClient } from "./api-client";

export interface AuditLogPayload {
  action: string;
  resource: string;
  details?: Record<string, any>;
}

export async function recordUserAuditLog(action: string, resource: string, details: Record<string, any> = {}) {
  const userEmail = typeof window !== "undefined" ? (localStorage.getItem("user_email") || "cashier@motoshop.com") : "system";
  const userRole = typeof window !== "undefined" ? (localStorage.getItem("user_role") || "cashier") : "cashier";

  const clientLogEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
    timestamp: new Date().toISOString(),
    user_id: userEmail,
    user_email: userEmail,
    user_role: userRole,
    user_name: userEmail.split("@")[0].charAt(0).toUpperCase() + userEmail.split("@")[0].slice(1),
    action,
    resource,
    details: {
      ...details,
      user_email: userEmail,
    },
    ip_address: "127.0.0.1",
  };

  // 1. Post to backend API endpoint
  try {
    const res = await apiClient.post<{ status: string; id: string }>("/audit-logs", {
      action,
      resource,
      details: clientLogEntry.details,
      user_role: userRole,
    });
    if (res.data?.id) {
      clientLogEntry.id = res.data.id;
    }
  } catch (e) {
    // Network or mock fallback
  }

  // 2. Persist in local storage for instant dashboard auditing and fallback
  if (typeof window !== "undefined") {
    try {
      const existing = localStorage.getItem("motoshop_audit_logs");
      const list = existing ? JSON.parse(existing) : [];
      list.unshift(clientLogEntry);
      // Keep up to 500 recent items in local cache
      if (list.length > 500) list.length = 500;
      localStorage.setItem("motoshop_audit_logs", JSON.stringify(list));
    } catch (e) {
      console.warn("Failed to update motoshop_audit_logs in localStorage", e);
    }
  }

  return clientLogEntry;
}
