import { invoke } from "@tauri-apps/api/core";
import { useEffect, useRef } from "react";
import { loadRecentHistory, loadSettings, saveSettings } from "../../api/settingsStore";
import { hasTauriRuntime } from "../../lib/runtime";
import { useAppStore } from "../../store/appStore";

export function useAppBootstrap(): void {
  const settingsHydratedRef = useRef(false);
  const settings = useAppStore((state) => state.settings);
  const setSettings = useAppStore((state) => state.setSettings);
  const setHistory = useAppStore((state) => state.setHistory);
  const setShortcutError = useAppStore((state) => state.setShortcutError);

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

    void Promise.all([loadSettings(), loadRecentHistory()]).then(
      ([storedSettings, recentHistory]) => {
        if (cancelled) return;
        setSettings(storedSettings);
        setHistory(recentHistory);
        settingsHydratedRef.current = true;
      },
    );

    return () => {
      cancelled = true;
    };
  }, [setHistory, setSettings]);

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
  }, [setSettings, setShortcutError, settings]);
}
