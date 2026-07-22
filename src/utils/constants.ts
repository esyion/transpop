import type { Language, ThemeMode, TranslationSettings } from "../types/translation";

export const DEFAULT_SETTINGS: TranslationSettings = {
  apiBaseUrl: "https://api.openai.com/v1",
  apiMode: "responses",
  model: "gpt-5.4",
  apiKey: "",
  apiKeyConfigured: false,
  targetLanguage: "Chinese",
  smartTargetLanguage: true,
  shortcut: "Alt + Space",
  shortcutEnabled: true,
  theme: "light",
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

export const LANGUAGE_LABELS: Record<Language, string> = {
  Chinese: "中文",
  English: "英语",
  Japanese: "日语",
  Korean: "韩语",
  French: "法语",
  German: "德语",
  Spanish: "西班牙语",
};

export function getLanguageLabel(language: string): string {
  return LANGUAGE_LABELS[language as Language] ?? language;
}

export const API_MODE_OPTIONS = [
  { value: "responses", label: "Responses API" },
  { value: "chat_completions", label: "聊天补全 API" },
] as const;

export const THEME_OPTIONS = ["system", "light", "dark"] as const;

export const THEME_LABELS: Record<ThemeMode, string> = {
  system: "跟随系统",
  light: "浅色",
  dark: "深色",
};
