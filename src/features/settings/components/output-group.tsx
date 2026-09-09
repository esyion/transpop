"use client";

import { Languages } from "lucide-react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { SwitchRow } from "@/features/settings/components/switch-row";
import { useAppStore } from "@/stores/app-store";

/**
 * 「输出」设置卡片：翻译完成后是否自动复制到剪贴板。
 */
export function OutputGroup() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);

  return (
    <SettingCard
      icon={<Languages className="size-4" />}
      title="输出"
      description="翻译完成后是否自动复制结果"
    >
      <SwitchRow
        label="翻译完成自动复制"
        checked={settings.autoCopy}
        onCheckedChange={(checked) => updateSettings({ autoCopy: checked })}
      />
    </SettingCard>
  );
}
