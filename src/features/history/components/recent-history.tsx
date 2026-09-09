"use client";

import { Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import type { HistoryItem } from "@/features/history/types";
import { useAppStore } from "@/stores/app-store";

/** 翻译页展示的最近历史条数。 */
const RECENT_COUNT = 3;

type RecentHistoryProps = {
  /** 最近历史条目（最多展示 {@link RECENT_COUNT} 条）。 */
  items: HistoryItem[];
};

/**
 * 翻译页底部的「最近翻译」列表：点击回填原文，悬停出现删除按钮。
 * 无记录时整体隐藏。
 */
export function RecentHistory({ items }: RecentHistoryProps) {
  const history = useAppStore((state) => state.history);
  const historyIndex = useAppStore((state) => state.historyIndex);
  const activeId = historyIndex >= 0 ? history[historyIndex]?.id : undefined;

  if (items.length === 0) return null;

  return (
    <section aria-label="最近翻译" className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between px-1">
        <span className="text-xs font-medium text-muted-foreground">最近翻译</span>
        <ViewAllButton total={history.length} />
      </div>
      <div className="flex flex-col gap-1.5">
        {items.map((item) => (
          <div
            key={item.id}
            className={`group flex items-center gap-1 rounded-lg border px-3 py-2 ${
              activeId === item.id ? "bg-accent" : "bg-background"
            }`}
          >
            <button
              type="button"
              onClick={() => useAppStore.getState().useHistoryItem(item)}
              className="min-w-0 flex-1 text-left outline-none"
              title="使用此历史记录"
            >
              <div className="truncate text-sm">{item.input}</div>
              <div className="truncate text-xs text-muted-foreground">
                {item.output}
              </div>
            </button>
            <Button
              variant="ghost"
              size="icon-xs"
              className="opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
              onClick={() => void useAppStore.getState().removeHistoryItem(item)}
              aria-label="删除历史记录"
              title="删除"
            >
              <Trash2 />
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/** 「查看全部」按钮：跳转历史页。 */
function ViewAllButton({ total }: { total: number }) {
  const router = useRouter();

  return (
    <Button variant="ghost" size="xs" onClick={() => router.push("/history")}>
      {total > RECENT_COUNT ? `查看全部 ${total} 条` : "查看全部"}
    </Button>
  );
}
