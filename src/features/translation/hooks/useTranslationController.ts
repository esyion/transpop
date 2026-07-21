import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { loadRecentHistory, saveBrowserHistory } from "../../../api/settingsStore";
import { translator } from "../../../api/translator";
import { writeClipboardText } from "../../../lib/clipboard";
import { hasTauriRuntime } from "../../../lib/runtime";
import { useAppStore } from "../../../store/appStore";
import type { HistoryItem } from "../../../types/translation";
import { inferTargetLanguage } from "../utils/language";

export function useTranslationController() {
  const translateRequestIdRef = useRef(0);
  const lastTranslatedKeyRef = useRef("");
  const copyTimerRef = useRef<number | undefined>(undefined);
  const [copied, setCopied] = useState(false);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const input = useAppStore((state) => state.input);
  const result = useAppStore((state) => state.result);
  const loading = useAppStore((state) => state.loading);
  const error = useAppStore((state) => state.error);
  const history = useAppStore((state) => state.history);
  const settings = useAppStore((state) => state.settings);
  const view = useAppStore((state) => state.view);
  const setInput = useAppStore((state) => state.setInput);
  const setLoading = useAppStore((state) => state.setLoading);
  const setError = useAppStore((state) => state.setError);
  const setResult = useAppStore((state) => state.setResult);
  const clearResult = useAppStore((state) => state.clearResult);
  const useHistoryItem = useAppStore((state) => state.useHistoryItem);
  const setHistory = useAppStore((state) => state.setHistory);

  const effectiveTargetLanguage = useMemo(
    () => inferTargetLanguage(input, settings),
    [input, settings],
  );
  const apiKeyMissing =
    !settings.apiKeyConfigured && settings.apiKey.trim().length === 0;
  const languageHint = result
    ? `${result.sourceLanguage} → ${result.targetLanguage}`
    : `Auto → ${effectiveTargetLanguage}`;

  const resetHistoryIndex = useCallback(() => setHistoryIndex(-1), []);

  const markCopied = useCallback(() => {
    setCopied(true);
    if (copyTimerRef.current !== undefined) {
      window.clearTimeout(copyTimerRef.current);
    }
    copyTimerRef.current = window.setTimeout(() => setCopied(false), 1200);
  }, []);

  useEffect(
    () => () => {
      if (copyTimerRef.current !== undefined) {
        window.clearTimeout(copyTimerRef.current);
      }
    },
    [],
  );

  const refreshRecentHistory = useCallback(
    async (fallbackHistory?: HistoryItem[]) => {
      if (hasTauriRuntime()) {
        setHistory(await loadRecentHistory(3));
        return;
      }
      if (fallbackHistory) saveBrowserHistory(fallbackHistory);
    },
    [setHistory],
  );

  const runTranslate = useCallback(
    async (textOverride?: string, force = false) => {
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
      resetHistoryIndex();

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
        if (requestId === translateRequestIdRef.current) setLoading(false);
      }
    },
    [
      apiKeyMissing,
      effectiveTargetLanguage,
      history,
      input,
      markCopied,
      refreshRecentHistory,
      resetHistoryIndex,
      setError,
      setLoading,
      setResult,
      settings,
    ],
  );

  useEffect(() => {
    if (view !== "translate" || apiKeyMissing) return;
    const text = input.trim();
    if (!text) {
      lastTranslatedKeyRef.current = "";
      return;
    }

    const timerId = window.setTimeout(() => void runTranslate(text), 1000);
    return () => window.clearTimeout(timerId);
  }, [apiKeyMissing, input, runTranslate, view]);

  const copyResult = useCallback(async () => {
    if (!result?.result) return;
    await writeClipboardText(result.result);
    markCopied();
    toast.success("Copied to clipboard");
  }, [markCopied, result?.result]);

  const retry = useCallback(
    () => void runTranslate(undefined, true),
    [runTranslate],
  );

  const clearInput = useCallback(() => {
    setInput("");
    clearResult();
    resetHistoryIndex();
  }, [clearResult, resetHistoryIndex, setInput]);

  const moveHistory = useCallback(
    (direction: 1 | -1) => {
      if (history.length === 0) return;
      const nextIndex = Math.min(
        Math.max(historyIndex + direction, 0),
        history.length - 1,
      );
      setHistoryIndex(nextIndex);
      useHistoryItem(history[nextIndex]);
    },
    [history, historyIndex, useHistoryItem],
  );

  return {
    input,
    result,
    loading,
    error,
    history,
    settings,
    view,
    copied,
    historyIndex,
    apiKeyMissing,
    effectiveTargetLanguage,
    languageHint,
    setInput,
    clearResult,
    useHistoryItem,
    runTranslate,
    copyResult,
    retry,
    clearInput,
    moveHistory,
    resetHistoryIndex,
  };
}

