"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { Filter, X, RotateCcw } from "lucide-react";
import clsx from "clsx";

interface FloatingFilterButtonProps {
  onClick: () => void;
  activeCount?: number;
  label?: string;
  className?: string;
}

export function FloatingFilterButton({
  onClick,
  activeCount = 0,
  label = "Filters",
  className,
}: FloatingFilterButtonProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const content = (
    <button
      type="button"
      onClick={onClick}
      style={{
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.25rem)",
      }}
      className={clsx(
        "fixed right-4 z-40 md:hidden flex items-center gap-2 px-4 py-3 bg-lime-500 hover:bg-lime-400 text-zinc-950 dark:bg-zinc-900 dark:hover:bg-zinc-800 dark:text-lime-400 dark:border-lime-500/60 font-bold rounded-full shadow-2xl shadow-lime-500/30 active:scale-95 transition-all text-xs border border-lime-600/40 ring-2 ring-lime-500/20 backdrop-blur-md",
        className
      )}
      aria-label="Open filters drawer"
    >
      <Filter className="w-4 h-4 text-zinc-950 dark:text-lime-400" />
      <span className="font-extrabold tracking-wide">{label}</span>
      {activeCount > 0 && (
        <span className="w-5 h-5 rounded-full bg-zinc-950 text-lime-400 dark:bg-lime-500 dark:text-zinc-950 text-[11px] font-bold flex items-center justify-center border border-lime-500/50 shadow-inner">
          {activeCount}
        </span>
      )}
    </button>
  );

  return createPortal(content, document.body);
}

interface MobileFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  activeCount?: number;
  onReset?: () => void;
  children: ReactNode;
}

export function MobileFilterSheet({
  isOpen,
  onClose,
  title = "Filter & Search",
  activeCount = 0,
  onReset,
  children,
}: MobileFilterSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background scroll when bottom sheet is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const content = (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
      {/* Dimmed Backdrop with Blur */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Drawer Sheet - Sticky at bottom */}
      <div 
        className="relative z-10 w-full max-h-[88vh] bg-white dark:bg-zinc-900 border-t border-slate-200 dark:border-zinc-800 rounded-t-3xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-bottom duration-200"
      >
        {/* Top Grab Handle */}
        <div className="pt-3 pb-1 flex justify-center shrink-0">
          <div className="w-10 h-1 bg-slate-300 dark:bg-zinc-700 rounded-full" />
        </div>

        {/* Sheet Header */}
        <div className="px-5 py-3 border-b border-slate-200 dark:border-zinc-800 flex items-center justify-between shrink-0 bg-white dark:bg-zinc-900">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-lime-600 dark:text-lime-400" />
            <h3 className="font-bold text-slate-900 dark:text-zinc-100 text-sm">{title}</h3>
            {activeCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-lime-50 text-lime-800 border border-lime-200 dark:bg-lime-500/10 dark:text-lime-400 dark:border-lime-500/30">
                {activeCount} active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onReset && (
              <button
                type="button"
                onClick={onReset}
                className="px-2.5 py-1 text-xs text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 transition-colors flex items-center gap-1 font-semibold rounded-lg hover:bg-slate-100 dark:hover:bg-zinc-800"
                title="Reset all filters"
              >
                <RotateCcw className="w-3 h-3 text-slate-500 dark:text-zinc-400" />
                <span>Reset</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-zinc-100 border border-slate-200 dark:border-zinc-700 transition-colors"
              title="Close filters"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Scrollable Filters Body (Zero horizontal scroll, pure vertical flow) */}
        <div className="flex-1 min-h-0 overflow-y-auto p-5 space-y-5 touch-pan-y overscroll-contain text-slate-700 dark:text-zinc-200">
          {children}
        </div>

        {/* Sticky Apply Button at Bottom with Safe-Area Padding */}
        <div 
          style={{
            paddingBottom: "max(1rem, calc(env(safe-area-inset-bottom, 0px) + 0.75rem))",
          }}
          className="p-4 border-t border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 sticky bottom-0 z-20 shadow-lg"
        >
          <button
            type="button"
            onClick={onClose}
            className="w-full py-3 bg-lime-500 hover:bg-lime-400 text-zinc-950 font-bold rounded-xl text-xs transition-all shadow-sm active:scale-[0.99] flex items-center justify-center gap-2"
          >
            <span>Apply & View Results</span>
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
