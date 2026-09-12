import React from "react";

interface BrandLogoProps {
  className?: string;
  size?: "sm" | "md" | "lg" | "xl" | number;
  variant?: "lime-on-dark" | "dark-on-lime" | "monochrome" | "lime-flat";
  showText?: boolean;
  subtitle?: string;
}

export function BrandLogo({
  className = "",
  size = "md",
  variant = "lime-on-dark",
  showText = false,
  subtitle = "Precision Workshop OS",
}: BrandLogoProps) {
  const pixelSize = typeof size === "number" ? size : {
    sm: 24,
    md: 32,
    lg: 40,
    xl: 56,
  }[size];

  // Container styling based on variant
  let containerBg = "bg-zinc-950 border border-zinc-800 shadow-sm";
  let primaryColor = "#84cc16"; // Kawasaki Lime
  let secondaryColor = "#ffffff";
  let accentColor = "#a3e635";

  if (variant === "dark-on-lime") {
    containerBg = "bg-lime-500 border border-lime-600 shadow-sm";
    primaryColor = "#09090b";
    secondaryColor = "#18181b";
    accentColor = "#27272a";
  } else if (variant === "lime-flat") {
    containerBg = "bg-transparent";
    primaryColor = "#84cc16";
    secondaryColor = "#ffffff";
    accentColor = "#bef264";
  } else if (variant === "monochrome") {
    containerBg = "bg-zinc-900 border border-zinc-700";
    primaryColor = "#ffffff";
    secondaryColor = "#a1a1aa";
    accentColor = "#71717a";
  }

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Emblem SVG Icon */}
      <div
        className={`flex items-center justify-center rounded-xl p-1 transition-transform group-hover:scale-105 shrink-0 ${containerBg}`}
        style={{ width: pixelSize, height: pixelSize }}
      >
        <svg
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
          aria-label="Versiklo MotoShop Precision Emblem"
        >
          {/* Subtle Technical Grid Hub */}
          <circle cx="50" cy="54" r="32" stroke={accentColor} strokeWidth="1.5" strokeDasharray="3 3" opacity="0.35" />
          
          {/* Precision Gear / Rotor Teeth (Workshop Core) */}
          <path
            d="M50 28 L53 32 L58 31 L60 36 L65 37 L65 42 L70 45 L68 50 L71 55 L67 59 L68 64 L63 67 L61 72 L56 72 L53 76 L47 76 L44 72 L39 72 L37 67 L32 64 L33 59 L29 55 L32 50 L30 45 L35 42 L35 37 L40 36 L42 31 L47 32 Z"
            fill="none"
            stroke={accentColor}
            strokeWidth="2.5"
            strokeLinejoin="round"
            opacity="0.45"
          />

          {/* Aerodynamic Motorcycle Front Cowl & Windshield */}
          <path
            d="M50 14 L68 28 L64 42 L50 36 L36 42 L32 28 Z"
            fill={primaryColor}
            stroke={primaryColor}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          {/* Cowl Central Air Intake Duct */}
          <path
            d="M50 22 L56 32 L50 35 L44 32 Z"
            fill="#09090b"
            stroke={primaryColor}
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Integrated Precision Workshop Wrench (Diagonal Fastener Grip) */}
          <path
            d="M50 42 L59 51 L55 55 L46 46 Z"
            fill={secondaryColor}
            opacity="0.9"
          />
          <path
            d="M59 51 L67 59 C69 61 69 64 67 66 C65 68 62 68 60 66 L52 58 Z"
            fill={primaryColor}
          />
          {/* Wrench Open Jaw Notch */}
          <path
            d="M65 62 L63 60 L61 62 L63 64 Z"
            fill="#09090b"
          />

          {/* Twin High-Octane Racing Speed Sweeps */}
          <path
            d="M20 50 C24 64 36 78 50 82"
            stroke={primaryColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
          <path
            d="M80 50 C76 64 64 78 50 82"
            stroke={primaryColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />

          {/* Central Hub Core Point */}
          <circle cx="50" cy="54" r="4.5" fill="#09090b" stroke={primaryColor} strokeWidth="2" />
        </svg>
      </div>

      {/* Optional Integrated Typography */}
      {showText && (
        <div className="flex flex-col text-left leading-none">
          <div className="flex items-center gap-1.5">
            <span className="text-base sm:text-lg font-black tracking-tight text-zinc-950 dark:text-zinc-50 font-sans">
              Versiklo
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-950 text-lime-400 font-bold uppercase tracking-wider">
              PRO
            </span>
          </div>
          {subtitle && (
            <span className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 font-semibold uppercase tracking-wider mt-1">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
