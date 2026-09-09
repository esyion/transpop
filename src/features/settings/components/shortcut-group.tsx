"use client";

import { Zap } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { SwitchRow } from "@/features/settings/components/switch-row";
import { useAppStore } from "@/stores/app-store";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";

/** 录制快捷键时被忽略的纯修饰键。 */
const MODIFIER_KEYS = ["Control", "Alt", "Shift", "Meta"];

/**
 * 把按键事件归一化为快捷键组成部分：Space 替换空格，单字符转大写；
 * 纯修饰键返回空串表示忽略。
 */
function normalizeKey(key: string): string {
  if (MODIFIER_KEYS.includes(key)) return "";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

type ShortcutGroupProps = {
  /** 快捷键注册失败的提示文案；null 表示无错误。 */
  error: string | null;
};

/**
 * 「快捷键」设置卡片：启用开关与录制全局快捷键。
 */
export function ShortcutGroup({ error }: ShortcutGroupProps) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [recording, setRecording] = useState(false);

  const recordShortcut = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!recording) return;
    event.preventDefault();
    event.stopPropagation();

    const key = normalizeKey(event.key);
    if (!key) return;

    const parts = [
      event.ctrlKey ? "Ctrl" : null,
      event.altKey ? "Alt" : null,
      event.shiftKey ? "Shift" : null,
      // 后端 global-shortcut 只识别 Command，不识别 Meta。
      event.metaKey ? "Command" : null,
      key,
    ].filter(Boolean) as string[];

    // 单键（非功能键）不足以构成全局快捷键，避免抢占日常输入。
    if (parts.length < 2 && !key.startsWith("F")) return;

    updateSettings({ shortcut: parts.join(" + "), shortcutEnabled: true });
    setRecording(false);
  };

  return (
    <SettingCard
      icon={<Zap className="size-4" />}
      title="快捷键"
      description="唤起翻译窗口的全局快捷键，可录制或单独开关"
    >
      <FieldGroup className="gap-3">
        <SwitchRow
          label="启用全局快捷键"
          checked={settings.shortcutEnabled}
          onCheckedChange={(checked) => updateSettings({ shortcutEnabled: checked })}
        />
        <Field>
          <FieldLabel htmlFor="shortcut-input">当前快捷键</FieldLabel>
          <InputGroup onKeyDown={recordShortcut}>
            <InputGroupInput
              id="shortcut-input"
              value={recording ? "请按下快捷键…" : settings.shortcut}
              readOnly
              placeholder="Alt + `"
              name="shortcut"
              autoComplete="off"
              aria-live="polite"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                variant={recording ? "default" : "outline"}
                onClick={() => setRecording((current) => !current)}
                onBlur={() => setRecording(false)}
                aria-pressed={recording}
              >
                {recording ? "录制中" : "录制快捷键"}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {error ? (
            <FieldDescription role="alert" className="text-destructive">
              {error}
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>
    </SettingCard>
  );
}
