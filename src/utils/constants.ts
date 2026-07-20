import type { TranslationSettings } from "../types/translation";

export const DEFAULT_SETTINGS: TranslationSettings = {
  provider: "OpenAI",
  apiKey: "",
  targetLanguage: "Chinese",
  shortcut: "Alt + Space",
  shortcutEnabled: true,
  theme: "system",
  fontScale: 1,
  startup: false,
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

export const PROVIDER_OPTIONS = ["OpenAI", "DeepL", "Google"] as const;
export const THEME_OPTIONS = ["system", "light", "dark"] as const;
