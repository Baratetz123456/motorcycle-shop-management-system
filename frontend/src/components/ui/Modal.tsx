"use client";

import React, { useEffect, useState, useRef } from "react";
import { createPortal } from "react-dom";
import { X, AlertTriangle, AlertCircle, Info } from "lucide-react";
import clsx from "clsx";

export type ModalSize = "sm" | "md" | "lg" | "xl" | "2xl";
export type ModalVariant = "lime" | "cyan" | "purple" | "emerald" | "amber" | "rose";

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
  lime: "bg-zinc-800 border-zinc-700 text-zinc-300",
  cyan: "bg-zinc-800 border-zinc-700 text-zinc-300",
  purple: "bg-zinc-800 border-zinc-700 text-zinc-300",
  emerald: "bg-zinc-800 border-zinc-700 text-zinc-300",
  amber: "bg-zinc-800 border-zinc-700 text-zinc-300",
  rose: "bg-zinc-800 border-zinc-700 text-zinc-300",
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

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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

  if (!isOpen || !mounted) return null;

  const content = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/95 animate-in fade-in duration-200 overflow-y-auto"
      onClick={(e) => {
        if (!preventBackdropClose && e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        ref={contentRef}
        className={clsx(
          "bg-zinc-900 border border-zinc-700 rounded-2xl overflow-hidden animate-in zoom-in-95 duration-200 w-full relative font-sans text-zinc-100 flex flex-col my-auto",
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

  return createPortal(content, document.body);
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
        "px-6 py-5 border-b border-zinc-800 bg-zinc-900 flex items-center justify-between shrink-0",
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
                "w-10 h-10 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-300 flex items-center justify-center shrink-0",
                ICON_VARIANT_CLASSES[iconVariant]
              )}
            >
              {renderModalIcon(icon)}
            </div>
          )}
          <div>
            {title && <h2 className="text-lg font-bold text-zinc-100 tracking-tight">{title}</h2>}
            {subtitle && <p className="text-xs text-zinc-400 mt-0.5">{subtitle}</p>}
          </div>
        </div>
      )}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 transition-colors ml-auto shrink-0"
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
        "p-6 space-y-4 max-h-[calc(85vh-140px)] overflow-y-auto font-sans touch-pan-y overscroll-contain scrollbar-compact",
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
        "px-6 py-4 border-t border-zinc-800 bg-zinc-900 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 sm:gap-3 shrink-0",
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
      <AlertTriangle className="w-5 h-5 text-zinc-400" />
    ) : confirmVariant === "warning" ? (
      <AlertCircle className="w-5 h-5 text-zinc-400" />
    ) : (
      <Info className="w-5 h-5 text-zinc-400" />
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
            <div className="p-3.5 rounded-xl border border-zinc-700 bg-zinc-800 text-zinc-200 text-xs leading-relaxed">
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
          className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {cancelText}
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isLoading}
          className="w-full sm:w-auto px-5 py-2.5 rounded-xl font-bold text-xs text-white bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <span>Processing...</span>
          ) : (
            <span>{confirmText}</span>
          )}
        </button>
      </ModalFooter>
    </Modal>
  );
}
