import { invoke } from "@tauri-apps/api/core";

import { DEFAULT_SETTINGS, MAX_HISTORY_ITEMS } from "@/lib/constants";
import { hasTauriRuntime } from "@/lib/runtime";
import type { HistoryItem, TranslationSettings } from "@/types/translation";

const SETTINGS_KEY = "settings";
const HISTORY_KEY = "history";

export async function loadSettings(): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
      : DEFAULT_SETTINGS;
  }

  const stored = await invoke<Partial<TranslationSettings>>("get_app_settings");
  return { ...DEFAULT_SETTINGS, ...stored, apiKey: "" };
}

export async function saveSettings(
  settings: TranslationSettings,
): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const next = {
      ...settings,
      apiKeyConfigured:
        settings.apiKeyConfigured || settings.apiKey.trim().length > 0,
    };
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
    return next;
  }

  const saved = await invoke<Partial<TranslationSettings>>(
    "save_app_settings",
    { settings },
  );
  return { ...DEFAULT_SETTINGS, ...saved, apiKey: "" };
}

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

/** 仅浏览器开发模式使用：把内存中的历史持久化到 localStorage。 */
export function saveBrowserHistory(items: HistoryItem[]): void {
  if (!hasTauriRuntime()) {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)),
    );
  }
}
