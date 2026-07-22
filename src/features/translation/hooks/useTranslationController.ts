import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import {
  loadRecentHistory,
  saveBrowserHistory,
} from "../../../api/settingsStore";
import { translator } from "../../../api/translator";
import { writeClipboardText } from "../../../lib/clipboard";
import { hasTauriRuntime } from "../../../lib/runtime";
import { useAppStore } from "../../../store/appStore";
import type {
  HistoryItem,
  TranslationSettings,
} from "../../../types/translation";
import { getLanguageLabel } from "../../../utils/constants";
import { inferTargetLanguage } from "../utils/language";

function createTranslationRequestKey(
  text: string,
  settings: TranslationSettings,
  targetLanguage: string,
): string {
  return [
    text,
    settings.apiBaseUrl,
    settings.apiMode,
    settings.model,
    targetLanguage,
    settings.apiKeyConfigured,
    settings.apiKey,
  ].join("\u0000");
}

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
  const restoreHistoryItem = useAppStore((state) => state.useHistoryItem);
  const setHistory = useAppStore((state) => state.setHistory);

  const effectiveTargetLanguage = useMemo(
    () => inferTargetLanguage(input, settings),
    [input, settings],
  );
  const apiKeyMissing =
    !settings.apiKeyConfigured && settings.apiKey.trim().length === 0;
  const languageHint = result
    ? `${getLanguageLabel(String(result.sourceLanguage))} → ${getLanguageLabel(String(result.targetLanguage))}`
    : `自动 → ${getLanguageLabel(effectiveTargetLanguage)}`;

  const resetHistoryIndex = useCallback(() => setHistoryIndex(-1), []);

  const restoreHistoryWithoutTranslating = useCallback(
    (item: HistoryItem) => {
      const text = item.input.trim();
      if (text) {
        lastTranslatedKeyRef.current = createTranslationRequestKey(
          text,
          settings,
          inferTargetLanguage(text, settings),
        );
      }

      // A history item already contains its translation. Invalidate any request
      // still in flight and restore the saved result without scheduling it again.
      translateRequestIdRef.current += 1;
      setLoading(false);
      restoreHistoryItem(item);
    },
    [restoreHistoryItem, setLoading, settings],
  );

  const selectHistoryItem = useCallback(
    (item: HistoryItem) => {
      setHistoryIndex(
        history.findIndex((historyItem) => historyItem.id === item.id),
      );
      restoreHistoryWithoutTranslating(item);
    },
    [history, restoreHistoryWithoutTranslating],
  );

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
        try {
          const loaded = await loadRecentHistory(3);
          setHistory(loaded);
        } catch {
          console.warn("Failed to load recent history");
          // Fallback to provided history on failure
          if (fallbackHistory) setHistory(fallbackHistory);
        }
        return;
      }
      // Browser environment: save and update state
      if (fallbackHistory) {
        saveBrowserHistory(fallbackHistory);
        setHistory(fallbackHistory);
      }
    },
    [setHistory],
  );

  const runTranslate = useCallback(
    async (textOverride?: string, force = false) => {
      const text = (textOverride ?? input).trim();
      if (!text) return;

      if (apiKeyMissing) {
        setError(null);
        if (force) toast.info("请先添加 API 密钥。");
        return;
      }

      const requestKey = createTranslationRequestKey(
        text,
        settings,
        effectiveTargetLanguage,
      );
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

        // Build new history item
        const nextHistoryItem: HistoryItem = {
          id: crypto.randomUUID(),
          input: text,
          output: nextResult.result,
          sourceLanguage: String(nextResult.sourceLanguage),
          targetLanguage: String(nextResult.targetLanguage),
          createdAt: Date.now(),
        };

        // Check again if request is still valid before updating history
        if (requestId !== translateRequestIdRef.current) return;

        const nextHistory = [nextHistoryItem, ...history].slice(0, 3);
        await refreshRecentHistory(nextHistory);

        // Check again after async history refresh
        if (requestId !== translateRequestIdRef.current) return;

        if (settings.autoCopy) {
          await writeClipboardText(nextResult.result);
          markCopied();
          toast.success("翻译结果已复制");
        } else {
          toast.success("翻译完成");
        }
      } catch (cause) {
        if (requestId !== translateRequestIdRef.current) return;
        console.error(cause);
        const message = String(cause).includes("API key")
          ? "请打开设置并添加 API 密钥。"
          : "无法完成翻译，请重试或检查网络连接。";
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
    toast.success("已复制到剪贴板");
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
      restoreHistoryWithoutTranslating(history[nextIndex]);
    },
    [history, historyIndex, restoreHistoryWithoutTranslating],
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
    useHistoryItem: selectHistoryItem,
    runTranslate,
    copyResult,
    retry,
    clearInput,
    moveHistory,
    resetHistoryIndex,
  };
}
