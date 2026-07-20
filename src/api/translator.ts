import { invoke } from "@tauri-apps/api/core";
import type { ApiMode, TranslationResult, TranslationSettings } from "../types/translation";

export interface Translator {
  translate(text: string, settings: TranslationSettings, targetLanguage: string): Promise<TranslationResult>;
}

const hasTauriRuntime = () => typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;

const detectSourceLanguage = (text: string): string => {
  if (/\p{Script=Han}/u.test(text)) return "Chinese";
  if (/\p{Script=Hiragana}|\p{Script=Katakana}/u.test(text)) return "Japanese";
  if (/\p{Script=Hangul}/u.test(text)) return "Korean";
  return "English";
};

const fallbackTranslate = (text: string, targetLanguage: string): string => {
  const dictionary: Record<string, Record<string, string>> = {
    "hello world": { Chinese: "你好，世界", English: "Hello world" },
    hello: { Chinese: "你好", English: "Hello" },
    "你好": { English: "Hello", Chinese: "你好" },
    "你好，世界": { English: "Hello world", Chinese: "你好，世界" },
  };

  const normalized = text.trim().toLowerCase();
  return dictionary[normalized]?.[targetLanguage] ?? `[${targetLanguage}] ${text.trim()}`;
};

class TauriTranslator implements Translator {
  async translate(text: string, settings: TranslationSettings, targetLanguage: string): Promise<TranslationResult> {
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
}

export const translator: Translator = new TauriTranslator();
export type { ApiMode };
