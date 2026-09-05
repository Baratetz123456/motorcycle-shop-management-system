/**
 * Standard Typography Tokens
 * Aligned with Customer Repair History (/repairs/history) and Repair Board (/repairs/board).
 */

export const TYPOGRAPHY = {
  // Page Header Level
  pageTitle:
    "text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-400 flex items-center gap-3",
  pageIcon: "w-8 h-8 text-cyan-400",
  pageSubtitle: "text-zinc-400 mt-1 text-sm",

  // Action Buttons
  primaryButton:
    "px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2",
  secondaryButton:
    "px-4 py-2.5 rounded-xl bg-zinc-900 border border-white/10 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors flex items-center gap-2 text-xs font-semibold shadow-md",

  // Filter Bar & Segmented Tabs
  tabButton:
    "px-4 py-2 rounded-xl text-xs font-semibold transition-all flex items-center gap-2",
  tabCounterPill:
    "px-2 py-0.5 rounded-full text-[10px] font-mono font-bold",
  searchInput:
    "w-full bg-zinc-900/80 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
  filterSelect:
    "bg-zinc-950/80 border border-white/10 text-zinc-200 text-xs rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 cursor-pointer",

  // Tables
  table: "w-full text-left text-sm text-zinc-300 whitespace-nowrap",
  tableHeader:
    "text-xs uppercase bg-zinc-900/90 text-zinc-400 font-semibold px-6 py-4 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md",
  tableHeaderCompact:
    "text-xs uppercase bg-zinc-950/90 text-zinc-400 font-semibold px-4 py-3.5 border-b border-white/10 sticky top-0 z-10 backdrop-blur-md",
  tableRow: "hover:bg-white/[0.03] transition-colors group",
  tableCellPrimary: "font-bold text-zinc-100",
  tableCellSecondary: "text-xs text-zinc-400",
  tableCellMono: "font-mono text-xs text-zinc-400",

  // Cards & Modals
  cardTitle: "text-base font-bold text-white",
  cardSubtitle: "text-xs text-zinc-400 font-medium",
  modalTitle: "text-xl font-bold text-white",
  modalSubtitle: "text-xs text-zinc-400",

  // Form Controls
  formLabel: "block text-xs font-semibold uppercase tracking-wider text-zinc-400 mb-1.5",
  formInput:
    "w-full bg-zinc-950/80 border border-white/10 rounded-xl py-2.5 px-3 text-sm text-zinc-100 placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50",
  formHint: "text-[11px] text-zinc-500",

  // Status Badges & Pills
  badge:
    "text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border",
  badgeMono:
    "font-mono text-xs font-bold px-2.5 py-1 rounded-lg border",
} as const;
