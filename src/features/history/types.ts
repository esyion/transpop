/** 翻译历史条目（与后端 `dto/history.rs` HistoryItemDto 对应）。 */
export type HistoryItem = {
  /** 条目 ID（后端生成的 UUID）。 */
  id: string;
  /** 原文。 */
  input: string;
  /** 译文。 */
  output: string;
  /** 源语言。 */
  sourceLanguage: string;
  /** 目标语言。 */
  targetLanguage: string;
  /** 创建时间（Unix 毫秒时间戳）。 */
  createdAt: number;
};
