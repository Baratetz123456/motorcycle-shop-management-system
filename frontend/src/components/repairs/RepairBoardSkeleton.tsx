"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import clsx from "clsx";

export function RepairBoardSkeleton() {
  const columns = [
    { title: "Pending", color: "border-amber-500/30" },
    { title: "Ongoing", color: "border-cyan-500/30" },
    { title: "Completed", color: "border-emerald-500/30" },
    { title: "Released", color: "border-zinc-500/30" },
  ];

  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-6 overflow-hidden max-w-full">
      {/* Header & Filter Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-56 rounded-xl" />
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
          <Skeleton className="h-4 w-72 rounded" />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Skeleton className="h-10 w-48 sm:w-64 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
          <Skeleton className="h-10 w-36 rounded-xl" />
        </div>
      </div>

      {/* 4-Column Kanban Board Layout */}
      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-6 overflow-hidden min-h-[600px]">
        {columns.map((col, idx) => (
          <div
            key={idx}
            className={clsx(
              "flex flex-col rounded-3xl bg-zinc-950/60 border border-white/5 p-4 backdrop-blur-md",
              col.color
            )}
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
              <div className="flex items-center gap-2">
                <Skeleton className="w-2.5 h-2.5 rounded-full" />
                <Skeleton className="h-5 w-24 rounded-md" />
              </div>
              <Skeleton className="h-5 w-7 rounded-full" />
            </div>

            {/* Column Cards */}
            <div className="flex-1 space-y-3.5 overflow-hidden">
              {Array.from({ length: idx === 3 ? 1 : 2 }).map((_, cIdx) => (
                <div
                  key={cIdx}
                  className="p-4 rounded-2xl bg-zinc-900/40 border border-white/5 space-y-3 backdrop-blur-sm"
                >
                  {/* Card Top: JO number and time */}
                  <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24 rounded-full" />
                    <Skeleton className="h-3 w-14 rounded" />
                  </div>

                  {/* Card Body: Bike model & Customer */}
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4 rounded-md" />
                    <div className="flex items-center gap-2">
                      <Skeleton className="w-4 h-4 rounded-full" />
                      <Skeleton className="h-3.5 w-28 rounded" />
                    </div>
                  </div>

                  {/* Mechanic / Parts info */}
                  <div className="flex items-center justify-between pt-2 border-t border-white/5 text-xs">
                    <div className="flex items-center gap-1.5">
                      <Skeleton className="w-5 h-5 rounded-full" />
                      <Skeleton className="h-3 w-16 rounded" />
                    </div>
                    <Skeleton className="h-5 w-16 rounded-md" />
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 pt-1">
                    <Skeleton className="h-7 flex-1 rounded-xl" />
                    <Skeleton className="h-7 w-8 rounded-xl" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default RepairBoardSkeleton;
