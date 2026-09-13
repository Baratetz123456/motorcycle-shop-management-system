"use client";

import React, { useId } from "react";

interface CategoryCardBannerProps {
  category?: string;
  itemType?: "PRODUCT" | "SERVICE";
  name?: string;
  brand?: string;
}

export function CategoryCardBanner({
  category = "",
  itemType = "PRODUCT",
  name = "",
  brand = "",
}: CategoryCardBannerProps) {
  const norm = `${category} ${name}`.toLowerCase();
  const idPrefix = useId().replace(/:/g, "_");

  // Determine category theme with strict precedence
  // 1. Brakes must be checked BEFORE fluids to avoid "Brake Fluid" matching general oil/fluid
  const isBrake = norm.includes("brake") || norm.includes("pad") || norm.includes("rotor") || norm.includes("caliper") || norm.includes("shoe") || norm.includes("disc");
  const isOil = !isBrake && (norm.includes("oil") || norm.includes("lube") || norm.includes("fluid") || norm.includes("lubricant") || norm.includes("coolant") || norm.includes("motul") || norm.includes("castrol"));
  const isTransmission = norm.includes("transmission") || norm.includes("cvt") || norm.includes("belt") || norm.includes("pulley") || norm.includes("clutch") || norm.includes("roller") || norm.includes("flyball") || norm.includes("gear") || norm.includes("chain");
  const isSuspension = norm.includes("suspension") || norm.includes("fork") || norm.includes("shock") || norm.includes("absorber") || norm.includes("spring") || norm.includes("seal");
  const isTire = norm.includes("tire") || norm.includes("tube") || norm.includes("wheel") || norm.includes("rim") || norm.includes("spoke");
  const isEngine = norm.includes("engine") || norm.includes("piston") || norm.includes("gasket") || norm.includes("spark") || norm.includes("plug") || norm.includes("exhaust") || norm.includes("pipe") || norm.includes("overhaul") || norm.includes("cylinder") || norm.includes("valve");
  const isElectrical = norm.includes("electr") || norm.includes("battery") || norm.includes("wire") || norm.includes("light") || norm.includes("bulb") || norm.includes("starter") || norm.includes("horn") || norm.includes("fuse") || norm.includes("relay");
  const isDiagnostic = norm.includes("diagnostic") || norm.includes("inspect") || norm.includes("scan") || norm.includes("ecu");
  const isTuneup = norm.includes("tune") || norm.includes("maintenance") || norm.includes("carburetor") || norm.includes("cleaning") || norm.includes("filter") || norm.includes("wash");
  const isAccessory = norm.includes("access") || norm.includes("helmet") || norm.includes("grip") || norm.includes("mirror") || norm.includes("box") || norm.includes("lock") || norm.includes("topbox");

  // Determine Theme Palette & Accents
  let glowColor = "bg-emerald-500/15";
  let pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";

  if (isBrake) {
    glowColor = "bg-rose-500/15";
    pillStyle = "bg-rose-950/90 text-rose-300 border-rose-800/80";
  } else if (isOil) {
    glowColor = "bg-amber-500/15";
    pillStyle = "bg-amber-950/90 text-amber-300 border-amber-800/80";
  } else if (isTransmission) {
    glowColor = "bg-indigo-500/15";
    pillStyle = "bg-indigo-950/90 text-indigo-300 border-indigo-800/80";
  } else if (isSuspension) {
    glowColor = "bg-cyan-500/15";
    pillStyle = "bg-cyan-950/90 text-cyan-300 border-cyan-800/80";
  } else if (isEngine) {
    glowColor = "bg-orange-500/15";
    pillStyle = "bg-orange-950/90 text-orange-300 border-orange-800/80";
  } else if (isTire) {
    glowColor = "bg-zinc-400/15";
    pillStyle = "bg-zinc-900/90 text-zinc-300 border-zinc-700";
  } else if (isElectrical) {
    glowColor = "bg-violet-500/15";
    pillStyle = "bg-violet-950/90 text-violet-300 border-violet-800/80";
  } else if (isDiagnostic) {
    glowColor = "bg-teal-500/15";
    pillStyle = "bg-teal-950/90 text-teal-300 border-teal-800/80";
  } else if (isAccessory) {
    glowColor = "bg-yellow-500/15";
    pillStyle = "bg-yellow-950/90 text-yellow-300 border-yellow-800/80";
  }

  return (
    <div className="w-full h-24 sm:h-28 bg-gradient-to-b from-zinc-900 to-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/80 rounded-t-2xl select-none">
      {/* Background Subtle Technical Grid Pattern */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`pos-grid-${idPrefix}`} width="12" height="12" patternUnits="userSpaceOnUse">
              <path d="M 12 0 L 0 0 0 12" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-500" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#pos-grid-${idPrefix})`} />
        </svg>
      </div>

      {/* Workshop Horizon Studio Lighting Line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700/50 to-transparent" />

      {/* Category Themed Ambient Glow */}
      <div className={`absolute w-32 h-32 rounded-full ${glowColor} blur-xl pointer-events-none`} />

      {/* Brand Watermark Badge (Top-Left) */}
      {brand && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-400 z-10 truncate max-w-[120px]">
          {brand}
        </span>
      )}

      {/* Photorealistic Category Render SVG Artwork */}
      {isBrake ? (
        // High-Performance Drilled Ventilated Disc Rotor & Red Anodized Racing Caliper
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`rotor-steel-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#71717a" />
              <stop offset="25%" stopColor="#d4d4d8" />
              <stop offset="50%" stopColor="#52525b" />
              <stop offset="75%" stopColor="#e4e4e7" />
              <stop offset="100%" stopColor="#3f3f46" />
            </linearGradient>
            <radialGradient id={`hub-center-${idPrefix}`} cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="70%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </radialGradient>
            <linearGradient id={`caliper-red-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f43f5e" />
              <stop offset="50%" stopColor="#e11d48" />
              <stop offset="100%" stopColor="#881337" />
            </linearGradient>
          </defs>

          {/* Outer Cast Steel Rotor with Multi-Stop Metallic Texture */}
          <circle cx="50" cy="50" r="38" fill={`url(#rotor-steel-${idPrefix})`} stroke="#27272a" strokeWidth="1.5" />
          {/* Outer Friction Surface Track */}
          <circle cx="50" cy="50" r="34" stroke="#a1a1aa" strokeWidth="0.75" strokeDasharray="3 1.5" fill="none" opacity="0.6" />
          <circle cx="50" cy="50" r="24" fill="#18181b" stroke="#3f3f46" strokeWidth="1.5" />

          {/* Center Anodized Aluminum Carrier Hub */}
          <circle cx="50" cy="50" r="15" fill={`url(#hub-center-${idPrefix})`} stroke="#52525b" strokeWidth="1" />
          <circle cx="50" cy="50" r="6" fill="#09090b" stroke="#71717a" strokeWidth="1" />

          {/* 5-Bolt Hub Mounting Holes */}
          <circle cx="50" cy="39" r="2.2" fill="#d4d4d8" stroke="#18181b" strokeWidth="0.8" />
          <circle cx="60.5" cy="46.5" r="2.2" fill="#d4d4d8" stroke="#18181b" strokeWidth="0.8" />
          <circle cx="56.5" cy="59" r="2.2" fill="#d4d4d8" stroke="#18181b" strokeWidth="0.8" />
          <circle cx="43.5" cy="59" r="2.2" fill="#d4d4d8" stroke="#18181b" strokeWidth="0.8" />
          <circle cx="39.5" cy="46.5" r="2.2" fill="#d4d4d8" stroke="#18181b" strokeWidth="0.8" />

          {/* Chamfered Cooling Holes (Double concentric rings) */}
          <circle cx="50" cy="21" r="1.5" fill="#09090b" />
          <circle cx="50" cy="79" r="1.5" fill="#09090b" />
          <circle cx="21" cy="50" r="1.5" fill="#09090b" />
          <circle cx="79" cy="50" r="1.5" fill="#09090b" />
          <circle cx="29.5" cy="29.5" r="1.5" fill="#09090b" />
          <circle cx="70.5" cy="70.5" r="1.5" fill="#09090b" />
          <circle cx="29.5" cy="70.5" r="1.5" fill="#09090b" />
          <circle cx="70.5" cy="29.5" r="1.5" fill="#09090b" />
          <circle cx="50" cy="26" r="1.2" fill="#09090b" />
          <circle cx="50" cy="74" r="1.2" fill="#09090b" />
          <circle cx="26" cy="50" r="1.2" fill="#09090b" />
          <circle cx="74" cy="50" r="1.2" fill="#09090b" />

          {/* Anodized 4-Piston Racing Caliper Body (Top Right Clamping Area) */}
          <path
            d="M62 14 C75 18 86 29 90 42 L80 46 C77 35 69 27 58 24 Z"
            fill={`url(#caliper-red-${idPrefix})`}
            stroke="#9f1239"
            strokeWidth="1.5"
          />
          {/* Caliper Bleeder Valve & Piston Caps */}
          <circle cx="70" cy="24" r="3" fill="#09090b" stroke="#fecdd3" strokeWidth="0.8" />
          <circle cx="81" cy="34" r="3" fill="#09090b" stroke="#fecdd3" strokeWidth="0.8" />
          <rect x="68" y="11" width="3" height="4" rx="1" fill="#e4e4e7" stroke="#3f3f46" strokeWidth="0.5" />
        </svg>
      ) : isOil ? (
        // Synthetic Oil & Fluid Container with Golden Viscosity Amber Gradient & Volumetric Window
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`bottle-plastic-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1c1917" />
              <stop offset="30%" stopColor="#292524" />
              <stop offset="70%" stopColor="#44403c" />
              <stop offset="100%" stopColor="#1c1917" />
            </linearGradient>
            <linearGradient id={`oil-amber-${idPrefix}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#f59e0b" />
              <stop offset="100%" stopColor="#b45309" />
            </linearGradient>
            <linearGradient id={`cap-ribbed-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#b45309" />
              <stop offset="50%" stopColor="#fbbf24" />
              <stop offset="100%" stopColor="#92400e" />
            </linearGradient>
          </defs>

          {/* Bottle Ergonomic Handle & Neck */}
          <path d="M42 16 L58 16 L56 22 L44 22 Z" fill="#292524" stroke="#57534e" strokeWidth="1" />
          
          {/* Threaded Ribbed Cap */}
          <rect x="40" y="10" width="20" height="7" rx="1.5" fill={`url(#cap-ribbed-${idPrefix})`} stroke="#78350f" strokeWidth="1" />
          <line x1="44" y1="10" x2="44" y2="17" stroke="#78350f" strokeWidth="0.8" />
          <line x1="48" y1="10" x2="48" y2="17" stroke="#78350f" strokeWidth="0.8" />
          <line x1="52" y1="10" x2="52" y2="17" stroke="#78350f" strokeWidth="0.8" />
          <line x1="56" y1="10" x2="56" y2="17" stroke="#78350f" strokeWidth="0.8" />

          {/* Molded Bottle Silhouette with Side Handle Loop */}
          <path
            d="M36 24 C40 22 60 22 64 24 L72 32 C75 35 77 42 76 80 C75 85 71 88 66 88 L34 88 C29 88 25 85 24 80 C23 42 25 35 28 32 Z"
            fill={`url(#bottle-plastic-${idPrefix})`}
            stroke="#57534e"
            strokeWidth="1.5"
          />

          {/* Ergonomic Molded Side Grip Indentations */}
          <path d="M28 44 C31 46 31 52 28 54 M28 58 C31 60 31 66 28 68 M28 72 C31 74 31 78 28 80" stroke="#78716c" strokeWidth="1.5" strokeLinecap="round" />

          {/* Vertical Translucent Fluid Level Inspection Window */}
          <rect x="46" y="36" width="8" height="42" rx="4" fill="#0c0a09" stroke="#57534e" strokeWidth="1" />
          {/* Viscous Amber Golden Synthetic Oil Inside Tube */}
          <rect x="47.5" y="46" width="5" height="30.5" rx="2.5" fill={`url(#oil-amber-${idPrefix})`} />
          
          {/* Fluid Volume Hash Marks (100ml, 200ml, 500ml) */}
          <line x1="54" y1="52" x2="58" y2="52" stroke="#d6d3d1" strokeWidth="1" />
          <line x1="54" y1="60" x2="58" y2="60" stroke="#d6d3d1" strokeWidth="1" />
          <line x1="54" y1="68" x2="58" y2="68" stroke="#d6d3d1" strokeWidth="1" />

          {/* Floating Viscous Gold Oil Droplet */}
          <path d="M78 24 C78 28 74 33 74 33 C74 33 70 28 70 24 C70 21.8 71.8 20 74 20 C76.2 20 78 21.8 78 24 Z" fill={`url(#oil-amber-${idPrefix})`} stroke="#f59e0b" strokeWidth="0.8" />
        </svg>
      ) : isTransmission ? (
        // CVT Variator Pulley, Heavy-Duty Ribbed Drive Belt & Centrifugal Clutch
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`pulley-metal-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#cbd5e1" />
              <stop offset="50%" stopColor="#475569" />
              <stop offset="100%" stopColor="#1e293b" />
            </linearGradient>
            <linearGradient id={`belt-rubber-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#18181b" />
              <stop offset="50%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </linearGradient>
          </defs>

          {/* Drive Pulley Variator Face (Left) */}
          <circle cx="34" cy="50" r="22" fill={`url(#pulley-metal-${idPrefix})`} stroke="#334155" strokeWidth="1.5" />
          <circle cx="34" cy="50" r="14" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
          <circle cx="34" cy="50" r="6" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1" />

          {/* Driven Pulley / Clutch Bell (Right) */}
          <circle cx="70" cy="50" r="17" fill={`url(#pulley-metal-${idPrefix})`} stroke="#334155" strokeWidth="1.5" />
          <circle cx="70" cy="50" r="9" fill="#0f172a" stroke="#64748b" strokeWidth="1" />
          <circle cx="70" cy="50" r="4" fill="#cbd5e1" stroke="#0f172a" strokeWidth="1" />

          {/* Kevlar Reinforced Ribbed Continuous Drive Belt */}
          <path
            d="M34 28 L70 33 C80 34 87 41 87 50 C87 59 80 66 70 67 L34 72 C22 72 12 62 12 50 C12 38 22 28 34 28 Z"
            fill="none"
            stroke={`url(#belt-rubber-${idPrefix})`}
            strokeWidth="7"
          />
          {/* Belt Outer Cording Line */}
          <path
            d="M34 25 L70 30 C82 31 90 39 90 50 C90 61 82 69 70 70 L34 75 C20 75 9 64 9 50 C9 36 20 25 34 25 Z"
            fill="none"
            stroke="#6366f1"
            strokeWidth="1.2"
          />

          {/* Internal Cog Notches / Teeth on Belt */}
          <line x1="42" y1="33" x2="42" y2="37" stroke="#4338ca" strokeWidth="1.5" />
          <line x1="52" y1="34" x2="52" y2="38" stroke="#4338ca" strokeWidth="1.5" />
          <line x1="62" y1="35" x2="62" y2="39" stroke="#4338ca" strokeWidth="1.5" />
          <line x1="42" y1="63" x2="42" y2="67" stroke="#4338ca" strokeWidth="1.5" />
          <line x1="52" y1="62" x2="52" y2="66" stroke="#4338ca" strokeWidth="1.5" />
          <line x1="62" y1="61" x2="62" y2="65" stroke="#4338ca" strokeWidth="1.5" />
        </svg>
      ) : isSuspension ? (
        // Gas-Charged Monoshock Absorber with Dual-Rate Metallic Spring & Polished Shaft
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`spring-cyan-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#0891b2" />
              <stop offset="40%" stopColor="#22d3ee" />
              <stop offset="70%" stopColor="#67e8f9" />
              <stop offset="100%" stopColor="#0e7490" />
            </linearGradient>
            <linearGradient id={`damper-shaft-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#94a3b8" />
              <stop offset="50%" stopColor="#f8fafc" />
              <stop offset="100%" stopColor="#64748b" />
            </linearGradient>
          </defs>

          {/* Top CNC Mounting Eyelet Bushing */}
          <circle cx="50" cy="14" r="8" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" />
          <circle cx="50" cy="14" r="4" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />

          {/* Remote Gas Piggyback Sub-Tank (Upper Right) */}
          <rect x="64" y="20" width="12" height="24" rx="3" fill="#0e7490" stroke="#0891b2" strokeWidth="1" />
          <line x1="56" y1="24" x2="64" y2="24" stroke="#06b6d4" strokeWidth="2" />

          {/* Micro-Polished Chrome Damper Shaft */}
          <rect x="47" y="22" width="6" height="58" fill={`url(#damper-shaft-${idPrefix})`} stroke="#475569" strokeWidth="0.8" />

          {/* Upper Anodized Preload Lock Rings */}
          <rect x="36" y="24" width="28" height="4" rx="1" fill="#0891b2" stroke="#164e63" strokeWidth="1" />
          <rect x="37" y="28" width="26" height="3" rx="1" fill="#0e7490" stroke="#164e63" strokeWidth="1" />

          {/* Coiled Suspension Heavy-Duty Dual-Rate Spring */}
          <path
            d="M36 33 C36 31 64 31 64 35 C64 39 36 39 36 43 C36 47 64 47 64 51 C64 55 36 55 36 59 C36 63 64 63 64 67 C64 71 36 71 36 75 C36 78 64 78 64 80"
            fill="none"
            stroke={`url(#spring-cyan-${idPrefix})`}
            strokeWidth="5"
            strokeLinecap="round"
          />

          {/* Bottom Mounting Eyelet with Rubber Bump-Stop */}
          <rect x="44" y="78" width="12" height="6" rx="2" fill="#0f172a" stroke="#334155" strokeWidth="1" />
          <circle cx="50" cy="88" r="7" fill="#1e293b" stroke="#06b6d4" strokeWidth="1.5" />
          <circle cx="50" cy="88" r="3.5" fill="#0f172a" stroke="#94a3b8" strokeWidth="1" />
        </svg>
      ) : isTire ? (
        // Motorcycle Wheel Rim with Directional Silica Tread Grooves & Central Brake Hub
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`tire-rubber-${idPrefix}`} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#18181b" />
              <stop offset="85%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#09090b" />
            </radialGradient>
            <linearGradient id={`rim-silver-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#e4e4e7" />
              <stop offset="50%" stopColor="#71717a" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>
          </defs>

          {/* Deep Carbon Rubber Tire Profile */}
          <circle cx="50" cy="50" r="40" fill={`url(#tire-rubber-${idPrefix})`} stroke="#3f3f46" strokeWidth="2" />
          <circle cx="50" cy="50" r="28" fill="#18181b" stroke="#52525b" strokeWidth="1.5" />

          {/* Cast Alloy 6-Spoke Wheel Rim */}
          <circle cx="50" cy="50" r="26" fill={`url(#rim-silver-${idPrefix})`} stroke="#09090b" strokeWidth="1" />
          <circle cx="50" cy="50" r="10" fill="#09090b" stroke="#a1a1aa" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="4" fill="#e4e4e7" />

          {/* Directional Wheel Spokes */}
          <line x1="50" y1="24" x2="50" y2="40" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="50" y1="60" x2="50" y2="76" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="37" x2="41" y2="45" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="59" y1="55" x2="72" y2="63" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="28" y1="63" x2="41" y2="55" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />
          <line x1="59" y1="45" x2="72" y2="37" stroke="#e4e4e7" strokeWidth="2.5" strokeLinecap="round" />

          {/* Directional Wet/Dry Tread Grooves Around Perimeter */}
          <path d="M47 12 L53 12 M47 88 L53 88 M12 47 L12 53 M88 47 L88 53" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
          <path d="M22 24 L27 28 M73 72 L78 76 M22 76 L27 72 M73 28 L78 24" stroke="#71717a" strokeWidth="2" strokeLinecap="round" />
        </svg>
      ) : isEngine ? (
        // Forged Aluminum Piston, Wrist Pin, and Heavy-Duty I-Beam Connecting Rod
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`piston-crown-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#7c2d12" />
              <stop offset="30%" stopColor="#ea580c" />
              <stop offset="70%" stopColor="#fb923c" />
              <stop offset="100%" stopColor="#9a3412" />
            </linearGradient>
            <linearGradient id={`conrod-steel-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#431407" />
              <stop offset="50%" stopColor="#9a3412" />
              <stop offset="100%" stopColor="#27272a" />
            </linearGradient>
          </defs>

          {/* Machined Piston Head Crown with Valve Relief Indentations */}
          <rect x="26" y="14" width="48" height="28" rx="4" fill={`url(#piston-crown-${idPrefix})`} stroke="#c2410c" strokeWidth="1.5" />
          <path d="M34 14 C38 18 44 18 48 14 M52 14 C56 18 62 18 66 14" stroke="#ffedd5" strokeWidth="1.2" />

          {/* Piston Compression & Oil Scraper Ring Grooves */}
          <line x1="26" y1="20" x2="74" y2="20" stroke="#1c1917" strokeWidth="1.5" />
          <line x1="26" y1="24" x2="74" y2="24" stroke="#1c1917" strokeWidth="1.5" />
          <line x1="26" y1="28" x2="74" y2="28" stroke="#1c1917" strokeWidth="1.5" />

          {/* Center Wrist Pin Boss */}
          <circle cx="50" cy="33" r="5" fill="#1c1917" stroke="#fed7aa" strokeWidth="1.5" />

          {/* High-Strength Forged I-Beam Connecting Rod */}
          <path
            d="M44 40 L43 72 C39 74 36 78 36 84 C36 91 42 96 50 96 C58 96 64 91 64 84 C64 78 61 74 57 72 L56 40 Z"
            fill={`url(#conrod-steel-${idPrefix})`}
            stroke="#ea580c"
            strokeWidth="1.5"
          />
          {/* I-Beam Central Recess Channel */}
          <rect x="47" y="44" width="6" height="26" rx="2" fill="#18181b" stroke="#7c2d12" strokeWidth="0.8" />

          {/* Big-End Crankshaft Bearing Journal & Rod Bolts */}
          <circle cx="50" cy="84" r="7" fill="#09090b" stroke="#fdba74" strokeWidth="1.5" />
          <circle cx="39" cy="84" r="1.5" fill="#fed7aa" />
          <circle cx="61" cy="84" r="1.5" fill="#fed7aa" />
        </svg>
      ) : isElectrical ? (
        // Sealed Maintenance-Free AGM Battery with Lead Terminals & High-Voltage Discharge
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`battery-case-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2e1065" />
              <stop offset="50%" stopColor="#4c1d95" />
              <stop offset="100%" stopColor="#0f172a" />
            </linearGradient>
            <linearGradient id={`lightning-bolt-${idPrefix}`} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c4b5fd" />
              <stop offset="50%" stopColor="#a855f7" />
              <stop offset="100%" stopColor="#7e22ce" />
            </linearGradient>
          </defs>

          {/* Lead/Brass Positive & Negative Top Posts */}
          <rect x="28" y="16" width="10" height="7" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />
          <rect x="62" y="16" width="10" height="7" rx="1.5" fill="#cbd5e1" stroke="#475569" strokeWidth="1" />

          {/* Battery Sealed Top Cover */}
          <rect x="20" y="22" width="60" height="8" rx="2" fill="#581c87" stroke="#7c3aed" strokeWidth="1.2" />

          {/* Heavy-Duty Reinforced Polypropylene Battery Casing */}
          <rect x="22" y="30" width="56" height="52" rx="4" fill={`url(#battery-case-${idPrefix})`} stroke="#7c3aed" strokeWidth="1.5" />

          {/* Molded Polarity Symbols */}
          <path d="M30 40 H36 M33 37 V43" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" />
          <path d="M64 40 H70" stroke="#38bdf8" strokeWidth="2" strokeLinecap="round" />

          {/* Center High-Energy Lightning Bolt Arc */}
          <path
            d="M52 38 L42 55 H52 L47 74 L62 51 H51 L56 38 Z"
            fill={`url(#lightning-bolt-${idPrefix})`}
            stroke="#e9d5ff"
            strokeWidth="1.2"
          />

          {/* Bottom Stabilizer Foot Rail */}
          <line x1="20" y1="82" x2="80" y2="82" stroke="#4c1d95" strokeWidth="2" />
        </svg>
      ) : isDiagnostic ? (
        // Analogue Diagnostic Tachometer / Speedometer Gauge with Calibrated Index & Needle
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <radialGradient id={`gauge-face-${idPrefix}`} cx="50%" cy="50%" r="50%">
              <stop offset="60%" stopColor="#042f2e" />
              <stop offset="85%" stopColor="#115e59" />
              <stop offset="100%" stopColor="#09090b" />
            </radialGradient>
            <linearGradient id={`needle-teal-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#2dd4bf" />
              <stop offset="100%" stopColor="#0f766e" />
            </linearGradient>
          </defs>

          {/* Machined Aluminum Bezel Gauge Housing */}
          <circle cx="50" cy="50" r="38" fill={`url(#gauge-face-${idPrefix})`} stroke="#14b8a6" strokeWidth="2" />
          <circle cx="50" cy="50" r="33" stroke="#0d9488" strokeWidth="1" strokeDasharray="2 2" />

          {/* Perimeter Calibrated Dial Sweep (270-degree arc) */}
          <path d="M26 74 A 32 32 0 1 1 74 74" fill="none" stroke="#2dd4bf" strokeWidth="2.5" strokeLinecap="round" />
          {/* RPM Redline Zone Arc */}
          <path d="M62 26 A 32 32 0 0 1 74 74" fill="none" stroke="#f43f5e" strokeWidth="3" strokeLinecap="round" />

          {/* Radial Tick Marks */}
          <line x1="29" y1="67" x2="34" y2="63" stroke="#ccfbf1" strokeWidth="1.5" />
          <line x1="22" y1="50" x2="28" y2="50" stroke="#ccfbf1" strokeWidth="1.5" />
          <line x1="29" y1="33" x2="34" y2="37" stroke="#ccfbf1" strokeWidth="1.5" />
          <line x1="50" y1="22" x2="50" y2="28" stroke="#ccfbf1" strokeWidth="2" />
          <line x1="71" y1="33" x2="66" y2="37" stroke="#f43f5e" strokeWidth="2" />
          <line x1="78" y1="50" x2="72" y2="50" stroke="#f43f5e" strokeWidth="2" />

          {/* Stepper Motor Center Hub */}
          <circle cx="50" cy="50" r="6" fill="#0f172a" stroke="#2dd4bf" strokeWidth="1.5" />

          {/* High-Contrast Tapered Indicator Needle */}
          <path d="M50 50 L66 30 L52 48 Z" fill={`url(#needle-teal-${idPrefix})`} stroke="#99f6e4" strokeWidth="1" />
          <circle cx="50" cy="50" r="2.5" fill="#f8fafc" />
        </svg>
      ) : isAccessory ? (
        // Aerodynamic Carbon-Composite Full-Face Helmet with Iridium Tinted Visor
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`helmet-shell-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#713f12" />
              <stop offset="50%" stopColor="#ca8a04" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>
            <linearGradient id={`visor-iridium-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="100%" stopColor="#854d0e" />
            </linearGradient>
          </defs>

          {/* Outer Shell Aerodynamic Spoiler Contour */}
          <path
            d="M26 56 C23 38 35 20 54 18 C74 16 82 32 82 48 C82 60 76 74 62 76 C52 77 44 76 36 74 L28 72 C25 66 26 60 26 56 Z"
            fill={`url(#helmet-shell-${idPrefix})`}
            stroke="#eab308"
            strokeWidth="1.5"
          />

          {/* Top Ram-Air Ventilation Diffusers */}
          <path d="M46 19 L54 19 L52 23 L44 23 Z" fill="#09090b" stroke="#facc15" strokeWidth="0.8" />

          {/* Optical Grade Iridium Anti-Scratch Visor Shield */}
          <path
            d="M44 32 C58 31 74 34 78 44 C80 50 78 57 74 58 C64 61 46 60 42 52 C40 48 40 36 44 32 Z"
            fill={`url(#visor-iridium-${idPrefix})`}
            stroke="#fef08a"
            strokeWidth="1.5"
          />

          {/* Visor Quick-Release Pivot Mechanism */}
          <circle cx="44" cy="46" r="3.5" fill="#09090b" stroke="#facc15" strokeWidth="1" />
          <circle cx="44" cy="46" r="1.5" fill="#e4e4e7" />

          {/* Chin Bar Mesh Vent */}
          <path d="M30 63 L38 65 L36 69 L28 67 Z" fill="#09090b" stroke="#713f12" strokeWidth="0.8" />
        </svg>
      ) : isTuneup ? (
        // Crossed Chrome-Vanadium Wrenches with High-Gloss Metallic Sheen
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`wrench-chrome-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f8fafc" />
              <stop offset="40%" stopColor="#94a3b8" />
              <stop offset="80%" stopColor="#334155" />
              <stop offset="100%" stopColor="#cbd5e1" />
            </linearGradient>
          </defs>

          {/* Diagonal Primary Open-End / Ring Wrench */}
          <path
            d="M68 20 C64 16 57 16 53 20 L22 69 C18 73 18 80 22 84 C26 88 33 88 37 84 L68 35 C72 31 72 24 68 20 Z"
            fill={`url(#wrench-chrome-${idPrefix})`}
            stroke="#10b981"
            strokeWidth="1.5"
          />
          {/* Ring Spanner Hole */}
          <circle cx="28" cy="78" r="4.5" fill="#09090b" stroke="#34d399" strokeWidth="1" />
          {/* Open-End Jaw Cutout */}
          <path d="M60 21 L65 26 L69 22" stroke="#09090b" strokeWidth="2.5" strokeLinecap="round" />

          {/* Secondary Crossed Adjustable Tool */}
          <path
            d="M32 20 C36 16 43 16 47 20 L78 69 C82 73 82 80 78 84 C74 88 67 88 63 84 L32 35 C28 31 28 24 32 20 Z"
            fill={`url(#wrench-chrome-${idPrefix})`}
            stroke="#10b981"
            strokeWidth="1.5"
            opacity="0.85"
          />
          <circle cx="72" cy="78" r="4.5" fill="#09090b" stroke="#34d399" strokeWidth="1" />
          <path d="M40 21 L35 26 L31 22" stroke="#09090b" strokeWidth="2.5" strokeLinecap="round" />
        </svg>
      ) : itemType === "SERVICE" ? (
        // Mechanic Diagnostic Service Shield & Gear Torque Icon
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`service-gear-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#34d399" />
              <stop offset="50%" stopColor="#059669" />
              <stop offset="100%" stopColor="#064e3b" />
            </linearGradient>
          </defs>

          {/* Precision Workshop Planetary Gear */}
          <circle cx="50" cy="50" r="26" fill={`url(#service-gear-${idPrefix})`} stroke="#10b981" strokeWidth="1.5" />
          <circle cx="50" cy="50" r="14" fill="#09090b" stroke="#6ee7b7" strokeWidth="1" />

          {/* Outer Gear Teeth (8-point) */}
          <rect x="47" y="18" width="6" height="8" rx="1.5" fill="#34d399" />
          <rect x="47" y="74" width="6" height="8" rx="1.5" fill="#34d399" />
          <rect x="18" y="47" width="8" height="6" rx="1.5" fill="#34d399" />
          <rect x="74" y="47" width="8" height="6" rx="1.5" fill="#34d399" />
          <rect x="27" y="27" width="7" height="7" rx="1.5" fill="#34d399" />
          <rect x="66" y="66" width="7" height="7" rx="1.5" fill="#34d399" />
          <rect x="66" y="27" width="7" height="7" rx="1.5" fill="#34d399" />
          <rect x="27" y="66" width="7" height="7" rx="1.5" fill="#34d399" />

          {/* Center Hex Nut */}
          <circle cx="50" cy="50" r="6" fill="#047857" stroke="#a7f3d0" strokeWidth="1" />
        </svg>
      ) : (
        // OEM Factory Crate / Hardware Component Box
        <svg className="w-24 h-24 sm:w-28 sm:h-28 relative z-10 transition-transform group-hover:scale-105 duration-300" viewBox="0 0 100 100" fill="none">
          <defs>
            <linearGradient id={`part-crate-${idPrefix}`} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#52525b" />
              <stop offset="50%" stopColor="#27272a" />
              <stop offset="100%" stopColor="#18181b" />
            </linearGradient>
          </defs>

          {/* Isometric Mechanical Hardware Enclosure */}
          <path d="M50 20 L80 36 L50 52 L20 36 Z" fill={`url(#part-crate-${idPrefix})`} stroke="#a1a1aa" strokeWidth="1.5" />
          <path d="M20 36 L50 52 L50 82 L20 66 Z" fill="#18181b" stroke="#71717a" strokeWidth="1.5" />
          <path d="M80 36 L50 52 L50 82 L80 66 Z" fill="#27272a" stroke="#71717a" strokeWidth="1.5" />

          {/* Center Part Hexagon Nut */}
          <circle cx="50" cy="36" r="6" fill="#3f3f46" stroke="#e4e4e7" strokeWidth="1" />
          <circle cx="50" cy="36" r="2.5" fill="#09090b" />
        </svg>
      )}

      {/* Category Tag pill on banner with themed styling */}
      <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${pillStyle}`}>
        {category || (itemType === "SERVICE" ? "Service" : "Part")}
      </span>
    </div>
  );
}

