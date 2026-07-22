import type { HistoryItem } from "../../../types/translation";

interface RecentHistoryProps {
  items: HistoryItem[];
  activeId?: string;
  onUse: (item: HistoryItem) => void;
}

export function RecentHistory({ items, activeId, onUse }: RecentHistoryProps) {
  if (items.length === 0) return null;

  return (
    <div className="history-section">
      <div className="history-heading">最近翻译</div>
      <div className="grid gap-2">
        {items.slice(0, 3).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onUse(item)}
            className={`history-card border px-3 py-2 text-left text-xs ${
              activeId === item.id
                ? "is-active border-primary/50 bg-primary/10"
                : "border-border bg-background/70"
            }`}
          >
            <div className="truncate font-medium text-foreground">{item.input}</div>
            <div className="truncate text-muted-foreground">{item.output}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
