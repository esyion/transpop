import { Command as CommandIcon, Languages, Settings, X } from "lucide-react";
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
    <header className="app-header" >
      <button
        type="button"
        onClick={() => onNavigate("translate")}
        className="brand-lockup outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="返回翻译"
      >
        <span className="brand-mark" aria-hidden="true">
          <Languages size={18} />
        </span>
        <span className="brand-copy">
          <strong className="brand-title">TransPop</strong>
          <span className="brand-subtitle">{languageHint}</span>
        </span>
      </button>

      <div className="header-tools">
        <Badge variant="secondary" className="status-badge hidden sm:inline-flex">
          {smartTargetLanguage ? "自动" : getLanguageLabel(effectiveTargetLanguage)}
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
          <CommandIcon size={16} />
        </Button>
        <Button
          variant="ghost"
          size="iconSm"
          onClick={() =>
            onNavigate(view === "settings" ? "translate" : "settings")
          }
          aria-label={view === "settings" ? "关闭设置" : "打开设置"}
          title="设置"
        >
          {view === "settings" ? <X size={16} /> : <Settings size={16} />}
        </Button>
      </div>
    </header>
  );
}
