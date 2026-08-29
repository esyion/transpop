"use client";

import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { AppContent } from "@/components/layout/AppContent";
import { AppHeader } from "@/components/layout/AppHeader";
import { Toaster } from "@/components/ui/sonner";
import { CommandPalette } from "@/features/command-palette/CommandPalette";
import { HistoryPanel } from "@/features/history/components/HistoryPanel";
import { SettingsPanel } from "@/features/settings/components/SettingsPanel";
import { TranslationWorkspace } from "@/features/translation/components/TranslationWorkspace";
import { useTranslationController } from "@/features/translation/hooks/useTranslationController";
import { useAppUpdater } from "@/features/updater/useAppUpdater";
import { useAppBootstrap } from "@/app/hooks/useAppBootstrap";
import { useAppCommands } from "@/app/hooks/useAppCommands";
import { useDesktopWindow } from "@/app/hooks/useDesktopWindow";
import { useAppStore } from "@/store/appStore";

export function AppShell() {
  useAppBootstrap();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const setView = useAppStore((state) => state.setView);
  const translation = useTranslationController();
  const updater = useAppUpdater();
  const { hideWindow } = useDesktopWindow(inputRef);
  const { executeCommand, handleInputKeyDown } = useAppCommands({
    inputRef,
    historyIndex: translation.historyIndex,
    resultText: translation.result?.result,
    view: translation.view,
    paletteOpen,
    setPaletteOpen,
    setView,
    runTranslate: translation.runTranslate,
    copyResult: translation.copyResult,
    retry: translation.retry,
    clearInput: translation.clearInput,
    moveHistory: translation.moveHistory,
    hideWindow,
  });

  useEffect(() => {
    if (updater.status !== "available" || !updater.availableVersion) return;

    const toastId = toast.info(
      `发现新版本 v${updater.availableVersion}`,
      {
        id: "transpop-update-available",
        duration: Number.POSITIVE_INFINITY,
        description: "点击即可下载、验证签名并安装更新。",
        action: {
          label: "立即升级",
          onClick: () => void updater.installUpdate(),
        },
      },
    );

    return () => {
      toast.dismiss(toastId);
    };
  }, [updater.availableVersion, updater.installUpdate, updater.status]);

  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>(
      'meta[name="theme-color"]',
    );
    if (!meta) return;

    const colorScheme = window.matchMedia("(prefers-color-scheme: dark)");
    const syncThemeColor = () => {
      const dark =
        translation.settings.theme === "dark" ||
        (translation.settings.theme === "system" && colorScheme.matches);
      meta.content = dark ? "#404040" : "#faf7f2";
    };

    syncThemeColor();
    colorScheme.addEventListener("change", syncThemeColor);
    return () => colorScheme.removeEventListener("change", syncThemeColor);
  }, [translation.settings.theme]);

  return (
    <main className="app-shell relative min-h-screen overflow-hidden">
      <div className="app-backdrop-grid pointer-events-none absolute inset-0" />
      <section
        className="app-window relative mx-auto flex w-full max-w-230 animate-in flex-col fade-in zoom-in-95 slide-in-from-bottom-2 duration-300"
        aria-label="TransPop 翻译器"
      >
        <h1 className="sr-only">TransPop 翻译器</h1>
        <AppHeader
          languageHint={translation.languageHint}
          effectiveTargetLanguage={translation.effectiveTargetLanguage}
          smartTargetLanguage={translation.settings.smartTargetLanguage}
          shortcut={translation.settings.shortcut}
          shortcutEnabled={translation.settings.shortcutEnabled}
          view={translation.view}
          onNavigate={setView}
          onOpenCommandPalette={() => setPaletteOpen(true)}
        />
        <AppContent
          view={translation.view}
          translation={
            <TranslationWorkspace
              inputRef={inputRef}
              input={translation.input}
              resultText={translation.result?.result ?? ""}
              loading={translation.loading}
              error={translation.error}
              history={translation.history.slice(0, 3)}
              activeHistoryId={
                translation.history[translation.historyIndex]?.id
              }
              copied={translation.copied}
              apiKeyMissing={translation.apiKeyMissing}
              onInputChange={(value) => {
                translation.setInput(value);
                if (!value.trim()) translation.clearResult();
              }}
              onInputKeyDown={handleInputKeyDown}
              onCopy={() => void translation.copyResult()}
              onRetry={translation.retry}
              onOpenSettings={() => setView("settings")}
              onUseHistory={translation.useHistoryItem}
              onDeleteHistory={(item) =>
                void translation.removeHistoryItem(item)
              }
              onViewAllHistory={() => setView("history")}
              historyTotalCount={translation.history.length}
            />
          }
          settings={<SettingsPanel updater={updater} />}
          history={
            <HistoryPanel
              items={translation.history}
              onUse={translation.useHistoryItem}
              onDelete={(item) => void translation.removeHistoryItem(item)}
              onClearAll={() => void translation.clearHistory()}
              onBack={() => setView("translate")}
            />
          }
        />
      </section>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onExecute={(action) => void executeCommand(action)}
      />
      <Toaster
        theme={
          translation.settings.theme === "system"
            ? undefined
            : translation.settings.theme
        }
      />
    </main>
  );
}

export default AppShell;
