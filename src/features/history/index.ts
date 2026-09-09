/**
 * 翻译历史 feature 的对外入口。
 */
export { HistoryView } from "./components/history-view";
export { RecentHistory } from "./components/recent-history";
export {
  loadRecentHistory,
  deleteHistoryItem,
  clearAllHistory,
} from "./api";
export type { HistoryItem } from "./types";
