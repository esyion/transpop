/**
 * 设置 feature 的对外入口。
 */
export { SettingsView } from "./components/settings-view";
export { loadSettings, saveSettings, applyShortcut } from "./api";
export { useAppUpdater } from "./hooks/use-app-updater";
export type { AppUpdaterController } from "./hooks/use-app-updater";
export { DEFAULT_SETTINGS } from "./types";
export type { TranslationSettings, ApiMode, ThemeMode } from "./types";
