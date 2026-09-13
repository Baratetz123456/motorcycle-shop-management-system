"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";

export function ReportsSkeleton() {
  return (
    <div className="flex-1 flex flex-col p-4 sm:p-6 space-y-6 overflow-hidden max-w-7xl mx-auto w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1.5">
          <Skeleton className="h-8 w-64 rounded-xl" />
          <Skeleton className="h-4 w-80 rounded" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-32 rounded-xl" />
          <Skeleton className="h-10 w-28 rounded-xl" />
        </div>
      </div>

      {/* Top 5 Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-3.5 w-24 rounded" />
              <Skeleton className="w-8 h-8 rounded-xl" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-4 w-12 rounded-full" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Dual Analytics Charts Wireframes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Trend Area Chart Skeleton */}
        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-3.5 w-32 rounded" />
            </div>
            <Skeleton className="h-7 w-20 rounded-lg" />
          </div>
          <div className="h-64 w-full flex items-end gap-3 pt-6 px-2">
            {[40, 65, 30, 80, 55, 90, 75, 45, 60, 85, 70, 95].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton
                  style={{ height: `${h}%` }}
                  className="w-full rounded-t-lg bg-zinc-800/40"
                />
                <Skeleton className="h-2.5 w-4 rounded" />
              </div>
            ))}
          </div>
        </div>

        {/* Repairs Distribution Bar Chart Skeleton */}
        <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-4 backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <Skeleton className="h-5 w-48 rounded-lg" />
              <Skeleton className="h-3.5 w-36 rounded" />
            </div>
            <Skeleton className="h-7 w-24 rounded-lg" />
          </div>
          <div className="h-64 w-full flex items-end gap-4 pt-6 px-4">
            {[35, 70, 45, 85, 60].map((h, idx) => (
              <div key={idx} className="flex-1 flex flex-col items-center gap-2">
                <Skeleton
                  style={{ height: `${h}%` }}
                  className="w-full rounded-t-xl bg-zinc-800/40"
                />
                <Skeleton className="h-3 w-10 rounded" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Activity / Sales Table Skeleton */}
      <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-3xl space-y-4 backdrop-blur-sm">
        <div className="flex items-center justify-between pb-2">
          <Skeleton className="h-5 w-44 rounded-lg" />
          <Skeleton className="h-4 w-24 rounded" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center justify-between p-3.5 bg-white/[0.02] border border-white/5 rounded-2xl"
            >
              <div className="flex items-center gap-3">
                <Skeleton className="w-9 h-9 rounded-xl" />
                <div className="space-y-1">
                  <Skeleton className="h-4 w-32 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-4">
                <Skeleton className="h-5 w-20 rounded-full" />
                <Skeleton className="h-5 w-16 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default ReportsSkeleton;
