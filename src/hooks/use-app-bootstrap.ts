"use client";

import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";

import { getStartupEnabled, setStartupEnabled } from "@/api/autostart";
import { loadRecentHistory, loadSettings, saveSettings } from "@/api/settings-store";
import { hasTauriRuntime } from "@/lib/runtime";
import { useAppStore } from "@/store/app-store";

/**
 * 应用启动引导：加载设置与历史、应用主题和字体缩放，
 * 并在设置变化时同步持久化、全局快捷键与开机自启。
 */
export function useAppBootstrap(): void {
  const settingsHydratedRef = useRef(false);
  const startupSyncedRef = useRef<boolean | null>(null);
  const startupPendingRef = useRef<boolean | null>(null);
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const setSettings = useAppStore((state) => state.setSettings);
  const setHistory = useAppStore((state) => state.setHistory);
  const setShortcutError = useAppStore((state) => state.setShortcutError);
  const setStartupError = useAppStore((state) => state.setStartupError);

  // 主题：在 <html> 上切换 dark 类
  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const applyTheme = (theme: typeof settings.theme) => {
      const dark =
        theme === "dark" || (theme === "system" && media.matches);
      root.classList.toggle("dark", dark);
      root.dataset.theme = theme;
    };

    applyTheme(settings.theme);

    if (settings.theme !== "system") return;
    media.addEventListener("change", () => applyTheme("system"));
    return () => media.removeEventListener("change", () => applyTheme("system"));
  }, [settings.theme]);

  // 字体缩放：调整根元素字号，Tailwind 的 rem 尺寸随之缩放
  useEffect(() => {
    document.documentElement.style.fontSize = `${settings.fontScale * 100}%`;
  }, [settings.fontScale]);

  // 启动时加载设置、历史与自启状态
  useEffect(() => {
    let cancelled = false;

    void Promise.all([
      loadSettings().catch((cause) => {
        console.error("failed to load settings", cause);
        return null;
      }),
      loadRecentHistory().catch((cause) => {
        console.error("failed to load history", cause);
        return [];
      }),
      getStartupEnabled().catch((cause) => {
        console.error("failed to read autostart", cause);
        return null;
      }),
    ]).then(([storedSettings, recentHistory, startupEnabled]) => {
      if (cancelled) return;
      if (storedSettings) {
        const nextSettings = {
          ...storedSettings,
          startup: startupEnabled ?? storedSettings.startup,
        };
        startupSyncedRef.current = nextSettings.startup;
        setSettings(nextSettings);
      }
      setHistory(recentHistory);
      settingsHydratedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [setHistory, setSettings]);

  // 设置变化：持久化 + 同步快捷键 + 同步自启
  useEffect(() => {
    if (!settingsHydratedRef.current) return;

    void saveSettings(settings)
      .then((saved) => {
        if (settings.apiKey.trim()) setSettings(saved);
      })
      .catch((cause) => console.error("failed to save settings", cause));

    if (!hasTauriRuntime()) return;

    void invoke("set_shortcut", {
      shortcut: settings.shortcut,
      enabled: settings.shortcutEnabled,
    })
      .then(() => setShortcutError(null))
      .catch((cause) => {
        setShortcutError(String(cause));
        console.error("failed to register shortcut", cause);
      });

    if (
      startupSyncedRef.current === settings.startup ||
      startupPendingRef.current === settings.startup
    ) {
      return;
    }

    const desiredStartup = settings.startup;
    startupPendingRef.current = desiredStartup;
    void setStartupEnabled(desiredStartup)
      .then(() => {
        startupSyncedRef.current = desiredStartup;
        startupPendingRef.current = null;
        setStartupError(null);
      })
      .catch((cause) => {
        setStartupError(String(cause));
        startupPendingRef.current = null;
        console.error("failed to update autostart", cause);

        void getStartupEnabled().then((actualStartup) => {
          if (actualStartup === null) return;
          startupSyncedRef.current = actualStartup;
          updateSettings({ startup: actualStartup });
        });
      });
  }, [settings, setSettings, setShortcutError, setStartupError, updateSettings]);
}
