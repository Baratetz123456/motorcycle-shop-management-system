import React from "react";

export interface AvatarPreset {
  id: string;
  name: string;
  roleHint: string;
  department: string;
  bgGradient: string;
  borderColor: string;
  badgeColor: string;
  renderFace: () => React.ReactNode;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  // 1. Alex - Master Motorcycle Mechanic (Lead Tech)
  {
    id: "avatar-1",
    name: "Alex",
    roleHint: "Master Mechanic",
    department: "Workshop Floor",
    bgGradient: "from-emerald-500 to-teal-600",
    borderColor: "border-emerald-500/40",
    badgeColor: "bg-emerald-500 text-zinc-950 font-bold",
    renderFace: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        {/* Borderless Circular Canvas Background */}
        <circle cx="32" cy="32" r="32" fill="#0f172a" />
        <circle cx="32" cy="32" r="30.5" fill="#134e4a" />
        <circle cx="32" cy="32" r="29" fill="#042f2e" />

        {/* Shoulders & Mechanic Jumpsuit */}
        <path d="M12 60 C12 46 20 42 32 42 C44 42 52 46 52 60 Z" fill="#1e293b" />
        {/* Coverall Yoke / Racing Stripe Accent */}
        <path d="M22 42 L32 50 L42 42" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Work Shirt Lapels */}
        <path d="M27 42 L32 47 L37 42" fill="#0f172a" />
        {/* Wrench Pocket Silhouette */}
        <path d="M38 52 L45 45 M45 45 L47 47 M40 54 L42 56" stroke="#94a3b8" strokeWidth="1.2" strokeLinecap="round" />

        {/* Neck */}
        <rect x="27.5" y="36" width="9" height="8" rx="3" fill="#f59e0b" />
        {/* Neck Shadow */}
        <path d="M27.5 36 C30 39 34 39 36.5 36 Z" fill="#d97706" />

        {/* Ears */}
        <circle cx="21" cy="31" r="3.5" fill="#fbbf24" />
        <circle cx="43" cy="31" r="3.5" fill="#fbbf24" />
        <circle cx="21" cy="31" r="1.8" fill="#d97706" />
        <circle cx="43" cy="31" r="1.8" fill="#d97706" />

        {/* Head Base */}
        <ellipse cx="32" cy="29" rx="11.5" ry="12.5" fill="#fde68a" />
        {/* Chin & Jaw Structure */}
        <path d="M22 28 C22 38 42 38 42 28 Z" fill="#fde68a" />

        {/* Safety Goggles / Protective Specs on Forehead */}
        <path d="M22 20 Q32 18 42 20" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        <rect x="23" y="16.5" width="8" height="6" rx="2" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1.5" />
        <rect x="33" y="16.5" width="8" height="6" rx="2" fill="#38bdf8" fillOpacity="0.4" stroke="#0284c7" strokeWidth="1.5" />
        <line x1="31" y1="19.5" x2="33" y2="19.5" stroke="#0f172a" strokeWidth="1.5" />

        {/* Mechanic Cap (Curved Visor + Crown) */}
        <path d="M20 18 C20 9 44 9 44 18 Z" fill="#09090b" />
        {/* Cap Front Panel Accent */}
        <path d="M27 10 L37 10 L35 15 L29 15 Z" fill="#10b981" />
        {/* Visor Brim */}
        <path d="M17 18 C17 15 47 15 47 18 L43 21 L21 21 Z" fill="#18181b" />
        <path d="M19 18.5 Q32 17 45 18.5" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" />

        {/* Eyebrows */}
        <path d="M25 24.5 Q27.5 23 30 24.5" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M34 24.5 Q36.5 23 39 24.5" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" />

        {/* Confident Eyes */}
        <circle cx="27.5" cy="27.5" r="2" fill="#18181b" />
        <circle cx="36.5" cy="27.5" r="2" fill="#18181b" />
        <circle cx="28.2" cy="26.8" r="0.7" fill="#ffffff" />
        <circle cx="37.2" cy="26.8" r="0.7" fill="#ffffff" />

        {/* Nose */}
        <path d="M32 27 L31 31 L33 31" stroke="#d97706" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />

        {/* Mechanic Smirk */}
        <path d="M28 33.5 Q32 36.5 36 33.5" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 2. Sam - Service Foreman & Technical Inspector
  {
    id: "avatar-2",
    name: "Sam",
    roleHint: "Service Foreman",
    department: "Service Operations",
    bgGradient: "from-amber-500 to-orange-600",
    borderColor: "border-amber-500/40",
    badgeColor: "bg-amber-500 text-zinc-950 font-bold",
    renderFace: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#0f172a" />
        <circle cx="32" cy="32" r="30.5" fill="#451a03" />
        <circle cx="32" cy="32" r="29" fill="#2d1202" />

        {/* High-Vis Service Inspector Vest over Polo */}
        <path d="M12 60 C12 46 20 42 32 42 C44 42 52 46 52 60 Z" fill="#f59e0b" />
        {/* Silver Reflective Vest Straps */}
        <path d="M22 42 L24 60" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
        <path d="M42 42 L40 60" stroke="#f1f5f9" strokeWidth="3" strokeLinecap="round" />
        {/* Navy Under-Collar */}
        <path d="M28 42 L32 47 L36 42" fill="#0f172a" />

        {/* Neck */}
        <rect x="27.5" y="36" width="9" height="8" rx="3" fill="#fed7aa" />

        {/* Ears with Workshop Comms Earset */}
        <circle cx="21" cy="31" r="3.5" fill="#fed7aa" />
        <circle cx="43" cy="31" r="3.5" fill="#fed7aa" />
        <rect x="18.5" y="27" width="3" height="7" rx="1.5" fill="#18181b" />
        <path d="M19 32 Q23 37 27 36" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Face */}
        <ellipse cx="32" cy="29" rx="11" ry="12" fill="#ffedd5" />

        {/* Clean Workshop Hardhat */}
        <path d="M18 19 C18 10 46 10 46 19 Z" fill="#facc15" />
        <path d="M16 19 C16 17 48 17 48 19 L45 22 L19 22 Z" fill="#eab308" />
        <rect x="29" y="11" width="6" height="4" rx="1" fill="#ca8a04" />

        {/* Glasses */}
        <rect x="23" y="24" width="7" height="5" rx="1.5" fill="#e0f2fe" fillOpacity="0.5" stroke="#334155" strokeWidth="1.4" />
        <rect x="34" y="24" width="7" height="5" rx="1.5" fill="#e0f2fe" fillOpacity="0.5" stroke="#334155" strokeWidth="1.4" />
        <line x1="30" y1="26.5" x2="34" y2="26.5" stroke="#334155" strokeWidth="1.4" />

        {/* Eyes behind lenses */}
        <circle cx="26.5" cy="26.5" r="1.5" fill="#1e293b" />
        <circle cx="37.5" cy="26.5" r="1.5" fill="#1e293b" />

        {/* Mustache & Smile */}
        <path d="M30 32.5 Q32 31.5 34 32.5" stroke="#78350f" strokeWidth="2" strokeLinecap="round" />
        <path d="M29 35 Q32 37 35 35" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 3. Dave - Dyno Tuner & Engine Specialist
  {
    id: "avatar-3",
    name: "Dave",
    roleHint: "Dyno Tuner",
    department: "Engine Lab",
    bgGradient: "from-rose-500 to-red-600",
    borderColor: "border-rose-500/40",
    badgeColor: "bg-rose-500 text-white font-bold",
    renderFace: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#0f172a" />
        <circle cx="32" cy="32" r="30.5" fill="#4c0519" />
        <circle cx="32" cy="32" r="29" fill="#2d020e" />

        {/* Heavy Carbon Tuner Overalls */}
        <path d="M12 60 C12 46 20 42 32 42 C44 42 52 46 52 60 Z" fill="#18181b" />
        {/* Red Performance Racing Trim */}
        <path d="M18 48 L22 60 M46 48 L42 60" stroke="#f43f5e" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M28 42 L32 48 L36 42" stroke="#f43f5e" strokeWidth="1.8" fill="#09090b" />

        {/* Neck with Earmuffs / Headband resting */}
        <rect x="27.5" y="36" width="9" height="8" rx="3" fill="#fbcfe8" />
        <path d="M21 40 Q32 44 43 40" stroke="#374151" strokeWidth="4" strokeLinecap="round" fill="none" />
        <rect x="18" y="36" width="4.5" height="7" rx="2" fill="#f43f5e" />
        <rect x="41.5" y="36" width="4.5" height="7" rx="2" fill="#f43f5e" />

        {/* Face */}
        <ellipse cx="32" cy="28.5" rx="11" ry="12" fill="#fce7f3" />

        {/* Backward Racing Tuner Cap */}
        <path d="M20 18 C20 10 44 10 44 18 Z" fill="#dc2626" />
        {/* Backward Cap Strap & Buckle */}
        <path d="M26 19 Q32 17 38 19" stroke="#991b1b" strokeWidth="2" strokeLinecap="round" />
        <circle cx="32" cy="18" r="1.5" fill="#f1f5f9" />

        {/* Eyes & Intense Focus */}
        <circle cx="27" cy="27" r="1.8" fill="#0f172a" />
        <circle cx="37" cy="27" r="1.8" fill="#0f172a" />
        <circle cx="27.6" cy="26.3" r="0.6" fill="#ffffff" />
        <circle cx="37.6" cy="26.3" r="0.6" fill="#ffffff" />

        {/* Sharp Brow */}
        <path d="M24 24.5 L29.5 24" stroke="#09090b" strokeWidth="1.6" strokeLinecap="round" />
        <path d="M40 24.5 L34.5 24" stroke="#09090b" strokeWidth="1.6" strokeLinecap="round" />

        {/* Chin Stubble & Determined Smile */}
        <circle cx="30" cy="36" r="0.6" fill="#9ca3af" />
        <circle cx="32" cy="36.5" r="0.6" fill="#9ca3af" />
        <circle cx="34" cy="36.5" r="0.6" fill="#9ca3af" />
        <path d="M28 32 Q32 35 36 32" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 4. Leo - Electrical & Diagnostics Specialist
  {
    id: "avatar-4",
    name: "Leo",
    roleHint: "Diagnostics Tech",
    department: "ECU & Electronics",
    bgGradient: "from-cyan-500 to-blue-600",
    borderColor: "border-cyan-500/40",
    badgeColor: "bg-cyan-500 text-zinc-950 font-bold",
    renderFace: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#0f172a" />
        <circle cx="32" cy="32" r="30.5" fill="#082f49" />
        <circle cx="32" cy="32" r="29" fill="#041f32" />

        {/* Tech Windbreaker / ESD Workshop Jacket */}
        <path d="M12 60 C12 46 20 42 32 42 C44 42 52 46 52 60 Z" fill="#0284c7" />
        {/* Cyber Cyan Circuit Stripe */}
        <path d="M24 42 L24 60 M40 42 L40 60" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="32" cy="52" r="2" fill="#38bdf8" />
        <line x1="32" y1="46" x2="32" y2="50" stroke="#38bdf8" strokeWidth="1.5" />

        {/* Neck */}
        <rect x="27.5" y="36" width="9" height="8" rx="3" fill="#fde047" fillOpacity="0.9" />

        {/* Face */}
        <ellipse cx="32" cy="28.5" rx="11" ry="12" fill="#fef08a" />

        {/* Modern Electronics Beanie */}
        <path d="M19 20 C19 11 45 11 45 20 Z" fill="#0f172a" />
        <rect x="18" y="19" width="28" height="4" rx="2" fill="#1e293b" />
        <path d="M29 21 L35 21" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />

        {/* Clear Tech Loupe / Monocular Headband */}
        <path d="M20 22 Q32 20 44 22" stroke="#475569" strokeWidth="1.8" />
        <circle cx="38" cy="27" r="4.5" fill="#38bdf8" fillOpacity="0.25" stroke="#0ea5e9" strokeWidth="1.4" />

        {/* Eyes */}
        <circle cx="26.5" cy="27.5" r="1.8" fill="#0f172a" />
        <circle cx="38" cy="27.5" r="1.8" fill="#0f172a" />
        <circle cx="27.2" cy="26.8" r="0.6" fill="#ffffff" />
        <circle cx="38.7" cy="26.8" r="0.6" fill="#ffffff" />

        {/* Friendly Focus */}
        <path d="M29 33.5 Q32 36 35 33.5" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 5. Rico - CVT & Drivetrain Tech
  {
    id: "avatar-5",
    name: "Rico",
    roleHint: "CVT Specialist",
    department: "Drivetrain Bay",
    bgGradient: "from-emerald-500 to-teal-600",
    borderColor: "border-emerald-500/40",
    badgeColor: "bg-emerald-500 text-zinc-950 font-bold",
    renderFace: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#0f172a" />
        <circle cx="32" cy="32" r="30.5" fill="#064e3b" />
        <circle cx="32" cy="32" r="29" fill="#022c22" />

        {/* Denim Workshirt / Shop Apron */}
        <path d="M12 60 C12 46 20 42 32 42 C44 42 52 46 52 60 Z" fill="#047857" />
        <path d="M25 42 L32 50 L39 42" stroke="#10b981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Brass Drive-Belt Pin */}
        <circle cx="32" cy="55" r="2.5" fill="#fbbf24" stroke="#d97706" strokeWidth="1" />

        {/* Neck */}
        <rect x="27.5" y="36" width="9" height="8" rx="3" fill="#fed7aa" />

        {/* Face */}
        <ellipse cx="32" cy="28.5" rx="11" ry="12" fill="#ffedd5" />

        {/* Workshop Bandanna / Headwrap */}
        <path d="M19 19 C19 11 45 11 45 19 Z" fill="#1e293b" />
        <path d="M18 19 Q32 17 46 19 L44 23 L20 23 Z" fill="#0f172a" />
        <circle cx="32" cy="20.5" r="1.2" fill="#10b981" />

        {/* Sharp Eyes & Brows */}
        <path d="M24 24 Q27 23 30 24.5" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M40 24 Q37 23 34 24.5" stroke="#18181b" strokeWidth="1.5" strokeLinecap="round" />
        <circle cx="27" cy="27.5" r="1.8" fill="#18181b" />
        <circle cx="37" cy="27.5" r="1.8" fill="#18181b" />

        {/* Broad Warm Smile */}
        <path d="M27.5 33 Q32 37.5 36.5 33" stroke="#0f172a" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 6. Elena - Service & Inventory Manager
  {
    id: "avatar-6",
    name: "Elena",
    roleHint: "Service Advisor",
    department: "Front Desk & Parts",
    bgGradient: "from-purple-500 to-indigo-600",
    borderColor: "border-purple-500/40",
    badgeColor: "bg-purple-500 text-white font-bold",
    renderFace: () => (
      <svg viewBox="0 0 64 64" fill="none" className="w-full h-full">
        <circle cx="32" cy="32" r="32" fill="#0f172a" />
        <circle cx="32" cy="32" r="30.5" fill="#312e81" />
        <circle cx="32" cy="32" r="29" fill="#1e1b4b" />

        {/* Service Advisor Modern Shop Polo & Lanyard */}
        <path d="M12 60 C12 46 20 42 32 42 C44 42 52 46 52 60 Z" fill="#4338ca" />
        {/* Emerald Workshop Lanyard */}
        <path d="M25 42 L32 54 L39 42" stroke="#10b981" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="30" y="54" width="4" height="6" rx="1" fill="#f8fafc" />

        {/* Neck */}
        <rect x="27.5" y="36" width="9" height="8" rx="3" fill="#fbcfe8" />

        {/* Hair Backdrop */}
        <ellipse cx="32" cy="27" rx="14" ry="14" fill="#1e1b4b" />

        {/* Face */}
        <ellipse cx="32" cy="28.5" rx="10.5" ry="11.5" fill="#fce7f3" />

        {/* Modern Styled Hair */}
        <path d="M20 22 C20 12 44 12 44 22 C42 16 38 15 32 16 C26 15 22 16 20 22 Z" fill="#0f172a" />
        <path d="M20 22 C19 28 20 33 21 35" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M44 22 C45 28 44 33 43 35" stroke="#0f172a" strokeWidth="2.5" strokeLinecap="round" />

        {/* Wireless Service Headset */}
        <rect x="42.5" y="26" width="2.5" height="6" rx="1.2" fill="#10b981" />
        <path d="M43 32 Q39 36 35 35" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" fill="none" />

        {/* Warm Expressive Eyes */}
        <circle cx="27" cy="27.5" r="1.8" fill="#1e1b4b" />
        <circle cx="37" cy="27.5" r="1.8" fill="#1e1b4b" />
        <circle cx="27.6" cy="26.8" r="0.6" fill="#ffffff" />
        <circle cx="37.6" cy="26.8" r="0.6" fill="#ffffff" />

        {/* Elegant Smile */}
        <path d="M28 33 Q32 36.5 36 33" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

/**
 * 100% Borderless UserAvatar Component
 * Renders pure, edge-to-edge SVG artwork with zero enclosing rings or border strokes.
 */
export function UserAvatar({
  avatarId,
  className = "w-8 h-8",
  showRing = false, // Ignored: invariant mandates 100% borderless
}: {
  avatarId?: string | null;
  className?: string;
  showRing?: boolean;
}) {
  const preset = AVATAR_PRESETS.find((p) => p.id === avatarId) || AVATAR_PRESETS[0];

  return (
    <div
      className={`rounded-full shrink-0 overflow-hidden flex items-center justify-center select-none ${className}`}
      title={`${preset.name} (${preset.roleHint} • ${preset.department})`}
    >
      {preset.renderFace()}
    </div>
  );
}
