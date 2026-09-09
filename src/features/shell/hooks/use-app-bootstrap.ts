"use client";

import { useEffect, useRef } from "react";

import { getStartupEnabled, setStartupEnabled } from "@/services/autostart";
import { applyShortcut, saveSettings } from "@/features/settings/api";
import { useAppStore } from "@/stores/app-store";
import type { ThemeMode } from "@/features/settings/types";

/** 快捷键注册失败的稳定用户文案（原始错误仅入控制台日志）。 */
const SHORTCUT_ERROR_MESSAGE = "快捷键注册失败，请尝试其他组合键";
/** 开机自启设置失败的稳定用户文案。 */
const STARTUP_ERROR_MESSAGE = "开机自启设置失败，请稍后重试";

/**
 * 应用启动引导：
 * 1. 主题与字体缩放应用到 document 根元素；
 * 2. 启动时加载设置、历史与自启状态；
 * 3. 设置变化时持久化，并同步全局快捷键与开机自启。
 */
export function useAppBootstrap(): void {
  const settingsHydrated = useRef(false);
  const startupSynced = useRef<boolean | null>(null);
  const startupPending = useRef<boolean | null>(null);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setSettings = useAppStore((state) => state.setSettings);
  const setShortcutError = useAppStore((state) => state.setShortcutError);
  const setStartupError = useAppStore((state) => state.setStartupError);

  // 主题：切换 <html> 上的 dark 类并跟随系统变化。
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (theme: ThemeMode) => {
      root.classList.toggle("dark", theme === "dark" || (theme === "system" && media.matches));
      root.dataset.theme = theme;
    };

    applyTheme(settings.theme);
    if (settings.theme !== "system") return;

    media.addEventListener("change", () => applyTheme("system"));
    return () => media.removeEventListener("change", () => applyTheme("system"));
  }, [settings.theme]);

  // 字体缩放：调整根元素字号，Tailwind 的 rem 尺寸随之缩放。
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontScale * 100}%`;
  }, [settings.fontScale]);

  // 启动时加载设置、历史与自启状态。
  useEffect(() => {
    void useAppStore.getState().loadHistory();

    void useAppStore.getState()
      .reloadSettings()
      .then((loaded) => {
        if (loaded) {
          const stored = useAppStore.getState().settings;
          startupSynced.current = stored.startup;
        }
        settingsHydrated.current = true;
      });

    void getStartupEnabled()
      .then((enabled) => {
        if (enabled === null) return;
        startupSynced.current = enabled;
        if (!settingsHydrated.current) {
          useAppStore.getState().updateSettings({ startup: enabled });
        }
      })
      .catch((cause) => console.error("failed to read autostart", cause));
    // 仅启动时执行一次。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 设置变化：持久化 + 同步快捷键 + 同步自启。
  useEffect(() => {
    if (!settingsHydrated.current) return;

    void saveSettings(settings)
      .then((saved) => {
        if (settings.apiKey.trim()) setSettings(saved);
      })
      .catch((cause) => console.error("failed to save settings", cause));

    void applyShortcut(settings.shortcut, settings.shortcutEnabled)
      .then(() => setShortcutError(null))
      .catch((cause) => {
        console.error("failed to register shortcut", cause);
        setShortcutError(SHORTCUT_ERROR_MESSAGE);
      });

    if (
      startupSynced.current === settings.startup ||
      startupPending.current === settings.startup
    ) {
      return;
    }

    const desiredStartup = settings.startup;
    startupPending.current = desiredStartup;
    void setStartupEnabled(desiredStartup)
      .then(() => {
        startupSynced.current = desiredStartup;
        startupPending.current = null;
        setStartupError(null);
      })
      .catch((cause) => {
        console.error("failed to update autostart", cause);
        setStartupError(STARTUP_ERROR_MESSAGE);
        startupPending.current = null;

        void getStartupEnabled().then((actual) => {
          if (actual === null) return;
          startupSynced.current = actual;
          updateSettings({ startup: actual });
        });
      });
  }, [settings, setSettings, setShortcutError, setStartupError, updateSettings]);
}
