"use client";

import { Check, Monitor } from "lucide-react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { SwitchRow } from "@/features/settings/components/switch-row";
import { LANGUAGE_LABELS, LANGUAGE_OPTIONS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * 「翻译语言」设置卡片：智能目标语言开关与默认目标语言。
 */
export function LanguageGroup() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  return (
    <SettingCard
      icon={<Monitor className="size-4" />}
      title="翻译语言"
      description="智能模式默认将中文翻译为英语，将其他语言翻译为中文"
    >
      <FieldGroup className="gap-3">
        <SwitchRow
          label="智能目标语言"
          checked={settings.smartTargetLanguage}
          onCheckedChange={(checked) => updateSettings({ smartTargetLanguage: checked })}
        />
        <Field>
          <FieldLabel id="target-language-label">默认目标语言</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.targetLanguage}
            aria-labelledby="target-language-label"
            onValueChange={(value) => {
              if (value) updateSettings({ targetLanguage: value });
            }}
            className="w-full flex-wrap"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <ToggleGroupItem key={language} value={language} className="min-w-16 flex-1">
                {settings.targetLanguage === language ? <Check /> : null}
                {LANGUAGE_LABELS[language]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>
      </FieldGroup>
    </SettingCard>
  );
}
