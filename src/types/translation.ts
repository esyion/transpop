export type ApiMode = "responses" | "chat_completions";
export type ThemeMode = "system" | "light" | "dark";
export type Language = "Chinese" | "English" | "Japanese" | "Korean" | "French" | "German" | "Spanish";
export type ViewMode = "translate" | "settings" | "history";

export interface TranslationResult {
  sourceLanguage: Language | string;
  targetLanguage: Language | string;
  result: string;
}

export interface TranslationSettings {
  apiBaseUrl: string;
  apiMode: ApiMode;
  model: string;
  apiKey: string;
  apiKeyConfigured: boolean;
  targetLanguage: Language;
  smartTargetLanguage: boolean;
  shortcut: string;
  shortcutEnabled: boolean;
  theme: ThemeMode;
  fontScale: number;
  startup: boolean;
  autoCopy: boolean;
}

export interface HistoryItem {
  id: string;
  input: string;
  output: string;
  sourceLanguage: string;
  targetLanguage: string;
  createdAt: number;
}
