"use client";

import { Type } from "lucide-react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { FieldDescription } from "@/components/ui/field";

/**
 * 「关于」说明卡片。
 */
export function AboutGroup() {
  return (
    <SettingCard
      icon={<Type className="size-4" />}
      title="关于"
      description="TransPop 是一款快捷、轻量的桌面翻译工具"
    >
      <FieldDescription>
        按下全局快捷键即可唤起翻译窗口，输入或粘贴文本后自动翻译。
      </FieldDescription>
    </SettingCard>
  );
}
