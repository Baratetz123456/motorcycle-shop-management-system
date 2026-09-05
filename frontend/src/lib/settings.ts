export interface SystemSettings {
  appName: string;
  timezone: string;
  country: string;
  currency: string;
  currencySymbol: string;
}

export const TIMEZONE_OPTIONS = [
  { label: "Asia/Manila (GMT+8)", value: "Asia/Manila" },
  { label: "UTC (GMT+0)", value: "UTC" },
  { label: "America/New_York (EST / GMT-5)", value: "America/New_York" },
  { label: "America/Los_Angeles (PST / GMT-8)", value: "America/Los_Angeles" },
  { label: "Europe/London (GMT+0)", value: "Europe/London" },
  { label: "Europe/Paris (CET / GMT+1)", value: "Europe/Paris" },
  { label: "Asia/Tokyo (JST / GMT+9)", value: "Asia/Tokyo" },
  { label: "Asia/Singapore (SGT / GMT+8)", value: "Asia/Singapore" },
  { label: "Australia/Sydney (AEST / GMT+10)", value: "Australia/Sydney" },
];

export const COUNTRY_OPTIONS = [
  { country: "Philippines", currency: "PHP", symbol: "₱" },
  { country: "United States", currency: "USD", symbol: "$" },
  { country: "Canada", currency: "CAD", symbol: "$" },
  { country: "United Kingdom", currency: "GBP", symbol: "£" },
  { country: "Japan", currency: "JPY", symbol: "¥" },
  { country: "Australia", currency: "AUD", symbol: "$" },
  { country: "Singapore", currency: "SGD", symbol: "$" },
];

export const DEFAULT_SETTINGS: SystemSettings = {
  appName: "Versiklo",
  timezone: "Asia/Manila",
  country: "Philippines",
  currency: "PHP",
  currencySymbol: "₱",
};

const SETTINGS_STORAGE_KEY = "motoshop_app_settings";

export function getSystemSettings(): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_SETTINGS,
      ...parsed,
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
}

export function saveSystemSettings(settings: Partial<SystemSettings>): SystemSettings {
  if (typeof window === "undefined") return DEFAULT_SETTINGS;
  try {
    const current = getSystemSettings();
    const updated = { ...current, ...settings };
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent("system_settings_updated", { detail: updated }));
    return updated;
  } catch (e) {
    console.error("Failed to save settings to localStorage:", e);
    return DEFAULT_SETTINGS;
  }
}
