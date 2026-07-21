import { ArrowUpDown, Check, Copy, Languages, RotateCcw, Settings } from "lucide-react";
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
  autoCopy: boolean;
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
  autoCopy,
  apiKeyMissing,
  onCopy,
  onRetry,
  onOpenSettings,
}: TranslationResultProps) {
  if (loading) {
    return (
      <Card className="result-card border-border/70">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm font-medium text-foreground/80">
            <Languages size={15} /> Thinking...
          </CardTitle>
          <CardDescription>
            Responding with lightweight skeleton feedback instead of a spinner.
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
          <CardTitle className="text-sm font-semibold text-foreground">
            Add API Key to start translating
          </CardTitle>
          <CardDescription>
            Your API key is encrypted before it is stored in the local SQLite
            database.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={onOpenSettings}>
            <Settings size={15} /> Open Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="result-card border-destructive/25">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold text-destructive">
            Unable to translate.
          </CardTitle>
          <CardDescription>{error}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onRetry} disabled={!canRetry}>
            <RotateCcw size={15} /> Retry
          </Button>
          <Button variant="ghost" onClick={onOpenSettings}>
            <Settings size={15} /> Open Settings
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (!resultText) {
    return (
      <Card className="result-card empty-result border-border/70">
        <CardContent className="grid gap-1 py-10 text-sm">
          <strong className="text-base font-semibold text-foreground">
            Start typing or paste text
          </strong>
          <p className="text-muted-foreground">
            Translation will appear automatically after 1 second.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="result-card border-border/70">
      <CardHeader className="flex-row items-start justify-between gap-4 pb-3">
        <div className="space-y-1">
          <CardTitle className="result-title text-foreground">Translation</CardTitle>
          <CardDescription>
            {autoCopy
              ? "Copied automatically. Retry if you need a refreshed result."
              : "Copy or retry without leaving the workflow."}
          </CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={onRetry} disabled={!canRetry}>
          <RotateCcw size={15} /> Retry
        </Button>
      </CardHeader>
      <CardContent className="grid gap-4">
        <p className="result-text whitespace-pre-wrap">{resultText}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" onClick={onCopy}>
            {copied ? <Check size={15} /> : <Copy size={15} />}
            {copied ? "Copied" : "Copy"}
          </Button>
          <Button variant="ghost" onClick={onRetry} disabled={!canRetry}>
            <RotateCcw size={15} /> Retry
          </Button>
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs text-muted-foreground">
            <ArrowUpDown size={13} /> History ↑ ↓
          </span>
        </div>
      </CardContent>
    </Card>
  );
}
