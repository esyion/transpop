"use client";

import { KeyRound, ShieldCheck } from "lucide-react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { FieldDescription } from "@/components/ui/field";

/**
 * 「安全」说明卡片：API 密钥的存储方式说明。
 */
export function SecurityGroup() {
  return (
    <SettingCard
      icon={<KeyRound className="size-4" />}
      title="安全"
      description="API 密钥使用 AES-256-GCM 加密后保存到本地数据库"
    >
      <FieldDescription className="flex items-center gap-1">
        <ShieldCheck className="size-3" />
        加密主密钥由操作系统密钥串管理，卸载应用并清除密钥串后数据不可恢复
      </FieldDescription>
    </SettingCard>
  );
}
