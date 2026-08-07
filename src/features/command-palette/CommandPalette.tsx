import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
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
  History,
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
  { label: "翻译历史", hint: "H", action: "history", icon: History },
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
  const reduceMotion = useReducedMotion();

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
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, scale: 0.98, y: 8 }}
            transition={{ duration: reduceMotion ? 0 : 0.14, ease: "easeOut" }}
            className="command-palette mx-auto w-full max-w-160"
            role="dialog"
            aria-modal="true"
            aria-label="命令面板"
          >
            <CommandMenu className="w-full bg-transparent text-popover-foreground">
              <div className="flex items-center gap-2 border-b border-border/70 px-4 py-3 text-muted-foreground focus-within:ring-2 focus-within:ring-inset focus-within:ring-ring">
                <Search size={16} />
                <CommandInput
                  autoFocus
                  placeholder="搜索命令…"
                  aria-label="搜索命令"
                  name="command-query"
                  autoComplete="off"
                  spellCheck={false}
                  className="w-full bg-transparent text-sm font-normal leading-normal outline-none placeholder:text-muted-foreground/55"
                  onKeyDown={(event) => {
                    if (event.key === "Escape") onOpenChange(false);
                  }}
                />
              </div>
              <CommandList className="max-h-80 overflow-auto p-2">
                <CommandEmpty className="px-3 py-8 text-center text-sm font-normal text-muted-foreground">
                  未找到匹配的命令
                </CommandEmpty>
                <CommandGroup
                  heading="命令"
                  className="px-1 py-1 text-xs font-medium text-muted-foreground"
                >
                  {commandItems.map(({ label, hint, action, icon: Icon }) => (
                    <CommandItem
                      key={action}
                      value={label}
                      onSelect={() => onExecute(action)}
                      className="flex cursor-pointer items-center justify-between gap-4 rounded-md px-3 py-2 text-sm font-normal leading-normal outline-none aria-selected:bg-accent aria-selected:text-foreground"
                    >
                      <span className="flex items-center gap-3">
                        <Icon size={16} className="text-muted-foreground" />
                        {label}
                      </span>
                      <span className="font-mono text-xs font-medium text-muted-foreground">{hint}</span>
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
