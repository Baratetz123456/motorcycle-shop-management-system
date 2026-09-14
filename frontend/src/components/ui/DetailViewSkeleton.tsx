"use client";

import React from "react";
import { Skeleton } from "./Skeleton";
import clsx from "clsx";

interface DetailViewSkeletonProps {
  className?: string;
  hasTable?: boolean;
}

export function DetailViewSkeleton({
  className,
  hasTable = true,
}: DetailViewSkeletonProps) {
  return (
    <div className={clsx("w-full max-w-6xl mx-auto space-y-6 animate-in fade-in duration-200", className)}>
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-4 rounded" />
            <Skeleton className="h-4 w-24 rounded" />
          </div>
          <Skeleton className="h-8 w-64 rounded-xl" />
        </div>
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-24 rounded-xl" />
          <Skeleton className="h-10 w-32 rounded-xl" />
        </div>
      </div>

      {/* Primary Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="p-5 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-3 backdrop-blur-sm"
          >
            <div className="flex items-center justify-between">
              <Skeleton className="h-4 w-20 rounded" />
              <Skeleton className="w-8 h-8 rounded-lg" />
            </div>
            <Skeleton className="h-7 w-28 rounded-lg" />
            <Skeleton className="h-3.5 w-36 rounded" />
          </div>
        ))}
      </div>

      {/* Main Content Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left / Central Details Box */}
        <div className="lg:col-span-2 space-y-6">
          <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-6 backdrop-blur-sm">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <Skeleton className="h-6 w-36 rounded-lg" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3 w-16 rounded" />
                  <Skeleton className="h-5 w-3/4 rounded" />
                </div>
              ))}
            </div>

            {hasTable && (
              <div className="space-y-3 pt-4 border-t border-white/5">
                <Skeleton className="h-5 w-28 rounded" />
                <div className="space-y-2">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-white/[0.02] rounded-xl">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-8 h-8 rounded-lg" />
                        <div className="space-y-1">
                          <Skeleton className="h-4 w-32 rounded" />
                          <Skeleton className="h-3 w-20 rounded" />
                        </div>
                      </div>
                      <Skeleton className="h-4 w-16 rounded" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Aside Info */}
        <div className="space-y-6">
          <div className="p-6 bg-zinc-900/40 border border-white/5 rounded-2xl space-y-4 backdrop-blur-sm">
            <Skeleton className="h-5 w-32 rounded-lg" />
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="space-y-1 flex-1">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-3 w-36 rounded" />
                </div>
              </div>
              <Skeleton className="h-px w-full bg-white/5 my-2" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-full rounded" />
                <Skeleton className="h-4 w-4/5 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DetailViewSkeleton;
