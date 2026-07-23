import { Check, Copy, Languages, RotateCcw, Settings } from "lucide-react";
import { Button } from "../../../components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../components/ui/card";

interface TranslationResultProps {
  loading: boolean;
  error: string | null;
  resultText: string;
  canRetry: boolean;
  copied: boolean;
  apiKeyMissing: boolean;
  onCopy: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
}

export function TranslationResult({
  loading,
  error,
  resultText,
  canRetry,
  copied,
  apiKeyMissing,
  onCopy,
  onRetry,
  onOpenSettings,
}: TranslationResultProps) {
  if (loading) {
    return (
      <Card className="result-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 font-medium text-foreground/80">
            <Languages size={15} /> 正在翻译...
          </CardTitle>
          <CardDescription>
            正在生成翻译结果，请稍候
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="skeleton-line h-4 w-3/4 rounded-full" />
          <div className="skeleton-line h-4 w-1/2 rounded-full" />
          <div className="flex gap-1.5 pt-2" aria-hidden="true">
            <span className="size-1.5 animate-pulse rounded-full bg-primary/80 [animation-delay:0ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary/80 [animation-delay:120ms]" />
            <span className="size-1.5 animate-pulse rounded-full bg-primary/80 [animation-delay:240ms]" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (apiKeyMissing) {
    return (
      <Card className="result-card border-primary/25">
        <CardHeader className="pb-2">
          <CardTitle>
            请先添加 API 密钥
          </CardTitle>
          <CardDescription>
            API 密钥会先加密，再存储到本地 SQLite 数据库中
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOpenSettings}>
            <Settings size={15} /> 打开设置
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="result-card border-destructive/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-destructive">
            翻译失败
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRetry} disabled={!canRetry}>
            <RotateCcw size={15} /> 重新翻译
          </Button>
          <Button variant="ghost" onClick={onOpenSettings}>
            <Settings size={15} /> 打开设置
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!resultText) {
    return (
      <Card className="result-card empty-result border-border/70">
        <CardContent className="grid gap-1.5 py-10">
          <strong className="text-base font-semibold leading-snug tracking-tight text-foreground">
            输入或粘贴需要翻译的文本
          </strong>
          <p className="text-xs font-normal leading-normal text-muted-foreground">
            自动显示翻译结果
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="result-card border-border/70">
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <CardTitle className="result-title text-foreground">翻译结果</CardTitle>
        </div>
        <Button variant="ghost" size="sm" onClick={onRetry} disabled={!canRetry}>
          <RotateCcw size={15} /> 重新翻译
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="result-text whitespace-pre-wrap">{resultText}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "已复制" : "复制"}
          </Button>
          <Button variant="ghost" onClick={onRetry} disabled={!canRetry}>
            <RotateCcw size={15} /> 重新翻译
          </Button>
          {/* <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-normal text-muted-foreground">
            <ArrowUpDown size={13} /> 上下键切换历史
          </span> */}
        </div>
      </CardContent>
    </Card>
  );
}
