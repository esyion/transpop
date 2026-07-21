import { Sparkles } from "lucide-react";

export function ShortcutStrip() {
  return (
    <footer className="shortcut-strip">
      <span className="shortcut-chip">
        <Sparkles size={13} /> Auto after 1s
      </span>
      <span className="shortcut-chip">
        <kbd className="font-medium text-foreground">Enter</kbd> Now
      </span>
      <span className="shortcut-chip">
        <kbd className="font-medium text-foreground">Esc</kbd> Close
      </span>
    </footer>
  );
}
