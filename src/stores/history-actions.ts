import { toast } from "sonner";

import {
  clearAllHistory,
  deleteHistoryItem,
  loadRecentHistory,
} from "@/features/history/api";
import type { HistoryItem } from "@/features/history/types";
import { MAX_HISTORY_ITEMS } from "@/lib/constants";

/** 历史 actions 所需的最小 store 读写接口。 */
type HistoryStoreSlice = {
  history: HistoryItem[];
  historyIndex: number;
  historyLoading: boolean;
  historyError: string | null;
  set: (partial: Partial<HistoryStoreSlice>) => void;
  get: () => { history: HistoryItem[] };
};

/** 历史相关 actions 的签名集合。 */
export type HistoryActions = {
  /** 从后端重新加载历史列表（驱动 loading 与 error 状态）。 */
  loadHistory: () => Promise<void>;
  /** 删除单条历史并刷新列表。 */
  removeHistoryItem: (item: HistoryItem) => Promise<void>;
  /** 清空全部历史并退出回看模式。 */
  clearHistory: () => Promise<void>;
  /** 整体替换历史列表（上限截断）。 */
  setHistory: (history: HistoryItem[]) => void;
};

/**
 * 历史 actions 工厂（zustand slice）：删除/清空失败时提示但不改动视图，
 * 加载失败置 `historyError` 供视图渲染重试入口。
 *
 * @param onHistoryCleared 清空成功后的附加回调（供调用方重置自身请求守卫）。
 */
export function createHistoryActions(
  set: HistoryStoreSlice["set"],
  get: HistoryStoreSlice["get"],
  onHistoryCleared?: () => void,
): HistoryActions {
  return {
    loadHistory: async () => {
      set({ historyLoading: true, historyError: null });
      try {
        const history = await loadRecentHistory();
        set({ history, historyLoading: false });
      } catch (cause) {
        console.error("failed to load history", cause);
        set({ historyLoading: false, historyError: "历史记录加载失败" });
      }
    },

    removeHistoryItem: async (item) => {
      try {
        await deleteHistoryItem(item.id);
      } catch (cause) {
        console.error("failed to delete history item", cause);
        toast.error("删除历史记录失败");
        return;
      }

      try {
        set({ history: await loadRecentHistory() });
      } catch {
        set({ history: get().history.filter((entry) => entry.id !== item.id) });
      }
      set({ historyIndex: -1 });
      toast.success("已删除历史记录");
    },

    clearHistory: async () => {
      try {
        await clearAllHistory();
      } catch (cause) {
        console.error("failed to clear history", cause);
        toast.error("清空历史记录失败");
        return;
      }

      set({ history: [], historyIndex: -1 });
      onHistoryCleared?.();
      toast.success("已清空全部历史记录");
    },

    setHistory: (history) => set({ history: history.slice(0, MAX_HISTORY_ITEMS) }),
  };
}
