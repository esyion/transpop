"use client";

import type { KeyboardEvent, RefObject } from "react";

import { Textarea } from "@/components/ui/textarea";
import type { HistoryItem } from "@/types/translation";

import { RecentHistory } from "./RecentHistory";
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
    <div className="translation-layout">
      <h2 className="sr-only">翻译</h2>
      <div className="translation-stage">
        <section className="input-panel" aria-labelledby="source-panel-title">
          <div className="panel-label-row">
            <span className="section-kicker" id="source-panel-title">
              原文
            </span>
            <span
              className="character-count"
              aria-label={`${input.length} 个字符`}
            >
              {input.length}
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
            placeholder="粘贴或输入文本…"
            rows={5}
            spellCheck={false}
            name="source-text"
            autoComplete="off"
            className="input-textarea focus-visible:ring-0"
          />
        </section>

        <div className="translation-divider" aria-hidden="true">
          <span />
        </div>

        <TranslationResult
          loading={loading}
          error={error}
          resultText={resultText}
          canRetry={input.trim().length > 0 && !apiKeyMissing}
          copied={copied}
          apiKeyMissing={apiKeyMissing && input.trim().length > 0}
          onCopy={onCopy}
          onRetry={onRetry}
          onOpenSettings={onOpenSettings}
        />
      </div>

      <RecentHistory
        items={history}
        onUse={onUseHistory}
        onDelete={onDeleteHistory}
        activeId={activeHistoryId}
        onViewAll={onViewAllHistory}
        totalCount={historyTotalCount}
      />
    </div>
  );
}
