"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { 
  SlidersHorizontal, 
  X 
} from "lucide-react";
import clsx from "clsx";

interface FloatingProfileActionsButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
  icon?: ReactNode;
}

export function FloatingProfileActionsButton({
  onClick,
  label = "Actions",
  className,
  icon,
}: FloatingProfileActionsButtonProps) {
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
      data-testid="mobile-profile-actions-fab"
      className={clsx(
        "fixed right-4 z-40 md:hidden flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-full active:scale-95 transition-all text-xs border border-emerald-500 cursor-pointer",
        className
      )}
      aria-label="Open profile actions sheet"
    >
      {icon || <SlidersHorizontal className="w-4 h-4 text-white" />}
      <span className="font-bold tracking-wide text-white">{label}</span>
    </button>
  );

  return createPortal(content, document.body);
}

export interface ProfileActionItem {
  id: string;
  label: string;
  icon: ReactNode;
  onClick: () => void;
  variant?: "default" | "primary" | "danger";
  disabled?: boolean;
}

export interface MobileProfileActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  actions: ProfileActionItem[];
}

export function MobileProfileActionsSheet({
  isOpen,
  onClose,
  title = "Quick Actions",
  subtitle,
  actions,
}: MobileProfileActionsSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Prevent background body scroll when open
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

  const sheetContent = (
    <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end" data-testid="mobile-profile-actions-sheet">
      {/* Solid Backdrop (Zero Blur, Zero Shadow) */}
      <div 
        className="fixed inset-0 bg-black/95 transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-Up Bottom Drawer Canvas */}
      <div 
        className="relative z-10 w-full bg-zinc-950 border-t border-zinc-800 rounded-t-3xl p-5 pb-8 space-y-4 animate-in slide-in-from-bottom duration-200"
        style={{
          paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 2rem)",
        }}
      >
        {/* Top Handle */}
        <div className="w-12 h-1 bg-zinc-700 rounded-full mx-auto mb-2" />

        {/* Header Bar */}
        <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
          <div>
            <h3 className="text-sm font-bold text-white tracking-tight">{title}</h3>
            {subtitle && (
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Close actions sheet"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Actions List */}
        <div className="space-y-2 pt-1">
          {actions.map((action) => {
            const isDanger = action.variant === "danger";
            const isPrimary = action.variant === "primary";

            return (
              <button
                key={action.id}
                type="button"
                disabled={action.disabled}
                onClick={() => {
                  onClose();
                  action.onClick();
                }}
                data-testid={`mobile-action-${action.id}`}
                className={clsx(
                  "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl font-bold text-xs transition-all text-left",
                  isPrimary && "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500",
                  isDanger && "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-300 hover:text-white",
                  !isPrimary && !isDanger && "bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-200 hover:text-white",
                  action.disabled && "opacity-40 cursor-not-allowed"
                )}
              >
                <span className={clsx(
                  "shrink-0",
                  isPrimary ? "text-white" : isDanger ? "text-zinc-400" : "text-zinc-400"
                )}>
                  {action.icon}
                </span>
                <span className="flex-1">{action.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );

  return createPortal(sheetContent, document.body);
}
