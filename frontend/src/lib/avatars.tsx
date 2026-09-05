import React from "react";

export interface AvatarPreset {
  id: string;
  name: string;
  roleHint: string;
  bgGradient: string;
  borderColor: string;
  badgeColor: string;
  // SVG element or JSX
  renderFace: () => React.ReactNode;
}

export const AVATAR_PRESETS: AvatarPreset[] = [
  {
    id: "avatar-1",
    name: "Alex",
    roleHint: "Lead Tech",
    bgGradient: "from-cyan-500 to-blue-600",
    borderColor: "border-cyan-500/40",
    badgeColor: "bg-cyan-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        {/* Head */}
        <circle cx="18" cy="18" r="14" fill="#0ea5e9" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fcd34d" />
        {/* Hair: Slicked Dark */}
        <path d="M9 16 C9 9 27 9 27 16 C25 12 21 11 18 11 C15 11 11 12 9 16 Z" fill="#1e293b" />
        {/* Eyes */}
        <circle cx="15" cy="18" r="1.5" fill="#0f172a" />
        <circle cx="21" cy="18" r="1.5" fill="#0f172a" />
        {/* Smile */}
        <path d="M15 22 Q18 25 21 22" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        {/* High-tech Eyewear / Loupe */}
        <circle cx="15" cy="18" r="3.5" stroke="#38bdf8" strokeWidth="1.5" fill="none" />
        <line x1="18.5" y1="18" x2="17.5" y2="18" stroke="#38bdf8" strokeWidth="1.5" />
      </svg>
    ),
  },
  {
    id: "avatar-2",
    name: "Sam",
    roleHint: "Service Foreman",
    bgGradient: "from-purple-500 to-indigo-600",
    borderColor: "border-purple-500/40",
    badgeColor: "bg-purple-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#a855f7" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fed7aa" />
        {/* Hair: Purple Spikes */}
        <path d="M9 17 C8 10 14 6 18 7 C22 6 28 10 27 17 C26 13 23 11 18 11 C13 11 10 13 9 17 Z" fill="#475569" />
        {/* Glasses */}
        <rect x="11.5" y="16" width="5.5" height="4" rx="1.5" stroke="#9333ea" strokeWidth="1.2" fill="none" />
        <rect x="19" y="16" width="5.5" height="4" rx="1.5" stroke="#9333ea" strokeWidth="1.2" fill="none" />
        <line x1="17" y1="18" x2="19" y2="18" stroke="#9333ea" strokeWidth="1.2" />
        {/* Eyes inside */}
        <circle cx="14" cy="18" r="1" fill="#1e1b4b" />
        <circle cx="22" cy="18" r="1" fill="#1e1b4b" />
        {/* Smile */}
        <path d="M15 23 Q18 25.5 21 23" stroke="#475569" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-3",
    name: "Jordan",
    roleHint: "Head Cashier",
    bgGradient: "from-emerald-500 to-teal-600",
    borderColor: "border-emerald-500/40",
    badgeColor: "bg-emerald-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#10b981" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fde68a" />
        {/* Headset Mic */}
        <path d="M10 18 C10 11 26 11 26 18" stroke="#10b981" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <circle cx="10" cy="18" r="2" fill="#047857" />
        <path d="M10 20 L13 24 L16 24" stroke="#10b981" strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <circle cx="16" cy="24" r="1" fill="#059669" />
        {/* Hair */}
        <path d="M10 15 C11 10 25 10 26 15 C24 12 21 11 18 11 C15 11 12 12 10 15 Z" fill="#92400e" />
        {/* Eyes */}
        <circle cx="15" cy="18" r="1.3" fill="#1c1917" />
        <circle cx="21" cy="18" r="1.3" fill="#1c1917" />
        {/* Warm Smile */}
        <path d="M14.5 22 Q18 25.5 21.5 22" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-4",
    name: "Casey",
    roleHint: "Speed Tuner",
    bgGradient: "from-amber-500 to-orange-600",
    borderColor: "border-amber-500/40",
    badgeColor: "bg-amber-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#f59e0b" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#ffedd5" />
        {/* Backward Cap */}
        <path d="M8 15 C8 10 28 10 28 15 Z" fill="#d97706" />
        <rect x="7" y="14" width="22" height="3" rx="1.5" fill="#b45309" />
        {/* Eyes */}
        <circle cx="14.5" cy="19" r="1.3" fill="#292524" />
        <circle cx="21.5" cy="19" r="1.3" fill="#292524" />
        {/* Confident Grin */}
        <path d="M15 23 Q18 25 21 22.5" stroke="#292524" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-5",
    name: "Morgan",
    roleHint: "Shop Manager",
    bgGradient: "from-rose-500 to-red-600",
    borderColor: "border-rose-500/40",
    badgeColor: "bg-rose-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#f43f5e" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fed7aa" />
        {/* Sleek Bob Hair */}
        <path d="M9 16 C9 8 27 8 27 16 C27 22 25 24 24 24 C23 20 23 14 18 14 C13 14 13 20 12 24 C11 24 9 22 9 16 Z" fill="#18181b" />
        {/* Eyes with Lashes */}
        <circle cx="15" cy="18" r="1.3" fill="#18181b" />
        <circle cx="21" cy="18" r="1.3" fill="#18181b" />
        <path d="M14 16.5 L13 15.5" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />
        <path d="M22 16.5 L23 15.5" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />
        {/* Red Lip Smile */}
        <path d="M15.5 22.5 Q18 24.5 20.5 22.5" stroke="#e11d48" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-6",
    name: "Taylor",
    roleHint: "Motor Specialist",
    bgGradient: "from-blue-500 to-indigo-700",
    borderColor: "border-blue-500/40",
    badgeColor: "bg-blue-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#3b82f6" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fef08a" />
        {/* Bandana */}
        <path d="M8 15 C8 11 28 11 28 15 L28 17 L8 17 Z" fill="#2563eb" />
        <circle cx="12" cy="16" r="0.8" fill="#ffffff" />
        <circle cx="18" cy="16" r="0.8" fill="#ffffff" />
        <circle cx="24" cy="16" r="0.8" fill="#ffffff" />
        {/* Eyes */}
        <circle cx="15" cy="19" r="1.3" fill="#1e293b" />
        <circle cx="21" cy="19" r="1.3" fill="#1e293b" />
        {/* Stubble beard */}
        <circle cx="18" cy="24" r="0.5" fill="#94a3b8" />
        <circle cx="16" cy="24" r="0.5" fill="#94a3b8" />
        <circle cx="20" cy="24" r="0.5" fill="#94a3b8" />
        <path d="M15 22 Q18 23.5 21 22" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-7",
    name: "Riley",
    roleHint: "Parts Specialist",
    bgGradient: "from-teal-500 to-cyan-600",
    borderColor: "border-teal-500/40",
    badgeColor: "bg-teal-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#14b8a6" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#ffedd5" />
        {/* Curly Hair */}
        <circle cx="12" cy="13" r="3" fill="#451a03" />
        <circle cx="18" cy="11" r="3.5" fill="#451a03" />
        <circle cx="24" cy="13" r="3" fill="#451a03" />
        <circle cx="10" cy="17" r="2.5" fill="#451a03" />
        <circle cx="26" cy="17" r="2.5" fill="#451a03" />
        {/* Glasses */}
        <circle cx="14.5" cy="18.5" r="2.8" stroke="#0d9488" strokeWidth="1.2" fill="none" />
        <circle cx="21.5" cy="18.5" r="2.8" stroke="#0d9488" strokeWidth="1.2" fill="none" />
        <line x1="17.3" y1="18.5" x2="18.7" y2="18.5" stroke="#0d9488" strokeWidth="1.2" />
        {/* Eyes */}
        <circle cx="14.5" cy="18.5" r="1" fill="#1c1917" />
        <circle cx="21.5" cy="18.5" r="1" fill="#1c1917" />
        {/* Smile */}
        <path d="M15 23 Q18 25.5 21 23" stroke="#1c1917" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-8",
    name: "Dakota",
    roleHint: "Diagnostic Pro",
    bgGradient: "from-amber-400 to-yellow-600",
    borderColor: "border-amber-400/40",
    badgeColor: "bg-amber-400 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#fbbf24" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fde68a" />
        {/* Protective Safety Visor / Goggles */}
        <path d="M10 16 C10 14 26 14 26 16 L26 20 C26 21 23 22 18 22 C13 22 10 21 10 20 Z" fill="#0284c7" fillOpacity="0.7" stroke="#38bdf8" strokeWidth="1.2" />
        {/* Hair sticking out above */}
        <path d="M12 14 C12 8 24 8 24 14" stroke="#78350f" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        {/* Smile */}
        <path d="M15 24 Q18 26 21 24" stroke="#1c1917" strokeWidth="1.3" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
  {
    id: "avatar-9",
    name: "Jesse",
    roleHint: "Pit Crew Chief",
    bgGradient: "from-violet-600 to-fuchsia-600",
    borderColor: "border-violet-500/40",
    badgeColor: "bg-violet-600 text-white",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#8b5cf6" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fed7aa" />
        {/* Racing Helmet Visor */}
        <path d="M8 17 C8 8 28 8 28 17 C28 25 25 28 18 28 C11 28 8 25 8 17 Z" stroke="#7c3aed" strokeWidth="2" fill="none" />
        <rect x="11" y="15" width="14" height="6" rx="3" fill="#0f172a" stroke="#a78bfa" strokeWidth="1" />
        <path d="M13 18 L23 18" stroke="#38bdf8" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    id: "avatar-10",
    name: "Avery",
    roleHint: "Systems Master",
    bgGradient: "from-sky-400 to-cyan-500",
    borderColor: "border-sky-400/40",
    badgeColor: "bg-sky-400 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 36 36" fill="none" className="w-full h-full">
        <circle cx="18" cy="18" r="14" fill="#38bdf8" fillOpacity="0.2" />
        <ellipse cx="18" cy="19" rx="9" ry="10" fill="#fef08a" />
        {/* Sleek Cyber Glasses */}
        <path d="M9 16 C9 9 27 9 27 16 Z" fill="#0369a1" />
        <polygon points="11,17 17,17 16,21 12,21" fill="#06b6d4" />
        <polygon points="19,17 25,17 24,21 20,21" fill="#06b6d4" />
        <line x1="17" y1="18" x2="19" y2="18" stroke="#0284c7" strokeWidth="1.5" />
        {/* Smile */}
        <path d="M15 23 Q18 25.5 21 23" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

export function UserAvatar({
  avatarId,
  className = "w-8 h-8",
}: {
  avatarId?: string | null;
  className?: string;
}) {
  const preset = AVATAR_PRESETS.find((p) => p.id === avatarId) || AVATAR_PRESETS[0];

  return (
    <div
      className={`rounded-full p-0.5 bg-gradient-to-tr ${preset.bgGradient} border ${preset.borderColor} flex items-center justify-center shrink-0 shadow-md ${className}`}
      title={`${preset.name} (${preset.roleHint})`}
    >
      <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center overflow-hidden p-0.5">
        {preset.renderFace()}
      </div>
    </div>
  );
}
