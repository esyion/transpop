import { AnimatePresence, motion } from "framer-motion";
import {
  Command as CommandMenu,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "cmdk";
import {
  Copy,
  Languages,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

export const commandItems = [
  { label: "立即翻译", hint: "回车", action: "translate", icon: Sparkles },
  { label: "复制结果", hint: "Ctrl/Cmd + C", action: "copy", icon: Copy },
  { label: "重新翻译", hint: "R", action: "retry", icon: RotateCcw },
  { label: "打开设置", hint: "S", action: "settings", icon: Settings },
  { label: "清空输入", hint: "⌫", action: "clear", icon: X },
  {
    label: "返回翻译",
    hint: "Esc",
    action: "translate-view",
    icon: Languages,
  },
] as const;

export type CommandAction = (typeof commandItems)[number]["action"];

interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onExecute: (action: CommandAction) => void;
}

export function CommandPalette({
  open,
  onOpenChange,
  onExecute,
}: CommandPaletteProps) {
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="command-overlay fixed inset-0 z-50 grid place-items-start px-4 pt-[14vh]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) onOpenChange(false);
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: 0.12, ease: "easeOut" }}
            className="command-palette mx-auto w-full max-w-160"
          >
            <CommandMenu className="w-full bg-transparent text-popover-foreground">
              <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-muted-foreground">
                <Search size={16} />
                <CommandInput
                  autoFocus
                  placeholder="搜索命令..."
                  className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground/60"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") onOpenChange(false);
                  }}
                />
              </div>
              <CommandList className="max-h-80 overflow-auto p-2">
                <CommandEmpty className="px-3 py-8 text-center text-sm text-muted-foreground">
                  未找到匹配的命令。
                </CommandEmpty>
                <CommandGroup
                  heading="命令"
                  className="px-1 py-1 text-xs text-muted-foreground"
                >
                  {commandItems.map(({ label, hint, action, icon: Icon }) => (
                    <CommandItem
                      key={action}
                      value={label}
                      onSelect={() => onExecute(action)}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl px-3 py-2 text-sm outline-none aria-selected:bg-accent aria-selected:text-foreground"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} className="text-muted-foreground" />
                        {label}
                      </span>
                      <span className="text-xs text-muted-foreground">{hint}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </CommandMenu>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
