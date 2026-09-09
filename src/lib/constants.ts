/**
 * 应用通用词表与常量：语言、接口类型、主题等展示用数据。
 * 纯数据模块，禁止引入任何副作用。
 */

/** 可选目标语言列表。 */
export const LANGUAGE_OPTIONS = [
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Spanish",
] as const;

/** 语言的中文展示名。 */
export const LANGUAGE_LABELS: Record<string, string> = {
  Chinese: "中文",
  English: "英语",
  Japanese: "日语",
  Korean: "韩语",
  French: "法语",
  German: "德语",
  Spanish: "西班牙语",
};

/**
 * 取语言的中文展示名；未登记的语言原样返回。
 */
export function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

/** 大模型接口类型选项。 */
export const API_MODE_OPTIONS = [
  { value: "responses", label: "Responses API" },
  { value: "chat_completions", label: "聊天补全 API" },
] as const;

/** 主题选项。 */
export const THEME_OPTIONS = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
] as const;

/** 历史记录最大保留条数（与后端 HISTORY_RETENTION_LIMIT 一致）。 */
export const MAX_HISTORY_ITEMS = 100;
