import { Sparkles } from "lucide-react";

export function ShortcutStrip() {
  return (
    <footer className="shortcut-strip">
      <span className="shortcut-chip">
        <Sparkles size={13} /> 1 秒后自动翻译
      </span>
      <span className="shortcut-chip">
        <kbd className="font-medium text-foreground">Enter</kbd> 立即翻译
      </span>
      <span className="shortcut-chip">
        <kbd className="font-medium text-foreground">Esc</kbd> 关闭
      </span>
    </footer>
  );
}
