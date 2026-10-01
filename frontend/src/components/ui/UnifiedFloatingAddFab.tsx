"use client";

import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Plus, UserPlus } from "lucide-react";
import clsx from "clsx";

export interface UnifiedFloatingAddFabProps {
  onClick?: () => void;
  href?: string;
  icon?: "plus" | "user-plus";
  ariaLabel?: string;
  className?: string;
  dataTestId?: string;
}

export function UnifiedFloatingAddFab({
  onClick,
  href,
  icon = "plus",
  ariaLabel = "Add Item",
  className,
  dataTestId = "mobile-floating-add-fab",
}: UnifiedFloatingAddFabProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  const IconComponent = icon === "user-plus" ? UserPlus : Plus;

  const buttonClasses = clsx(
    "w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/40 shadow-xl shadow-emerald-950/60 transition-all transform active:scale-95 flex items-center justify-center relative cursor-pointer",
    className
  );

  const innerIcon = <IconComponent className="w-6 h-6 text-white" />;

  const content = (
    <div
      style={{
        position: "fixed",
        bottom: "calc(env(safe-area-inset-bottom, 0px) + 5.25rem)",
        right: "1rem",
        zIndex: 50,
      }}
      className="md:hidden animate-in fade-in zoom-in-95 duration-200"
    >
      {href ? (
        <Link
          href={href}
          aria-label={ariaLabel}
          data-testid={dataTestId}
          className={buttonClasses}
        >
          {innerIcon}
        </Link>
      ) : (
        <button
          onClick={onClick}
          type="button"
          aria-label={ariaLabel}
          data-testid={dataTestId}
          className={buttonClasses}
        >
          {innerIcon}
        </button>
      )}
    </div>
  );

  return createPortal(content, document.body);
}
