import type { TranslationSettings } from "../types/translation";

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

export const API_MODE_OPTIONS = [
  { value: "responses", label: "Responses" },
  { value: "chat_completions", label: "Chat Completions" },
] as const;

export const THEME_OPTIONS = ["system", "light", "dark"] as const;
