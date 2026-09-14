"use client";

import React, { useState } from "react";
import Image from "next/image";

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
  const [imageError, setImageError] = useState(false);
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

  // Determine Category Label & Banner Image (Top PH Market Models)
  let categoryLabel = "Workshop Unit";
  let bannerImage = "/images/banners/bikes/general.jpg";

  if (isSportbike) {
    categoryLabel = "Sportbike";
    bannerImage = "/images/banners/bikes/sportbike.jpg";
  } else if (isScooter) {
    categoryLabel = "Scooter";
    bannerImage = "/images/banners/bikes/scooter.jpg";
  } else if (isNaked) {
    categoryLabel = "Naked Street";
    bannerImage = "/images/banners/bikes/naked.jpg";
  } else if (isUnderbone) {
    categoryLabel = "Underbone";
    bannerImage = "/images/banners/bikes/underbone.jpg";
  } else if (isAdventure) {
    categoryLabel = "Adventure / Dual";
    bannerImage = "/images/banners/bikes/adventure.jpg";
  } else if (isCruiser) {
    categoryLabel = "Cruiser";
    bannerImage = "/images/banners/bikes/cruiser.jpg";
  }

  // Unified Monochrome Dark Theme Badge Style (Black/Dark Zinc Canvas with Crisp White Text)
  const pillStyle = "bg-zinc-950/90 text-zinc-100 border-zinc-700/90 font-mono";

  // Extract brand from motorcycle name if not provided
  const detectedBrand =
    brand ||
    (motorcycleName.toLowerCase().startsWith("yamaha")
      ? "Yamaha"
      : motorcycleName.toLowerCase().startsWith("honda")
        ? "Honda"
        : motorcycleName.toLowerCase().startsWith("kawasaki")
          ? "Kawasaki"
          : motorcycleName.toLowerCase().startsWith("suzuki")
            ? "Suzuki"
            : motorcycleName.toLowerCase().startsWith("ducati")
              ? "Ducati"
              : motorcycleName.toLowerCase().startsWith("ktm")
                ? "KTM"
                : motorcycleName.toLowerCase().startsWith("vespa")
                  ? "Vespa"
                  : motorcycleName.toLowerCase().startsWith("bmw")
                    ? "BMW"
                    : "");

  return (
    <div className="w-full h-24 sm:h-28 bg-zinc-950 flex items-center justify-center relative overflow-hidden border-b border-zinc-800/80 rounded-t-2xl select-none group">
      {/* Realistic Photographic Bike Banner Image */}
      {!imageError ? (
        <img
          src={bannerImage}
          alt={`${categoryLabel} motorcycle`}
          onError={() => setImageError(true)}
          className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        /* Fallback dark mesh pattern if image fails to load */
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-950 to-zinc-900" />
      )}

      {/* Workshop Horizon Studio Lighting Line */}
      <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-zinc-700/60 to-transparent z-10" />

      {/* Brand Watermark Badge (Top-Left) - Monochrome Dark Theme */}
      {detectedBrand && (
        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-zinc-950/90 backdrop-blur-md border border-zinc-700/90 text-[8px] sm:text-[9px] font-mono font-bold uppercase tracking-wider text-zinc-200 z-20 truncate max-w-[120px] shadow-sm">
          {detectedBrand}
        </span>
      )}

      {/* Category Pill (Top-Right) - Strictly Monochrome Dark Theme Black & White */}
      <span
        className={`absolute top-2 right-2 px-2 py-0.5 rounded-md backdrop-blur-md border text-[8px] sm:text-[9px] font-bold uppercase tracking-wider z-20 shadow-sm ${pillStyle}`}
      >
        {categoryLabel}
      </span>
    </div>
  );
}
