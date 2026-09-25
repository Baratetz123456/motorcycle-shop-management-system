"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import clsx from "clsx";

interface TableSkeletonProps {
  columns?: number | string[];
  rows?: number;
  showSearch?: boolean;
  showPagination?: boolean;
  className?: string;
  hasActionColumn?: boolean;
}

export function TableSkeleton({
  columns = 5,
  rows = 6,
  showSearch = true,
  showPagination = true,
  className,
  hasActionColumn = true,
}: TableSkeletonProps) {
  const columnCount = typeof columns === "number" ? columns : columns.length;
  const headerTitles = Array.isArray(columns) ? columns : null;

  // Randomized relative widths for realistic table cell data representation
  const getCellWidth = (rowIdx: number, colIdx: number) => {
    const widths = ["w-3/4", "w-1/2", "w-2/3", "w-4/5", "w-1/3"];
    return widths[(rowIdx + colIdx) % widths.length];
  };

  return (
    <div className={clsx("w-full space-y-4", className)}>
      {/* Search and Action Bar Skeleton */}
      {showSearch && (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 pb-2">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <Skeleton className="h-10 w-full rounded-xl" />
          </div>
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-28 rounded-xl" />
            <Skeleton className="h-10 w-32 rounded-xl" />
          </div>
        </div>
      )}

      {/* Table Container Skeleton */}
      <div className="bg-zinc-900/40 border border-white/5 rounded-2xl overflow-hidden backdrop-blur-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-zinc-950/80 border-b border-white/5 uppercase text-[11px] text-zinc-400 font-semibold tracking-wider">
              <tr>
                {Array.from({ length: columnCount }).map((_, i) => (
                  <th key={i} className="py-3.5 px-6">
                    {headerTitles ? (
                      <span className="opacity-40">{headerTitles[i]}</span>
                    ) : (
                      <Skeleton className="h-3.5 w-20 rounded" />
                    )}
                  </th>
                ))}
                {hasActionColumn && !headerTitles && (
                  <th className="py-3.5 px-6 text-right w-16">
                    <Skeleton className="h-3.5 w-8 rounded ml-auto" />
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {Array.from({ length: rows }).map((_, rIdx) => (
                <tr key={rIdx} className="hover:bg-white/[0.01]">
                  {Array.from({ length: columnCount }).map((_, cIdx) => (
                    <td key={cIdx} className="py-4 px-6">
                      <div className="flex items-center gap-2">
                        {cIdx === 0 && (
                          <Skeleton className="w-7 h-7 rounded-full shrink-0" />
                        )}
                        <Skeleton
                          className={clsx("h-4 rounded", getCellWidth(rIdx, cIdx))}
                        />
                      </div>
                    </td>
                  ))}
                  {hasActionColumn && !headerTitles && (
                    <td className="py-4 px-6 text-right">
                      <Skeleton className="h-6 w-12 rounded-lg ml-auto" />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination Skeleton */}
      {showPagination && (
        <div className="flex items-center justify-between pt-2 px-2">
          <Skeleton className="h-4 w-36 rounded" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-8 w-20 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-8 rounded-lg" />
            <Skeleton className="h-8 w-20 rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}

export default TableSkeleton;
