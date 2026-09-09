import { invoke } from "@tauri-apps/api/core";

import { hasTauriRuntime } from "@/lib/runtime";
import type { TranslationResult, TranslationSettings } from "@/types/translation";

const detectSourceLanguage = (text: string): string => {
  if (/\p{Script=Han}/u.test(text)) return "Chinese";
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)) return "Japanese";
  if (/\p{Script=Hangul}/u.test(text)) return "Korean";
  return "English";
};

/** 浏览器开发模式下的占位翻译，便于不启动 Tauri 时调试界面。 */
const fallbackTranslate = (text: string, targetLanguage: string): string => {
  return `[${targetLanguage}] ${text.trim()}`;
};

export async function translate(
  text: string,
  settings: TranslationSettings,
  targetLanguage: string,
): Promise<TranslationResult> {
  if (hasTauriRuntime()) {
    return invoke<TranslationResult>("translate", {
      request: {
        text,
        targetLanguage,
        apiBaseUrl: settings.apiBaseUrl,
        apiMode: settings.apiMode,
        model: settings.model,
      },
    });
  }

  await new Promise((resolve) => window.setTimeout(resolve, 420));

  return {
    sourceLanguage: detectSourceLanguage(text),
    targetLanguage,
    result: fallbackTranslate(text, targetLanguage),
  };
}
