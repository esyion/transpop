import type { TranslationResult, TranslationSettings } from "@/types/translation";
import { getLanguageLabel } from "@/lib/constants";

/** 智能模式：中文译为英语，其他语言译为中文。 */
export function inferTargetLanguage(
  text: string,
  settings: TranslationSettings,
): string {
  if (!settings.smartTargetLanguage) return settings.targetLanguage;
  return /\p{Script=Han}/u.test(text) ? "English" : "Chinese";
}

export function getLanguageHint(
  result: TranslationResult | null,
  input: string,
  settings: TranslationSettings,
): string {
  if (result) {
    return `${getLanguageLabel(String(result.sourceLanguage))} → ${getLanguageLabel(String(result.targetLanguage))}`;
  }
  return `自动 → ${getLanguageLabel(inferTargetLanguage(input, settings))}`;
}
