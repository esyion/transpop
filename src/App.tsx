import { invoke } from "@tauri-apps/api/core";
import {
  ArrowUpDown,
  Check,
  Command as CommandIcon,
  Copy,
  Languages,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Command as CommandMenu,
  CommandInput,
  CommandList,
  CommandEmpty,
  CommandGroup,
  CommandItem,
} from "cmdk";
import { toast, Toaster } from "sonner";
import {
  loadRecentHistory,
  loadSettings,
  saveBrowserHistory,
  saveSettings,
} from "./api/settingsStore";
import { translator } from "./api/translator";
import { SettingsPanel } from "./components/SettingsPanel";
import { Badge } from "./components/ui/badge";
import { Button } from "./components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./components/ui/card";
import { Separator } from "./components/ui/separator";
import { Textarea } from "./components/ui/textarea";
import { useAppStore } from "./store/appStore";
import type { HistoryItem, TranslationSettings } from "./types/translation";
import "./App.css";

const hasTauriRuntime = () =>
  typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const commandItems = [
  {
    label: "Translate now",
    hint: "Enter",
    action: "translate" as const,
    icon: Sparkles,
  },
  {
    label: "Copy result",
    hint: "Ctrl/Cmd + C",
    action: "copy" as const,
    icon: Copy,
  },
  { label: "Retry", hint: "R", action: "retry" as const, icon: RotateCcw },
  {
    label: "Open settings",
    hint: "S",
    action: "settings" as const,
    icon: Settings,
  },
  { label: "Clear input", hint: "⌫", action: "clear" as const, icon: X },
  {
    label: "Back to translate",
    hint: "Esc",
    action: "translate-view" as const,
    icon: Languages,
  },
];

type CommandAction = (typeof commandItems)[number]["action"];

const inferTargetLanguage = (text: string, settings: TranslationSettings) => {
  if (!settings.smartTargetLanguage) return settings.targetLanguage;
  return /\p{Script=Han}/u.test(text) ? "English" : "Chinese";
};

const readClipboardText = async () => {
  try {
    if (hasTauriRuntime()) {
      const { readText } = await import("@tauri-apps/plugin-clipboard-manager");
      return (await readText())?.trim() ?? "";
    }
    return (await navigator.clipboard.readText())?.trim() ?? "";
  } catch (cause) {
    console.debug("clipboard read skipped", cause);
    return "";
  }
};

const writeClipboardText = async (text: string) => {
  if (hasTauriRuntime()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }
  await navigator.clipboard.writeText(text);
};

function App() {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const settingsHydratedRef = useRef(false);
  const translateRequestIdRef = useRef(0);
  const lastTranslatedKeyRef = useRef("");
  const [copied, setCopied] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [paletteOpen, setPaletteOpen] = useState(false);

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
    setHistory,
    setShortcutError,
  } = useAppStore();

  const effectiveTargetLanguage = useMemo(
    () => inferTargetLanguage(input, settings),
    [input, settings],
  );
  const hasApiKey =
    settings.apiKeyConfigured || settings.apiKey.trim().length > 0;
  const apiKeyMissing = !hasApiKey;
  const languageHint = useMemo(() => {
    if (!result) return `Auto → ${effectiveTargetLanguage}`;
    return `${result.sourceLanguage} → ${result.targetLanguage}`;
  }, [effectiveTargetLanguage, result]);

  useEffect(() => {
    inputRef.current?.focus();
  }, [view]);

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

    void Promise.all([loadSettings(), loadRecentHistory(3)]).then(
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

    if (hasTauriRuntime()) {
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
    }
  }, [setSettings, setShortcutError, settings]);

  useEffect(() => {
    if (!hasTauriRuntime()) return;
    void invoke("set_hide_on_blur", {
      enabled: view === "translate" && !paletteOpen,
    }).catch((cause) => console.error("failed to update blur behavior", cause));
  }, [paletteOpen, view]);

  const hydrateInputFromClipboard = async () => {
    const clipboardText = await readClipboardText();
    if (!clipboardText || clipboardText === input.trim()) return;
    setInput(clipboardText);
    clearResult();
    setHistoryIndex(-1);
  };

  useEffect(() => {
    if (!hasTauriRuntime()) return;

    let unlisten: (() => void) | undefined;
    void import("@tauri-apps/api/event").then(({ listen }) =>
      listen("transpop://focus-input", () => {
        setView("translate");
        void hydrateInputFromClipboard();
        window.setTimeout(() => inputRef.current?.focus(), 0);
      }).then((handler) => {
        unlisten = handler;
      }),
    );

    return () => unlisten?.();
  }, [input, setView]);

  const hideWindow = async () => {
    if (hasTauriRuntime()) {
      await invoke("hide_main_window");
      return;
    }

    inputRef.current?.blur();
  };

  const markCopied = () => {
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const refreshRecentHistory = async (fallbackHistory?: HistoryItem[]) => {
    if (hasTauriRuntime()) {
      setHistory(await loadRecentHistory(3));
      return;
    }
    if (fallbackHistory) {
      saveBrowserHistory(fallbackHistory);
    }
  };

  const runTranslate = async (textOverride?: string, force = false) => {
    const text = (textOverride ?? input).trim();
    if (!text) return;

    if (apiKeyMissing) {
      setError(null);
      if (force) toast.info("Add an API key to start translating.");
      return;
    }

    const requestKey = [
      text,
      settings.apiBaseUrl,
      settings.apiMode,
      settings.model,
      effectiveTargetLanguage,
      settings.apiKeyConfigured,
      settings.apiKey,
    ].join("\u0000");
    if (!force && requestKey === lastTranslatedKeyRef.current) return;

    const requestId = translateRequestIdRef.current + 1;
    translateRequestIdRef.current = requestId;
    lastTranslatedKeyRef.current = requestKey;

    setLoading(true);
    setError(null);
    setHistoryIndex(-1);

    try {
      const nextResult = await translator.translate(
        text,
        settings,
        effectiveTargetLanguage,
      );
      if (requestId !== translateRequestIdRef.current) return;
      setResult(text, nextResult);

      const nextHistory: HistoryItem[] = [
        {
          id: crypto.randomUUID(),
          input: text,
          output: nextResult.result,
          sourceLanguage: String(nextResult.sourceLanguage),
          targetLanguage: String(nextResult.targetLanguage),
          createdAt: Date.now(),
        },
        ...history,
      ].slice(0, 3);
      await refreshRecentHistory(nextHistory);

      if (settings.autoCopy) {
        await writeClipboardText(nextResult.result);
        markCopied();
        toast.success("Translation copied");
      } else {
        toast.success("Translation ready");
      }
    } catch (cause) {
      if (requestId !== translateRequestIdRef.current) return;
      console.error(cause);
      const message = String(cause).includes("API key")
        ? "Open Settings and add your API key."
        : "Unable to translate. Retry or check your network.";
      setError(message);
      toast.error(message);
    } finally {
      if (requestId === translateRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    if (view !== "translate" || apiKeyMissing) return;

    const text = input.trim();
    if (!text) {
      lastTranslatedKeyRef.current = "";
      return;
    }

    const timerId = window.setTimeout(() => {
      void runTranslate(text);
    }, 1000);

    return () => window.clearTimeout(timerId);
  }, [
    apiKeyMissing,
    effectiveTargetLanguage,
    input,
    settings.apiKey,
    settings.apiKeyConfigured,
    settings.autoCopy,
    settings.apiBaseUrl,
    settings.apiMode,
    settings.model,
    view,
  ]);

  const copyResult = async () => {
    if (!result?.result) return;
    await writeClipboardText(result.result);
    markCopied();
    toast.success("Copied to clipboard");
  };

  const retry = () => {
    void runTranslate(undefined, true);
  };

  const moveHistory = (direction: 1 | -1) => {
    if (history.length === 0) return;
    const nextIndex = Math.min(
      Math.max(historyIndex + direction, 0),
      history.length - 1,
    );
    setHistoryIndex(nextIndex);
    useHistoryItem(history[nextIndex]);
  };

  const openPalette = () => {
    if (!paletteOpen) setPaletteOpen(true);
  };

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
        setInput("");
        clearResult();
        setHistoryIndex(-1);
        return;
      case "translate-view":
        setView("translate");
        return;
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

  const handleShellKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      openPalette();
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
    }

    if (
      (event.ctrlKey || event.metaKey) &&
      event.key.toLowerCase() === "c" &&
      result?.result
    ) {
      const target = event.target as HTMLElement;
      const hasSelection = window.getSelection()?.toString();
      if (target.tagName !== "TEXTAREA" && !hasSelection) {
        event.preventDefault();
        void copyResult();
      }
    }
  };

  return (
    <main
      className="relative min-h-screen overflow-hidden px-6 py-8"
      onKeyDown={handleShellKeyDown}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(59,130,246,0.18),transparent_24%),radial-gradient(circle_at_100%_0%,rgba(96,165,250,0.08),transparent_22%)]" />
      <motion.section
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.16, ease: "easeOut" }}
        className="relative mx-auto flex w-full max-w-[900px] flex-col overflow-hidden rounded-[20px] border border-border/80 bg-card/80 shadow-[0_20px_70px_rgba(17,24,39,0.15)] backdrop-blur-2xl"
        aria-label="TransPop translator"
      >
        <header className="flex items-center justify-between gap-4 border-b border-border/70 px-6 py-4">
          <button
            type="button"
            onClick={() => setView("translate")}
            className="flex items-center gap-3 rounded-[12px] text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Back to translate"
          >
            <span className="grid size-10 place-items-center rounded-[14px] border border-border bg-background text-lg shadow-sm">
              🌍
            </span>
            <span className="grid gap-0.5">
              <strong className="text-xl font-semibold tracking-[-0.03em] text-foreground">
                Translate
              </strong>
              <span className="text-xs text-muted-foreground">
                {languageHint}
              </span>
            </span>
          </button>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="hidden sm:inline-flex">
              {settings.smartTargetLanguage
                ? "Smart language"
                : effectiveTargetLanguage}
            </Badge>
            <Badge variant={settings.shortcutEnabled ? "outline" : "secondary"}>
              {settings.shortcutEnabled ? settings.shortcut : "Shortcut off"}
            </Badge>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() => openPalette()}
              aria-label="Open command palette"
              title="Command palette"
            >
              <CommandIcon size={16} />
            </Button>
            <Button
              variant="ghost"
              size="iconSm"
              onClick={() =>
                setView(view === "settings" ? "translate" : "settings")
              }
              aria-label="Open settings"
              title="Settings"
            >
              {view === "settings" ? <X size={16} /> : <Settings size={16} />}
            </Button>
          </div>
        </header>

        <div className="max-h-[500px] overflow-auto px-6 py-5">
          <AnimatePresence mode="wait">
            {view === "translate" ? (
              <motion.div
                key="translate"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
                className="grid gap-4"
              >
                <div className="grid gap-3 rounded-[16px] border border-border bg-background/95 p-4 shadow-[0_1px_0_rgba(255,255,255,0.35)]">
                  <div className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2 font-medium text-foreground/80">
                      <Languages size={14} /> Input
                    </span>
                    <span>
                      Auto translates 1s after typing stops · Shift+Enter for
                      newline
                    </span>
                  </div>
                  <label className="sr-only" htmlFor="translate-input">
                    Text to translate
                  </label>
                  <Textarea
                    id="translate-input"
                    ref={inputRef}
                    value={input}
                    onChange={(event) => {
                      setInput(event.currentTarget.value);
                      if (!event.currentTarget.value.trim()) clearResult();
                    }}
                    onKeyDown={handleInputKeyDown}
                    placeholder="Type something or copy text before opening..."
                    rows={2}
                    spellCheck="false"
                    className="min-h-[52px] border-0 bg-transparent p-0 text-[18px] shadow-none focus-visible:ring-0"
                  />
                </div>

                <Separator />

                <ResultArea
                  loading={loading}
                  error={error}
                  resultText={result?.result ?? ""}
                  canRetry={input.trim().length > 0 && !apiKeyMissing}
                  copied={copied}
                  autoCopy={settings.autoCopy}
                  apiKeyMissing={apiKeyMissing && input.trim().length > 0}
                  onCopy={copyResult}
                  onRetry={retry}
                  onOpenSettings={() => setView("settings")}
                />

                <RecentHistory
                  items={history.slice(0, 3)}
                  onUse={useHistoryItem}
                  activeId={history[historyIndex]?.id}
                />

                <footer className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
                    <Sparkles size={13} /> Auto after 1s
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
                    <kbd className="font-medium text-foreground">Enter</kbd> Now
                  </span>
                  <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5">
                    <kbd className="font-medium text-foreground">Esc</kbd> Close
                  </span>
                </footer>
              </motion.div>
            ) : (
              <motion.div
                key="settings"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.12, ease: "easeOut" }}
              >
                <SettingsPanel />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.section>

      <AnimatePresence>
        {paletteOpen ? (
          <motion.div
            className="fixed inset-0 z-50 grid place-items-start bg-black/25 px-4 pt-[14vh] backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) setPaletteOpen(false);
            }}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.12, ease: "easeOut" }}
              className="mx-auto w-full max-w-[640px] overflow-hidden rounded-[18px] border border-border bg-popover/95 shadow-[0_24px_80px_rgba(15,23,42,0.24)]"
            >
              <CommandMenu className="w-full bg-transparent text-popover-foreground">
                <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-muted-foreground">
                  <Search size={16} />
                  <CommandInput
                    autoFocus
                    placeholder="Search actions..."
                    className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                    onKeyDown={(event) => {
                      if (event.key === "Escape") setPaletteOpen(false);
                    }}
                  />
                </div>
                <CommandList className="max-h-[320px] overflow-auto p-2">
                  <CommandEmpty className="px-3 py-8 text-center text-sm text-muted-foreground">
                    No actions found.
                  </CommandEmpty>
                  <CommandGroup
                    heading="Actions"
                    className="px-1 py-1 text-xs text-muted-foreground"
                  >
                    {commandItems.map(({ label, hint, action, icon: Icon }) => (
                      <CommandItem
                        key={action}
                        value={label}
                        onSelect={() => {
                          void executeCommand(action);
                        }}
                        className="flex cursor-pointer items-center justify-between gap-4 rounded-[12px] px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-foreground"
                      >
                        <span className="flex items-center gap-3">
                          <Icon size={16} className="text-muted-foreground" />
                          {label}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {hint}
                        </span>
                      </CommandItem>
                    ))}
                  </CommandGroup>
                </CommandList>
              </CommandMenu>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <Toaster
        richColors
        position="top-center"
        theme={settings.theme === "system" ? undefined : settings.theme}
      />
    </main>
  );
}

interface ResultAreaProps {
  loading: boolean;
  error: string | null;
  resultText: string;
  canRetry: boolean;
  copied: boolean;
  autoCopy: boolean;
  apiKeyMissing: boolean;
  onCopy: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}

function ResultArea({
  loading,
  error,
  resultText,
  canRetry,
  copied,
  autoCopy,
  apiKeyMissing,
  onCopy,
  onRetry,
  onOpenSettings,
}: ResultAreaProps) {
  if (loading) {
    return (
      <Card className="border-border/70 bg-background/80 shadow-[0_1px_0_rgba(255,255,255,0.35)]">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Languages size={15} /> Thinking...
          </CardTitle>
          <CardDescription>
            Responding with lightweight skeleton feedback instead of a spinner.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="h-4 w-3/4 animate-pulse rounded-full bg-muted" />
          <div className="h-4 w-1/2 animate-pulse rounded-full bg-muted" />
          <div className="flex gap-1.5 pt-2" aria-hidden="true">
            <span className="size-1.5 animate-pulse rounded-full bg-primary/80 [animation-delay:0ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary/80 [animation-delay:120ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary/80 [animation-delay:240ms]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (apiKeyMissing) {
    return (
      <Card className="border-primary/25 bg-background/90">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-foreground">
            Add API Key to start translating
          </CardTitle>
          <CardDescription>
            Your API key is encrypted before it is stored in the local SQLite
            database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOpenSettings}>
            <Settings size={15} /> Open Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-destructive/25 bg-background/80">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-destructive">
            Unable to translate.
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRetry} disabled={!canRetry}>
            <RotateCcw size={15} /> Retry
          </Button>
          <Button variant="ghost" onClick={onOpenSettings}>
            <Settings size={15} /> Open Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!resultText) {
    return (
      <Card className="border-dashed border-border/70 bg-background/70">
        <CardContent className="grid gap-1 py-10 text-sm">
          <strong className="text-base font-semibold text-foreground">
            Start typing or paste text
          </strong>
          <p className="text-muted-foreground">
            Translation will appear automatically after 1 second.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border/70 bg-background/90 shadow-[0_1px_0_rgba(255,255,255,0.35)]">
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <CardTitle className="text-sm font-medium text-foreground/80">
            Translation
          </CardTitle>
          <CardDescription>
            {autoCopy
              ? "Copied automatically. Retry if you need a refreshed result."
              : "Copy or retry without leaving the workflow."}
          </CardDescription>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onRetry}
          disabled={!canRetry}
        >
          <RotateCcw size={15} /> Retry
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="whitespace-pre-wrap text-[18px] leading-7 text-foreground">
          {resultText}
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" onClick={onRetry} disabled={!canRetry}>
            <RotateCcw size={15} /> Retry
          </Button>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <ArrowUpDown size={13} /> History ↑ ↓
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function RecentHistory({
  items,
  activeId,
  onUse,
}: {
  items: HistoryItem[];
  activeId?: string;
  onUse: (item: HistoryItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="grid gap-2">
      <div className="text-xs font-medium text-muted-foreground">
        Recent translations
      </div>
      <div className="grid gap-2">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onUse(item)}
            className={`rounded-xl border px-3 py-2 text-left text-xs transition hover:bg-muted/60 ${
              activeId === item.id
                ? "border-primary/50 bg-primary/10"
                : "border-border bg-background/70"
            }`}
          >
            <div className="truncate font-medium text-foreground">
              {item.input}
            </div>
            <div className="truncate text-muted-foreground">{item.output}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

export default App;


