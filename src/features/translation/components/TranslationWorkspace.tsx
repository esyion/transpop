import type { KeyboardEvent, RefObject } from "react";
import { Separator } from "../../../components/ui/separator";
import { Textarea } from "../../../components/ui/textarea";
import type { HistoryItem } from "../../../types/translation";
import { RecentHistory } from "./RecentHistory";
import { ShortcutStrip } from "./ShortcutStrip";
import { TranslationResult } from "./TranslationResult";

interface TranslationWorkspaceProps {
  inputRef: RefObject<HTMLTextAreaElement | null>;
  input: string;
  resultText: string;
  loading: boolean;
  error: string | null;
  history: HistoryItem[];
  activeHistoryId?: string;
  copied: boolean;
  autoCopy: boolean;
  apiKeyMissing: boolean;
  onInputChange: (value: string) => void;
  onInputKeyDown: (event: KeyboardEvent<HTMLTextAreaElement>) => void;
  onCopy: () => void;
  onRetry: () => void;
  onOpenSettings: () => void;
  onUseHistory: (item: HistoryItem) => void;
  onDeleteHistory: (item: HistoryItem) => void;
  onViewAllHistory?: () => void;
  historyTotalCount?: number;
}

export function TranslationWorkspace({
  inputRef,
  input,
  resultText,
  loading,
  error,
  history,
  activeHistoryId,
  copied,
  autoCopy,
  apiKeyMissing,
  onInputChange,
  onInputKeyDown,
  onCopy,
  onRetry,
  onOpenSettings,
  onUseHistory,
  onDeleteHistory,
  onViewAllHistory,
  historyTotalCount,
}: TranslationWorkspaceProps) {
  return (
    <div className="translation-layout grid gap-4">
      <div className="input-panel">
        <div className="panel-label-row">
          <span className="section-kicker">
            <span className="mini-seal" aria-hidden="true" /> 原文
          </span>
        </div>
        <label className="sr-only" htmlFor="translate-input">
          待翻译文本
        </label>
        <Textarea
          id="translate-input"
          ref={inputRef}
          value={input}
          onChange={(event) => onInputChange(event.currentTarget.value)}
          onKeyDown={onInputKeyDown}
          placeholder="在此粘贴或输入文本..."
          rows={2}
          spellCheck="false"
          className="input-textarea focus-visible:ring-0"
        />
      </div>

      <Separator className="ink-divider" />

      <TranslationResult
        loading={loading}
        error={error}
        resultText={resultText}
        canRetry={input.trim().length > 0 && !apiKeyMissing}
        copied={copied}
        autoCopy={autoCopy}
        apiKeyMissing={apiKeyMissing && input.trim().length > 0}
        onCopy={onCopy}
        onRetry={onRetry}
        onOpenSettings={onOpenSettings}
      />

      <RecentHistory
        items={history}
        onUse={onUseHistory}
        onDelete={onDeleteHistory}
        activeId={activeHistoryId}
        onViewAll={onViewAllHistory}
        totalCount={historyTotalCount}
      />

      {/* <ShortcutStrip /> */}
    </div>
  );
}

