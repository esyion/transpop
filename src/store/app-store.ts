import { create } from "zustand";
import { toast } from "sonner";

import { translate } from "@/api/translator";
import {
  clearAllHistory,
  deleteHistoryItem,
  loadRecentHistory,
  saveBrowserHistory,
} from "@/api/settings-store";
import { writeClipboardText } from "@/lib/clipboard";
import { DEFAULT_SETTINGS, MAX_HISTORY_ITEMS } from "@/lib/constants";
import { hasTauriRuntime } from "@/lib/runtime";
import { inferTargetLanguage } from "@/lib/language";
import type {
  HistoryItem,
  TranslationResult,
  TranslationSettings,
} from "@/types/translation";

function createRequestKey(
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

interface AppState {
  input: string;
  result: TranslationResult | null;
  loading: boolean;
  error: string | null;
  copied: boolean;
  historyIndex: number;
  history: HistoryItem[];
  settings: TranslationSettings;
  shortcutError: string | null;
  startupError: string | null;
  setInput: (input: string) => void;
  clearInput: () => void;
  runTranslate: (textOverride?: string, force?: boolean) => Promise<void>;
  copyResult: () => Promise<void>;
  retry: () => void;
  moveHistory: (direction: 1 | -1) => void;
  useHistoryItem: (item: HistoryItem) => void;
  removeHistoryItem: (item: HistoryItem) => Promise<void>;
  clearHistory: () => Promise<void>;
  updateSettings: (settings: Partial<TranslationSettings>) => void;
  setSettings: (settings: TranslationSettings) => void;
  setHistory: (history: HistoryItem[]) => void;
  setShortcutError: (error: string | null) => void;
  setStartupError: (error: string | null) => void;
}

let translateRequestId = 0;
let lastRequestKey = "";
let copyResetTimer: number | undefined;

export const useAppStore = create<AppState>((set, get) => ({
  input: "",
  result: null,
  loading: false,
  error: null,
  copied: false,
  historyIndex: -1,
  history: [],
  settings: DEFAULT_SETTINGS,
  shortcutError: null,
  startupError: null,

  setInput: (input) => set({ input }),

  clearInput: () => {
    translateRequestId += 1;
    lastRequestKey = "";
    set({ input: "", result: null, error: null, historyIndex: -1 });
  },

  runTranslate: async (textOverride, force = false) => {
    const { input, settings } = get();
    const text = (textOverride ?? input).trim();
    if (!text) return;

    const apiKeyMissing =
      !settings.apiKeyConfigured && settings.apiKey.trim().length === 0;
    if (apiKeyMissing) {
      set({ error: null });
      if (force) toast.info("请先在设置中添加 API 密钥");
      return;
    }

    const targetLanguage = inferTargetLanguage(text, settings);
    const requestKey = createRequestKey(text, settings, targetLanguage);
    if (!force && requestKey === lastRequestKey) return;

    const requestId = ++translateRequestId;
    lastRequestKey = requestKey;
    set({ loading: true, error: null, historyIndex: -1 });

    try {
      const result = await translate(text, settings, targetLanguage);
      if (requestId !== translateRequestId) return;

      set((state) => ({
        result,
        error: null,
        history: [
          {
            id: crypto.randomUUID(),
            input: text,
            output: result.result,
            sourceLanguage: String(result.sourceLanguage),
            targetLanguage: String(result.targetLanguage),
            createdAt: Date.now(),
          },
          ...state.history,
        ].slice(0, MAX_HISTORY_ITEMS),
      }));

      // Tauri 模式下翻译命令已把记录写入本地数据库，从数据库重载；
      // 浏览器开发模式则把内存列表持久化到 localStorage。
      if (hasTauriRuntime()) {
        try {
          set({ history: await loadRecentHistory() });
        } catch (cause) {
          console.warn("failed to reload history", cause);
        }
      } else {
        saveBrowserHistory(get().history);
      }
      if (requestId !== translateRequestId) return;

      if (get().settings.autoCopy) {
        await writeClipboardText(result.result);
        markCopied(set);
        toast.success("翻译结果已复制");
      } else {
        toast.success("翻译完成");
      }
    } catch (cause) {
      if (requestId !== translateRequestId) return;
      console.error(cause);
      const message = String(cause).includes("API key")
        ? "请打开设置并添加 API 密钥"
        : "无法完成翻译，请重试或检查网络连接";
      set({ error: message });
      toast.error(message);
    } finally {
      if (requestId === translateRequestId) set({ loading: false });
    }
  },

  copyResult: async () => {
    const { result } = get();
    if (!result?.result) return;
    await writeClipboardText(result.result);
    markCopied(set);
    toast.success("已复制到剪贴板");
  },

  retry: () => void get().runTranslate(undefined, true),

  moveHistory: (direction) => {
    const { history, historyIndex } = get();
    if (history.length === 0) return;
    const nextIndex = Math.min(
      Math.max(historyIndex + direction, 0),
      history.length - 1,
    );
    restoreWithoutTranslate(set, get, history[nextIndex]);
    set({ historyIndex: nextIndex });
  },

  useHistoryItem: (item) => {
    translateRequestId += 1;
    restoreWithoutTranslate(set, get, item);
    set({
      historyIndex: get().history.findIndex((entry) => entry.id === item.id),
    });
  },

  removeHistoryItem: async (item) => {
    try {
      await deleteHistoryItem(item.id);
      try {
        set({ history: await loadRecentHistory() });
      } catch {
        set((state) => ({
          history: state.history.filter((entry) => entry.id !== item.id),
        }));
      }
      set({ historyIndex: -1 });
      toast.success("已删除历史记录");
    } catch (cause) {
      console.error(cause);
      toast.error("删除历史记录失败");
    }
  },

  clearHistory: async () => {
    try {
      await clearAllHistory();
      translateRequestId += 1;
      lastRequestKey = "";
      set({ history: [], historyIndex: -1 });
      toast.success("已清空全部历史记录");
    } catch (cause) {
      console.error(cause);
      toast.error("清空历史记录失败");
    }
  },

  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),

  setSettings: (settings) => set({ settings }),

  setHistory: (history) => set({ history: history.slice(0, MAX_HISTORY_ITEMS) }),

  setShortcutError: (shortcutError) => set({ shortcutError }),
  setStartupError: (startupError) => set({ startupError }),
}));

function markCopied(set: (partial: Partial<AppState>) => void) {
  set({ copied: true });
  window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(() => set({ copied: false }), 1600);
}

/** 把历史条目回填到输入框，但不重新翻译。 */
function restoreWithoutTranslate(
  set: (partial: Partial<AppState>) => void,
  get: () => AppState,
  item: HistoryItem,
) {
  const text = item.input.trim();
  if (text) {
    lastRequestKey = createRequestKey(
      text,
      get().settings,
      inferTargetLanguage(text, get().settings),
    );
  }
  translateRequestId += 1;
  set({
    input: item.input,
    result: {
      sourceLanguage: item.sourceLanguage,
      targetLanguage: item.targetLanguage,
      result: item.output,
    },
    error: null,
    loading: false,
  });
}
