"use client";

import { Copy, History, Languages, RotateCcw, Settings, Sparkles, X } from "lucide-react";

import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command";

/** 命令面板条目。 */
const COMMAND_ITEMS = [
  { label: "立即翻译", shortcut: "Enter", action: "translate", icon: Sparkles },
  { label: "复制结果", shortcut: "Ctrl + C", action: "copy", icon: Copy },
  { label: "重新翻译", shortcut: "R", action: "retry", icon: RotateCcw },
  { label: "翻译历史", shortcut: "H", action: "history", icon: History },
  { label: "打开设置", shortcut: "S", action: "settings", icon: Settings },
  { label: "清空输入", shortcut: "⌫", action: "clear", icon: X },
  { label: "返回翻译", shortcut: "Esc", action: "translate-view", icon: Languages },
] as const;

/** 命令面板可执行的动作。 */
export type CommandAction = (typeof COMMAND_ITEMS)[number]["action"];

type CommandPaletteProps = {
  /** 面板是否打开。 */
  open: boolean;
  /** 开合状态回调。 */
  onOpenChange: (open: boolean) => void;
  /** 命令执行回调。 */
  onExecute: (action: CommandAction) => void;
};

/**
 * 全局命令面板（Ctrl+K）：搜索并执行翻译、复制、导航等命令。
 * 键盘导航由 cmdk 提供。
 */
export function CommandPalette({ open, onOpenChange, onExecute }: CommandPaletteProps) {
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
          {COMMAND_ITEMS.map(({ label, shortcut, action, icon: Icon }) => (
            <CommandItem key={action} value={label} onSelect={() => onExecute(action)}>
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
