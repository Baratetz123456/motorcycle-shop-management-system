"use client";

import React, { useEffect, useRef } from "react";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";
export type ModalVariant = "cyan" | "purple" | "emerald" | "amber" | "rose";

export type ModalIconProp = React.ComponentType<{ className?: string }> | React.ReactNode;

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  icon?: ModalIconProp;
  iconVariant?: ModalVariant;
  size?: ModalSize;
  children: React.ReactNode;
  preventBackdropClose?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<ModalSize, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-xl",
  "2xl": "max-w-2xl",
};

const ICON_VARIANT_CLASSES: Record<ModalVariant, string> = {
  cyan: "bg-cyan-500/10 border-cyan-500/20 text-cyan-400",
  purple: "bg-purple-500/10 border-purple-500/20 text-purple-400",
  emerald: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
  amber: "bg-amber-500/10 border-amber-500/20 text-amber-400",
  rose: "bg-rose-500/10 border-rose-500/20 text-rose-400",
};

function renderModalIcon(icon: ModalIconProp) {
  if (!icon) return null;
  if (React.isValidElement(icon)) {
    return icon;
  }
  if (typeof icon === "function" || (typeof icon === "object" && icon !== null && "render" in (icon as any))) {
    const IconComponent = icon as React.ComponentType<{ className?: string }>;
    return <IconComponent className="w-5 h-5" />;
  }
  return icon as React.ReactNode;
}

export function Modal({
  isOpen,
  onClose,
  title,
  subtitle,
  icon,
  iconVariant = "cyan",
  size = "md",
  children,
  preventBackdropClose = false,
  className,
}: ModalProps) {
  const contentRef = useRef<HTMLDivElement>(null);

  // Close on Escape key
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (!preventBackdropClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={contentRef}
        className={clsx(
          "bg-zinc-900 border border-white/10 rounded-3xl shadow-2xl shadow-black/80 backdrop-blur-2xl overflow-hidden animate-in zoom-in-95 duration-200 w-full relative font-sans text-zinc-100 flex flex-col my-auto",
          SIZE_CLASSES[size],
          className
        )}
      >
        {/* Render built-in header if title is provided */}
        {title && (
          <ModalHeader
            title={title}
            subtitle={subtitle}
            icon={icon}
            iconVariant={iconVariant}
            onClose={onClose}
          />
        )}
        {children}
      </div>
    </div>
  );
}

export interface ModalHeaderProps {
  title?: string;
  subtitle?: string;
  icon?: ModalIconProp;
  iconVariant?: ModalVariant;
  onClose?: () => void;
  children?: React.ReactNode;
  className?: string;
}

export function ModalHeader({
  title,
  subtitle,
  icon,
  iconVariant = "cyan",
  onClose,
  children,
  className,
}: ModalHeaderProps) {
  return (
    <div
      className={clsx(
        "px-6 py-5 border-b border-white/10 bg-zinc-950/70 backdrop-blur-md flex items-center justify-between shrink-0",
        className
      )}
    >
      {children ? (
        children
      ) : (
        <div className="flex items-center gap-3.5">
          {icon && (
            <div
              className={clsx(
                "w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 shadow-sm",
                ICON_VARIANT_CLASSES[iconVariant]
              )}
            >
              {renderModalIcon(icon)}
            </div>
          )}
          <div>
            {title && <h2 className="text-lg font-bold text-white tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-white/10 transition-colors ml-auto shrink-0"
          title="Close dialog (Esc)"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

export function ModalBody({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto font-sans",
        className
      )}
    >
      {children}
    </div>
  );
}

export function ModalFooter({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "px-6 py-4 border-t border-white/10 bg-zinc-950/50 flex items-center justify-end gap-3 shrink-0",
        className
      )}
    >
      {children}
    </div>
  );
}

export interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  title: string;
  description?: React.ReactNode;
  message?: React.ReactNode;
  warningDetails?: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  confirmVariant?: "danger" | "warning" | "primary";
  isLoading?: boolean;
  icon?: ModalIconProp;
}

export function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  message,
  warningDetails,
  confirmText = "Confirm",
  cancelText = "Cancel",
  confirmVariant = "danger",
  isLoading = false,
  icon,
}: ConfirmModalProps) {
  const iconVariant = confirmVariant === "danger" ? "rose" : confirmVariant === "warning" ? "amber" : "cyan";

  const defaultIcon =
    confirmVariant === "danger" ? (
      <AlertTriangle className="w-5 h-5" />
    ) : confirmVariant === "warning" ? (
      <AlertCircle className="w-5 h-5" />
    ) : (
      <Info className="w-5 h-5" />
    );

  const modalBodyContent = message !== undefined ? message : description;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="md"
      title={title}
      icon={icon || defaultIcon}
      iconVariant={iconVariant}
      preventBackdropClose={isLoading}
    >
      <ModalBody>
        <div className="space-y-3 text-sm text-zinc-300">
          <div>{modalBodyContent}</div>
          {warningDetails && (
            <div
              className={clsx(
                "p-3.5 rounded-xl border text-xs leading-relaxed",
                confirmVariant === "danger"
                  ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-300"
              )}
            >
              {warningDetails}
            </div>
          )}
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={onClose}
          disabled={isLoading}
          className="px-4 py-2.5 rounded-xl border border-white/10 hover:border-white/20 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white text-xs font-semibold transition-all disabled:opacity-50"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className={clsx(
            "px-5 py-2.5 rounded-xl text-white font-bold text-xs shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2",
            confirmVariant === "danger"
              ? "bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-600/20"
              : confirmVariant === "warning"
              ? "bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 shadow-amber-600/20"
              : "bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 shadow-cyan-500/20"
          )}
        >
          {isLoading ? (
            <span>Processing...</span>
          ) : (
            <>
              <span>{confirmText}</span>
            </>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
