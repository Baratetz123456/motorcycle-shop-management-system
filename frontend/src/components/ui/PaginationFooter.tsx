"use client";

import React, { useMemo } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";
import clsx from "clsx";

export interface PaginationFooterProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  pageSizeOptions?: number[];
  itemLabel?: string;
  className?: string;
  isLoading?: boolean;
}

export function PaginationFooter({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 25, 50],
  itemLabel = "item(s)",
  className,
  isLoading = false,
}: PaginationFooterProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  // Compute item index range
  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  // Smart page numbers calculation with ellipsis
  const paginationRange = useMemo(() => {
    const pages: (number | string)[] = [];
    if (safeTotalPages <= 7) {
      for (let i = 1; i <= safeTotalPages; i++) {
        pages.push(i);
      }
    } else {
      if (safeCurrentPage <= 4) {
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
        pages.push("...");
        pages.push(safeTotalPages);
      } else if (safeCurrentPage >= safeTotalPages - 3) {
        pages.push(1);
        pages.push("...");
        for (let i = safeTotalPages - 4; i <= safeTotalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push("...");
        pages.push(safeCurrentPage - 1);
        pages.push(safeCurrentPage);
        pages.push(safeCurrentPage + 1);
        pages.push("...");
        pages.push(safeTotalPages);
      }
    }
    return pages;
  }, [safeTotalPages, safeCurrentPage]);

  return (
    <div
      className={clsx(
        "p-3.5 sm:p-4 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-400 shrink-0 select-none pb-28 md:pb-4",
        className
      )}
      data-testid="pagination-footer"
    >
      {/* =========================================================================
          Desktop View (>= md): Full Featured Controls
          ========================================================================= */}
      <div className="hidden md:flex items-center justify-between gap-4">
        {/* Left: Summary text */}
        <div className="flex items-center gap-2">
          <span>
            Showing{" "}
            <span className="font-bold text-white font-mono">
              {startItem}–{endItem}
            </span>{" "}
            of{" "}
            <span className="font-bold text-white font-mono">{totalItems}</span>{" "}
            {itemLabel}
          </span>
          <span className="text-zinc-600">|</span>
          <span className="text-zinc-500">
            Page <span className="font-semibold text-zinc-300">{safeCurrentPage}</span> of{" "}
            <span className="font-semibold text-zinc-300">{safeTotalPages}</span>
          </span>
        </div>

        {/* Right: Controls & Page Numbers */}
        <div className="flex items-center gap-3">
          {/* Page Size Selector */}
          {onPageSizeChange && (
            <div className="flex items-center gap-1.5 text-zinc-400 mr-2">
              <span className="text-[11px] text-zinc-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => onPageSizeChange(Number(e.target.value))}
                disabled={isLoading}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer"
                title="Items per page"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt} className="bg-zinc-900 text-zinc-200">
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Jump to First Page */}
          <button
            type="button"
            onClick={() => onPageChange(1)}
            disabled={safeCurrentPage <= 1 || isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="First Page"
          >
            <ChevronsLeft className="w-3.5 h-3.5" />
          </button>

          {/* Previous Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1 || isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Numbered Page Buttons */}
          <div className="flex items-center gap-1">
            {paginationRange.map((p, idx) => {
              if (p === "...") {
                return (
                  <span
                    key={`ellipsis-${idx}`}
                    className="px-2 py-1 text-zinc-600 font-mono select-none"
                  >
                    …
                  </span>
                );
              }
              const isCurrent = p === safeCurrentPage;
              return (
                <button
                  key={`page-${p}`}
                  type="button"
                  onClick={() => onPageChange(p as number)}
                  disabled={isLoading}
                  className={clsx(
                    "min-w-[28px] h-7 px-2 rounded-lg font-mono text-xs transition-colors font-medium",
                    isCurrent
                      ? "bg-emerald-500 text-zinc-950 font-bold border border-emerald-400 shadow-sm"
                      : "bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white"
                  )}
                >
                  {p}
                </button>
              );
            })}
          </div>

          {/* Next Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages || isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          {/* Jump to Last Page */}
          <button
            type="button"
            onClick={() => onPageChange(safeTotalPages)}
            disabled={safeCurrentPage >= safeTotalPages || isLoading}
            className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-300 hover:bg-zinc-800 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Last Page"
          >
            <ChevronsRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* =========================================================================
          Mobile View (< md): Touch-Friendly Streamlined Bar (Clear of FABs)
          ========================================================================= */}
      <div className="flex md:hidden flex-col gap-2.5 pr-14 md:pr-0">
        <div className="flex items-center justify-between text-xs">
          <div className="text-zinc-400">
            Page{" "}
            <span className="font-bold text-white font-mono">{safeCurrentPage}</span> of{" "}
            <span className="font-bold text-white font-mono">{safeTotalPages}</span>
            <span className="text-zinc-500 ml-1.5">
              ({totalItems} {itemLabel})
            </span>
          </div>

          {onPageSizeChange && (
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] text-zinc-500">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  onPageChange(1);
                  onPageSizeChange(Number(e.target.value));
                }}
                disabled={isLoading}
                className="bg-zinc-900 border border-zinc-800 text-zinc-200 text-xs rounded-lg px-2 py-1 focus:outline-none focus:border-emerald-500"
              >
                {pageSizeOptions.map((opt) => (
                  <option key={opt} value={opt}>
                    {opt}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Large Touch Target Prev/Next Buttons */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1 || isLoading}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium flex items-center justify-center gap-1.5 active:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Previous</span>
          </button>

          <button
            type="button"
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= safeTotalPages || isLoading}
            className="min-h-[40px] px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-200 font-medium flex items-center justify-center gap-1.5 active:bg-zinc-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors text-xs"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
