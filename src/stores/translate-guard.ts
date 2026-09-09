/**
 * 翻译请求守卫：请求竞态防护、去重键与「已复制」瞬态状态。
 *
 * 这些状态是请求时序的实现细节，与 UI 渲染无关，故放在 store 闭包之外，
 * 以模块级变量承载并集中在本模块管理。
 */
import { inferTargetLanguage } from "@/features/translation/language";
import type { TranslationResult } from "@/features/translation/types";
import type { HistoryItem } from "@/features/history/types";
import type { TranslationSettings } from "@/features/settings/types";

/** 「已复制」状态自动复位延时（毫秒）。 */
const COPIED_RESET_DELAY_MS = 1600;

/** 守卫函数可写的 AppState 字段子集。 */
type GuardPatch = {
  copied?: boolean;
  input?: string;
  result?: TranslationResult | null;
  error?: string | null;
  loading?: boolean;
  historyIndex?: number;
};

/** 守卫所需的 store 读取接口子集。 */
type GuardStore = {
  history: HistoryItem[];
  historyIndex: number;
  settings: TranslationSettings;
};

let translateRequestId = 0;
let lastRequestKey = "";
let copyResetTimer: number | undefined;

/** 生成翻译请求去重键：文本 + 影响结果的全部设置项。 */
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

/** 翻译请求守卫。 */
export const translateGuard = {
  /** 领取新的请求序号，旧序号的响应视为过期。 */
  nextId(): number {
    translateRequestId += 1;
    return translateRequestId;
  },

  /** 判断响应序号是否已过期（过期则丢弃，不更新界面）。 */
  isStale(requestId: number): boolean {
    return requestId !== translateRequestId;
  },

  /** 与上次进行中的请求重复时返回 true；否则记录该键并放行。 */
  dedupe(key: string): boolean {
    if (key === lastRequestKey) return true;
    lastRequestKey = key;
    return false;
  },

  /** 作废全部在途请求并清空去重键（清空输入/历史后调用）。 */
  invalidate(): void {
    translateRequestId += 1;
    lastRequestKey = "";
  },

  /** 记录请求键但不领取新序号（历史回填后允许重新翻译同一文本）。 */
  syncKey(text: string, settings: TranslationSettings): void {
    lastRequestKey = createRequestKey(
      text,
      settings,
      inferTargetLanguage(text, settings),
    );
  },
};

/** 置「已复制」并在短暂延时后自动复位。 */
export function markCopied(set: (patch: GuardPatch) => void): void {
  set({ copied: true });
  window.clearTimeout(copyResetTimer);
  copyResetTimer = window.setTimeout(
    () => set({ copied: false }),
    COPIED_RESET_DELAY_MS,
  );
}

/** 把历史条目回填到输入框，但不触发重新翻译。 */
export function restoreWithoutTranslate(
  set: (patch: GuardPatch) => void,
  get: () => GuardStore,
  item: HistoryItem,
): void {
  const text = item.input.trim();
  if (text) {
    translateGuard.syncKey(text, get().settings);
  }
  translateGuard.invalidate();
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
