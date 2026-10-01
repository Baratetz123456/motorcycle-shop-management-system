"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Filter } from "lucide-react";
import clsx from "clsx";

export interface UnifiedFloatingFilterFabProps {
  onClick: () => void;
  hasActiveFilters?: boolean;
  activeCount?: number;
  stacked?: boolean;
  ariaLabel?: string;
  className?: string;
  dataTestId?: string;
}

export function UnifiedFloatingFilterFab({
  onClick,
  hasActiveFilters = false,
  activeCount = 0,
  stacked = false,
  ariaLabel = "Filter Catalog",
  className,
  dataTestId = "pos-mobile-filter-fab",
}: UnifiedFloatingFilterFabProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const isFilterActive = hasActiveFilters || activeCount > 0;
  const bottomPosition = stacked
    ? "calc(env(safe-area-inset-bottom, 0px) + 9rem)"
    : "calc(env(safe-area-inset-bottom, 0px) + 5.25rem)";

  const content = (
    <div
      style={{
        position: "fixed",
        bottom: bottomPosition,
        right: "1rem",
        zIndex: 50,
      }}
      className="md:hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <button
        onClick={onClick}
        type="button"
        aria-label={ariaLabel}
        data-testid={dataTestId}
        className={clsx(
          "w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500 shadow-lg transition-all transform active:scale-95 flex items-center justify-center relative cursor-pointer",
          className
        )}
      >
        <Filter className="w-6 h-6 text-white" />
        {isFilterActive && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600 animate-in fade-in zoom-in-75 duration-150" />
        )}
      </button>
    </div>
  );

  return createPortal(content, document.body);
}

// Backward-compatible alias for existing imports
export const FloatingFilterButton = UnifiedFloatingFilterFab;
export const FloatingFilterFab = UnifiedFloatingFilterFab;
