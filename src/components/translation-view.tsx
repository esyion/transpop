"use client";

import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Copy,
  Languages,
  RotateCcw,
  Settings,
} from "lucide-react";

import { RecentHistory } from "@/components/recent-history";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { Textarea } from "@/components/ui/textarea";
import { useAppStore } from "@/store/app-store";

const AUTO_TRANSLATE_DELAY_MS = 1000;

export function TranslationView() {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const input = useAppStore((state) => state.input);
  const result = useAppStore((state) => state.result);
  const loading = useAppStore((state) => state.loading);
  const error = useAppStore((state) => state.error);
  const copied = useAppStore((state) => state.copied);
  const history = useAppStore((state) => state.history);
  const historyIndex = useAppStore((state) => state.historyIndex);
  const settings = useAppStore((state) => state.settings);

  const apiKeyMissing =
    !settings.apiKeyConfigured && settings.apiKey.trim().length === 0;
  const canRetry = input.trim().length > 0 && !apiKeyMissing;
  const resultText = result?.result ?? "";

  // 进入翻译页时聚焦输入框
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 输入停止变化 1 秒后自动翻译
  useEffect(() => {
    const text = input.trim();
    if (!text || apiKeyMissing) return;

    const timerId = window.setTimeout(
      () => void useAppStore.getState().runTranslate(text),
      AUTO_TRANSLATE_DELAY_MS,
    );
    return () => window.clearTimeout(timerId);
  }, [apiKeyMissing, input]);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void useAppStore.getState().runTranslate(undefined, true);
      return;
    }

    // 输入框光标在开头按 ↑ 回到上一条历史，↓ 回到下一条
    if (event.key === "ArrowUp" && inputRef.current?.selectionStart === 0) {
      event.preventDefault();
      useAppStore.getState().moveHistory(1);
      return;
    }

    if (event.key === "ArrowDown" && historyIndex >= 0) {
      event.preventDefault();
      useAppStore.getState().moveHistory(-1);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <h2 className="sr-only">翻译</h2>
      <div className="grid items-stretch gap-3 sm:grid-cols-2">
        <section aria-label="原文" className="flex min-w-0 flex-col gap-1.5">
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-medium text-muted-foreground">
              原文
            </span>
            <span
              className="text-xs text-muted-foreground"
              aria-label={`${input.length} 个字符`}
            >
              {input.length}
            </span>
          </div>
          <Textarea
            id="translate-input"
            ref={inputRef}
            value={input}
            onChange={(event) =>
              useAppStore.getState().setInput(event.currentTarget.value)
            }
            onKeyDown={handleInputKeyDown}
            placeholder="粘贴或输入文本…"
            rows={5}
            spellCheck={false}
            name="source-text"
            autoComplete="off"
            className="flex-1 resize-none"
          />
        </section>

        <TranslationResultCard
          loading={loading}
          error={error}
          resultText={resultText}
          canRetry={canRetry}
          copied={copied}
          apiKeyMissing={apiKeyMissing && input.trim().length > 0}
        />
      </div>

      <RecentHistory items={history.slice(0, 3)} />
    </div>
  );
}

interface TranslationResultCardProps {
  loading: boolean;
  error: string | null;
  resultText: string;
  canRetry: boolean;
  copied: boolean;
  apiKeyMissing: boolean;
}

function TranslationResultCard({
  loading,
  error,
  resultText,
  canRetry,
  copied,
  apiKeyMissing,
}: TranslationResultCardProps) {
  

  let body: React.ReactNode;

  if (loading) {
    body = (
      <Card aria-live="polite" className="flex flex-1 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Spinner /> 正在翻译…
          </CardTitle>
          <CardDescription>正在生成翻译结果，请稍候</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2.5">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  } else if (apiKeyMissing) {
    body = (
      <Card className="flex flex-1 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">请先添加 API 密钥</CardTitle>
          <CardDescription>
            API 密钥会先加密，再存储到本地 SQLite 数据库中
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OpenSettingsButton />
        </CardContent>
      </Card>
    );
  } else if (error) {
    body = (
      <Card role="alert" className="flex flex-1 flex-col">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive text-sm">翻译失败</CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => useAppStore.getState().retry()}
            disabled={!canRetry}
          >
            <RotateCcw data-icon="inline-start" /> 重新翻译
          </Button>
          <OpenSettingsButton />
        </CardContent>
      </Card>
    );
  } else if (!resultText) {
    body = (
      <Card className="flex flex-1 flex-col justify-center">
        <CardContent className="p-4">
          <Empty className="py-4">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Languages />
              </EmptyMedia>
              <EmptyTitle className="text-base">
                输入或粘贴需要翻译的文本
              </EmptyTitle>
              <EmptyDescription className="text-xs">
                输入后自动显示翻译结果
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        </CardContent>
      </Card>
    );
  } else {
    body = (
      <Card aria-live="polite" className="flex flex-1 flex-col">
        <CardHeader className="flex-row items-center justify-between gap-3 pb-2">
          <CardTitle className="text-sm">译文</CardTitle>
          <Button
            variant="ghost"
            size="xs"
            onClick={() => useAppStore.getState().retry()}
            disabled={!canRetry}
          >
            <RotateCcw data-icon="inline-start" /> 重新翻译
          </Button>
        </CardHeader>
        <CardContent className="flex flex-1 flex-col justify-between gap-3">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">
            {resultText}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => void useAppStore.getState().copyResult()}>
              {copied ? (
                <Check data-icon="inline-start" />
              ) : (
                <Copy data-icon="inline-start" />
              )}
              {copied ? "已复制" : "复制"}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <section aria-label="译文" className="flex min-w-0 flex-col gap-1.5">
      {body}
    </section>
  );
}

function OpenSettingsButton() {
  const router = useRouter();

  return (
    <Button size="sm" onClick={() => router.push("/settings")}>
      <Settings data-icon="inline-start" /> 打开设置
    </Button>
  );
}
