import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import { toast, Toaster } from "sonner";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useAppCommands } from "./hooks/useAppCommands";
import { useDesktopWindow } from "./hooks/useDesktopWindow";
import { AppContent } from "../components/layout/AppContent";
import { AppHeader } from "../components/layout/AppHeader";
import { CommandPalette } from "../features/command-palette/CommandPalette";
import { HistoryPanel } from "../features/history/components/HistoryPanel";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { TranslationWorkspace } from "../features/translation/components/TranslationWorkspace";
import { useTranslationController } from "../features/translation/hooks/useTranslationController";
import { useAppUpdater } from "../features/updater/useAppUpdater";
import { useAppStore } from "../store/appStore";
import "../styles/index.css";

export function AppShell() {
  useAppBootstrap();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const setView = useAppStore((state) => state.setView);
  const translation = useTranslationController();
  const updater = useAppUpdater();
  const { hideWindow } = useDesktopWindow(inputRef);
  const { executeCommand, handleInputKeyDown } =
    useAppCommands({
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

  return (
    <main className="app-shell relative min-h-screen overflow-hidden">
      <div className="app-aura pointer-events-none absolute inset-0" />
      <motion.section
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="app-window relative mx-auto flex w-full max-w-[920px] flex-col"
        aria-label="TransPop 翻译器"
      >
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
      </motion.section>

      <CommandPalette
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        onExecute={(action) => void executeCommand(action)}
      />
      <Toaster
        richColors
        position="top-center"
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




