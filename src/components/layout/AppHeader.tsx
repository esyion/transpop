import {
  Command as CommandIcon,
  History,
  Settings,
  X,
} from "lucide-react";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import type { ViewMode } from "../../types/translation";
import { getLanguageLabel } from "../../utils/constants";

interface AppHeaderProps {
  languageHint: string;
  effectiveTargetLanguage: string;
  smartTargetLanguage: boolean;
  shortcut: string;
  shortcutEnabled: boolean;
  view: ViewMode;
  onNavigate: (view: ViewMode) => void;
  onOpenCommandPalette: () => void;
}

export function AppHeader({
  languageHint,
  effectiveTargetLanguage,
  smartTargetLanguage,
  shortcut,
  shortcutEnabled,
  view,
  onNavigate,
  onOpenCommandPalette,
}: AppHeaderProps) {
  return (
    <header className="app-header" data-tauri-drag-region>
      <button
        type="button"
        onClick={() => onNavigate("translate")}
        className="brand-lockup outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="返回翻译"
      >
        <img
          className="brand-mark"
          src="/logo.svg"
          width="36"
          height="36"
          alt=""
          aria-hidden="true"
        />
        <span className="brand-copy">
          <strong className="brand-title">TransPop</strong>
          <span className="brand-subtitle">{languageHint}</span>
        </span>
      </button>

      <div className="header-tools">
        <Badge variant="secondary" className="status-badge hidden sm:inline-flex">
          {smartTargetLanguage
            ? "自动"
            : getLanguageLabel(effectiveTargetLanguage)}
        </Badge>
        <Badge
          className="shortcut-badge"
          variant={shortcutEnabled ? "outline" : "secondary"}
        >
          {shortcutEnabled ? shortcut : "快捷键已关闭"}
        </Badge>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={onOpenCommandPalette}
          aria-label="打开命令面板"
          title="命令面板"
        >
          <CommandIcon size={16} aria-hidden="true" />
        </Button>
        <Button
          variant={view === "history" ? "accent" : "ghost"}
          size="iconSm"
          onClick={() =>
            onNavigate(view === "history" ? "translate" : "history")
          }
          aria-label={view === "history" ? "关闭历史" : "打开历史"}
          title="翻译历史"
        >
          {view === "history" ? (
            <X size={16} aria-hidden="true" />
          ) : (
            <History size={16} aria-hidden="true" />
          )}
        </Button>
        <Button
          variant={view === "settings" ? "accent" : "ghost"}
          size="iconSm"
          onClick={() =>
            onNavigate(view === "settings" ? "translate" : "settings")
          }
          aria-label={view === "settings" ? "关闭设置" : "打开设置"}
          title="设置"
        >
          {view === "settings" ? (
            <X size={16} aria-hidden="true" />
          ) : (
            <Settings size={16} aria-hidden="true" />
          )}
        </Button>
      </div>
    </header>
  );
}
