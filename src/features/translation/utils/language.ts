import type { TranslationSettings } from "../../../types/translation";

export function inferTargetLanguage(
  text: string,
  settings: TranslationSettings,
): string {
  if (!settings.smartTargetLanguage) return settings.targetLanguage;
  return /\p{Script=Han}/u.test(text) ? "English" : "Chinese";
}
