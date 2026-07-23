import { Trash2 } from "lucide-react";
import type { HistoryItem } from "../../../types/translation";

interface RecentHistoryProps {
  items: HistoryItem[];
  activeId?: string;
  onUse: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
  onViewAll?: () => void;
  totalCount?: number;
}

export function RecentHistory({
  items,
  activeId,
  onUse,
  onDelete,
  onViewAll,
  totalCount,
}: RecentHistoryProps) {
  if (items.length === 0) return null;

  const showViewAll =
    typeof onViewAll === "function" &&
    typeof totalCount === "number" &&
    totalCount > items.length;

  return (
    <div className="history-section">
      <div className="history-heading-row">
        <div className="history-heading">最近翻译</div>
        {onViewAll ? (
          <button
            type="button"
            className="history-view-all"
            onClick={onViewAll}
          >
            {showViewAll ? `查看全部 ${totalCount} 条` : "查看全部"}
          </button>
        ) : null}
      </div>
      <div className="grid gap-2">
        {items.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className={`history-card group flex items-center gap-2 border px-3 py-2 text-left ${
              activeId === item.id
                ? "is-active border-primary/50 bg-primary/10"
                : "border-border bg-background/70"
            }`}
          >
            <button
              type="button"
              onClick={() => onUse(item)}
              className="history-card-body min-w-0 flex-1 text-left"
              title="使用此历史记录"
            >
              <div className="history-input truncate">{item.input}</div>
              <div className="history-output truncate">{item.output}</div>
            </button>
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDelete(item);
              }}
              className="history-delete-btn inline-flex size-7 shrink-0 items-center justify-center rounded-md text-muted-foreground opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 group-hover:opacity-100"
              aria-label="删除历史记录"
              title="删除"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
