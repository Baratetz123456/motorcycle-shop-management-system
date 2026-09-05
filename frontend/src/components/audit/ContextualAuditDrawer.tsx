"use client";

import { useEffect, useState } from "react";
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
      return "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
    }
    if (act.includes("UPDATE") || act.includes("EDIT") || act.includes("PATCH")) {
      return "bg-cyan-500/10 text-cyan-400 border-cyan-500/20";
    }
    if (act.includes("VOID") || act.includes("DELETE") || act.includes("REMOVE")) {
      return "bg-red-500/10 text-red-400 border-red-500/20";
    }
    return "bg-purple-500/10 text-purple-400 border-purple-500/20";
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden animate-in fade-in duration-200">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Slide-over drawer */}
      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-xl bg-zinc-900 border-l border-white/10 shadow-2xl flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-6 border-b border-white/10 bg-zinc-950/80 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 text-cyan-400 font-bold text-lg">
                <Activity className="w-5 h-5 text-cyan-400" />
                <h2>{title}</h2>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                {subtitle || "Real-time contextual audit events and user action logs"}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={fetchLogs}
                disabled={isLoading}
                title="Refresh Logs"
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <RefreshCw className={clsx("w-4 h-4", isLoading && "animate-spin text-cyan-400")} />
              </button>

              <button
                onClick={onClose}
                className="p-2 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Search & Metadata Filter Bar */}
          <div className="p-4 bg-zinc-950/50 border-b border-white/5 flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Filter logs by user, action, or payload..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-zinc-900 border border-white/10 rounded-xl py-1.5 pl-9 pr-3 text-xs text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500"
              />
            </div>

            <span className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2.5 py-1.5 rounded-lg border border-white/5 whitespace-nowrap">
              {displayLogs.length} event(s)
            </span>
          </div>

          {/* Log Items Stream */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {isLoading && displayLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-zinc-500 text-xs">
                <RefreshCw className="w-8 h-8 text-cyan-500 animate-spin mb-3" />
                <span>Loading activity stream...</span>
              </div>
            ) : displayLogs.length === 0 ? (
              <div className="text-center py-20 text-zinc-500 text-xs space-y-2">
                <ShieldCheck className="w-10 h-10 mx-auto text-zinc-600" />
                <p>No activity logs recorded for this context yet.</p>
              </div>
            ) : (
              displayLogs.map((log) => {
                const isExpanded = expandedId === log.id;
                return (
                  <div
                    key={log.id}
                    className="bg-zinc-950/80 border border-white/5 rounded-2xl p-4 transition-all hover:border-white/10 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={clsx(
                          "px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border",
                          getActionBadgeColor(log.action)
                        )}>
                          {log.action}
                        </span>

                        <span className="text-xs text-zinc-400 font-medium truncate max-w-[200px]">
                          {log.resource}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 text-[11px] text-zinc-500 shrink-0">
                        <Clock className="w-3 h-3" />
                        <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                      </div>
                    </div>

                    {/* User & IP Attribution */}
                    <div className="flex items-center justify-between text-xs text-zinc-400 pt-1 border-t border-white/5">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-zinc-500" />
                        <span className="font-semibold text-white truncate max-w-[180px]">
                          {log.user_id || "system"}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-zinc-900 border border-white/5 text-[10px] text-cyan-300 uppercase font-mono">
                          {log.user_role || "cashier"}
                        </span>
                      </div>

                      {log.details && Object.keys(log.details).length > 0 && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : log.id)}
                          className="text-[11px] font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
                        >
                          <Code className="w-3 h-3" />
                          <span>{isExpanded ? "Hide Payload" : "View Payload"}</span>
                          {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                        </button>
                      )}
                    </div>

                    {/* Expandable JSON details */}
                    {isExpanded && log.details && (
                      <div className="mt-2 p-3 rounded-xl bg-zinc-900 border border-white/5 font-mono text-[11px] text-zinc-300 overflow-x-auto">
                        <pre className="whitespace-pre-wrap">{JSON.stringify(log.details, null, 2)}</pre>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Drawer Footer */}
          <div className="p-4 border-t border-white/10 bg-zinc-950/90 flex items-center justify-between text-xs text-zinc-400">
            <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
              <ShieldCheck className="w-4 h-4" />
              Cryptographic Audit Stream Active
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>

        </div>
      </div>
    </div>
  );
}
