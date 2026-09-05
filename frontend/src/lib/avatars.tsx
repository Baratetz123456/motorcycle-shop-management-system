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
  // 1. Alex - Lead Master Tech (Flat Mechanic Cap & Navy Crew)
  {
    id: "avatar-1",
    name: "Alex",
    roleHint: "Lead Tech",
    department: "Workshop Floor",
    bgGradient: "from-cyan-500 via-sky-500 to-blue-600",
    borderColor: "border-cyan-500/40",
    badgeColor: "bg-cyan-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        {/* Background Plate */}
        <circle cx="24" cy="24" r="23" fill="#0c4a6e" />
        {/* Shoulders / Torso */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#1e293b" />
        {/* Collar Accent */}
        <path d="M21 33 L24 37 L27 33" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#f59e0b" />
        {/* Face Base */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fcd34d" />
        {/* Hair sideburns */}
        <path d="M15 20 L15 24 L16.5 24 L16.5 20 Z" fill="#0f172a" />
        <path d="M33 20 L33 24 L31.5 24 L31.5 20 Z" fill="#0f172a" />
        {/* Flat Mechanic Cap */}
        <path d="M14 19 C14 12 34 12 34 19 Z" fill="#0f172a" />
        <path d="M12 19 C12 17 36 17 36 19 L34 21 L14 21 Z" fill="#1e293b" />
        <rect x="20" y="15" width="8" height="3" rx="1" fill="#06b6d4" />
        {/* Eyes */}
        <circle cx="20" cy="23" r="1.5" fill="#0f172a" />
        <circle cx="28" cy="23" r="1.5" fill="#0f172a" />
        <circle cx="20.5" cy="22.5" r="0.5" fill="#ffffff" />
        <circle cx="28.5" cy="22.5" r="0.5" fill="#ffffff" />
        {/* Eyebrows */}
        <path d="M18.5 20.5 Q20.5 19.5 22 20.5" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M26 20.5 Q27.5 19.5 29.5 20.5" stroke="#0f172a" strokeWidth="1.2" strokeLinecap="round" />
        {/* Nose */}
        <path d="M24 23 L23.5 25 L24.5 25" stroke="#d97706" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Smile */}
        <path d="M21 27 Q24 30 27 27" stroke="#0f172a" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 2. Sam - Service Foreman (Clean Flat Glasses & Workshop Polo)
  {
    id: "avatar-2",
    name: "Sam",
    roleHint: "Service Foreman",
    department: "Service Management",
    bgGradient: "from-purple-500 via-violet-500 to-indigo-600",
    borderColor: "border-purple-500/40",
    badgeColor: "bg-purple-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#3b0764" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#4c1d95" />
        <path d="M20 33 L24 38 L28 33" fill="#f8fafc" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fed7aa" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fed7aa" />
        {/* Slick Flat Hair */}
        <path d="M14 18 C14 10 34 10 34 18 C32 13 28 12 24 12 C19 12 16 14 14 18 Z" fill="#334155" />
        {/* Glasses - Flat Geometric */}
        <rect x="16.5" y="19.5" width="6.5" height="5" rx="1.5" stroke="#c084fc" strokeWidth="1.5" fill="#581c87" fillOpacity="0.4" />
        <rect x="25" y="19.5" width="6.5" height="5" rx="1.5" stroke="#c084fc" strokeWidth="1.5" fill="#581c87" fillOpacity="0.4" />
        <line x1="23" y1="22" x2="25" y2="22" stroke="#c084fc" strokeWidth="1.5" />
        {/* Eyes inside glasses */}
        <circle cx="19.8" cy="22" r="1.3" fill="#0f172a" />
        <circle cx="28.2" cy="22" r="1.3" fill="#0f172a" />
        <circle cx="20.3" cy="21.5" r="0.4" fill="#ffffff" />
        <circle cx="28.7" cy="21.5" r="0.4" fill="#ffffff" />
        {/* Smile */}
        <path d="M21 28 Q24 30.5 27 28" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 3. Jordan - Head Cashier (Service Headset & Front Counter Lanyard)
  {
    id: "avatar-3",
    name: "Jordan",
    roleHint: "Head Cashier",
    department: "POS & Billing",
    bgGradient: "from-emerald-500 via-teal-500 to-green-600",
    borderColor: "border-emerald-500/40",
    badgeColor: "bg-emerald-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#064e3b" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#047857" />
        {/* Lanyard & Tag */}
        <path d="M20 33 L24 41 L28 33" stroke="#a7f3d0" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        <rect x="22.5" y="40" width="3" height="4" rx="0.5" fill="#f8fafc" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fde68a" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fde68a" />
        {/* Medium Wavy Hair */}
        <path d="M14 22 C13 14 16 11 24 11 C32 11 35 14 34 22 C34 26 31 25 31 22 C31 16 17 16 17 22 C17 25 14 26 14 22 Z" fill="#78350f" />
        {/* Headset Band */}
        <path d="M14 21 C14 12 34 12 34 21" stroke="#34d399" strokeWidth="2" strokeLinecap="round" fill="none" />
        {/* Ear Cushions */}
        <rect x="12.5" y="19" width="3" height="5" rx="1.5" fill="#065f46" />
        <rect x="32.5" y="19" width="3" height="5" rx="1.5" fill="#065f46" />
        {/* Boom Mic */}
        <path d="M14 22 L17 27 L21 27" stroke="#34d399" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <circle cx="21" cy="27" r="1.2" fill="#10b981" />
        {/* Eyes */}
        <circle cx="20" cy="22" r="1.4" fill="#1c1917" />
        <circle cx="28" cy="22" r="1.4" fill="#1c1917" />
        <circle cx="20.4" cy="21.5" r="0.5" fill="#ffffff" />
        <circle cx="28.4" cy="21.5" r="0.5" fill="#ffffff" />
        {/* Warm Smile */}
        <path d="M20.5 27 Q24 30.5 27.5 27" stroke="#1c1917" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 4. Casey - Speed Tuner (Flat Backward Snapback & Orange Racing Crew)
  {
    id: "avatar-4",
    name: "Casey",
    roleHint: "Speed Tuner",
    department: "Dyno & Engine",
    bgGradient: "from-amber-500 via-orange-500 to-red-600",
    borderColor: "border-amber-500/40",
    badgeColor: "bg-amber-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#7c2d12" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#18181b" />
        {/* Racing Collar Strip */}
        <path d="M17 33 L24 38 L31 33" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fed7aa" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#ffedd5" />
        {/* Hair Tuft protruding under cap */}
        <path d="M14 22 L13 25 L15 24 Z" fill="#292524" />
        <path d="M34 22 L35 25 L33 24 Z" fill="#292524" />
        {/* Backward Snapback Cap Dome */}
        <path d="M13 20 C13 11 35 11 35 20 Z" fill="#ea580c" />
        {/* Cap Edge / Brim at Back */}
        <path d="M11 20 C11 18 37 18 37 20 L35 22 L13 22 Z" fill="#c2410c" />
        {/* Snap Adjustment Hole */}
        <path d="M22 17 Q24 15 26 17" stroke="#7c2d12" strokeWidth="1.5" strokeLinecap="round" fill="none" />
        {/* Eyes with energetic gaze */}
        <circle cx="19.5" cy="23" r="1.5" fill="#292524" />
        <circle cx="28.5" cy="23" r="1.5" fill="#292524" />
        <circle cx="20" cy="22.5" r="0.5" fill="#ffffff" />
        <circle cx="29" cy="22.5" r="0.5" fill="#ffffff" />
        {/* Sharp Eyebrows */}
        <path d="M18 20.5 L22 21.5" stroke="#292524" strokeWidth="1.5" strokeLinecap="round" />
        <path d="M30 20.5 L26 21.5" stroke="#292524" strokeWidth="1.5" strokeLinecap="round" />
        {/* Confident Grin */}
        <path d="M20.5 27.5 Q24 30.5 28 26.5" stroke="#292524" strokeWidth="1.6" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 5. Morgan - General Manager (Sleek Bob, Tailored Collar & Blazer)
  {
    id: "avatar-5",
    name: "Morgan",
    roleHint: "Shop Manager",
    department: "Executive & Admin",
    bgGradient: "from-rose-500 via-pink-500 to-red-600",
    borderColor: "border-rose-500/40",
    badgeColor: "bg-rose-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#4c0519" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#18181b" />
        {/* White Blouse Inner */}
        <polygon points="20,33 24,40 28,33" fill="#f4f4f5" />
        {/* Blazer Lapel */}
        <path d="M16 34 L21 44 L27 44 L32 34" stroke="#e11d48" strokeWidth="1.8" fill="none" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fed7aa" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fed7aa" />
        {/* Sleek Asymmetrical Bob */}
        <path d="M14 20 C14 10 34 10 34 20 C34 27 32 29 30 29 C29 23 29 16 24 16 C18 16 17 23 16 28 C15 28 14 26 14 20 Z" fill="#18181b" />
        {/* Sharp Eyes */}
        <circle cx="20" cy="22" r="1.4" fill="#18181b" />
        <circle cx="28" cy="22" r="1.4" fill="#18181b" />
        <circle cx="20.4" cy="21.5" r="0.5" fill="#ffffff" />
        <circle cx="28.4" cy="21.5" r="0.5" fill="#ffffff" />
        {/* Refined Eyebrows */}
        <path d="M18 19.5 Q20.5 18.5 22 19.5" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" />
        <path d="M26 19.5 Q27.5 18.5 30 19.5" stroke="#18181b" strokeWidth="1.2" strokeLinecap="round" />
        {/* Red Lip Smile */}
        <path d="M21 27.5 Q24 29.5 27 27.5" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 6. Taylor - Engine Specialist (Mechanic Bandana & Denim Vest)
  {
    id: "avatar-6",
    name: "Taylor",
    roleHint: "Engine Specialist",
    department: "Powertrain",
    bgGradient: "from-blue-600 via-indigo-600 to-slate-900",
    borderColor: "border-blue-500/40",
    badgeColor: "bg-blue-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#172554" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#1e3a8a" />
        {/* Dark Crew Tee */}
        <path d="M19 33 L24 37 L29 33" stroke="#0f172a" strokeWidth="2" fill="none" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fef08a" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fde047" />
        {/* Hair underneath */}
        <path d="M13 22 L13 26 L15 25 Z" fill="#1e293b" />
        <path d="M35 22 L35 26 L33 25 Z" fill="#1e293b" />
        {/* Mechanic Bandana Wrap */}
        <path d="M13 18 C13 12 35 12 35 18 L35 22 L13 22 Z" fill="#2563eb" />
        {/* Bandana White Flat Patterns */}
        <circle cx="18" cy="18" r="1" fill="#ffffff" />
        <circle cx="24" cy="18" r="1" fill="#ffffff" />
        <circle cx="30" cy="18" r="1" fill="#ffffff" />
        <circle cx="21" cy="20" r="0.8" fill="#ffffff" />
        <circle cx="27" cy="20" r="0.8" fill="#ffffff" />
        {/* Focused Eyes */}
        <circle cx="19.5" cy="23" r="1.4" fill="#0f172a" />
        <circle cx="28.5" cy="23" r="1.4" fill="#0f172a" />
        {/* Stubble Beards */}
        <circle cx="24" cy="30" r="0.7" fill="#64748b" />
        <circle cx="21.5" cy="29.5" r="0.7" fill="#64748b" />
        <circle cx="26.5" cy="29.5" r="0.7" fill="#64748b" />
        <circle cx="19.5" cy="28.5" r="0.7" fill="#64748b" />
        <circle cx="28.5" cy="28.5" r="0.7" fill="#64748b" />
        {/* Smile */}
        <path d="M21 26.5 Q24 28 27 26.5" stroke="#0f172a" strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 7. Riley - Parts Specialist (Wireframe Glasses & Teal Polo)
  {
    id: "avatar-7",
    name: "Riley",
    roleHint: "Parts Specialist",
    department: "Inventory & OEM",
    bgGradient: "from-teal-500 via-cyan-500 to-emerald-600",
    borderColor: "border-teal-500/40",
    badgeColor: "bg-teal-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#134e4a" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#0f766e" />
        {/* Barcode/Scanner Pin */}
        <rect x="29" y="36" width="4" height="2" rx="0.5" fill="#f8fafc" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fed7aa" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fed7aa" />
        {/* Curly Modern Hair */}
        <circle cx="16" cy="15" r="4.5" fill="#451a03" />
        <circle cx="24" cy="12" r="5" fill="#451a03" />
        <circle cx="32" cy="15" r="4.5" fill="#451a03" />
        <circle cx="13" cy="20" r="3.5" fill="#451a03" />
        <circle cx="35" cy="20" r="3.5" fill="#451a03" />
        {/* Flat Wireframe Round Glasses */}
        <circle cx="19.5" cy="22" r="3.8" stroke="#14b8a6" strokeWidth="1.5" fill="#0f766e" fillOpacity="0.25" />
        <circle cx="28.5" cy="22" r="3.8" stroke="#14b8a6" strokeWidth="1.5" fill="#0f766e" fillOpacity="0.25" />
        <line x1="23.3" y1="22" x2="24.7" y2="22" stroke="#14b8a6" strokeWidth="1.5" />
        {/* Eyes */}
        <circle cx="19.5" cy="22" r="1.3" fill="#1c1917" />
        <circle cx="28.5" cy="22" r="1.3" fill="#1c1917" />
        <circle cx="19.9" cy="21.5" r="0.4" fill="#ffffff" />
        <circle cx="28.9" cy="21.5" r="0.4" fill="#ffffff" />
        {/* Smile */}
        <path d="M21 27.5 Q24 30.5 27 27.5" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 8. Dakota - Diagnostic Pro (Blue Safety Visor & Diagnostic Suit)
  {
    id: "avatar-8",
    name: "Dakota",
    roleHint: "Diagnostic Pro",
    department: "ECU & Telemetry",
    bgGradient: "from-amber-400 via-yellow-500 to-amber-600",
    borderColor: "border-amber-400/40",
    badgeColor: "bg-amber-400 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#713f12" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#334155" />
        {/* High-tech Visor Harness Piping */}
        <path d="M16 44 L20 33 M32 44 L28 33" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fde68a" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fde68a" />
        {/* Sandy Spiky Hair */}
        <path d="M15 17 C15 10 33 10 33 17 C31 12 28 11 24 11 C20 11 17 12 15 17 Z" fill="#b45309" />
        <path d="M20 11 L22 8 L24 11 L26 8 L28 11" stroke="#b45309" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Diagnostic Protective Safety Visor / Shield */}
        <path d="M13 19 C13 17 35 17 35 19 L35 24 C35 25.5 31 27 24 27 C17 27 13 25.5 13 24 Z" fill="#0284c7" fillOpacity="0.75" stroke="#38bdf8" strokeWidth="1.5" />
        <line x1="16" y1="21" x2="32" y2="21" stroke="#bae6fd" strokeWidth="1" strokeLinecap="round" opacity="0.6" />
        {/* Eyes Visible Behind Visor */}
        <circle cx="19.5" cy="22" r="1.3" fill="#0f172a" />
        <circle cx="28.5" cy="22" r="1.3" fill="#0f172a" />
        {/* Smile */}
        <path d="M21 29 Q24 31.5 27 29" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 9. Jesse - Pit Crew Chief (Aerodynamic Racing Cap & Radio Headset)
  {
    id: "avatar-9",
    name: "Jesse",
    roleHint: "Pit Crew Chief",
    department: "Trackside & Tuning",
    bgGradient: "from-violet-600 via-fuchsia-600 to-pink-600",
    borderColor: "border-violet-500/40",
    badgeColor: "bg-violet-600 text-white",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#4a044e" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#581c87" />
        {/* Racing Checkered Collar Accent */}
        <rect x="22" y="34" width="4" height="4" fill="#ede9fe" />
        <rect x="20" y="34" width="2" height="2" fill="#1e1b4b" />
        <rect x="24" y="36" width="2" height="2" fill="#1e1b4b" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fed7aa" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fed7aa" />
        {/* Racing Helmet / Pit Cap */}
        <path d="M13 18 C13 10 35 10 35 18 L36 21 L12 21 Z" fill="#7c3aed" />
        <path d="M11 20 L37 20" stroke="#f472b6" strokeWidth="2" strokeLinecap="round" />
        {/* Radio Communication Earpiece */}
        <rect x="33" y="20" width="3" height="5" rx="1.5" fill="#0f172a" stroke="#a78bfa" strokeWidth="1" />
        {/* Eyes */}
        <circle cx="19.5" cy="23" r="1.4" fill="#1e1b4b" />
        <circle cx="28.5" cy="23" r="1.4" fill="#1e1b4b" />
        <circle cx="20" cy="22.5" r="0.5" fill="#ffffff" />
        <circle cx="29" cy="22.5" r="0.5" fill="#ffffff" />
        {/* Eyebrows */}
        <path d="M18 20.5 L22 21" stroke="#1e1b4b" strokeWidth="1.3" strokeLinecap="round" />
        <path d="M30 20.5 L26 21" stroke="#1e1b4b" strokeWidth="1.3" strokeLinecap="round" />
        {/* Smile */}
        <path d="M21 27.5 Q24 30 27 27.5" stroke="#1e1b4b" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 10. Avery - Dyno / Systems Master (Cyber HUD Specs & High-Neck Uniform)
  {
    id: "avatar-10",
    name: "Avery",
    roleHint: "Systems Master",
    department: "Telemetry & Dyno",
    bgGradient: "from-sky-400 via-cyan-500 to-blue-600",
    borderColor: "border-sky-400/40",
    badgeColor: "bg-sky-400 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#082f49" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#0f172a" />
        {/* High Tech Cyan Shoulder Trim */}
        <path d="M10 40 L16 33 M38 40 L32 33" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
        {/* High-Neck Collar */}
        <path d="M20 28 L20 33 L28 33 L28 28 Z" fill="#1e293b" />
        {/* Face */}
        <ellipse cx="24" cy="21" rx="9" ry="9.5" fill="#fef08a" />
        {/* Short Dark Cropped Hair */}
        <path d="M14 18 C14 11 34 11 34 18 C33 13 29 11 24 11 C19 11 15 13 14 18 Z" fill="#0f172a" />
        {/* Flat Cyber HUD Glasses */}
        <polygon points="15,19 23,19 22,24 16,24" fill="#06b6d4" fillOpacity="0.85" stroke="#22d3ee" strokeWidth="1.2" />
        <polygon points="25,19 33,19 32,24 26,24" fill="#06b6d4" fillOpacity="0.85" stroke="#22d3ee" strokeWidth="1.2" />
        <line x1="23" y1="20.5" x2="25" y2="20.5" stroke="#22d3ee" strokeWidth="1.5" />
        {/* Eyes Glint Inside HUD */}
        <circle cx="19" cy="21.5" r="1.2" fill="#082f49" />
        <circle cx="29" cy="21.5" r="1.2" fill="#082f49" />
        {/* Smile */}
        <path d="M21 27 Q24 29.5 27 27" stroke="#0f172a" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 11. Marcus - Senior Electrical Tech (Industrial Safety Earmuffs & Hi-Vis)
  {
    id: "avatar-11",
    name: "Marcus",
    roleHint: "Electrical Tech",
    department: "Wiring & Harness",
    bgGradient: "from-yellow-500 via-amber-500 to-orange-600",
    borderColor: "border-yellow-500/40",
    badgeColor: "bg-yellow-500 text-zinc-950",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#451a03" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#1e293b" />
        {/* Hi-Vis Yellow Chest Band */}
        <path d="M10 41 L38 41" stroke="#eab308" strokeWidth="3" strokeLinecap="round" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#d97706" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#f59e0b" />
        {/* Short Dark Crop Hair */}
        <path d="M14 18 C14 11 34 11 34 18 Z" fill="#1c1917" />
        {/* Industrial Safety Earmuffs */}
        <path d="M13 20 C13 9 35 9 35 20" stroke="#ca8a04" strokeWidth="2.5" strokeLinecap="round" fill="none" />
        <rect x="11" y="19" width="4" height="7" rx="2" fill="#eab308" stroke="#a16207" strokeWidth="1.2" />
        <rect x="33" y="19" width="4" height="7" rx="2" fill="#eab308" stroke="#a16207" strokeWidth="1.2" />
        {/* Eyes */}
        <circle cx="19.5" cy="22.5" r="1.4" fill="#1c1917" />
        <circle cx="28.5" cy="22.5" r="1.4" fill="#1c1917" />
        <circle cx="20" cy="22" r="0.5" fill="#ffffff" />
        <circle cx="29" cy="22" r="0.5" fill="#ffffff" />
        {/* Determined Eyebrows */}
        <path d="M18 19.5 L22 20.5" stroke="#1c1917" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M30 19.5 L26 20.5" stroke="#1c1917" strokeWidth="1.4" strokeLinecap="round" />
        {/* Confident Smile */}
        <path d="M21 27 Q24 29.5 27 27" stroke="#1c1917" strokeWidth="1.5" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },

  // 12. Elena - Customer Care Lead (Polished High Bun, Service Lapel & Smile)
  {
    id: "avatar-12",
    name: "Elena",
    roleHint: "Customer Care",
    department: "Reception & Relations",
    bgGradient: "from-pink-500 via-rose-500 to-purple-600",
    borderColor: "border-pink-500/40",
    badgeColor: "bg-pink-500 text-white",
    renderFace: () => (
      <svg viewBox="0 0 48 48" fill="none" className="w-full h-full">
        <circle cx="24" cy="24" r="23" fill="#500724" />
        {/* Shoulders */}
        <path d="M10 44 C10 36 16 33 24 33 C32 33 38 36 38 44 Z" fill="#9f1239" />
        {/* Gold Customer Care Lapel Pin */}
        <circle cx="29" cy="37" r="1.5" fill="#fbbf24" />
        {/* White Inner Collar */}
        <polygon points="20,33 24,39 28,33" fill="#fdf2f8" />
        {/* Neck */}
        <rect x="21" y="28" width="6" height="6" rx="2" fill="#fed7aa" />
        {/* Face */}
        <ellipse cx="24" cy="22" rx="9" ry="10" fill="#fed7aa" />
        {/* High Top Bun */}
        <circle cx="24" cy="9" r="4.5" fill="#18181b" />
        {/* Polished Side-Swept Hair */}
        <path d="M14 19 C14 11 34 11 34 19 C32 14 27 13 24 13 C18 13 15 15 14 19 Z" fill="#18181b" />
        {/* Pearl Stud Earrings */}
        <circle cx="14" cy="23" r="1.2" fill="#f8fafc" />
        <circle cx="34" cy="23" r="1.2" fill="#f8fafc" />
        {/* Friendly Expressive Eyes */}
        <circle cx="19.5" cy="22" r="1.4" fill="#18181b" />
        <circle cx="28.5" cy="22" r="1.4" fill="#18181b" />
        <circle cx="20" cy="21.5" r="0.5" fill="#ffffff" />
        <circle cx="29" cy="21.5" r="0.5" fill="#ffffff" />
        {/* Soft Eyelash Accent */}
        <path d="M18 20.5 L17 19.5" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />
        <path d="M30 20.5 L31 19.5" stroke="#18181b" strokeWidth="1" strokeLinecap="round" />
        {/* Warm Rose Smile */}
        <path d="M20.5 27 Q24 30.5 27.5 27" stroke="#e11d48" strokeWidth="1.8" strokeLinecap="round" fill="none" />
      </svg>
    ),
  },
];

export function UserAvatar({
  avatarId,
  className = "w-8 h-8",
  showRing = true,
}: {
  avatarId?: string | null;
  className?: string;
  showRing?: boolean;
}) {
  const preset = AVATAR_PRESETS.find((p) => p.id === avatarId) || AVATAR_PRESETS[0];

  return (
    <div
      className={`rounded-full p-0.5 bg-gradient-to-tr ${preset.bgGradient} ${
        showRing ? `border ${preset.borderColor}` : ""
      } flex items-center justify-center shrink-0 shadow-md transition-transform ${className}`}
      title={`${preset.name} (${preset.roleHint} • ${preset.department})`}
    >
      <div className="w-full h-full bg-zinc-950 rounded-full flex items-center justify-center overflow-hidden p-0.5">
        {preset.renderFace()}
      </div>
    </div>
  );
}
