import { motion } from "framer-motion";
import { useRef, useState } from "react";
import { Toaster } from "sonner";
import { useAppBootstrap } from "./hooks/useAppBootstrap";
import { useAppCommands } from "./hooks/useAppCommands";
import { useDesktopWindow } from "./hooks/useDesktopWindow";
import { AppContent } from "../components/layout/AppContent";
import { AppHeader } from "../components/layout/AppHeader";
import { CommandPalette } from "../features/command-palette/CommandPalette";
import { SettingsPanel } from "../features/settings/components/SettingsPanel";
import { TranslationWorkspace } from "../features/translation/components/TranslationWorkspace";
import { useTranslationController } from "../features/translation/hooks/useTranslationController";
import { useAppStore } from "../store/appStore";
import "../styles/index.css";

export function AppShell() {
  useAppBootstrap();

  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const setView = useAppStore((state) => state.setView);
  const translation = useTranslationController();
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

  return (
    <main className="app-shell relative min-h-screen overflow-hidden">
      <div className="app-aura pointer-events-none absolute inset-0" />
      <motion.section
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="app-window relative mx-auto flex w-full max-w-[920px] flex-col"
        aria-label="TransPop translator"
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
              autoCopy={translation.settings.autoCopy}
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
            />
          }
          settings={<SettingsPanel />}
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




