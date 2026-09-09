"use client";

import type { KeyboardEvent } from "react";
import { useState } from "react";
import {
  Check,
  CircleArrowUp,
  KeyRound,
  Languages,
  Monitor,
  Palette,
  PlugZap,
  RefreshCw,
  ShieldCheck,
  Type,
  Zap,
} from "lucide-react";

import { useAppUpdater } from "@/hooks/use-app-updater";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@/components/ui/input-group";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { Spinner } from "@/components/ui/spinner";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import {
  API_MODE_OPTIONS,
  LANGUAGE_LABELS,
  LANGUAGE_OPTIONS,
  THEME_OPTIONS,
} from "@/lib/constants";
import { useAppStore } from "@/store/app-store";
import type { ApiMode, ThemeMode } from "@/types/translation";

function normalizeKey(key: string) {
  if (["Control", "Alt", "Shift", "Meta"].includes(key)) return "";
  if (key === " ") return "Space";
  if (key.length === 1) return key.toUpperCase();
  return key;
}

export function SettingsView() {
  const shortcutError = useAppStore((state) => state.shortcutError);
  const startupError = useAppStore((state) => state.startupError);
  const updater = useAppUpdater();

  return (
    <section aria-label="设置">
      <h2 className="sr-only">设置</h2>
      <FieldGroup className="flex flex-col gap-3">
        <ApiGroup />
        <LanguageGroup />
        <ShortcutGroup shortcutError={shortcutError} />
        <AppearanceGroup startupError={startupError} />
        <OutputGroup />
        <SecurityGroup />
        <AboutGroup />
        <UpdateGroup updater={updater} />
      </FieldGroup>
    </section>
  );
}

function SettingCard({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="gap-3 py-4">
      <CardHeader className="px-4">
        <CardTitle className="flex items-center gap-2 text-sm">
          <span className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground">
            {icon}
          </span>
          {title}
        </CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-4">{children}</CardContent>
    </Card>
  );
}

function SwitchRow({
  label,
  checked,
  onCheckedChange,
}: {
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  const id = `switch-${label}`;

  return (
    <Field orientation="horizontal">
      <FieldLabel htmlFor={id} className="font-normal">
        {label}
      </FieldLabel>
      <Switch id={id} checked={checked} onCheckedChange={onCheckedChange} />
    </Field>
  );
}

function ApiGroup() {
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
      description="支持兼容 OpenAI 的接口，可使用 Responses 或聊天补全接口"
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
            onChange={(event) =>
              updateSettings({ apiBaseUrl: event.currentTarget.value })
            }
          />
        </Field>

        <Field>
          <FieldLabel>接口类型</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.apiMode}
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
          <FieldLabel htmlFor="model">模型</FieldLabel>
          <Input
            id="model"
            value={settings.model}
            placeholder={
              settings.apiMode === "responses" ? "例如 gpt-5.4…" : "例如 qwen-plus…"
            }
            name="model"
            autoComplete="off"
            spellCheck={false}
            onChange={(event) =>
              updateSettings({ model: event.currentTarget.value })
            }
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="api-key">API 密钥</FieldLabel>
          <InputGroup>
            <InputGroupInput
              id="api-key"
              value={apiKeyDraft}
              type="password"
              placeholder={
                settings.apiKeyConfigured ? "粘贴新密钥以替换…" : "粘贴 API 密钥…"
              }
              name="api-key"
              autoComplete="off"
              spellCheck={false}
              onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") saveApiKey();
              }}
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                onClick={saveApiKey}
                disabled={!apiKeyDraft.trim()}
              >
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

function LanguageGroup() {
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
          onCheckedChange={(checked) =>
            updateSettings({ smartTargetLanguage: checked })
          }
        />
        <Field>
          <FieldLabel>默认目标语言</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.targetLanguage}
            onValueChange={(value) => {
              if (value) updateSettings({ targetLanguage: value });
            }}
            className="w-full flex-wrap"
          >
            {LANGUAGE_OPTIONS.map((language) => (
              <ToggleGroupItem
                key={language}
                value={language}
                className="min-w-16 flex-1"
              >
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

function ShortcutGroup({ shortcutError }: { shortcutError: string | null }) {
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
      // 后端只识别 COMMAND，不识别 META
      event.metaKey ? "Command" : null,
      key,
    ].filter(Boolean) as string[];

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
          onCheckedChange={(checked) =>
            updateSettings({ shortcutEnabled: checked })
          }
        />
        <Field>
          <FieldLabel htmlFor="shortcut">当前快捷键</FieldLabel>
          <InputGroup onKeyDown={recordShortcut}>
            <InputGroupInput
              id="shortcut"
              value={recording ? "请按下快捷键…" : settings.shortcut}
              readOnly
              placeholder="Alt + `"
              name="shortcut"
              autoComplete="off"
            />
            <InputGroupAddon align="inline-end">
              <InputGroupButton
                type="button"
                variant={recording ? "default" : "outline"}
                onClick={() => setRecording((current) => !current)}
                onBlur={() => setRecording(false)}
              >
                {recording ? "录制中" : "录制快捷键"}
              </InputGroupButton>
            </InputGroupAddon>
          </InputGroup>
          {shortcutError ? (
            <FieldDescription className="text-destructive">
              快捷键注册失败，可尝试 Ctrl + Alt + T
            </FieldDescription>
          ) : null}
        </Field>
      </FieldGroup>
    </SettingCard>
  );
}

function AppearanceGroup({ startupError }: { startupError: string | null }) {
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
          <FieldLabel>主题</FieldLabel>
          <ToggleGroup
            type="single"
            variant="outline"
            value={settings.theme}
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
          <FieldLabel htmlFor="font-scale">
            字体缩放 {settings.fontScale.toFixed(2)}×
          </FieldLabel>
          <Slider
            id="font-scale"
            min={0.9}
            max={1.2}
            step={0.05}
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
          <FieldDescription className="text-destructive">
            {startupError}
          </FieldDescription>
        ) : null}
      </FieldGroup>
    </SettingCard>
  );
}

function OutputGroup() {
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

function SecurityGroup() {
  return (
    <SettingCard
      icon={<KeyRound className="size-4" />}
      title="安全"
      description="API 密钥使用 AES-GCM 加密后保存到本地数据库"
    >
      <FieldDescription className="flex items-center gap-1">
        <ShieldCheck className="size-3" />
        加密密钥由操作系统密钥串管理，应用卸载后将一并清除
      </FieldDescription>
    </SettingCard>
  );
}

function AboutGroup() {
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

function UpdateGroup({ updater }: { updater: ReturnType<typeof useAppUpdater> }) {
  const busy =
    updater.status === "checking" ||
    updater.status === "downloading" ||
    updater.status === "installing";

  return (
    <SettingCard
      icon={<CircleArrowUp className="size-4" />}
      title="应用更新"
      description="检查并安装 TransPop 的新版本"
    >
      <FieldGroup className="gap-3">
        <Field orientation="horizontal">
          <FieldLabel className="font-normal">当前版本</FieldLabel>
          <Badge variant="outline">
            {updater.currentVersion ? `v${updater.currentVersion}` : "读取中…"}
          </Badge>
        </Field>

        {updater.status === "available" && updater.availableVersion ? (
          <div className="flex flex-col gap-2 rounded-lg border p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">发现新版本</span>
              <Badge>v{updater.availableVersion}</Badge>
            </div>
            {updater.releaseNotes ? (
              <p className="max-h-24 overflow-auto text-xs leading-5 text-muted-foreground whitespace-pre-wrap">
                {updater.releaseNotes}
              </p>
            ) : null}
          </div>
        ) : null}

        {updater.status === "downloading" || updater.status === "installing" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <Spinner className="size-3" />
                {updater.status === "installing" ? "正在安装更新…" : "正在下载更新…"}
              </span>
              <span>{updater.progress === null ? "" : `${updater.progress}%`}</span>
            </div>
            <Progress value={updater.progress ?? 10} />
          </div>
        ) : null}

        {updater.status === "error" && updater.error ? (
          <FieldDescription className="text-destructive">
            {updater.error}
          </FieldDescription>
        ) : null}

        <Button
          variant={updater.status === "available" ? "default" : "outline"}
          disabled={busy}
          onClick={() => {
            if (updater.status === "available") {
              void updater.installUpdate();
            } else {
              void updater.checkForUpdates();
            }
          }}
        >
          {busy ? (
            <Spinner data-icon="inline-start" />
          ) : updater.status === "available" ? (
            <CircleArrowUp data-icon="inline-start" />
          ) : (
            <RefreshCw data-icon="inline-start" />
          )}
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
      </FieldGroup>
    </SettingCard>
  );
}
