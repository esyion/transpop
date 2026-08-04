import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { getStartupEnabled, setStartupEnabled } from "../../api/autostart";
import { loadRecentHistory, loadSettings, saveSettings } from "../../api/settingsStore";
import { hasTauriRuntime } from "../../lib/runtime";
import { useAppStore } from "../../store/appStore";

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

  useEffect(() => {
    if (settings.theme === "system") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.dataset.theme = settings.theme;
    }

    document.documentElement.style.setProperty(
      "--font-scale",
      String(settings.fontScale),
    );
  }, [settings.fontScale, settings.theme]);

  useEffect(() => {
    let cancelled = false;
    const startupEnabled = getStartupEnabled().catch((cause) => {
      if (!cancelled) {
        const message = String(cause);
        setStartupError(message);
        console.error("failed to read autostart", cause);
      }
      return null;
    });

    void Promise.all([loadSettings(), loadRecentHistory(), startupEnabled]).then(
      ([storedSettings, recentHistory, startupEnabled]) => {
        if (cancelled) return;
        const nextSettings = {
          ...storedSettings,
          startup: startupEnabled ?? storedSettings.startup,
        };
        startupSyncedRef.current = nextSettings.startup;
        setSettings(nextSettings);
        setHistory(recentHistory);
        settingsHydratedRef.current = true;
      },
    );

    return () => {
      cancelled = true;
    };
  }, [setHistory, setSettings, setStartupError]);

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
        const message = String(cause);
        setShortcutError(message);
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
        const message = String(cause);
        startupPendingRef.current = null;
        setStartupError(message);
        console.error("failed to update autostart", cause);

        void getStartupEnabled().then((actualStartup) => {
          if (actualStartup === null) return;
          startupSyncedRef.current = actualStartup;
          updateSettings({ startup: actualStartup });
        });
      });
  }, [setSettings, setShortcutError, setStartupError, settings, updateSettings]);
}
