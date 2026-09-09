import { hasTauriRuntime } from "@/lib/runtime";
import { MAX_HISTORY_ITEMS } from "@/lib/constants";

import { invokeIpc } from "@/services/ipc";
import type { HistoryItem } from "@/features/history/types";

/** 浏览器开发模式下 localStorage 的历史键名。 */
const HISTORY_STORAGE_KEY = "history";

/**
 * 加载最近翻译历史；浏览器开发模式从 localStorage 读取。
 */
export async function loadRecentHistory(limit = MAX_HISTORY_ITEMS): Promise<HistoryItem[]> {
  if (!hasTauriRuntime()) {
    const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as HistoryItem[]).slice(0, limit) : [];
  }

  return invokeIpc<HistoryItem[]>("list_recent_history", { limit });
}

/**
 * 删除单条历史记录；空白 ID 直接忽略。
 */
export async function deleteHistoryItem(id: string): Promise<void> {
  const historyId = id.trim();
  if (!historyId) return;

  if (!hasTauriRuntime()) {
    persistBrowserHistory((items) => items.filter((item) => item.id !== historyId));
    return;
  }

  await invokeIpc("delete_history_item", { id: historyId });
}

/**
 * 清空全部历史记录。
 */
export async function clearAllHistory(): Promise<void> {
  if (!hasTauriRuntime()) {
    persistBrowserHistory(() => []);
    return;
  }

  await invokeIpc("clear_all_history");
}

/** 仅浏览器开发模式使用：把内存中的历史列表持久化到 localStorage。 */
export function saveBrowserHistory(items: HistoryItem[]): void {
  if (!hasTauriRuntime()) {
    window.localStorage.setItem(
      HISTORY_STORAGE_KEY,
      JSON.stringify(items.slice(0, MAX_HISTORY_ITEMS)),
    );
  }
}

/** 对浏览器模式的历史列表做映射后回写 localStorage。 */
function persistBrowserHistory(map: (items: HistoryItem[]) => HistoryItem[]): void {
  const raw = window.localStorage.getItem(HISTORY_STORAGE_KEY);
  const items: HistoryItem[] = raw ? JSON.parse(raw) : [];
  window.localStorage.setItem(
    HISTORY_STORAGE_KEY,
    JSON.stringify(map(items).slice(0, MAX_HISTORY_ITEMS)),
  );
}
