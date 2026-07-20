import { invoke } from "@tauri-apps/api/core";
import { DEFAULT_SETTINGS } from "../utils/constants";
import type { HistoryItem, TranslationSettings } from "../types/translation";

const SETTINGS_KEY = "settings";
const HISTORY_KEY = "history";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function loadSettings(): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  const stored = await invoke<Partial<TranslationSettings>>("get_app_settings");
  return { ...DEFAULT_SETTINGS, ...stored, apiKey: "" };
}

export async function saveSettings(settings: TranslationSettings): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const next = { ...settings, apiKeyConfigured: settings.apiKeyConfigured || settings.apiKey.trim().length > 0 };
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  const saved = await invoke<Partial<TranslationSettings>>("save_app_settings", { settings });
  return { ...DEFAULT_SETTINGS, ...saved, apiKey: "" };
}

export async function loadRecentHistory(limit = 3): Promise<HistoryItem[]> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw).slice(0, limit) : [];
  }

  return invoke<HistoryItem[]>("list_recent_history", { limit });
}

export function saveBrowserHistory(items: HistoryItem[]): void {
  if (!hasTauriRuntime()) {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify(items.slice(0, 100)));
  }
}
