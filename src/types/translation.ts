export type ApiMode = "responses" | "chat_completions";
export type ThemeMode = "system" | "light" | "dark";
/** 视图对应的路由路径 */
export type ViewRoute = "/" | "/settings" | "/history";

export interface TranslationResult {
  sourceLanguage: string;
  targetLanguage: string;
  result: string;
}

export interface TranslationSettings {
  apiBaseUrl: string;
  apiMode: ApiMode;
  model: string;
  apiKey: string;
  apiKeyConfigured: boolean;
  targetLanguage: string;
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
