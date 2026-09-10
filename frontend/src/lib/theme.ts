export type DarkAppTheme = "cyan" | "emerald" | "violet" | "amber";
export type LightAppTheme = "cobalt" | "emerald-alpine" | "amethyst" | "crimson";
export type AppTheme = DarkAppTheme | LightAppTheme;

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

export const DARK_THEME_OPTIONS: ThemeOption[] = [
  {
    id: "cyan",
    name: "Cyan Drift",
    tagline: "Electric Cyan & Dark Zinc",
    accentColor: "#06b6d4",
    gradientClass: "from-cyan-400 to-cyan-400",
    badgeBg: "bg-cyan-500/10",
    badgeText: "text-cyan-400",
    borderClass: "border-cyan-500/30",
    previewSwatches: ["#06b6d4", "#06b6d4", "#06b6d4"],
  },
  {
    id: "emerald",
    name: "Emerald Speed",
    tagline: "Neon Emerald & Dark Zinc",
    accentColor: "#10b981",
    gradientClass: "from-emerald-400 to-emerald-400",
    badgeBg: "bg-emerald-500/10",
    badgeText: "text-emerald-400",
    borderClass: "border-emerald-500/30",
    previewSwatches: ["#10b981", "#10b981", "#10b981"],
  },
  {
    id: "violet",
    name: "Violet Hyperdrive",
    tagline: "Hyper Violet & Dark Zinc",
    accentColor: "#a855f7",
    gradientClass: "from-purple-400 to-purple-400",
    badgeBg: "bg-purple-500/10",
    badgeText: "text-purple-400",
    borderClass: "border-purple-500/30",
    previewSwatches: ["#a855f7", "#a855f7", "#a855f7"],
  },
  {
    id: "amber",
    name: "Amber Forge",
    tagline: "Forge Amber & Dark Zinc",
    accentColor: "#f59e0b",
    gradientClass: "from-amber-400 to-amber-400",
    badgeBg: "bg-amber-500/10",
    badgeText: "text-amber-400",
    borderClass: "border-amber-500/30",
    previewSwatches: ["#f59e0b", "#f59e0b", "#f59e0b"],
  },
];

export const LIGHT_THEME_OPTIONS: ThemeOption[] = [
  {
    id: "cobalt",
    name: "Cobalt Horizon",
    tagline: "Deep Sapphire Blue",
    accentColor: "#1d4ed8",
    gradientClass: "from-blue-600 to-blue-600",
    badgeBg: "bg-blue-600/10",
    badgeText: "text-blue-700",
    borderClass: "border-blue-600/30",
    previewSwatches: ["#1d4ed8", "#1d4ed8", "#1d4ed8"],
  },
  {
    id: "emerald-alpine",
    name: "Emerald Alpine",
    tagline: "Forest Pine Green",
    accentColor: "#047857",
    gradientClass: "from-emerald-700 to-emerald-700",
    badgeBg: "bg-emerald-600/10",
    badgeText: "text-emerald-700",
    borderClass: "border-emerald-600/30",
    previewSwatches: ["#047857", "#047857", "#047857"],
  },
  {
    id: "amethyst",
    name: "Amethyst Royal",
    tagline: "Deep Velvet Violet",
    accentColor: "#6d28d9",
    gradientClass: "from-violet-700 to-violet-700",
    badgeBg: "bg-purple-600/10",
    badgeText: "text-purple-700",
    borderClass: "border-purple-600/30",
    previewSwatches: ["#6d28d9", "#6d28d9", "#6d28d9"],
  },
  {
    id: "crimson",
    name: "Crimson Sunset",
    tagline: "Vibrant Ruby Crimson",
    accentColor: "#be123c",
    gradientClass: "from-rose-600 to-rose-600",
    badgeBg: "bg-rose-600/10",
    badgeText: "text-rose-700",
    borderClass: "border-rose-600/30",
    previewSwatches: ["#be123c", "#be123c", "#be123c"],
  },
];

export const THEME_OPTIONS = DARK_THEME_OPTIONS;

export function getThemesForMode(mode: AppMode): ThemeOption[] {
  return mode === "light" ? LIGHT_THEME_OPTIONS : DARK_THEME_OPTIONS;
}

export function getDefaultThemeForMode(mode: AppMode): AppTheme {
  return mode === "light" ? "cobalt" : "cyan";
}

export type AppMode = "dark" | "light";

const THEME_STORAGE_KEY = "motoshop_app_theme";
const MODE_STORAGE_KEY = "motoshop_app_mode";

const ALL_VALID_THEMES: AppTheme[] = [
  "cyan", "emerald", "violet", "amber",
  "cobalt", "emerald-alpine", "amethyst", "crimson"
];

function getUserThemeKey(userId?: string | null): string {
  const uid = userId || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
  return uid ? `motoshop_app_theme_${uid}` : THEME_STORAGE_KEY;
}

function getUserModeKey(userId?: string | null): string {
  const uid = userId || (typeof window !== "undefined" ? localStorage.getItem("user_id") : null);
  return uid ? `motoshop_app_mode_${uid}` : MODE_STORAGE_KEY;
}

export function isValidTheme(theme: any): theme is AppTheme {
  return typeof theme === "string" && ALL_VALID_THEMES.includes(theme as AppTheme);
}

export function getAppTheme(userId?: string | null): AppTheme {
  if (typeof window === "undefined") return "cyan";
  try {
    const userKey = getUserThemeKey(userId);
    let stored = localStorage.getItem(userKey) as AppTheme;
    if (!stored && userKey !== THEME_STORAGE_KEY) {
      stored = localStorage.getItem(THEME_STORAGE_KEY) as AppTheme;
    }
    if (stored && ALL_VALID_THEMES.includes(stored)) {
      return stored;
    }
    const mode = getAppMode(userId);
    return getDefaultThemeForMode(mode);
  } catch (e) {
    return "cyan";
  }
}

export function saveAppTheme(theme: AppTheme, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const userKey = getUserThemeKey(userId);
    localStorage.setItem(userKey, theme);
    // Also update current session global fallback
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDocument(theme);
    window.dispatchEvent(new CustomEvent("theme_updated", { detail: { theme, userId } }));
  } catch (e) {
    console.error("Failed to save theme:", e);
  }
}

export function applyThemeToDocument(theme: AppTheme): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", theme);
}

export function getAppMode(userId?: string | null): AppMode {
  if (typeof window === "undefined") return "dark";
  try {
    const userKey = getUserModeKey(userId);
    let stored = localStorage.getItem(userKey) as AppMode;
    if (!stored && userKey !== MODE_STORAGE_KEY) {
      stored = localStorage.getItem(MODE_STORAGE_KEY) as AppMode;
    }
    if (stored && ["dark", "light"].includes(stored)) {
      return stored;
    }
    return "dark";
  } catch (e) {
    return "dark";
  }
}

export function saveAppMode(mode: AppMode, userId?: string | null): void {
  if (typeof window === "undefined") return;
  try {
    const userKey = getUserModeKey(userId);
    localStorage.setItem(userKey, mode);
    // Also update current session global fallback
    localStorage.setItem(MODE_STORAGE_KEY, mode);
    applyModeToDocument(mode);
    window.dispatchEvent(new CustomEvent("mode_updated", { detail: { mode, userId } }));
  } catch (e) {
    console.error("Failed to save appearance mode:", e);
  }
}

export function applyModeToDocument(mode: AppMode): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-mode", mode);
  if (mode === "light") {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
  } else {
    document.documentElement.classList.remove("light");
    document.documentElement.classList.add("dark");
  }
}

export function syncUserPreferences(theme?: string | null, mode?: string | null, userId?: string | null): void {
  if (typeof window === "undefined") return;
  const uid = userId || localStorage.getItem("user_id");
  const targetMode = (mode && ["dark", "light"].includes(mode)) 
    ? (mode as AppMode) 
    : getAppMode(uid);
  const targetTheme = (theme && isValidTheme(theme)) 
    ? (theme as AppTheme) 
    : getAppTheme(uid);

  saveAppMode(targetMode, uid);
  saveAppTheme(targetTheme, uid);
}

