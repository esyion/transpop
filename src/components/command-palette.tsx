"use client";

import {
  Copy,
  History,
  Languages,
  RotateCcw,
  Settings,
  Sparkles,
  X,
} from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

export const commandItems = [
  { label: "立即翻译", shortcut: "Enter", action: "translate", icon: Sparkles },
  { label: "复制结果", shortcut: "Ctrl + C", action: "copy", icon: Copy },
  { label: "重新翻译", shortcut: "R", action: "retry", icon: RotateCcw },
  { label: "翻译历史", shortcut: "H", action: "history", icon: History },
  { label: "打开设置", shortcut: "S", action: "settings", icon: Settings },
  { label: "清空输入", shortcut: "⌫", action: "clear", icon: X },
  { label: "返回翻译", shortcut: "Esc", action: "translate-view", icon: Languages },
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
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="命令面板"
      description="搜索并执行命令"
    >
      <CommandInput placeholder="搜索命令…" />
      <CommandList>
        <CommandEmpty>未找到匹配的命令</CommandEmpty>
        <CommandGroup heading="命令">
          {commandItems.map(({ label, shortcut, action, icon: Icon }) => (
            <CommandItem
              key={action}
              value={label}
              onSelect={() => onExecute(action)}
            >
              <Icon />
              <span>{label}</span>
              <CommandShortcut>{shortcut}</CommandShortcut>
            </CommandItem>
          ))}
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
