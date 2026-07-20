import { invoke } from "@tauri-apps/api/core";
import { ArrowUpDown, Copy, Languages, RotateCcw, Settings, Sparkles, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { loadSettings, saveSettings } from "./api/settingsStore";
import { translator } from "./api/translator";
import { SettingsPanel } from "./components/SettingsPanel";
import { useAppStore } from "./store/appStore";
import "./App.css";

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

function App() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const settingsHydratedRef = useRef(false);
  const [copied, setCopied] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const {
    input,
    result,
    loading,
    error,
    history,
    settings,
    view,
    setInput,
    setLoading,
    setError,
    setResult,
    clearResult,
    setView,
    useHistoryItem,
    setSettings,
  } = useAppStore();

  const canTranslate = input.trim().length > 0 && !loading;
  const languageHint = useMemo(() => {
    if (!result) return `Auto → ${settings.targetLanguage}`;
    return `${result.sourceLanguage} → ${result.targetLanguage}`;
  }, [result, settings.targetLanguage]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [view]);

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme;
    document.documentElement.style.setProperty("--font-scale", String(settings.fontScale));
  }, [settings.fontScale, settings.theme]);

  useEffect(() => {
    let cancelled = false;

    void loadSettings().then((storedSettings) => {
      if (cancelled) return;
      setSettings(storedSettings);
      settingsHydratedRef.current = true;
    });

    return () => {
      cancelled = true;
    };
  }, [setSettings]);

  useEffect(() => {
    if (!settingsHydratedRef.current) return;

    void saveSettings(settings).catch((cause) => console.error("failed to save settings", cause));

    if (hasTauriRuntime()) {
      void invoke("set_shortcut", {
        shortcut: settings.shortcut,
        enabled: settings.shortcutEnabled,
      }).catch((cause) => console.error("failed to register shortcut", cause));
    }
  }, [settings]);

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen("transpop://focus-input", () => {
        setView("translate");
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }).then((handler) => {
        unlisten = handler;
      }),
    );

    return () => unlisten?.();
  }, [setView]);

  const hideWindow = async () => {
    if (hasTauriRuntime()) {
      await invoke("hide_main_window");
      return;
    }

    inputRef.current?.blur();
  };

  const runTranslate = async () => {
    const text = input.trim();
    if (!text || loading) return;

    setLoading(true);
    setError(null);
    setHistoryIndex(-1);

    try {
      const nextResult = await translator.translate(text, settings);
      setResult(text, nextResult);
    } catch (cause) {
      console.error(cause);
      setError("Unable to translate. Check your API key.");
    } finally {
      setLoading(false);
    }
  };

  const copyResult = async () => {
    if (!result?.result) return;
    await navigator.clipboard.writeText(result.result);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const retry = () => {
    void runTranslate();
  };

  const moveHistory = (direction: 1 | -1) => {
    if (history.length === 0) return;
    const nextIndex = Math.min(Math.max(historyIndex + direction, 0), history.length - 1);
    setHistoryIndex(nextIndex);
    useHistoryItem(history[nextIndex]);
  };

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void runTranslate();
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

  const handleShellKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === "Escape") {
      event.preventDefault();
      if (view === "settings") {
        setView("translate");
        return;
      }
      void hideWindow();
    }

    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "c" && result?.result) {
      const target = event.target as HTMLElement;
      const hasSelection = window.getSelection()?.toString();
      if (target.tagName !== "TEXTAREA" && !hasSelection) {
        event.preventDefault();
        void copyResult();
      }
    }
  };

  return (
    <main className="app-shell" onKeyDown={handleShellKeyDown}>
      <section className="floating-window" aria-label="TransPop translator">
        <header className="toolbar">
          <button className="brand-button" type="button" onClick={() => setView("translate")} aria-label="Back to translate">
            <span className="brand-icon" aria-hidden="true">🌍</span>
            <span>
              <strong>Translate</strong>
              <small>{languageHint}</small>
            </span>
          </button>

          <div className="toolbar-actions">
            <kbd>{settings.shortcutEnabled ? settings.shortcut : "Shortcut Off"}</kbd>
            <button
              className="icon-button"
              type="button"
              onClick={() => setView(view === "settings" ? "translate" : "settings")}
              aria-label="Open settings"
              title="Settings"
            >
              {view === "settings" ? <X size={18} /> : <Settings size={18} />}
            </button>
          </div>
        </header>

        {view === "translate" ? (
          <div className="translate-view">
            <label className="sr-only" htmlFor="translate-input">Text to translate</label>
            <textarea
              id="translate-input"
              ref={inputRef}
              value={input}
              onChange={(event) => {
                setInput(event.currentTarget.value);
                if (!event.currentTarget.value.trim()) clearResult();
              }}
              onKeyDown={handleInputKeyDown}
              placeholder="Type something..."
              rows={2}
              spellCheck="false"
            />

            <div className="divider" />

            <ResultArea
              loading={loading}
              error={error}
              resultText={result?.result ?? ""}
              canRetry={input.trim().length > 0}
              onCopy={copyResult}
              onRetry={retry}
              copied={copied}
            />

            <footer className="quick-actions" aria-label="Keyboard hints">
              <span><kbd>Enter</kbd> Translate</span>
              <span><kbd>Shift</kbd> + <kbd>Enter</kbd> New line</span>
              <span><kbd>Esc</kbd> Close</span>
              <button className="primary-action" type="button" disabled={!canTranslate} onClick={() => void runTranslate()}>
                <Sparkles size={16} /> Translate
              </button>
            </footer>
          </div>
        ) : (
          <SettingsPanel />
        )}
      </section>
    </main>
  );
}

interface ResultAreaProps {
  loading: boolean;
  error: string | null;
  resultText: string;
  canRetry: boolean;
  copied: boolean;
  onCopy: () => void;
  onRetry: () => void;
}

function ResultArea({ loading, error, resultText, canRetry, copied, onCopy, onRetry }: ResultAreaProps) {
  if (loading) {
    return (
      <section className="result-card" aria-live="polite" aria-busy="true">
        <div className="result-meta"><Languages size={16} /> Thinking...</div>
        <div className="skeleton skeleton-wide" />
        <div className="skeleton skeleton-mid" />
        <div className="thinking-dots" aria-hidden="true"><span /> <span /> <span /></div>
      </section>
    );
  }

  if (error) {
    return (
      <section className="result-card error-card" role="alert">
        <strong>Unable to translate.</strong>
        <p>Check your API key.</p>
        <button className="ghost-button" type="button" disabled={!canRetry} onClick={onRetry}>
          <RotateCcw size={15} /> Retry
        </button>
      </section>
    );
  }

  if (!resultText) {
    return (
      <section className="empty-state" aria-live="polite">
        <strong>Start typing...</strong>
        <p>Translation will appear here.</p>
      </section>
    );
  }

  return (
    <section className="result-card result-ready" aria-live="polite">
      <p className="result-text">{resultText}</p>
      <div className="result-actions">
        <button className="ghost-button" type="button" onClick={onCopy}>
          <Copy size={15} /> {copied ? "Copied" : "Copy"}
        </button>
        <button className="ghost-button" type="button" onClick={onRetry}>
          <RotateCcw size={15} /> Retry
        </button>
        <span className="history-hint"><ArrowUpDown size={14} /> History ↑ ↓</span>
      </div>
    </section>
  );
}

export default App;
