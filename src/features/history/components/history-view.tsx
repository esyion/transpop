"use client";

import { ChevronDown, ChevronUp, History, RotateCcw, Search, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Skeleton } from "@/components/ui/skeleton";
import { getLanguageLabel } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import type { HistoryItem } from "@/features/history/types";

/**
 * 翻译历史页：搜索过滤、展开查看、单条删除与一键清空。
 * 覆盖 loading / 错误重试 / 双空态（无记录、无匹配）视图状态。
 */
export function HistoryView() {
  const router = useRouter();
  const history = useAppStore((state) => state.history);
  const historyLoading = useAppStore((state) => state.historyLoading);
  const historyError = useAppStore((state) => state.historyError);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => filterHistory(history, query), [history, query]);

  return (
    <section aria-label="翻译历史" className="flex flex-col gap-3">
      <div className="flex flex-col gap-2.5">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">翻译历史</h2>
            <span className="text-xs text-muted-foreground">
              共 {history.length} 条
              {query.trim() ? ` · 匹配 ${filtered.length} 条` : ""}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" onClick={() => router.push("/")}>
              <Undo2 data-icon="inline-start" /> 返回
            </Button>
            <ClearAllButton itemCount={history.length} disabled={history.length === 0} />
          </div>
        </div>

        <InputGroup>
          <InputGroupAddon>
            <Search />
          </InputGroupAddon>
          <InputGroupInput
            value={query}
            onChange={(event) => setQuery(event.currentTarget.value)}
            placeholder="搜索原文或译文…"
            aria-label="搜索历史记录"
            name="history-query"
            autoComplete="off"
          />
        </InputGroup>
      </div>

      {historyLoading ? (
        <HistoryLoadingSkeleton />
      ) : historyError ? (
        <HistoryLoadError />
      ) : history.length === 0 ? (
        <HistoryEmptyState title="暂无历史记录" description="翻译过的内容会自动保存在这里" />
      ) : filtered.length === 0 ? (
        <HistoryEmptyState title="未找到匹配的历史记录" description="换个关键词试试" />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => (
            <HistoryItemCard
              key={item.id}
              item={item}
              expanded={expandedId === item.id}
              onToggle={() =>
                setExpandedId((current) => (current === item.id ? null : item.id))
              }
            />
          ))}
        </div>
      )}
    </section>
  );
}

/** 按关键词过滤历史（匹配原文或译文，大小写不敏感）。 */
function filterHistory(history: HistoryItem[], query: string): HistoryItem[] {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return history;
  return history.filter(
    (item) =>
      item.input.toLowerCase().includes(keyword) ||
      item.output.toLowerCase().includes(keyword),
  );
}

/** 历史加载中的骨架屏。 */
function HistoryLoadingSkeleton() {
  return (
    <div aria-busy="true" aria-label="历史记录加载中" className="flex flex-col gap-2">
      {[0, 1, 2].map((row) => (
        <Card key={row}>
          <CardContent className="flex flex-col gap-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

/** 历史加载失败卡片，提供重试入口。 */
function HistoryLoadError() {
  return (
    <Card role="alert">
      <CardContent className="flex items-center justify-between gap-3 p-4">
        <p className="text-sm text-muted-foreground">历史记录加载失败，请重试</p>
        <Button variant="outline" size="sm" onClick={() => void useAppStore.getState().loadHistory()}>
          <RotateCcw data-icon="inline-start" /> 重试
        </Button>
      </CardContent>
    </Card>
  );
}

/** 空态占位（无记录 / 无匹配共用）。 */
function HistoryEmptyState({ title, description }: { title: string; description: string }) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <History />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}

type HistoryItemCardProps = {
  item: HistoryItem;
  expanded: boolean;
  onToggle: () => void;
};

/** 单条历史卡片：点击展开全文，附「使用」与「删除」操作。 */
function HistoryItemCard({ item, expanded, onToggle }: HistoryItemCardProps) {
  const router = useRouter();

  return (
    <article className="flex flex-col gap-2 rounded-lg border bg-background p-3">
      <button
        type="button"
        className="flex items-start justify-between gap-2 text-left outline-none"
        onClick={onToggle}
        aria-expanded={expanded}
      >
        <span className="flex min-w-0 flex-col gap-1">
          <span className={`text-sm leading-relaxed ${expanded ? "" : "line-clamp-2"}`}>
            {item.input}
          </span>
          <span
            className={`text-sm leading-relaxed text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}
          >
            {item.output}
          </span>
          <span className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>
              {getLanguageLabel(item.sourceLanguage)} → {getLanguageLabel(item.targetLanguage)}
            </span>
            <span>{formatHistoryTime(item.createdAt)}</span>
          </span>
        </span>
        {expanded ? (
          <ChevronUp className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        ) : (
          <ChevronDown className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        )}
      </button>

      <div className="flex items-center gap-1.5">
        <Button
          size="xs"
          onClick={() => {
            useAppStore.getState().useHistoryItem(item);
            router.push("/");
          }}
        >
          使用
        </Button>
        <Button
          size="xs"
          variant="ghost"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          onClick={() => void useAppStore.getState().removeHistoryItem(item)}
          aria-label="删除此条历史"
        >
          <Trash2 data-icon="inline-start" /> 删除
        </Button>
      </div>
    </article>
  );
}

/** 「清空全部」按钮：二次确认后执行清空。 */
function ClearAllButton({ itemCount, disabled }: { itemCount: number; disabled: boolean }) {
  const [confirmOpen, setConfirmOpen] = useState(false);

  return (
    <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="outline" size="sm" disabled={disabled}>
          <Trash2 data-icon="inline-start" /> 清空全部
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>清空全部历史记录？</AlertDialogTitle>
          <AlertDialogDescription>
            此操作将删除全部 {itemCount} 条历史记录，且无法撤销。
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>取消</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              setConfirmOpen(false);
              void useAppStore.getState().clearHistory();
            }}
          >
            确认清空
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** 把 Unix 毫秒时间戳格式化为「MM/DD HH:mm」。 */
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
