import type { TranslationSettings } from "@/types/translation";

export const DEFAULT_SETTINGS: TranslationSettings = {
  apiBaseUrl: "https://api.openai.com/v1",
  apiMode: "responses",
  model: "gpt-5.4",
  apiKey: "",
  apiKeyConfigured: false,
  targetLanguage: "Chinese",
  smartTargetLanguage: true,
  shortcut: "Alt + `",
  shortcutEnabled: true,
  theme: "system",
  fontScale: 1,
  startup: false,
  autoCopy: true,
};

export const LANGUAGE_OPTIONS = [
  "Chinese",
  "English",
  "Japanese",
  "Korean",
  "French",
  "German",
  "Spanish",
] as const;

export const LANGUAGE_LABELS: Record<string, string> = {
  Chinese: "中文",
  English: "英语",
  Japanese: "日语",
  Korean: "韩语",
  French: "法语",
  German: "德语",
  Spanish: "西班牙语",
};

export function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language] ?? language;
}

export const API_MODE_OPTIONS = [
  { value: "responses", label: "Responses API" },
  { value: "chat_completions", label: "聊天补全 API" },
] as const;

export const THEME_OPTIONS = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
] as const;

export const MAX_HISTORY_ITEMS = 100;
