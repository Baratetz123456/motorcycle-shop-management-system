"use client";

import React from "react";
import { Skeleton } from "@/components/ui/Skeleton";
import clsx from "clsx";

export function PosCatalogCardsSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900/40 border border-white/5 rounded-2xl p-4 flex flex-col justify-between h-44 backdrop-blur-sm"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Skeleton className="h-4 w-16 rounded-full" />
              <Skeleton className="h-4 w-12 rounded-full" />
            </div>
            <Skeleton className="h-5 w-3/4 rounded-md" />
            <Skeleton className="h-3 w-1/2 rounded" />
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-white/5">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="w-8 h-8 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PosRepairsCardsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="bg-zinc-900/40 border border-white/5 rounded-2xl p-5 space-y-4 backdrop-blur-sm"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-24 rounded-lg" />
              <Skeleton className="h-5 w-16 rounded-full" />
            </div>
            <Skeleton className="h-4 w-20 rounded" />
          </div>
          <div className="space-y-1.5">
            <Skeleton className="h-5 w-2/3 rounded" />
            <Skeleton className="h-4 w-1/2 rounded" />
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-white/5">
            <Skeleton className="h-4 w-28 rounded" />
            <Skeleton className="h-8 w-24 rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PosCartSkeleton() {
  return (
    <div className="w-full h-full flex flex-col justify-between space-y-6 bg-zinc-950/60 border border-white/5 rounded-3xl p-5 backdrop-blur-md">
      <div className="space-y-4">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <Skeleton className="h-6 w-28 rounded-lg" />
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>

        {/* Selected Customer Box */}
        <div className="p-3 bg-white/[0.02] border border-white/5 rounded-2xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Skeleton className="w-9 h-9 rounded-full" />
            <div className="space-y-1">
              <Skeleton className="h-4 w-28 rounded" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
          </div>
          <Skeleton className="h-6 w-14 rounded-lg" />
        </div>

        {/* Cart Item Rows */}
        <div className="space-y-3 pt-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="p-3 bg-zinc-900/40 border border-white/5 rounded-xl flex items-center justify-between gap-3"
            >
              <div className="space-y-1 flex-1">
                <Skeleton className="h-4 w-32 rounded" />
                <Skeleton className="h-3 w-16 rounded" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="h-7 w-16 rounded-lg" />
                <Skeleton className="h-5 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Cart Summary & Checkout Actions */}
      <div className="space-y-4 pt-4 border-t border-white/5">
        <div className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-16 rounded" />
            <Skeleton className="h-3.5 w-14 rounded" />
          </div>
          <div className="flex justify-between">
            <Skeleton className="h-3.5 w-20 rounded" />
            <Skeleton className="h-3.5 w-12 rounded" />
          </div>
          <div className="flex justify-between pt-2 border-t border-white/5">
            <Skeleton className="h-5 w-24 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Skeleton className="h-11 w-full rounded-2xl" />
          <Skeleton className="h-11 w-full rounded-2xl" />
        </div>
      </div>
    </div>
  );
}

export function PosPageSkeleton() {
  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-6 p-4 sm:p-6 overflow-hidden max-w-full">
      {/* Catalog & Filter Area (Left) */}
      <div className="flex-1 flex flex-col space-y-4 min-w-0">
        {/* Top Customer Guard Banner Skeleton */}
        <div className="p-4 bg-zinc-900/40 border border-white/5 rounded-2xl flex items-center justify-between backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-xl" />
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44 rounded-lg" />
              <Skeleton className="h-3.5 w-64 rounded" />
            </div>
          </div>
          <Skeleton className="h-9 w-32 rounded-xl" />
        </div>

        {/* Tab & Search Bar */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Skeleton className="h-10 w-36 rounded-xl" />
            <Skeleton className="h-10 w-36 rounded-xl" />
          </div>
          <Skeleton className="h-10 w-full sm:w-64 rounded-xl" />
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-20 rounded-xl shrink-0" />
          ))}
        </div>

        {/* Catalog Grid */}
        <div className="flex-1 overflow-hidden pt-2">
          <PosCatalogCardsSkeleton count={8} />
        </div>
      </div>

      {/* Cart Sidebar (Right) */}
      <div className="w-full lg:w-96 shrink-0 h-[600px] lg:h-auto">
        <PosCartSkeleton />
      </div>
    </div>
  );
}

export default PosPageSkeleton;
