import {
  ChevronDown,
  ChevronUp,
  History,
  Search,
  Trash2,
  Undo2,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "../../../components/ui/button";
import { Input } from "../../../components/ui/input";
import type { HistoryItem } from "../../../types/translation";
import { getLanguageLabel } from "../../../utils/constants";

interface HistoryPanelProps {
  items: HistoryItem[];
  onUse: (item: HistoryItem) => void;
  onDelete: (item: HistoryItem) => void;
  onClearAll: () => void;
  onBack: () => void;
}

function formatHistoryTime(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function HistoryPanel({
  items,
  onUse,
  onDelete,
  onClearAll,
  onBack,
}: HistoryPanelProps) {
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return items;
    return items.filter(
      (item) =>
        item.input.toLowerCase().includes(keyword) ||
        item.output.toLowerCase().includes(keyword),
    );
  }, [items, query]);

  const handleClearAll = () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setConfirmClear(false);
    onClearAll();
  };

  return (
    <section className="history-page" aria-label="翻译历史">
      <div className="history-page-header">
        <div className="history-page-title-row">
          <div className="history-page-title">
            <History size={17} />
            <div>
              <h2>翻译历史</h2>
              <p>
                共 {items.length} 条
                {query.trim() ? ` · 匹配 ${filtered.length} 条` : ""}
                （最多保留 100 条）
              </p>
            </div>
          </div>
          <div className="history-page-actions">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onBack}
              aria-label="返回翻译"
            >
              <Undo2 size={14} />
              返回
            </Button>
            <Button
              type="button"
              variant={confirmClear ? "destructive" : "outline"}
              size="sm"
              disabled={items.length === 0}
              onClick={handleClearAll}
              onBlur={() => setConfirmClear(false)}
            >
              <Trash2 size={14} />
              {confirmClear ? "确认清空" : "清空全部"}
            </Button>
          </div>
        </div>

        <div className="history-search">
          <Search size={15} className="history-search-icon" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="搜索原文或译文..."
            className="history-search-input"
            aria-label="搜索历史记录"
          />
        </div>
      </div>

      {items.length === 0 ? (
        <div className="history-empty">暂无历史记录</div>
      ) : filtered.length === 0 ? (
        <div className="history-empty">未找到匹配的历史记录</div>
      ) : (
        <div className="history-full-list">
          {filtered.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <article
                key={item.id}
                className={`history-full-card ${expanded ? "is-expanded" : ""}`}
              >
                <button
                  type="button"
                  className="history-full-main"
                  onClick={() =>
                    setExpandedId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  aria-expanded={expanded}
                >
                  <div className="history-full-text">
                    <div
                      className={
                        expanded
                          ? "history-full-input"
                          : "history-full-input line-clamp-2"
                      }
                    >
                      {item.input}
                    </div>
                    <div
                      className={
                        expanded
                          ? "history-full-output"
                          : "history-full-output line-clamp-2"
                      }
                    >
                      {item.output}
                    </div>
                    <div className="history-full-meta">
                      <span>
                        {getLanguageLabel(item.sourceLanguage)} →{" "}
                        {getLanguageLabel(item.targetLanguage)}
                      </span>
                      <span>{formatHistoryTime(item.createdAt)}</span>
                    </div>
                  </div>
                  <span className="history-expand-icon" aria-hidden="true">
                    {expanded ? (
                      <ChevronUp size={16} />
                    ) : (
                      <ChevronDown size={16} />
                    )}
                  </span>
                </button>

                <div className="history-full-toolbar">
                  <Button
                    type="button"
                    size="sm"
                    variant="accent"
                    onClick={() => onUse(item)}
                  >
                    使用
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="ghost"
                    className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => onDelete(item)}
                    aria-label="删除此条历史"
                  >
                    <Trash2 size={14} />
                    删除
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
