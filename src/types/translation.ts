export type TranslationProvider = "OpenAI" | "DeepL" | "Google";
export type ThemeMode = "system" | "light" | "dark";
export type Language = "Auto" | "Chinese" | "English" | "Japanese" | "Korean" | "French" | "German" | "Spanish";
export type ViewMode = "translate" | "settings";

export interface TranslationResult {
  sourceLanguage: Language | string;
  targetLanguage: Language | string;
  result: string;
}

export interface TranslationSettings {
  provider: TranslationProvider;
  apiKey: string;
  targetLanguage: Language;
  shortcut: string;
  shortcutEnabled: boolean;
  theme: ThemeMode;
  fontScale: number;
  startup: boolean;
}

export interface HistoryItem {
  id: string;
  input: string;
  output: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: number;
}
