/** 翻译结果的 IPC 契约（与后端 `dto/translation.rs` TranslationResultDto 对应）。 */
export type TranslationResult = {
  /** 识别出的源语言。 */
  sourceLanguage: string;
  /** 目标语言。 */
  targetLanguage: string;
  /** 译文。 */
  result: string;
};
