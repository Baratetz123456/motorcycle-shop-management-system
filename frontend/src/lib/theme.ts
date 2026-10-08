"use client";

import { useState, useEffect, useCallback } from "react";

export type DarkAppTheme = "cyan" | "emerald" | "violet" | "amber";
export type LightAppTheme = "cobalt" | "emerald-alpine" | "amethyst" | "crimson";
export type AppTheme = DarkAppTheme | LightAppTheme;

export type AppMode = "dark" | "light" | "system";
export type ThemeMode = AppMode;

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
];

export const LIGHT_THEME_OPTIONS: ThemeOption[] = DARK_THEME_OPTIONS;
export const THEME_OPTIONS = DARK_THEME_OPTIONS;

export function getThemesForMode(_mode?: AppMode): ThemeOption[] {
  return DARK_THEME_OPTIONS;
}

export function getDefaultThemeForMode(_mode?: AppMode): AppTheme {
  return "cyan";
}

export const THEME_STORAGE_KEY = "motoshop_app_theme";
export const MODE_STORAGE_KEY = "motoshop_app_mode";

export function isValidTheme(theme: unknown): theme is AppTheme {
  return theme === "cyan";
}

export function getAppTheme(_userId?: string | null): AppTheme {
  return "cyan";
}

export function saveAppTheme(_theme?: AppTheme, _userId?: string | null): void {
  if (typeof window === "undefined") return;
  applyThemeToDocument("cyan");
}

export function applyThemeToDocument(_theme: AppTheme = "cyan"): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-theme", "cyan");
}

export function resolveEffectiveMode(_mode: AppMode = "dark"): "dark" {
  return "dark";
}

export function getAppMode(_userId?: string | null): AppMode {
  return "dark";
}

export function applyModeToDocument(_mode: AppMode = "dark"): void {
  if (typeof document === "undefined") return;
  document.documentElement.setAttribute("data-mode", "dark");
  document.documentElement.setAttribute("data-theme-mode", "dark");
  document.documentElement.classList.remove("light");
  document.documentElement.classList.add("dark");
}

export function saveAppMode(_mode: AppMode = "dark", _userId?: string | null): void {
  if (typeof window === "undefined") return;
  applyModeToDocument("dark");
}

export function revertToSavedModeAndTheme(_userId?: string | null): void {
  if (typeof window === "undefined") return;
  applyModeToDocument("dark");
  applyThemeToDocument("cyan");
}

export function syncUserPreferences(_theme?: string | null, _mode?: string | null, _userId?: string | null): void {
  if (typeof window === "undefined") return;
  applyModeToDocument("dark");
  applyThemeToDocument("cyan");
}

// Convenience alias helpers
export const getStoredTheme = getAppMode;
export const setStoredTheme = saveAppMode;
export const applyTheme = applyModeToDocument;

export function toggleAppMode(_userId?: string | null): AppMode {
  return "dark";
}

export function useTheme() {
  const [themeMode] = useState<AppMode>("dark");
  const [resolvedTheme] = useState<"light" | "dark">("dark");

  useEffect(() => {
    applyModeToDocument("dark");
    applyThemeToDocument("cyan");
  }, []);

  const setTheme = useCallback((_newMode: AppMode) => {
    applyModeToDocument("dark");
  }, []);

  const toggleTheme = useCallback(() => {
    applyModeToDocument("dark");
  }, []);

  return {
    theme: themeMode,
    resolvedTheme,
    setTheme,
    toggleTheme,
  };
}
