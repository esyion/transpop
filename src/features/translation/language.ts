import { getLanguageLabel } from "@/lib/constants";

import type { TranslationResult } from "@/features/translation/types";
import type { TranslationSettings } from "@/features/settings/types";

/**
 * 智能模式的目标语言规则：中文译为英语，其他语言译为中文；
 * 未启用智能模式时返回设置中的默认目标语言。
 */
export function inferTargetLanguage(
  text: string,
  settings: TranslationSettings,
): string {
  if (!settings.smartTargetLanguage) return settings.targetLanguage;
  return /\p{Script=Han}/u.test(text) ? "English" : "Chinese";
}

/**
 * 生成语言提示文案：有结果时展示「源 → 目标」，否则展示预估方向。
 */
export function getLanguageHint(
  result: TranslationResult | null,
  input: string,
  settings: TranslationSettings,
): string {
  if (result) {
    return `${getLanguageLabel(result.sourceLanguage)} → ${getLanguageLabel(result.targetLanguage)}`;
  }
  return `自动 → ${getLanguageLabel(inferTargetLanguage(input, settings))}`;
}
