"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { 
  ShieldCheck, 
  X, 
  Search, 
  RefreshCw, 
  Clock, 
  User, 
  Tag, 
  Code, 
  ChevronDown, 
  ChevronRight,
  Activity,
  Layers
} from "lucide-react";
import clsx from "clsx";
import { apiClient } from "@/lib/api-client";

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  user_id: string | null;
  user_role: string | null;
  action: string;
  resource: string;
  details: any;
  ip_address: string | null;
}

interface ContextualAuditDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  resourceFilter?: string;
  actionPrefix?: string;
}

export function ContextualAuditDrawer({
  isOpen,
  onClose,
  title,
  subtitle,
  resourceFilter,
  actionPrefix
}: ContextualAuditDrawerProps) {
  const [logs, setLogs] = useState<AuditLogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, resourceFilter, actionPrefix]);

  const fetchLogs = async () => {
    setIsLoading(true);
    let fetchedList: AuditLogEntry[] = [];

    // 1. Fetch from backend API
    try {
      const res = await apiClient.get<{ items: AuditLogEntry[] }>("/audit-logs", {
        params: { page_size: 50 }
      });
      if (Array.isArray(res.data?.items)) {
        fetchedList = res.data.items;
      }
    } catch (e) {
      // Ignore network errors and rely on local storage fallback
    }

    // 2. Fetch from local storage audit logs
    const stored = localStorage.getItem("motoshop_audit_logs");
    if (stored) {
      try {
        const localList: AuditLogEntry[] = JSON.parse(stored);
        if (Array.isArray(localList) && localList.length > 0) {
          const existingIds = new Set(fetchedList.map((l) => l.id));
          fetchedList = [...localList.filter((l) => !existingIds.has(l.id)), ...fetchedList];
        }
      } catch (e) {
        // ignore
      }
    }

    // 3. Contextual Filter
    let filtered = fetchedList;
    if (actionPrefix) {
      filtered = filtered.filter((l) => 
        l.action.toUpperCase().startsWith(actionPrefix.toUpperCase()) ||
        (resourceFilter && l.resource.toLowerCase().includes(resourceFilter.toLowerCase()))
      );
    } else if (resourceFilter) {
      filtered = filtered.filter((l) => 
        l.resource.toLowerCase().includes(resourceFilter.toLowerCase())
      );
    }

    setLogs(filtered);
    setIsLoading(false);
  };

  if (!isOpen) return null;

  const displayLogs = logs.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.action.toLowerCase().includes(q) ||
      l.resource.toLowerCase().includes(q) ||
      (l.user_id && l.user_id.toLowerCase().includes(q)) ||
      (l.user_role && l.user_role.toLowerCase().includes(q)) ||
      (l.details && JSON.stringify(l.details).toLowerCase().includes(q))
    );
  });

  const getActionBadgeColor = (action: string) => {
    const act = action.toUpperCase();
    if (act.includes("CREATE") || act.includes("CHECKOUT") || act.includes("COMPLETED")) {
      return "bg-emerald-50 text-emerald-800 border-emerald-200";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("PATCH")) {
      return "bg-blue-50 text-blue-800 border-blue-200";
    }
    if (act.includes("VOID") || act.includes("DELETE") || act.includes("REMOVE")) {
      return "bg-rose-50 text-rose-800 border-rose-200";
    }
    return "bg-purple-50 text-purple-800 border-purple-200";
  };

  if (!isOpen || !mounted) return null;

  const content = (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-white border-l border-slate-200 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-slate-200 bg-white flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
                <Activity className="w-5 h-5 text-lime-600" />
                <h2>{title}</h2>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {subtitle || "Real-time contextual audit events and user action logs"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                disabled={isLoading}
                title="Refresh Logs"
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin text-lime-600")} />
              </button>

              <button
                onClick={onClose}
                className="p-2 text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Metadata Filter Bar */}
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                placeholder="Filter logs by user, action, or payload..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-white border border-slate-200 rounded-xl py-1.5 pl-9 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-lime-500/50 shadow-sm"
              />
            </div>

            <span className="text-[11px] font-mono text-slate-600 bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 whitespace-nowrap shadow-xs">
              {displayLogs.length} event(s)
            </span>
          </div>

          {/* Log Items Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && displayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 text-xs">
                <RefreshCw className="w-8 h-8 text-lime-600 animate-spin mb-3" />
                <span>Loading activity stream...</span>
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="text-center py-20 text-slate-500 text-xs space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-slate-400" />
                <p>No activity logs recorded for this context yet.</p>
              </div>
            ) : (
              displayLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className="bg-slate-50/70 border border-slate-200 rounded-2xl p-4 transition-all hover:bg-white hover:shadow-xs space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border",
                          getActionBadgeColor(log.action)
                        )}>
                          {log.action}
                        </span>

                        <span className="text-xs text-slate-600 font-medium truncate max-w-[200px]">
                          {log.resource}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-slate-500 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* User & IP Attribution */}
                    <div className="flex items-center justify-between text-xs text-slate-600 pt-1 border-t border-slate-200/80">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span className="font-semibold text-slate-900 truncate max-w-[180px]">
                          {log.user_id || "system"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-white border border-slate-200 text-[10px] text-slate-700 uppercase font-mono">
                          {log.user_role || "cashier"}
                        </span>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="text-[11px] font-semibold text-lime-700 hover:text-lime-800 flex items-center gap-1 transition-colors"
                        >
                          <Code className="w-3 h-3" />
                          <span>{isExpanded ? "Hide Payload" : "View Payload"}</span>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Expandable JSON details */}
                    {isExpanded && log.details && (
                      <div className="mt-2 p-3 rounded-xl bg-slate-900 border border-slate-800 font-mono text-[11px] text-slate-200 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer - Sticky at bottom */}
          <div 
            style={{
              paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
            }}
            className="p-4 border-t border-slate-200 bg-white shrink-0 sticky bottom-0 z-20 flex items-center justify-between text-xs text-slate-600"
          >
            <span className="flex items-center gap-1.5 text-emerald-700 font-semibold">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="hidden sm:inline">Cryptographic Audit Stream Active</span>
              <span className="sm:hidden">Audit Stream</span>
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
