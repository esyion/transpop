import { Check, CircleArrowUp, KeyRound, LoaderCircle, Monitor, Palette, PlugZap, Power, RefreshCw, ShieldCheck, Type } from "lucide-react";
import type { KeyboardEvent } from "react";
import { useState } from "react";
import { Badge } from "../../../components/ui/badge";
import { Button } from "../../../components/ui/button";

import { Input } from "../../../components/ui/input";

import { useAppStore } from "../../../store/appStore";
import {
  API_MODE_OPTIONS,
  getLanguageLabel,
  LANGUAGE_OPTIONS,
  THEME_LABELS,
  THEME_OPTIONS,
} from "../../../utils/constants";
import type { ApiMode, Language, ThemeMode } from "../../../types/translation";
import { Field, SettingGroup, SwitchRow } from "./SettingsPrimitives";
import type { AppUpdaterController } from "../../updater/useAppUpdater";


export function SettingsPanel({ updater }: { updater: AppUpdaterController }) {
  const { settings, shortcutError, updateSettings } = useAppStore();
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

    updateSettings({ shortcut: parts.join(" + "), shortcutEnabled: true });
    setRecordingShortcut(false);
  };

  return (
    <section className="settings-layout" aria-label="设置">
      <div className="settings-list grid gap-3">
        <SettingGroup
          icon={<PlugZap size={17} />}
          title="大模型接口"
          description="支持兼容 OpenAI 的接口，目前可使用 Responses 和聊天补全接口"
        >
          <Field label="接口地址">
            <Input
              value={settings.apiBaseUrl}
              placeholder="https://api.openai.com/v1"
              onChange={(event) => updateSettings({ apiBaseUrl: event.currentTarget.value })}
            />
          </Field>

          <Field label="接口类型">
            <div className="setting-row grid grid-cols-2 gap-1 border border-border p-1">
              {API_MODE_OPTIONS.map((mode) => (
                <Button
                  key={mode.value}
                  type="button"
                  size="sm"
                  variant={settings.apiMode === mode.value ? "accent" : "ghost"}
                  onClick={() => updateSettings({ apiMode: mode.value as ApiMode })}
                >
                  {settings.apiMode === mode.value ? <Check size={14} /> : null}
                  {mode.label}
                </Button>
              ))}
            </div>
          </Field>

          <Field label="模型">
            <Input
              value={settings.model}
              placeholder={settings.apiMode === "responses" ? "gpt-5.4" : "qwen-plus / moonshot-v1-8k"}
              onChange={(event) => updateSettings({ model: event.currentTarget.value })}
            />
          </Field>

          <Field label="API 密钥">
            <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
              <Input
                value={apiKeyDraft}
                type="password"
                placeholder={settings.apiKeyConfigured ? "已安全保存，粘贴新密钥可替换" : "粘贴 API 密钥"}
                onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveApiKey();
                }}
              />
              <Button type="button" onClick={saveApiKey} disabled={!apiKeyDraft.trim()}>
                保存
              </Button>
            </div>
          </Field>
          <p className="setting-help inline-flex items-center gap-1.5">
            <ShieldCheck size={13} /> {settings.apiKeyConfigured ? "API 密钥已加密存储在本地" : "开始翻译前需要先配置 API 密钥"}
          </p>
        </SettingGroup>

        <SettingGroup
          icon={<Monitor size={17} />}
          title="翻译语言"
          description="智能模式默认将中文翻译为英语，将其他语言翻译为中文"
        >
          <SwitchRow
            label="智能选择目标语言"
            checked={settings.smartTargetLanguage}
            onCheckedChange={(checked) => updateSettings({ smartTargetLanguage: checked })}
          />
          <Field label="默认目标语言">
            <select
              className="setting-row h-10 border border-border px-3 outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
              value={settings.targetLanguage}
              disabled={settings.smartTargetLanguage}
              onChange={(event) => updateSettings({ targetLanguage: event.currentTarget.value as Language })}
            >
              {LANGUAGE_OPTIONS.map((language) => (
                <option key={language} value={language}>
                  {getLanguageLabel(language)}
                </option>
              ))}
            </select>
          </Field>
        </SettingGroup>

        <SettingGroup icon={<Palette size={17} />} title="主题" description=''>
          <div className="grid grid-cols-3 gap-1 rounded-xl border border-border bg-background p-1">
            {THEME_OPTIONS.map((theme) => (
              <Button
                variant={settings.theme === theme ? "accent" : "ghost"}
                size="sm"
                type="button"
                key={theme}
                onClick={() => updateSettings({ theme: theme as ThemeMode })}
                className="capitalize"
              >
                {settings.theme === theme ? <Check size={14} /> : null}
                {THEME_LABELS[theme]}
              </Button>
            ))}
          </div>
        </SettingGroup>

        <SettingGroup icon={<Power size={17} />} title="使用习惯" description="调整自动复制和开机启动等常用行为">
          <SwitchRow
            label="自动复制翻译结果"
            checked={settings.autoCopy}
            onCheckedChange={(checked) => updateSettings({ autoCopy: checked })}
          />
          <SwitchRow
            label="开机自动启动"
            checked={settings.startup}
            onCheckedChange={(checked) => updateSettings({ startup: checked })}
          />
        </SettingGroup>

        <SettingGroup icon={<KeyRound size={17} />} title="快捷键" description="按下组合键即可录制">
          <SwitchRow
            label="启用快捷键"
            checked={settings.shortcutEnabled}
            onCheckedChange={(checked) => updateSettings({ shortcutEnabled: checked })}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={shortcutError ? "destructive" : "outline"}>{settings.shortcut}</Badge>
            <Button
              type="button"
              variant={recordingShortcut ? "accent" : "outline"}
              onClick={() => setRecordingShortcut(true)}
              onKeyDown={recordShortcut}
            >
              {recordingShortcut ? "请按下快捷键..." : "录制快捷键"}
            </Button>
          </div>
          {shortcutError && (
            <p className="setting-help text-destructive">快捷键注册失败，可尝试 Ctrl + Alt + T</p>
          )}
        </SettingGroup>

        <SettingGroup icon={<Type size={17} />} title="字体大小" description="根据阅读习惯调整界面字体缩放比例">
          <Field label={`缩放 ${settings.fontScale.toFixed(2)}×`}>
            <input
              className="w-full accent-primary"
              aria-label="字体缩放"
              type="range"
              min="0.9"
              max="1.2"
              step="0.05"
              value={settings.fontScale}
              onChange={(event) => updateSettings({ fontScale: Number(event.currentTarget.value) })}
            />
          </Field>
        </SettingGroup>

        <SettingGroup
          icon={<CircleArrowUp size={17} />}
          title="应用更新"
          description="检查并安装 TransPop 的新版本"
        >
          <div className="setting-row flex items-center justify-between gap-3 border border-border px-3 py-2.5">
            <span className="text-sm font-normal text-foreground">当前版本</span>
            <Badge variant="outline">
              {updater.currentVersion ? `v${updater.currentVersion}` : "读取中..."}
            </Badge>
          </div>

          {updater.status === "available" && updater.availableVersion ? (
            <div className="grid gap-2 rounded-xl border border-primary/30 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-3">
                <span className="text-sm font-medium text-foreground">发现新版本</span>
                <Badge variant="default">v{updater.availableVersion}</Badge>
              </div>
              {updater.releaseNotes ? (
                <p className="max-h-24 overflow-auto whitespace-pre-wrap text-xs leading-5 text-muted-foreground">
                  {updater.releaseNotes}
                </p>
              ) : null}
            </div>
          ) : null}

          {updater.status === "downloading" || updater.status === "installing" ? (
            <div className="grid gap-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{updater.status === "installing" ? "正在安装更新..." : "正在下载更新..."}</span>
                <span>{updater.progress === null ? "" : `${updater.progress}%`}</span>
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
            disabled={updater.status === "checking" || updater.status === "downloading" || updater.status === "installing"}
            onClick={() => {
              if (updater.status === "available") {
                void updater.installUpdate();
              } else {
                void updater.checkForUpdates();
              }
            }}
          >
            {updater.status === "checking" ? <LoaderCircle className="animate-spin" size={15} /> : null}
            {updater.status === "downloading" ? <LoaderCircle className="animate-spin" size={15} /> : null}
            {updater.status === "installing" ? <LoaderCircle className="animate-spin" size={15} /> : null}
            {updater.status === "available" ? <CircleArrowUp size={15} /> : null}
            {updater.status !== "checking" && updater.status !== "downloading" && updater.status !== "installing" && updater.status !== "available" ? <RefreshCw size={15} /> : null}
            {updater.status === "available"
              ? "立即升级"
              : updater.status === "checking"
                ? "正在检查..."
                : updater.status === "downloading"
                  ? "正在下载..."
                  : updater.status === "installing"
                    ? "正在安装..."
                    : updater.status === "upToDate"
                      ? "重新检查"
                      : "检查更新"}
          </Button>
        </SettingGroup>
      </div>
    </section>
  );
}

function normalizeKey(key: string) {
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return "";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}


