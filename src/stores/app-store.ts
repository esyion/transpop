import { create } from "zustand";
import { toast } from "sonner";

import { translateText } from "@/features/translation/api";
import { inferTargetLanguage } from "@/features/translation/language";
import type { TranslationResult } from "@/features/translation/types";
import { loadRecentHistory, saveBrowserHistory } from "@/features/history/api";
import type { HistoryItem } from "@/features/history/types";
import { DEFAULT_SETTINGS } from "@/features/settings/types";
import { loadSettings } from "@/features/settings/api";
import type { TranslationSettings } from "@/features/settings/types";
import { MAX_HISTORY_ITEMS } from "@/lib/constants";
import { hasTauriRuntime } from "@/lib/runtime";
import { IpcError } from "@/services/ipc";
import { writeClipboardText } from "@/services/clipboard";

import { createHistoryActions } from "@/stores/history-actions";
import { markCopied, restoreWithoutTranslate, translateGuard } from "@/stores/translate-guard";

/** 输入停止变化后自动翻译的延时（毫秒）。 */
const AUTO_TRANSLATE_DELAY_MS = 1000;

/** API 密钥未配置时的引导文案。 */
const API_KEY_MISSING_MESSAGE = "请打开设置并添加 API 密钥";
/** 翻译失败的通用文案。 */
const TRANSLATE_FAILED_MESSAGE = "无法完成翻译，请重试或检查网络连接";
/** 设置加载失败的稳定文案。 */
const SETTINGS_LOAD_FAILED_MESSAGE = "设置加载失败，请重试";

/** 客户端状态树。 */
export type AppState = {
  /** 输入框原文。 */
  input: string;
  /** 最近一次翻译结果。 */
  result: TranslationResult | null;
  /** 是否正在翻译。 */
  loading: boolean;
  /** 翻译失败提示（用户文案）。 */
  error: string | null;
  /** 翻译结果是否已复制（短暂置真后自动复位）。 */
  copied: boolean;
  /** 正在回看的历史下标；-1 表示不在回看模式。 */
  historyIndex: number;
  /** 历史记录列表（最近优先）。 */
  history: HistoryItem[];
  /** 历史列表是否加载中。 */
  historyLoading: boolean;
  /** 历史列表加载失败提示；非空时视图展示重试入口。 */
  historyError: string | null;
  /** 应用设置。 */
  settings: TranslationSettings;
  /** 设置加载失败提示；非空时设置页顶部展示重试入口。 */
  settingsError: string | null;
  /** 快捷键注册失败提示。 */
  shortcutError: string | null;
  /** 开机自启失败提示。 */
  startupError: string | null;
  /** 更新输入内容。 */
  setInput: (input: string) => void;
  /** 清空输入与结果。 */
  clearInput: () => void;
  /** 执行翻译；`force` 为真时跳过去重直接重译。 */
  runTranslate: (textOverride?: string, force?: boolean) => Promise<void>;
  /** 复制当前翻译结果。 */
  copyResult: () => Promise<void>;
  /** 用原文重试翻译。 */
  retry: () => void;
  /** 在历史列表中前后移动（↑/↓ 键）。 */
  moveHistory: (direction: 1 | -1) => void;
  /** 回填某条历史到输入框（不触发翻译）。 */
  useHistoryItem: (item: HistoryItem) => void;
  /** 删除单条历史记录并刷新列表。 */
  removeHistoryItem: (item: HistoryItem) => Promise<void>;
  /** 清空全部历史记录。 */
  clearHistory: () => Promise<void>;
  /** 从后端重新加载历史列表（驱动 loading/error 态）。 */
  loadHistory: () => Promise<void>;
  /** 整体替换历史列表。 */
  setHistory: (history: HistoryItem[]) => void;
  /** 局部合并更新设置。 */
  updateSettings: (settings: Partial<TranslationSettings>) => void;
  /** 整体替换设置。 */
  setSettings: (settings: TranslationSettings) => void;
  /** 从后端加载设置；失败时置 `settingsError`（返回是否成功）。 */
  reloadSettings: () => Promise<boolean>;
  /** 设置快捷键错误提示。 */
  setShortcutError: (error: string | null) => void;
  /** 设置开机自启错误提示。 */
  setStartupError: (error: string | null) => void;
};

/**
 * 应用全局唯一 zustand store。
 * 组件通过 selector 订阅切片；命令式场景用 `useAppStore.getState()`。
 * 历史相关 actions 抽离在 `history-actions.ts`，请求守卫在 `translate-guard.ts`。
 */
export const useAppStore = create<AppState>((set, get) => ({
  input: "",
  result: null,
  loading: false,
  error: null,
  copied: false,
  historyIndex: -1,
  history: [],
  historyLoading: false,
  historyError: null,
  settings: DEFAULT_SETTINGS,
  settingsError: null,
  shortcutError: null,
  startupError: null,

  setInput: (input) => set({ input }),

  clearInput: () => {
    translateGuard.invalidate();
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
    if (!force && translateGuard.dedupe(createRequestKey(text, settings, targetLanguage))) {
      return;
    }

    const requestId = translateGuard.nextId();
    set({ loading: true, error: null, historyIndex: -1 });

    try {
      const result = await translateText(text, targetLanguage);
      if (translateGuard.isStale(requestId)) return;

      set((state) => ({
        result,
        error: null,
        history: [
          {
            id: crypto.randomUUID(),
            input: text,
            output: result.result,
            sourceLanguage: result.sourceLanguage,
            targetLanguage: result.targetLanguage,
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
      if (translateGuard.isStale(requestId)) return;

      if (get().settings.autoCopy) {
        await writeClipboardText(result.result);
        markCopied(set);
        toast.success("翻译结果已复制");
      } else {
        toast.success("翻译完成");
      }
    } catch (cause) {
      if (translateGuard.isStale(requestId)) return;
      console.error("translate failed", cause);
      const message =
        cause instanceof IpcError && cause.code === "API_KEY_MISSING"
          ? API_KEY_MISSING_MESSAGE
          : TRANSLATE_FAILED_MESSAGE;
      set({ error: message });
      toast.error(message);
    } finally {
      if (!translateGuard.isStale(requestId)) set({ loading: false });
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
    restoreWithoutTranslate(set, get, item);
    set({
      historyIndex: get().history.findIndex((entry) => entry.id === item.id),
    });
  },

  ...createHistoryActions(set, get, () => {
    // 清空历史后作废在途请求与去重键，允许重新翻译。
    translateGuard.invalidate();
  }),

  updateSettings: (settings) =>
    set((state) => ({ settings: { ...state.settings, ...settings } })),

  setSettings: (settings) => set({ settings }),

  reloadSettings: async () => {
    try {
      const stored = await loadSettings();
      set({ settings: stored, settingsError: null });
      return true;
    } catch (cause) {
      console.error("failed to load settings", cause);
      set({ settingsError: SETTINGS_LOAD_FAILED_MESSAGE });
      return false;
    }
  },

  setShortcutError: (shortcutError) => set({ shortcutError }),
  setStartupError: (startupError) => set({ startupError }),
}));

/** 生成翻译请求去重键（供守卫模块语义一致的命名导出）。 */
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
