"use client";

import { ChevronDown, ChevronUp, History, Search, Trash2, Undo2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@/components/ui/input-group";
import { getLanguageLabel } from "@/lib/constants";
import { useAppStore } from "@/store/app-store";

export function HistoryView() {
  const router = useRouter();
  const history = useAppStore((state) => state.history);
  const [query, setQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const keyword = query.trim().toLowerCase();
    if (!keyword) return history;
    return history.filter(
      (item) =>
        item.input.toLowerCase().includes(keyword) ||
        item.output.toLowerCase().includes(keyword),
    );
  }, [history, query]);

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
            <ClearAllButton
              itemCount={history.length}
              disabled={history.length === 0}
            />
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

      {history.length === 0 ? (
        <HistoryEmpty title="暂无历史记录" description="翻译过的内容会保存在这里" />
      ) : filtered.length === 0 ? (
        <HistoryEmpty title="未找到匹配的历史记录" description="换个关键词试试" />
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((item) => {
            const expanded = expandedId === item.id;
            return (
              <article
                key={item.id}
                className="flex flex-col gap-2 rounded-lg border bg-background p-3"
              >
                <button
                  type="button"
                  className="flex items-start justify-between gap-2 text-left outline-none"
                  onClick={() =>
                    setExpandedId((current) =>
                      current === item.id ? null : item.id,
                    )
                  }
                  aria-expanded={expanded}
                >
                  <span className="flex min-w-0 flex-col gap-1">
                    <span
                      className={`text-sm leading-relaxed ${expanded ? "" : "line-clamp-2"}`}
                    >
                      {item.input}
                    </span>
                    <span
                      className={`text-sm leading-relaxed text-muted-foreground ${expanded ? "" : "line-clamp-2"}`}
                    >
                      {item.output}
                    </span>
                    <span className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>
                        {getLanguageLabel(item.sourceLanguage)} →{" "}
                        {getLanguageLabel(item.targetLanguage)}
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
                    onClick={() =>
                      void useAppStore.getState().removeHistoryItem(item)
                    }
                    aria-label="删除此条历史"
                  >
                    <Trash2 data-icon="inline-start" /> 删除
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

function ClearAllButton({
  itemCount,
  disabled,
}: {
  itemCount: number;
  disabled: boolean;
}) {
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

function HistoryEmpty({ title, description }: { title: string; description: string }) {
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
