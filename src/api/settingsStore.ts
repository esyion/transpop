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

/** Max history rows kept by backend and browser storage. */
export const MAX_HISTORY_ITEMS = 100;

export async function loadRecentHistory(
  limit = MAX_HISTORY_ITEMS,
): Promise<HistoryItem[]> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    return raw ? JSON.parse(raw).slice(0, limit) : [];
  }

  return invoke<HistoryItem[]>("list_recent_history", { limit });
}

export async function deleteHistoryItem(id: string): Promise<void> {
  const historyId = id.trim();
  if (!historyId) return;

  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(HISTORY_KEY);
    const items: HistoryItem[] = raw ? JSON.parse(raw) : [];
    const next = items.filter((item) => item.id !== historyId);
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(next.slice(0, MAX_HISTORY_ITEMS)),
    );
    return;
  }

  await invoke("delete_history_item", { id: historyId });
}

export async function clearAllHistory(): Promise<void> {
  if (!hasTauriRuntime()) {
    window.localStorage.setItem(HISTORY_KEY, JSON.stringify([]));
    return;
  }

  await invoke("clear_all_history");
}

export function saveBrowserHistory(items: HistoryItem[]): void {
  if (!hasTauriRuntime()) {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)),
    );
  }
}
