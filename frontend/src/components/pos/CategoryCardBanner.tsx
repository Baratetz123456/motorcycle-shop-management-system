"use client";

import React, { useState } from "react";

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
  const [imageError, setImageError] = useState(false);
  const norm = `${category} ${name}`.toLowerCase();
  const isService = itemType === "SERVICE";

  // Determine category theme with strict precedence
  // 1. Brakes checked before fluids to avoid "Brake Fluid" matching oil/fluid
  const isBrake =
    norm.includes("brake") ||
    norm.includes("pad") ||
    norm.includes("rotor") ||
    norm.includes("caliper") ||
    norm.includes("shoe") ||
    norm.includes("disc");

  const isOil =
    !isBrake &&
    (norm.includes("oil") ||
      norm.includes("lube") ||
      norm.includes("fluid") ||
      norm.includes("lubricant") ||
      norm.includes("coolant") ||
      norm.includes("motul") ||
      norm.includes("castrol"));

  const isTransmission =
    norm.includes("transmission") ||
    norm.includes("cvt") ||
    norm.includes("belt") ||
    norm.includes("pulley") ||
    norm.includes("clutch") ||
    norm.includes("roller") ||
    norm.includes("flyball") ||
    norm.includes("gear") ||
    norm.includes("chain");

  const isSuspension =
    norm.includes("suspension") ||
    norm.includes("fork") ||
    norm.includes("shock") ||
    norm.includes("absorber") ||
    norm.includes("spring") ||
    norm.includes("seal");

  const isTire =
    norm.includes("tire") ||
    norm.includes("tube") ||
    norm.includes("wheel") ||
    norm.includes("rim") ||
    norm.includes("spoke");

  const isEngine =
    norm.includes("engine") ||
    norm.includes("piston") ||
    norm.includes("gasket") ||
    norm.includes("spark") ||
    norm.includes("plug") ||
    norm.includes("exhaust") ||
    norm.includes("pipe") ||
    norm.includes("overhaul") ||
    norm.includes("cylinder") ||
    norm.includes("valve");

  const isElectrical =
    norm.includes("electr") ||
    norm.includes("battery") ||
    norm.includes("wire") ||
    norm.includes("light") ||
    norm.includes("bulb") ||
    norm.includes("starter") ||
    norm.includes("horn") ||
    norm.includes("fuse") ||
    norm.includes("relay");

  const isFilter =
    !isOil &&
    (norm.includes("filter") ||
      norm.includes("air filter") ||
      norm.includes("oil filter") ||
      norm.includes("fuel filter") ||
      norm.includes("element"));

  const isDiagnosticOrTuneup =
    !isFilter &&
    (norm.includes("diagnostic") ||
      norm.includes("inspect") ||
      norm.includes("scan") ||
      norm.includes("ecu") ||
      norm.includes("tune") ||
      norm.includes("maintenance") ||
      norm.includes("cleaning") ||
      norm.includes("wash") ||
      norm.includes("pms") ||
      norm.includes("throttle"));

  const isAccessory =
    norm.includes("access") ||
    norm.includes("helmet") ||
    norm.includes("grip") ||
    norm.includes("mirror") ||
    norm.includes("box") ||
    norm.includes("lock") ||
    norm.includes("topbox");

  // STRICT SEPARATION: Distinct Image Paths and Labels between Products and Services (100% Motorcycle-Only)
  let bannerImage = "";
  let categoryLabel = "";
  let pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";

  if (isService) {
    // SERVICES: 100% Motorcycle-Specific Workshop Operations (Zero Cars)
    if (isBrake) {
      bannerImage = "/images/banners/services/service_brakes.jpg";
      categoryLabel = "Brake Service";
      pillStyle = "bg-rose-950/90 text-rose-300 border-rose-800/80";
    } else if (isOil) {
      bannerImage = "/images/banners/services/service_oil.jpg";
      categoryLabel = "Oil & Flush";
      pillStyle = "bg-amber-950/90 text-amber-300 border-amber-800/80";
    } else if (isFilter) {
      bannerImage = "/images/banners/services/service_filter.jpg";
      categoryLabel = "Filter Service";
      pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";
    } else if (isTransmission) {
      bannerImage = "/images/banners/services/service_transmission.jpg";
      categoryLabel = "CVT / Drivetrain";
      pillStyle = "bg-indigo-950/90 text-indigo-300 border-indigo-800/80";
    } else if (isSuspension) {
      bannerImage = "/images/banners/services/service_suspension.jpg";
      categoryLabel = "Fork Rebuild";
      pillStyle = "bg-cyan-950/90 text-cyan-300 border-cyan-800/80";
    } else if (isEngine) {
      bannerImage = "/images/banners/services/service_engine.jpg";
      categoryLabel = "Engine Overhaul";
      pillStyle = "bg-orange-950/90 text-orange-300 border-orange-800/80";
    } else if (isTire) {
      bannerImage = "/images/banners/services/service_tires.jpg";
      categoryLabel = "Tire & Wheel";
      pillStyle = "bg-zinc-900/90 text-zinc-300 border-zinc-700";
    } else if (isElectrical) {
      bannerImage = "/images/banners/services/service_electrical.jpg";
      categoryLabel = "Electrical";
      pillStyle = "bg-violet-950/90 text-violet-300 border-violet-800/80";
    } else if (isDiagnosticOrTuneup) {
      bannerImage = "/images/banners/services/service_tuneup.jpg";
      categoryLabel = "PMS / Diagnostic";
      pillStyle = "bg-teal-950/90 text-teal-300 border-teal-800/80";
    } else {
      bannerImage = "/images/banners/services/service_general.jpg";
      categoryLabel = "Shop Service";
      pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";
    }
  } else {
    // PRODUCTS: Top Philippine Motorcycle Market Hardware & Spares (RCB, Uma, JVT, Motul)
    if (isBrake) {
      bannerImage = "/images/banners/products/part_brakes.jpg";
      categoryLabel = "Brake System";
      pillStyle = "bg-rose-950/90 text-rose-300 border-rose-800/80";
    } else if (isOil) {
      bannerImage = "/images/banners/products/part_oil.jpg";
      categoryLabel = "Oils & Fluids";
      pillStyle = "bg-amber-950/90 text-amber-300 border-amber-800/80";
    } else if (isFilter) {
      bannerImage = "/images/banners/products/part_filter.jpg";
      categoryLabel = "Filters & Spares";
      pillStyle = "bg-emerald-950/90 text-emerald-300 border-emerald-800/80";
    } else if (isTransmission) {
      bannerImage = "/images/banners/products/part_transmission.jpg";
      categoryLabel = "Transmission";
      pillStyle = "bg-indigo-950/90 text-indigo-300 border-indigo-800/80";
    } else if (isSuspension) {
      bannerImage = "/images/banners/products/part_suspension.jpg";
      categoryLabel = "Suspension";
      pillStyle = "bg-cyan-950/90 text-cyan-300 border-cyan-800/80";
    } else if (isEngine) {
      bannerImage = "/images/banners/products/part_engine.jpg";
      categoryLabel = "Engine Parts";
      pillStyle = "bg-orange-950/90 text-orange-300 border-orange-800/80";
    } else if (isTire) {
      bannerImage = "/images/banners/products/part_tires.jpg";
      categoryLabel = "Tires & Wheels";
      pillStyle = "bg-zinc-900/90 text-zinc-300 border-zinc-700";
    } else if (isElectrical) {
      bannerImage = "/images/banners/products/part_electrical.jpg";
      categoryLabel = "Electrical";
      pillStyle = "bg-violet-950/90 text-violet-300 border-violet-800/80";
    } else if (isAccessory) {
      bannerImage = "/images/banners/products/part_accessories.jpg";
      categoryLabel = "Accessories";
      pillStyle = "bg-yellow-950/90 text-yellow-300 border-yellow-800/80";
    } else {
      bannerImage = "/images/banners/products/part_general.jpg";
      categoryLabel = "Parts & Spares";
      pillStyle = "bg-zinc-900/90 text-zinc-300 border-zinc-700";
    }
  }

  return (
    <div className="w-full h-24 sm:h-28 bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/80 rounded-t-2xl select-none group">
      {/* Photographic Category Banner */}
      {!imageError ? (
        <img
          src={bannerImage}
          alt={categoryLabel}
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900" />
      )}

      {/* Metallic Base Horizon Line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent z-10" />

      {/* Top Left: Brand Watermark OR Distinct Type Badge */}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 z-20">
        {/* Strict Distinction: Cool Titanium/Cyan [PART] vs Warm Amber [SERVICE] Badge */}
        {isService ? (
          <span className="px-1.5 py-0.5 rounded-md bg-amber-950/90 backdrop-blur-md border border-amber-800/80 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-amber-300 shadow-sm">
            SERVICE
          </span>
        ) : (
          <span className="px-1.5 py-0.5 rounded-md bg-cyan-950/90 backdrop-blur-md border border-cyan-800/80 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-cyan-300 shadow-sm">
            PART
          </span>
        )}

        {brand && (
          <span className="px-1.5 py-0.5 rounded-md bg-zinc-950/90 backdrop-blur-md border border-zinc-700/80 text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-zinc-200 truncate max-w-[100px] shadow-sm">
            {brand}
          </span>
        )}
      </div>

      {/* Top Right: Category Pill */}
      <span
        className={`absolute top-2 right-2 px-2 py-0.5 rounded-md backdrop-blur-md border text-[8px] sm:text-[9px] font-bold uppercase tracking-wider z-20 shadow-sm ${pillStyle}`}
      >
        {categoryLabel}
      </span>
    </div>
  );
}
