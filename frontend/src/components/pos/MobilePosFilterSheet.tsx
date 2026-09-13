"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Filter, X, Search, Wrench, Package, Check } from "lucide-react";
import clsx from "clsx";

interface FloatingFilterFabProps {
  onClick: () => void;
  hasActiveFilters?: boolean;
}

export function FloatingFilterFab({ onClick, hasActiveFilters = false }: FloatingFilterFabProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return createPortal(
    <div
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 9rem)",
        right: "1rem",
        zIndex: 50,
      }}
      className="md:hidden animate-in fade-in zoom-in-95 duration-200"
    >
      <button
        onClick={onClick}
        type="button"
        aria-label="Filter Catalog"
        data-testid="pos-mobile-filter-fab"
        className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500 shadow-none transition-all transform active:scale-95 flex items-center justify-center relative cursor-pointer"
      >
        <Filter className="w-6 h-6 text-white" />
        {hasActiveFilters && (
          <span className="absolute top-1 right-1 w-3.5 h-3.5 rounded-full bg-white border-2 border-emerald-600" />
        )}
      </button>
    </div>,
    document.body
  );
}

interface MobilePosFilterSheetProps {
  isOpen: boolean;
  onClose: () => void;
  search: string;
  onSearchChange: (val: string) => void;
  activeFilter: "SERVICE" | "PRODUCT";
  onFilterChange: (type: "SERVICE" | "PRODUCT") => void;
  subFilters: { id: string; label: string; count?: number }[];
  activeSubFilter: string;
  onSubFilterChange: (id: string) => void;
  onReset: () => void;
  totalResults: number;
}

export function MobilePosFilterSheet({
  isOpen,
  onClose,
  search,
  onSearchChange,
  activeFilter,
  onFilterChange,
  subFilters,
  activeSubFilter,
  onSubFilterChange,
  onReset,
  totalResults,
}: MobilePosFilterSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center md:hidden animate-in fade-in duration-200">
      {/* Solid Black Backdrop (Zero Blur) */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/95 transition-opacity"
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Sheet */}
      <div
        data-testid="pos-mobile-filter-sheet"
        className="relative w-full max-h-[85vh] bg-zinc-950 border-t border-zinc-800 rounded-t-3xl shadow-none flex flex-col z-10 animate-in slide-in-from-bottom duration-300 text-zinc-100"
      >
        {/* Grab Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-zinc-800" />
        </div>

        {/* Sheet Header */}
        <div className="p-4 pb-3 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-emerald-400" />
              <span>Filter Catalog</span>
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Showing {totalResults} available item(s)
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scrollable Filters Body */}
        <div className="p-4 space-y-5 overflow-y-auto flex-1 touch-pan-y pb-6">
          
          {/* 1. Search Bar */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Search Item or SKU
            </label>
            <div className="relative">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                placeholder="Type item name, brand, or SKU..."
                value={search}
                onChange={(e) => onSearchChange(e.target.value)}
                data-testid="pos-mobile-search-input"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-none"
              />
            </div>
          </div>

          {/* 2. Type Switcher (Services vs Parts) */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Catalog Category
            </label>
            <div className="grid grid-cols-2 gap-2 bg-zinc-900 p-1.5 rounded-2xl border border-zinc-800">
              <button
                type="button"
                onClick={() => {
                  onFilterChange("SERVICE");
                  onSubFilterChange("ALL");
                }}
                className={clsx(
                  "py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                  activeFilter === "SERVICE"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-none"
                    : "bg-transparent text-zinc-400 hover:text-white border-transparent"
                )}
              >
                <Wrench className="w-4 h-4" />
                <span>Services</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onFilterChange("PRODUCT");
                  onSubFilterChange("ALL");
                }}
                className={clsx(
                  "py-2.5 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border",
                  activeFilter === "PRODUCT"
                    ? "bg-emerald-600 text-white border-emerald-500 shadow-none"
                    : "bg-transparent text-zinc-400 hover:text-white border-transparent"
                )}
              >
                <Package className="w-4 h-4" />
                <span>Parts</span>
              </button>
            </div>
          </div>

          {/* 3. Sub-Category Pills */}
          <div className="space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Specific {activeFilter === "SERVICE" ? "Service Type" : "Parts Category"}
            </label>
            <div className="grid grid-cols-2 gap-2">
              {subFilters.map((sub) => {
                const isSelected = activeSubFilter === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => onSubFilterChange(sub.id)}
                    className={clsx(
                      "p-2.5 rounded-xl text-xs font-semibold transition-all text-left flex items-center justify-between border",
                      isSelected
                        ? "bg-emerald-600 text-white font-bold border-emerald-500 shadow-none"
                        : "bg-zinc-900 border-zinc-800 text-zinc-300 hover:bg-zinc-850"
                    )}
                  >
                    <span className="truncate">{sub.label}</span>
                    <div className="flex items-center gap-1.5 shrink-0 ml-1">
                      {sub.count !== undefined && (
                        <span className={clsx(
                          "text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-md",
                          isSelected ? "bg-emerald-700 text-white" : "bg-zinc-800 text-zinc-400"
                        )}>
                          {sub.count}
                        </span>
                      )}
                      {isSelected && <Check className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

        </div>

        {/* Sheet Footer Actions */}
        <div className="p-4 border-t border-zinc-800 bg-zinc-950 flex items-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex-1 py-3 px-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-zinc-300 hover:text-white text-xs font-bold transition-all"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all border border-emerald-500"
          >
            Apply ({totalResults})
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
