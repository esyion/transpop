"use client";

import { Check, PlugZap, ShieldCheck } from "lucide-react";
import { useState } from "react";

import { SettingCard } from "@/features/settings/components/setting-card";
import { API_MODE_OPTIONS } from "@/lib/constants";
import { useAppStore } from "@/stores/app-store";
import type { ApiMode } from "@/features/settings/types";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

/**
 * 「大模型接口」设置卡片：接口地址、接口类型、模型与 API 密钥。
 * 密钥只在本地加密落盘，保存后清空表单。
 */
export function ApiGroup() {
  const settings = useAppStore((state) => state.settings);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const [apiKeyDraft, setApiKeyDraft] = useState("");

  const saveApiKey = () => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed) return;
    updateSettings({ apiKey: trimmed, apiKeyConfigured: true });
    setApiKeyDraft("");
  };

  return (
    <SettingCard
      icon={<PlugZap className="size-4" />}
      title="大模型接口"
      description="支持兼容 OpenAI 的接口，可使用 Responses 或聊天补全"
    >
      <FieldGroup className="gap-3">
        <Field>
          <FieldLabel htmlFor="api-base-url">接口地址</FieldLabel>
          <Input
            id="api-base-url"
            value={settings.apiBaseUrl}
            placeholder="例如 https://api.openai.com/v1…"
            type="url"
            name="api-base-url"
            autoComplete="off"
            onChange={(event) => updateSettings({ apiBaseUrl: event.currentTarget.value })}
          />
        </Field>

        <Field>
          <FieldLabel id="api-mode-label">接口类型</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.apiMode}
            aria-labelledby="api-mode-label"
            onValueChange={(value) => {
              if (value) updateSettings({ apiMode: value as ApiMode });
            }}
            className="w-full"
          >
            {API_MODE_OPTIONS.map((mode) => (
              <ToggleGroupItem key={mode.value} value={mode.value} className="flex-1">
                {settings.apiMode === mode.value ? <Check /> : null}
                {mode.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </Field>

        <Field>
          <FieldLabel htmlFor="model-input">模型</FieldLabel>
          <Input
            id="model-input"
            value={settings.model}
            placeholder={settings.apiMode === "responses" ? "例如 gpt-5.4…" : "例如 qwen-plus…"}
            name="model"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) => updateSettings({ model: event.currentTarget.value })}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="api-key-input">API 密钥</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="api-key-input"
              value={apiKeyDraft}
              type="password"
              placeholder={settings.apiKeyConfigured ? "粘贴新密钥以替换…" : "粘贴 API 密钥…"}
              name="api-key"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveApiKey();
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton type="button" onClick={saveApiKey} disabled={!apiKeyDraft.trim()}>
                保存
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          <FieldDescription className="flex items-center gap-1">
            <ShieldCheck className="size-3" />
            {settings.apiKeyConfigured
              ? "API 密钥已加密存储在本地"
              : "开始翻译前需要先配置 API 密钥"}
          </FieldDescription>
        </Field>
      </FieldGroup>
    </SettingCard>
  );
}
