"use client";

import {
  Check,
  CircleArrowUp,
  KeyRound,
  Languages,
  LoaderCircle,
  Monitor,
  Palette,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Type,
  Zap,
} from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAppStore } from "@/store/appStore";
import type {
  ApiMode,
  Language,
  ThemeMode,
} from "@/types/translation";
import {
  API_MODE_OPTIONS,
  LANGUAGE_LABELS,
  LANGUAGE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
} from "@/utils/constants";
import type { AppUpdaterController } from "@/features/updater/useAppUpdater";

import { Field, SettingGroup, SwitchRow } from "./SettingsPrimitives";

function normalizeKey(key: string) {
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return "";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function SettingsPanel({
  updater,
}: {
  updater: AppUpdaterController;
}) {
  const { settings, shortcutError, startupError, updateSettings } =
    useAppStore();
  const [apiKeyDraft, setApiKeyDraft] = useState("");
  const [recordingShortcut, setRecordingShortcut] = useState(false);

  const saveApiKey = () => {
    const trimmed = apiKeyDraft.trim();
    if (!trimmed) return;
    updateSettings({ apiKey: trimmed, apiKeyConfigured: true });
    setApiKeyDraft("");
  };

  const recordShortcut = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (!recordingShortcut) return;
    event.preventDefault();
    event.stopPropagation();

    const key = normalizeKey(event.key);
    if (!key) return;

    const parts = [
      event.ctrlKey ? "Ctrl" : null,
      event.altKey ? "Alt" : null,
      event.shiftKey ? "Shift" : null,
      event.metaKey ? "Meta" : null,
      key,
    ].filter(Boolean) as string[];

    if (parts.length < 2 && !key.startsWith("F")) return;

    updateSettings({
      shortcut: parts.join(" + "),
      shortcutEnabled: true,
    });
    setRecordingShortcut(false);
  };

  return (
    <section className="settings-layout" aria-label="设置">
      <h2 className="sr-only">设置</h2>
      <div className="settings-list grid gap-3">
        <SettingGroup
          icon={<PlugZap size={17} />}
          title="大模型接口"
          description="支持兼容 OpenAI 的接口，目前可使用 Responses 和聊天补全接口"
        >
          <Field label="接口地址">
            <Input
              value={settings.apiBaseUrl}
              placeholder="例如 https://api.openai.com/v1…"
              type="url"
              name="api-base-url"
              autoComplete="off"
              onChange={(event) =>
                updateSettings({ apiBaseUrl: event.currentTarget.value })
              }
            />
          </Field>

          <Field label="接口类型">
            <div className="setting-row grid grid-cols-2 gap-1 border border-border p-1">
              {API_MODE_OPTIONS.map((mode) => (
                <Button
                  key={mode.value}
                  type="button"
                  size="sm"
                  variant={
                    settings.apiMode === mode.value ? "accent" : "ghost"
                  }
                  onClick={() =>
                    updateSettings({ apiMode: mode.value as ApiMode })
                  }
                >
                  {settings.apiMode === mode.value ? (
                    <Check size={14} />
                  ) : null}
                  {mode.label}
                </Button>
              ))}
            </div>
          </Field>

          <Field label="模型">
            <Input
              value={settings.model}
              placeholder={
                settings.apiMode === "responses"
                  ? "例如 gpt-5.4…"
                  : "例如 qwen-plus…"
              }
              name="model"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) =>
                updateSettings({ model: event.currentTarget.value })
              }
            />
          </Field>

          <Field label="API 密钥">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={apiKeyDraft}
                type="password"
                placeholder={
                  settings.apiKeyConfigured
                    ? "粘贴新密钥以替换…"
                    : "粘贴 API 密钥…"
                }
                name="api-key"
                autoComplete="off"
                spellCheck={false}
                onChange={(event) =>
                  setApiKeyDraft(event.currentTarget.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveApiKey();
                }}
              />
              <Button
                type="button"
                onClick={saveApiKey}
                disabled={!apiKeyDraft.trim()}
              >
                保存
              </Button>
            </div>
          </Field>
          <p className="setting-help inline-flex items-center gap-1.5">
            <ShieldCheck size={13} />{" "}
            {settings.apiKeyConfigured
              ? "API 密钥已加密存储在本地"
              : "开始翻译前需要先配置 API 密钥"}
          </p>
        </SettingGroup>

        <SettingGroup
          icon={<Monitor size={17} />}
          title="翻译语言"
          description="智能模式默认将中文翻译为英语，将其他语言翻译为中文"
        >
          <SwitchRow
            label="智能目标语言"
            checked={settings.smartTargetLanguage}
            onCheckedChange={(checked) =>
              updateSettings({ smartTargetLanguage: checked })
            }
          />
          <Field label="默认目标语言">
            <div className="setting-row grid grid-cols-2 gap-1 border border-border p-1 sm:grid-cols-4">
              {LANGUAGE_OPTIONS.map((language) => (
                <Button
                  key={language}
                  type="button"
                  size="sm"
                  variant={
                    settings.targetLanguage === language ? "accent" : "ghost"
                  }
                  onClick={() =>
                    updateSettings({ targetLanguage: language as Language })
                  }
                >
                  {settings.targetLanguage === language ? (
                    <Check size={14} />
                  ) : null}
                  {LANGUAGE_LABELS[language as Language]}
                </Button>
              ))}
            </div>
          </Field>
        </SettingGroup>

        <SettingGroup
          icon={<Zap size={17} />}
          title="快捷键"
          description="唤起翻译窗口的全局快捷键，可录制或单独开关"
        >
          <SwitchRow
            label="启用全局快捷键"
            checked={settings.shortcutEnabled}
            onCheckedChange={(checked) =>
              updateSettings({ shortcutEnabled: checked })
            }
          />
          <Field label="当前快捷键">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={settings.shortcut}
                readOnly
                placeholder="Alt + Space"
                name="shortcut"
                autoComplete="off"
              />
              <Button
                type="button"
                variant={recordingShortcut ? "accent" : "outline"}
                onKeyDown={recordShortcut}
                onClick={() =>
                  setRecordingShortcut((current) => !current)
                }
                onBlur={() => setRecordingShortcut(false)}
              >
                {recordingShortcut ? "请按下快捷键…" : "录制快捷键"}
              </Button>
            </div>
          </Field>
          {shortcutError && (
            <p className="setting-help text-destructive">
              快捷键注册失败，可尝试 Ctrl + Alt + T
            </p>
          )}
        </SettingGroup>

        <SettingGroup
          icon={<Palette size={17} />}
          title="外观"
          description="界面主题、字体缩放与启动行为"
        >
          <Field label="主题">
            <div className="setting-row grid grid-cols-3 gap-1 border border-border p-1">
              {THEME_OPTIONS.map((theme) => (
                <Button
                  key={theme}
                  type="button"
                  size="sm"
                  variant={settings.theme === theme ? "accent" : "ghost"}
                  onClick={() =>
                    updateSettings({ theme: theme as ThemeMode })
                  }
                >
                  {settings.theme === theme ? <Check size={14} /> : null}
                  {THEME_LABELS[theme as ThemeMode]}
                </Button>
              ))}
            </div>
          </Field>

          <Field label={`字体缩放 ${settings.fontScale.toFixed(2)}×`}>
            <input
              className="w-full accent-primary"
              aria-label="字体缩放"
              name="font-scale"
              type="range"
              min="0.9"
              max="1.2"
              step="0.05"
              value={settings.fontScale}
              onChange={(event) =>
                updateSettings({
                  fontScale: Number(event.currentTarget.value),
                })
              }
            />
          </Field>

          <SwitchRow
            label="开机自动启动"
            checked={settings.startup}
            onCheckedChange={(checked) =>
              updateSettings({ startup: checked })
            }
          />
          {startupError && (
            <p className="setting-help text-destructive">{startupError}</p>
          )}
        </SettingGroup>

        <SettingGroup
          icon={<Languages size={17} />}
          title="输出"
          description="翻译完成后是否自动复制结果"
        >
          <SwitchRow
            label="翻译完成自动复制"
            checked={settings.autoCopy}
            onCheckedChange={(checked) =>
              updateSettings({ autoCopy: checked })
            }
          />
        </SettingGroup>

        <SettingGroup
          icon={<KeyRound size={17} />}
          title="安全"
          description="API 密钥使用 AES-GCM 加密后保存到本地数据库"
        >
          <p className="setting-help inline-flex items-center gap-1.5">
            <ShieldCheck size={13} />
            加密密钥由操作系统密钥串管理，应用卸载后将一并清除
          </p>
        </SettingGroup>

        <SettingGroup
          icon={<Type size={17} />}
          title="关于"
          description="TransPop 是一款快捷、轻量的桌面翻译工具"
        >
          <p className="setting-help">
            按下全局快捷键即可唤起翻译窗口，输入或粘贴文本后自动翻译。
          </p>
        </SettingGroup>

        <SettingGroup
          icon={<CircleArrowUp size={17} />}
          title="应用更新"
          description="检查并安装 TransPop 的新版本"
        >
          <div className="setting-row flex items-center justify-between gap-3 border border-border px-3 py-2.5">
            <span className="text-sm font-normal text-foreground">
              当前版本
            </span>
            <Badge variant="outline">
              {updater.currentVersion
                ? `v${updater.currentVersion}`
                : "读取中…"}
            </Badge>
          </div>

          {updater.status === "available" && updater.availableVersion ? (
            <div className="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">
                  发现新版本
                </span>
                <Badge variant="default">
                  v{updater.availableVersion}
                </Badge>
              </div>
              {updater.releaseNotes ? (
                <p className="max-h-24 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                  {updater.releaseNotes}
                </p>
              ) : null}
            </div>
          ) : null}

          {updater.status === "downloading" ||
          updater.status === "installing" ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {updater.status === "installing"
                    ? "正在安装更新…"
                    : "正在下载更新…"}
                </span>
                <span>
                  {updater.progress === null ? "" : `${updater.progress}%`}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-[width] duration-200"
                  style={{ width: `${updater.progress ?? 24}%` }}
                />
              </div>
            </div>
          ) : null}

          {updater.status === "error" && updater.error ? (
            <p className="setting-help text-destructive">{updater.error}</p>
          ) : null}

          <Button
            type="button"
            className="w-full"
            variant={updater.status === "available" ? "accent" : "outline"}
            disabled={
              updater.status === "checking" ||
              updater.status === "downloading" ||
              updater.status === "installing"
            }
            onClick={() => {
              if (updater.status === "available") {
                void updater.installUpdate();
              } else {
                void updater.checkForUpdates();
              }
            }}
          >
            {updater.status === "checking" ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : null}
            {updater.status === "downloading" ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : null}
            {updater.status === "installing" ? (
              <LoaderCircle className="animate-spin" size={15} />
            ) : null}
            {updater.status === "available" ? (
              <CircleArrowUp size={15} />
            ) : null}
            {updater.status !== "checking" &&
            updater.status !== "downloading" &&
            updater.status !== "installing" &&
            updater.status !== "available" ? (
              <RefreshCw size={15} />
            ) : null}
            {updater.status === "available"
              ? "立即升级"
              : updater.status === "checking"
                ? "正在检查…"
                : updater.status === "downloading"
                  ? "正在下载…"
                  : updater.status === "installing"
                    ? "正在安装…"
                    : updater.status === "upToDate"
                      ? "重新检查"
                      : "检查更新"}
          </Button>
        </SettingGroup>
      </div>
    </section>
  );
}
