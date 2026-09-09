"use client";

import { AlertCircle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";

import { AboutGroup } from "@/features/settings/components/about-group";
import { ApiGroup } from "@/features/settings/components/api-group";
import { AppearanceGroup } from "@/features/settings/components/appearance-group";
import { LanguageGroup } from "@/features/settings/components/language-group";
import { OutputGroup } from "@/features/settings/components/output-group";
import { SecurityGroup } from "@/features/settings/components/security-group";
import { ShortcutGroup } from "@/features/settings/components/shortcut-group";
import { UpdateGroup } from "@/features/settings/components/update-group";
import { useAppStore } from "@/stores/app-store";

/**
 * 设置页：按卡片组合各项设置分组。
 * 设置本体加载失败时顶部展示错误条并提供重试。
 */
export function SettingsView() {
  const shortcutError = useAppStore((state) => state.shortcutError);
  const startupError = useAppStore((state) => state.startupError);
  const settingsError = useAppStore((state) => state.settingsError);

  return (
    <section aria-label="设置">
      <h2 className="sr-only">设置</h2>
      {settingsError ? (
        <div
          role="alert"
          className="mb-3 flex items-center justify-between gap-3 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2.5"
        >
          <span className="flex items-center gap-2 text-sm text-destructive">
            <AlertCircle className="size-4 shrink-0" />
            {settingsError}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void useAppStore.getState().reloadSettings()}
          >
            <RotateCcw data-icon="inline-start" /> 重试
          </Button>
        </div>
      ) : null}
      <FieldGroup className="flex flex-col gap-3">
        <ApiGroup />
        <LanguageGroup />
        <ShortcutGroup error={shortcutError} />
        <AppearanceGroup startupError={startupError} />
        <OutputGroup />
        <SecurityGroup />
        <AboutGroup />
        <UpdateGroup />
      </FieldGroup>
    </section>
  );
}
