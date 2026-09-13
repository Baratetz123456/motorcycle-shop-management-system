"use client";

import React from "react";

interface CustomerBikeCardBannerProps {
  motorcycleName?: string;
  brand?: string;
  categoryOverride?: string;
}

export function CustomerBikeCardBanner({
  motorcycleName = "",
  brand = "",
  categoryOverride = "",
}: CustomerBikeCardBannerProps) {
  const norm = `${motorcycleName} ${brand} ${categoryOverride}`.toLowerCase();

  // Detect motorcycle category from bike name
  const isScooter =
    norm.includes("scooter") ||
    norm.includes("nmax") ||
    norm.includes("click") ||
    norm.includes("vespa") ||
    norm.includes("aerox") ||
    norm.includes("pcx") ||
    norm.includes("mio") ||
    norm.includes("beat") ||
    norm.includes("burgman") ||
    norm.includes("fazzio") ||
    norm.includes("gravis") ||
    norm.includes("kymco");

  const isSportbike =
    !isScooter &&
    (norm.includes("sport") ||
      norm.includes("ninja") ||
      norm.includes("panigale") ||
      norm.includes("cbr") ||
      norm.includes("r3") ||
      norm.includes("r1") ||
      norm.includes("r15") ||
      norm.includes("r6") ||
      norm.includes("gsx-r") ||
      norm.includes("gsx r") ||
      norm.includes("rc200") ||
      norm.includes("rc390") ||
      norm.includes("superbike") ||
      norm.includes("hayabusa") ||
      norm.includes("zx-"));

  const isNaked =
    !isScooter &&
    !isSportbike &&
    (norm.includes("naked") ||
      norm.includes("mt-") ||
      norm.includes("mt0") ||
      norm.includes("duke") ||
      norm.includes("z400") ||
      norm.includes("z650") ||
      norm.includes("z900") ||
      norm.includes("z1000") ||
      norm.includes("cb650") ||
      norm.includes("cb500") ||
      norm.includes("cb150") ||
      norm.includes("sv650") ||
      norm.includes("monster") ||
      norm.includes("street triple"));

  const isUnderbone =
    !isScooter &&
    !isSportbike &&
    !isNaked &&
    (norm.includes("underbone") ||
      norm.includes("raider") ||
      norm.includes("sniper") ||
      norm.includes("wave") ||
      norm.includes("smash") ||
      norm.includes("winner") ||
      norm.includes("fury") ||
      norm.includes("xrm") ||
      norm.includes("crypton"));

  const isAdventure =
    !isScooter &&
    !isSportbike &&
    !isNaked &&
    !isUnderbone &&
    (norm.includes("adventure") ||
      norm.includes("adv") ||
      norm.includes("gs") ||
      norm.includes("v-strom") ||
      norm.includes("versys") ||
      norm.includes("tenere") ||
      norm.includes("crf") ||
      norm.includes("klx") ||
      norm.includes("enduro") ||
      norm.includes("dual sport") ||
      norm.includes("rally") ||
      norm.includes("transalp"));

  const isCruiser =
    !isScooter &&
    !isSportbike &&
    !isNaked &&
    !isUnderbone &&
    !isAdventure &&
    (norm.includes("cruiser") ||
      norm.includes("rebel") ||
      norm.includes("w175") ||
      norm.includes("vulcan") ||
      norm.includes("shadow") ||
      norm.includes("harley") ||
      norm.includes("bolt") ||
      norm.includes("meteor") ||
      norm.includes("classic") ||
      norm.includes("bobber") ||
      norm.includes("scrambler"));

  // Determine Category Label and Color Accents
  let categoryLabel = "Workshop Bike";
  let glowColor = "bg-emerald-500/15";
  let iconColor = "text-emerald-400";
  let pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";

  if (isSportbike) {
    categoryLabel = "Sportbike";
    glowColor = "bg-rose-500/15";
    iconColor = "text-rose-400";
    pillStyle = "bg-rose-950/90 text-rose-300 border-rose-800/80";
  } else if (isScooter) {
    categoryLabel = "Maxi-Scooter";
    glowColor = "bg-emerald-500/15";
    iconColor = "text-emerald-400";
    pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";
  } else if (isNaked) {
    categoryLabel = "Naked Street";
    glowColor = "bg-cyan-500/15";
    iconColor = "text-cyan-400";
    pillStyle = "bg-cyan-950/90 text-cyan-300 border-cyan-800/80";
  } else if (isUnderbone) {
    categoryLabel = "Hyper Underbone";
    glowColor = "bg-indigo-500/15";
    iconColor = "text-indigo-400";
    pillStyle = "bg-indigo-950/90 text-indigo-300 border-indigo-800/80";
  } else if (isAdventure) {
    categoryLabel = "Adventure Touring";
    glowColor = "bg-amber-500/15";
    iconColor = "text-amber-400";
    pillStyle = "bg-amber-950/90 text-amber-300 border-amber-800/80";
  } else if (isCruiser) {
    categoryLabel = "Cruiser Classic";
    glowColor = "bg-orange-500/15";
    iconColor = "text-orange-400";
    pillStyle = "bg-orange-950/90 text-orange-300 border-orange-800/80";
  }

  // Extract brand from motorcycle name if not provided
  const detectedBrand =
    brand ||
    (motorcycleName.toLowerCase().startsWith("yamaha")
      ? "Yamaha"
      : motorcycleName.toLowerCase().startsWith("honda")
        ? "Honda"
        : motorcycleName.toLowerCase().startsWith("kawasaki")
          ? "Kawasaki"
          : motorcycleName.toLowerCase().startsWith("ducati")
            ? "Ducati"
            : motorcycleName.toLowerCase().startsWith("suzuki")
              ? "Suzuki"
              : motorcycleName.toLowerCase().startsWith("ktm")
                ? "KTM"
                : motorcycleName.toLowerCase().startsWith("vespa")
                  ? "Vespa"
                  : motorcycleName.toLowerCase().startsWith("bmw")
                    ? "BMW"
                    : "");

  return (
    <div className="w-full h-24 sm:h-28 bg-gradient-to-b from-zinc-900 to-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/80 rounded-t-2xl select-none">
      {/* Background Subtle Workshop Grid Floor */}
      <div className="absolute inset-0 opacity-15 pointer-events-none">
        <svg width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id={`bike-grid-${categoryLabel}`} width="14" height="14" patternUnits="userSpaceOnUse">
              <path d="M 14 0 L 0 0 0 14" fill="none" stroke="currentColor" strokeWidth="0.5" className="text-zinc-500" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#bike-grid-${categoryLabel})`} />
        </svg>
      </div>

      {/* Realistic Studio Floor Horizon Lighting Line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent" />

      {/* Ambient Category Themed Glow */}
      <div className={`absolute w-36 h-36 rounded-full ${glowColor} blur-xl pointer-events-none`} />

      {/* Brand Pill (Top-Left) */}
      {detectedBrand && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-zinc-900/90 border border-zinc-800 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-400 z-10 truncate max-w-[120px]">
          {detectedBrand}
        </span>
      )}

      {/* Photorealistic Motorcycle Silhouette Artwork */}
      {isSportbike ? (
        // Aerodynamic Track Supersport (Twin-spar frame, aggressive fairing, clip-ons, tall tail)
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Wheel Rims with brake rotors */}
          <circle cx="24" cy="50" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="24" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="24" cy="50" r="3" fill="currentColor" />
          
          <circle cx="96" cy="50" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="96" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="96" cy="50" r="3" fill="currentColor" />

          {/* Front Inverted Fork */}
          <line x1="24" y1="50" x2="38" y2="23" strokeWidth="3" />
          <line x1="26" y1="46" x2="39" y2="25" strokeWidth="1.5" />

          {/* Swingarm & Monoshock */}
          <line x1="60" y1="44" x2="96" y2="50" strokeWidth="3.5" />
          <line x1="62" y1="36" x2="68" y2="46" strokeWidth="3" />

          {/* Aerodynamic Fairing & Fuel Tank */}
          <path d="M38 23l-8 7 12 12 18-2 12-14-6-10-18-2-10 9z" fill="currentColor" fillOpacity="0.22" strokeWidth="2.2" />
          
          {/* Windscreen & Nose Beak */}
          <path d="M36 21l-8 3-7 8 8 2 7-6 10-2z" fill="currentColor" fillOpacity="0.4" strokeWidth="1.8" />
          
          {/* High Racing Tail Cowl & Seat */}
          <path d="M66 26l22-6 10 7-18 5-14-6z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />

          {/* Racing Exhaust Canister */}
          <line x1="72" y1="48" x2="90" y2="40" strokeWidth="3.5" />
          <circle cx="91" cy="39" r="2.5" fill="currentColor" />
        </svg>
      ) : isScooter ? (
        // Modern Maxi-Scooter (Step-through floorboard, dual windscreen, underseat storage)
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* 13/14-inch Scooter Alloy Wheels */}
          <circle cx="24" cy="51" r="13" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="24" cy="51" r="8" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="24" cy="51" r="3" fill="currentColor" />

          <circle cx="96" cy="51" r="13" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="96" cy="51" r="8" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="96" cy="51" r="3" fill="currentColor" />

          {/* Front Telescopic Fork */}
          <line x1="24" y1="51" x2="36" y2="26" strokeWidth="2.8" />

          {/* Maxi-Scooter Aerodynamic Front Shield & Tall Windscreen */}
          <path d="M36 26l-6 8 8 10 16-2 4-12-6-11-16 7z" fill="currentColor" fillOpacity="0.22" strokeWidth="2.2" />
          <path d="M34 23l-3-11 8-2 6 9z" fill="currentColor" fillOpacity="0.4" strokeWidth="1.8" />

          {/* Step-Through Tunnel / Floorboard */}
          <path d="M54 42h16l4-8-20 8z" fill="currentColor" fillOpacity="0.15" strokeWidth="2" />

          {/* Long Plush Dual Seat & Wide Rear Underseat Cowl */}
          <path d="M54 34l22-4 18 2 8 8-16 6-32-12z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />

          {/* CVT Belt Housing & Rear Dual Shock */}
          <rect x="76" y="44" width="22" height="7" rx="3" fill="currentColor" fillOpacity="0.2" strokeWidth="2" />
          <line x1="88" y1="36" x2="94" y2="48" strokeWidth="2.5" />
        </svg>
      ) : isNaked ? (
        // Aggressive Streetfighter / Naked Sport (Exposed trellis frame, muscular tank, compact tail)
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Wheels */}
          <circle cx="24" cy="50" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="24" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="24" cy="50" r="3" fill="currentColor" />

          <circle cx="96" cy="50" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="96" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="96" cy="50" r="3" fill="currentColor" />

          {/* Inverted Front Fork & Upright Handlebar */}
          <line x1="24" y1="50" x2="38" y2="24" strokeWidth="3" />
          <line x1="36" y1="21" x2="42" y2="18" strokeWidth="2.5" />

          {/* Muscular Angular Tank & Radiator Shrouds */}
          <path d="M38 24l-6 6 8 8 16-2 10-12-14-6-14 6z" fill="currentColor" fillOpacity="0.25" strokeWidth="2.2" />

          {/* Exposed Trellis Frame Truss */}
          <path d="M48 34l8 10 10-10M56 44l8-10" strokeWidth="2" />

          {/* Compact Upswept Tail Cowl */}
          <path d="M68 28l18-8 10 8-16 4-12-4z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />

          {/* Aluminum Swingarm */}
          <line x1="62" y1="44" x2="96" y2="50" strokeWidth="3.5" />
          <line x1="68" y1="36" x2="74" y2="46" strokeWidth="2.5" />
        </svg>
      ) : isUnderbone ? (
        // Hyper Underbone (Slim step-through backbone, sharp racing ducktail, lightweight chassis)
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* 17-inch Narrow Wheels */}
          <circle cx="22" cy="50" r="14" strokeWidth="2.2" fill="currentColor" fillOpacity="0.08" />
          <circle cx="22" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="22" cy="50" r="3" fill="currentColor" />

          <circle cx="98" cy="50" r="14" strokeWidth="2.2" fill="currentColor" fillOpacity="0.08" />
          <circle cx="98" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="98" cy="50" r="3" fill="currentColor" />

          {/* Front Fork & Headlight Cowl */}
          <line x1="22" y1="50" x2="36" y2="24" strokeWidth="2.5" />
          <path d="M36 24l-8 5 6 6 10-4z" fill="currentColor" fillOpacity="0.3" strokeWidth="2" />

          {/* Slim Underbone Backbone Spine */}
          <path d="M44 31l12 12h14l-8-12-18 0z" fill="currentColor" fillOpacity="0.2" strokeWidth="2.2" />

          {/* Stepped Dual Seat & Sharp Aerodynamic Ducktail */}
          <path d="M52 28l24-4 18 2 8 6-18 2-32-6z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />

          {/* Chain Drive & Upswept Free-Flow Exhaust */}
          <line x1="68" y1="43" x2="98" y2="50" strokeWidth="3" />
          <line x1="72" y1="46" x2="94" y2="38" strokeWidth="3.5" />
        </svg>
      ) : isAdventure ? (
        // Adventure / Dual-Sport (Tall stance, front beak, tall windshield, high ground clearance)
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Spoked Off-Road Wheels (Larger front 19/21-inch) */}
          <circle cx="22" cy="48" r="15" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="22" cy="48" r="10" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="22" cy="48" r="3" fill="currentColor" />

          <circle cx="96" cy="50" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="96" cy="50" r="9" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="96" cy="50" r="3" fill="currentColor" />

          {/* Long Travel Suspension Fork */}
          <line x1="22" y1="48" x2="38" y2="18" strokeWidth="3" />

          {/* Adventure Beak & Tall Touring Windscreen */}
          <path d="M38 18l-12 5 10 6 12-2 10-9-20 0z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />
          <path d="M36 18l-2-12 8 0 4 12z" fill="currentColor" fillOpacity="0.4" strokeWidth="1.8" />

          {/* Large Capacity Fuel Tank & Skid Plate */}
          <path d="M48 27l8 8 12-4 8-12-16-2-12 10z" fill="currentColor" fillOpacity="0.25" strokeWidth="2.2" />
          <path d="M44 42l16 2 4-6-20 4z" fill="currentColor" fillOpacity="0.2" strokeWidth="2" />

          {/* Two-Up Touring Seat & Rear Luggage Rack */}
          <path d="M68 29l20-3 12 4-8 4-24-5z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />
          <line x1="90" y1="28" x2="102" y2="28" strokeWidth="2.5" />
        </svg>
      ) : isCruiser ? (
        // Low-Slung Cruiser (Teardrop tank, raked front fork, low bucket seat, relaxed geometry)
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          {/* Front Large Thin Wheel, Fat Rear Wheel */}
          <circle cx="18" cy="48" r="15" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="18" cy="48" r="10" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="18" cy="48" r="3" fill="currentColor" />

          <circle cx="98" cy="51" r="13" strokeWidth="3" fill="currentColor" fillOpacity="0.1" />
          <circle cx="98" cy="51" r="7" strokeWidth="1.2" strokeDasharray="3 3" />
          <circle cx="98" cy="51" r="3" fill="currentColor" />

          {/* Raked Chopper/Cruiser Fork */}
          <line x1="18" y1="48" x2="42" y2="20" strokeWidth="3" />
          <line x1="40" y1="18" x2="46" y2="15" strokeWidth="2.5" />

          {/* Teardrop Cruiser Tank */}
          <path d="M42 20c4-2 14-2 18 6l-14 8-4-14z" fill="currentColor" fillOpacity="0.3" strokeWidth="2.2" />

          {/* Deep Low-Slung Saddle Seat & Bobbed Rear Fender */}
          <path d="M58 32c4-4 12-4 18 0l16 8-14 4-20-12z" fill="currentColor" fillOpacity="0.25" strokeWidth="2.2" />

          {/* Dual Straight-Pipe Chrome Exhaust */}
          <line x1="56" y1="46" x2="100" y2="48" strokeWidth="3.5" />
          <line x1="60" y1="50" x2="102" y2="52" strokeWidth="2.8" />
        </svg>
      ) : (
        // Standard Modern Workshop Motorcycle on Service Lift
        <svg className={`w-28 h-16 sm:w-32 sm:h-20 ${iconColor} relative z-10 transition-transform group-hover:scale-105 duration-300`} viewBox="0 0 120 70" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="24" cy="48" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="24" cy="48" r="3" fill="currentColor" />
          <circle cx="96" cy="48" r="14" strokeWidth="2.5" fill="currentColor" fillOpacity="0.08" />
          <circle cx="96" cy="48" r="3" fill="currentColor" />
          
          <line x1="24" y1="48" x2="38" y2="22" strokeWidth="3" />
          <path d="M38 22l-6 6 10 10 18-2 12-14-14-4-20 4z" fill="currentColor" fillOpacity="0.22" strokeWidth="2" />
          <path d="M64 26l20-6 12 8-16 4-16-6z" fill="currentColor" fillOpacity="0.3" strokeWidth="2" />
          <line x1="62" y1="42" x2="96" y2="48" strokeWidth="3.2" />
          {/* Lift Platform Line */}
          <line x1="8" y1="64" x2="112" y2="64" strokeWidth="2.5" strokeDasharray="4 2" />
        </svg>
      )}

      {/* Category Tag pill on banner with themed styling */}
      <span className={`absolute bottom-2 right-2 px-2 py-0.5 rounded-md border text-[9px] font-bold uppercase tracking-wider ${pillStyle}`}>
        {categoryLabel}
      </span>
    </div>
  );
}
