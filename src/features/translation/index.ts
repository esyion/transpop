/**
 * 翻译 feature 的对外入口。
 * 组件只允许从这里导入，保证 feature 边界清晰。
 */
export { TranslationView, TRANSLATE_INPUT_ID } from "./components/translation-view";
export { inferTargetLanguage, getLanguageHint } from "./language";
export { translateText } from "./api";
export type { TranslationResult } from "./types";
