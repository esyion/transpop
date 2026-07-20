import { DEFAULT_SETTINGS } from "../utils/constants";
import type { TranslationSettings } from "../types/translation";

const STORE_PATH = "settings.json";
const SETTINGS_KEY = "settings";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

export async function loadSettings(): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(SETTINGS_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  const { load } = await import("@tauri-apps/plugin-store");
  const store = await load(STORE_PATH, { autoSave: true });
  const stored = await store.get<Partial<TranslationSettings>>(SETTINGS_KEY);
  return { ...DEFAULT_SETTINGS, ...stored };
}

export async function saveSettings(settings: TranslationSettings): Promise<void> {
  if (!hasTauriRuntime()) {
    window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
    return;
  }

  const { load } = await import("@tauri-apps/plugin-store");
  const store = await load(STORE_PATH, { autoSave: true });
  await store.set(SETTINGS_KEY, settings);
  await store.save();
}
