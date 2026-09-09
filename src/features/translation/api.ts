import { hasTauriRuntime } from "@/lib/runtime";

import { invokeIpc } from "@/services/ipc";
import type { TranslationResult } from "@/features/translation/types";

/** 浏览器开发模式下占位翻译的模拟延迟（毫秒）。 */
const FALLBACK_DELAY_MS = 420;

/** 按脚本探测源语言（仅浏览器开发模式占位用）。 */
const detectSourceLanguage = (text: string): string => {
  if (/\p{Script=Han}/u.test(text)) return "Chinese";
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)) return "Japanese";
  if (/\p{Script=Hangul}/u.test(text)) return "Korean";
  return "English";
};

/** 浏览器开发模式下的占位翻译，便于不启动 Tauri 时调试界面。 */
const fallbackTranslate = (text: string, targetLanguage: string): string =>
  `[${targetLanguage}] ${text.trim()}`;

/**
 * 请求后端执行翻译。
 *
 * 安全面约束：只提交文本与目标语言；接口地址、接口类型、模型与
 * API 密钥一律由后端从本地设置读取。浏览器开发模式返回占位结果。
 */
export async function translateText(
  text: string,
  targetLanguage: string,
): Promise<TranslationResult> {
  if (hasTauriRuntime()) {
    return invokeIpc<TranslationResult>("translate", {
      request: { text, targetLanguage },
    });
  }

  await new Promise((resolve) => window.setTimeout(resolve, FALLBACK_DELAY_MS));

  return {
    sourceLanguage: detectSourceLanguage(text),
    targetLanguage,
    result: fallbackTranslate(text, targetLanguage),
  };
}
