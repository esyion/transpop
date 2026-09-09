import { hasTauriRuntime } from "@/lib/runtime";

import { invokeIpc } from "@/services/ipc";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import type { TranslationSettings } from "@/features/settings/types";

/** 浏览器开发模式下 localStorage 的设置键名。 */
const SETTINGS_STORAGE_KEY = "settings";

/**
 * 加载应用设置；浏览器开发模式从 localStorage 读取。
 * 明文 API 密钥不落盘，加载后恒为空串。
 */
export async function loadSettings(): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(SETTINGS_STORAGE_KEY);
    return raw ? { ...DEFAULT_SETTINGS, ...JSON.parse(raw) } : DEFAULT_SETTINGS;
  }

  const stored = await invokeIpc<Partial<TranslationSettings>>("get_app_settings");
  return { ...DEFAULT_SETTINGS, ...stored, apiKey: "" };
}

/**
 * 保存应用设置；填写了新密钥则后端加密替换，否则沿用已存密钥。
 * 返回后端落盘后的最终设置（密钥位脱敏）。
 */
export async function saveSettings(
  settings: TranslationSettings,
): Promise<TranslationSettings> {
  if (!hasTauriRuntime()) {
    const next: TranslationSettings = {
      ...settings,
      apiKey: "",
      apiKeyConfigured:
        settings.apiKeyConfigured || settings.apiKey.trim().length > 0,
    };
    window.localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(next));
    return next;
  }

  const saved = await invokeIpc<Partial<TranslationSettings>>("save_app_settings", {
    settings,
  });
  return { ...DEFAULT_SETTINGS, ...saved, apiKey: "" };
}

/**
 * 重新注册全局快捷键（设置变更时调用；持久化仍走 {@link saveSettings}）。
 * 浏览器开发模式静默返回。
 */
export async function applyShortcut(
  shortcut: string,
  enabled: boolean,
): Promise<void> {
  if (!hasTauriRuntime()) return;
  await invokeIpc("set_shortcut", { shortcut, enabled });
}
