"use client";

import { useEffect, useState, ReactNode } from "react";
import { createPortal } from "react-dom";
import { 
  FileText, 
  Printer, 
  Download, 
  Copy, 
  Check, 
  ArrowLeft, 
  Ban, 
  CheckCircle,
  X 
} from "lucide-react";
import clsx from "clsx";

interface FloatingDocActionsButtonProps {
  onClick: () => void;
  label?: string;
  className?: string;
}

export function FloatingDocActionsButton({
  onClick,
  label = "Actions",
  className,
}: FloatingDocActionsButtonProps) {
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
      className={clsx(
        "fixed right-4 z-40 sm:hidden flex items-center gap-2 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold rounded-full active:scale-95 transition-all text-xs border border-emerald-500 no-print cursor-pointer",
        className
      )}
      aria-label="Open document actions sheet"
    >
      <FileText className="w-4 h-4 text-white" />
      <span className="font-bold tracking-wide text-white">{label}</span>
    </button>
  );

  return createPortal(content, document.body);
}

export interface MobileDocActionsSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  onPrint?: () => void;
  printLabel?: string;
  onDownloadCSV?: () => void;
  csvLabel?: string;
  onCopy?: () => void;
  copyLabel?: string;
  isCopied?: boolean;
  onDisburse?: () => void;
  disburseLabel?: string;
  isDisbursed?: boolean;
  onVoid?: () => void;
  voidLabel?: string;
  isVoidDisabled?: boolean;
  voidRestrictedText?: string;
  children?: ReactNode;
}

export function MobileDocActionsSheet({
  isOpen,
  onClose,
  title = "Document Actions",
  subtitle,
  onBack,
  backLabel = "Back to List",
  onPrint,
  printLabel = "Print / Save PDF",
  onDownloadCSV,
  csvLabel = "Download CSV Report",
  onCopy,
  copyLabel = "Copy Document Number",
  isCopied = false,
  onDisburse,
  disburseLabel = "Disburse Settlement",
  isDisbursed = false,
  onVoid,
  voidLabel = "Void Transaction",
  isVoidDisabled = false,
  voidRestrictedText,
  children,
}: MobileDocActionsSheetProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Lock scroll when open
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

  const content = (
    <div className="fixed inset-0 z-50 sm:hidden flex flex-col justify-end no-print">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/95 transition-opacity duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-up Sheet */}
      <div
        style={{
          paddingBottom: "max(1.5rem, env(safe-area-inset-bottom, 1.5rem))",
        }}
        className="relative z-10 w-full bg-zinc-900 border-t border-zinc-700 rounded-t-2xl max-h-[85vh] flex flex-col animate-in slide-in-from-bottom duration-200 font-sans text-zinc-100"
      >
        {/* Grab Handle */}
        <div className="w-full flex justify-center pt-3 pb-1">
          <div className="w-12 h-1.5 rounded-full bg-zinc-700" />
        </div>

        {/* Sheet Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-zinc-800">
          <div>
            <h2 className="text-sm font-bold text-white tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-[11px] text-zinc-400 font-mono mt-0.5">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors cursor-pointer"
            aria-label="Close action sheet"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Actions List */}
        <div className="p-4 space-y-2.5 overflow-y-auto">
          {/* Disburse Settlement Action (If provided) */}
          {onDisburse && !isDisbursed && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDisburse();
              }}
              className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2.5 transition-all border border-emerald-500 active:scale-[0.98] cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-white" />
              <span>{disburseLabel}</span>
            </button>
          )}

          {/* Print / Save PDF (Primary Action) */}
          {onPrint && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onPrint();
              }}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-white border border-zinc-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Printer className="w-4 h-4 text-zinc-300" />
              <span>{printLabel}</span>
            </button>
          )}

          {/* Download CSV */}
          {onDownloadCSV && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onDownloadCSV();
              }}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-white border border-zinc-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <Download className="w-4 h-4 text-zinc-300" />
              <span>{csvLabel}</span>
            </button>
          )}

          {/* Copy ID */}
          {onCopy && (
            <button
              type="button"
              onClick={onCopy}
              className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-white border border-zinc-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              {isCopied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-bold">Copied to Clipboard!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-zinc-300" />
                  <span>{copyLabel}</span>
                </>
              )}
            </button>
          )}

          {/* Back Navigation */}
          {onBack && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onBack();
              }}
              className="w-full py-3 px-4 rounded-xl bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-800 text-zinc-300 border border-zinc-800 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 text-zinc-400" />
              <span>{backLabel}</span>
            </button>
          )}

          {/* Void Action (If provided) */}
          {onVoid && (
            <div className="pt-2 border-t border-zinc-800">
              {!isVoidDisabled ? (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onVoid();
                  }}
                  className="w-full py-3 px-4 rounded-xl bg-zinc-800 hover:bg-zinc-700 active:bg-zinc-850 text-white border border-zinc-700 font-bold text-xs flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] cursor-pointer"
                >
                  <Ban className="w-4 h-4 text-zinc-400" />
                  <span>{voidLabel}</span>
                </button>
              ) : (
                <p className="text-[11px] text-zinc-500 italic text-center py-1">
                  {voidRestrictedText || "Action not permitted"}
                </p>
              )}
            </div>
          )}

          {/* Custom Children Slots */}
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
