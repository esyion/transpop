"use client";

import { Check, Palette } from "lucide-react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { SwitchRow } from "@/features/settings/components/switch-row";
import { THEME_OPTIONS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import type { ThemeMode } from "@/features/settings/types";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Slider } from "@/components/ui/slider";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/** 字体缩放范围与步进。 */
const FONT_SCALE_MIN = 0.9;
const FONT_SCALE_MAX = 1.2;
const FONT_SCALE_STEP = 0.05;

type AppearanceGroupProps = {
  /** 开机自启设置失败的提示文案；null 表示无错误。 */
  startupError: string | null;
};

/**
 * 「外观」设置卡片：主题、字体缩放与开机自启。
 */
export function AppearanceGroup({ startupError }: AppearanceGroupProps) {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  return (
    <SettingCard
      icon={<Palette className="size-4" />}
      title="外观"
      description="界面主题、字体缩放与启动行为"
    >
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel id="theme-label">主题</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.theme}
            aria-labelledby="theme-label"
            onValueChange={(value) => {
              if (value) updateSettings({ theme: value as ThemeMode });
            }}
            className="w-full"
          >
            {THEME_OPTIONS.map((theme) => (
              <ToggleGroupItem key={theme.value} value={theme.value} className="flex-1">
                {settings.theme === theme.value ? <Check /> : null}
                {theme.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="font-scale-slider">
            字体缩放 {settings.fontScale.toFixed(2)}×
          </FieldLabel>
          <Slider
            id="font-scale-slider"
            min={FONT_SCALE_MIN}
            max={FONT_SCALE_MAX}
            step={FONT_SCALE_STEP}
            value={[settings.fontScale]}
            onValueChange={([value]) => updateSettings({ fontScale: value })}
          />
        </Field>

        <SwitchRow
          label="开机自动启动"
          checked={settings.startup}
          onCheckedChange={(checked) => updateSettings({ startup: checked })}
        />
        {startupError ? (
          <FieldDescription role="alert" className="text-destructive">
            {startupError}
          </FieldDescription>
        ) : null}
      </FieldGroup>
    </SettingCard>
  );
}
