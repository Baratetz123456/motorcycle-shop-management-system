export type AppTheme = "cyan" | "emerald" | "violet" | "amber";

export interface ThemeOption {
  id: AppTheme;
  name: string;
  tagline: string;
  accentColor: string;
  gradientClass: string;
  badgeBg: string;
  badgeText: string;
  borderClass: string;
  previewSwatches: string[];
}

export const THEME_OPTIONS: ThemeOption[] = [
  {
    id: "cyan",
    name: "Cyan Drift",
    tagline: "Electric Cyan & Velocity Blue",
    accentColor: "#06b6d4",
    gradientClass: "from-cyan-400 via-blue-500 to-indigo-400",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
    borderClass: "border-cyan-500/30",
    previewSwatches: ["#06b6d4", "#3b82f6", "#6366f1"],
  },
  {
    id: "emerald",
    name: "Emerald Speed",
    tagline: "Neon Green & Mint Teal",
    accentColor: "#10b981",
    gradientClass: "from-emerald-400 via-teal-500 to-cyan-400",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    previewSwatches: ["#10b981", "#14b8a6", "#06b6d4"],
  },
  {
    id: "violet",
    name: "Violet Hyperdrive",
    tagline: "Hyper Purple & Electric Indigo",
    accentColor: "#a855f7",
    gradientClass: "from-purple-400 via-violet-500 to-indigo-400",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    borderClass: "border-purple-500/30",
    previewSwatches: ["#a855f7", "#8b5cf6", "#6366f1"],
  },
  {
    id: "amber",
    name: "Amber Forge",
    tagline: "Sunset Gold & Crimson Amber",
    accentColor: "#f59e0b",
    gradientClass: "from-amber-400 via-orange-500 to-rose-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    borderClass: "border-amber-500/30",
    previewSwatches: ["#f59e0b", "#f97316", "#f43f5e"],
  },
];

const THEME_STORAGE_KEY = "motoshop_app_theme";

export function getAppTheme(): AppTheme {
  if (typeof window === "undefined") return "cyan";
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
    if (stored && ["cyan", "emerald", "violet", "amber"].includes(stored)) {
      return stored;
    }
    return "cyan";
  } catch (e) {
    return "cyan";
  }
}

export function saveAppTheme(theme: AppTheme): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    window.dispatchEvent(new CustomEvent("theme_updated", { detail: { theme } }));
  } catch (e) {
    console.error("Failed to save theme:", e);
  }
}

export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}
