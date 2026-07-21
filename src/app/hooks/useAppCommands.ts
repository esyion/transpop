import type { KeyboardEvent, RefObject } from "react";
import { useEffect } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { CommandAction } from "../../features/command-palette/CommandPalette";
import type { ViewMode } from "../../types/translation";

interface UseAppCommandsOptions {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  historyIndex: number;
  resultText?: string;
  view: ViewMode;
  paletteOpen: boolean;
  setPaletteOpen: Dispatch<SetStateAction<boolean>>;
  setView: (view: ViewMode) => void;
  runTranslate: (textOverride?: string, force?: boolean) => Promise<void>;
  copyResult: () => Promise<void>;
  retry: () => void;
  clearInput: () => void;
  moveHistory: (direction: 1 | -1) => void;
  hideWindow: () => Promise<void>;
}

export function useAppCommands({
  inputRef,
  historyIndex,
  resultText,
  view,
  paletteOpen,
  setPaletteOpen,
  setView,
  runTranslate,
  copyResult,
  retry,
  clearInput,
  moveHistory,
  hideWindow,
}: UseAppCommandsOptions) {
  const executeCommand = async (action: CommandAction) => {
    setPaletteOpen(false);

    switch (action) {
      case "translate":
        if (view === "settings") {
          setView("translate");
          return;
        }
        await runTranslate(undefined, true);
        return;
      case "copy":
        await copyResult();
        return;
      case "retry":
        retry();
        return;
      case "settings":
        setView("settings");
        return;
      case "clear":
        clearInput();
        return;
      case "translate-view":
        setView("translate");
    }
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runTranslate(undefined, true);
      return;
    }

    if (event.key === "ArrowUp" && inputRef.current?.selectionStart === 0) {
      event.preventDefault();
      moveHistory(1);
      return;
    }

    if (event.key === "ArrowDown" && historyIndex >= 0) {
      event.preventDefault();
      moveHistory(-1);
    }
  };

  const handleShellKeyDown = (event: globalThis.KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      setPaletteOpen(true);
      return;
    }

    if (event.key === "Escape") {
      event.preventDefault();
      if (paletteOpen) {
        setPaletteOpen(false);
        return;
      }
      if (view === "settings") {
        setView("translate");
        return;
      }
      void hideWindow();
      return;
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "c" &&
      resultText
    ) {
      const target = event.target as HTMLElement;
      const hasSelection = window.getSelection()?.toString();
      if (target.tagName !== "TEXTAREA" && !hasSelection) {
        event.preventDefault();
        void copyResult();
      }
    }
  };

  useEffect(() => {
    window.addEventListener("keydown", handleShellKeyDown, true);
    return () => window.removeEventListener("keydown", handleShellKeyDown, true);
  });

  return { executeCommand, handleInputKeyDown };
}



