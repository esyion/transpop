"use client";

import { Check, Copy, Languages, RotateCcw, Settings } from "lucide-react";
import { useRouter } from "next/navigation";
import type { KeyboardEvent } from "react";
import { useEffect, useRef } from "react";

import { RecentHistory } from "@/features/history";
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
import { useAppStore } from "@/stores/app-store";

/** 输入框自动翻译的延时（毫秒）。 */
const AUTO_TRANSLATE_DELAY_MS = 1000;

/** 翻译输入框的 DOM id（后端唤起窗口后前端聚焦目标，勿随意改名）。 */
export const TRANSLATE_INPUT_ID = "translate-input";

/**
 * 翻译主页：原文输入、译文结果卡片与最近翻译。
 * 覆盖 loading / 密钥缺失引导 / 错误重试 / 空态 / 成功五类视图状态。
 */
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

  // 进入翻译页时聚焦输入框。
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // 输入停止变化 1 秒后自动翻译。
  useEffect(() => {
    const text = input.trim();
    if (!text || apiKeyMissing) return;

    const timerId = window.setTimeout(() => {
      void useAppStore.getState().runTranslate(text);
    }, AUTO_TRANSLATE_DELAY_MS);
    return () => window.clearTimeout(timerId);
  }, [apiKeyMissing, input]);

  const handleInputKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void useAppStore.getState().runTranslate(undefined, true);
      return;
    }

    // 光标在行首按 ↑ 回看上一条历史，↓ 回看下一条。
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
            <span className="text-xs font-medium text-muted-foreground">原文</span>
            <span
              className="text-xs text-muted-foreground"
              aria-label={`${input.length} 个字符`}
            >
              {input.length}
            </span>
          </div>
          <Textarea
            id={TRANSLATE_INPUT_ID}
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

type TranslationResultCardProps = {
  loading: boolean;
  error: string | null;
  resultText: string;
  canRetry: boolean;
  copied: boolean;
  apiKeyMissing: boolean;
};

/** 译文卡片：按加载、错误、空态、成功四种状态切换内容。 */
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
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{resultText}</p>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void useAppStore.getState().copyResult()}
            >
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

/** 「打开设置」引导按钮。 */
function OpenSettingsButton() {
  const router = useRouter();

  return (
    <Button size="sm" onClick={() => router.push("/settings")}>
      <Settings data-icon="inline-start" /> 打开设置
    </Button>
  );
}
