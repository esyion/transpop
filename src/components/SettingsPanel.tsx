import { Check, KeyRound, Monitor, Palette, PlugZap, Power, ShieldCheck, Type } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { useState } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import { useAppStore } from "../store/appStore";
import { LANGUAGE_OPTIONS, THEME_OPTIONS } from "../utils/constants";
import type { Language, ThemeMode } from "../types/translation";

const navItems = ["General", "Translation", "Appearance", "Shortcut", "About"];

export function SettingsPanel() {
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
    <section className="grid gap-4 md:grid-cols-[150px_minmax(0,1fr)]" aria-label="Settings">
      <nav className="grid content-start gap-1 rounded-[16px] border border-border bg-background/70 p-2" aria-label="Settings sections">
        {navItems.map((item, index) => (
          <button
            className={`rounded-[10px] px-3 py-2 text-left text-sm transition ${index === 0 ? "bg-accent/10 text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"}`}
            type="button"
            key={item}
          >
            {item}
          </button>
        ))}
      </nav>

      <div className="grid max-h-[365px] gap-3 overflow-auto pr-1">
        <SettingGroup
          icon={<PlugZap size={17} />}
          title="API"
          description="Only OpenAI is enabled in the MVP to avoid unusable provider choices."
        >
          <div className="flex items-center justify-between gap-3 rounded-[12px] border border-border bg-background px-3 py-2">
            <span className="text-sm text-muted-foreground">Provider</span>
            <Badge variant="secondary">OpenAI</Badge>
          </div>

          <Field label="API Key">
            <div className="flex gap-2">
              <Input
                value={apiKeyDraft}
                type="password"
                placeholder={settings.apiKeyConfigured ? "Saved securely · paste a new key to replace" : "Paste OpenAI API key"}
                onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") saveApiKey();
                }}
              />
              <Button type="button" onClick={saveApiKey} disabled={!apiKeyDraft.trim()}>
                Save
              </Button>
            </div>
          </Field>
          <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck size={13} /> {settings.apiKeyConfigured ? "API key is encrypted in local SQLite." : "Required before translation can start."}
          </p>
        </SettingGroup>

        <SettingGroup
          icon={<Monitor size={17} />}
          title="Language"
          description="Smart mode sends Chinese to English and other text to Chinese by default."
        >
          <SwitchRow
            label="Smart target language"
            checked={settings.smartTargetLanguage}
            onCheckedChange={(checked) => updateSettings({ smartTargetLanguage: checked })}
          />
          <Field label="Fallback target language">
            <select
              className="h-10 rounded-[12px] border border-border bg-background px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:opacity-50"
              value={settings.targetLanguage}
              disabled={settings.smartTargetLanguage}
              onChange={(event) => updateSettings({ targetLanguage: event.currentTarget.value as Language })}
            >
              {LANGUAGE_OPTIONS.map((language) => <option key={language}>{language}</option>)}
            </select>
          </Field>
        </SettingGroup>

        <SettingGroup icon={<Palette size={17} />} title="Theme" description="Theme follows design tokens and can follow the system.">
          <div className="grid grid-cols-3 gap-1 rounded-[12px] border border-border bg-background p-1">
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
                {theme}
              </Button>
            ))}
          </div>
        </SettingGroup>

        <SettingGroup icon={<Power size={17} />} title="Workflow" description="Defaults favor one-shot translation with less clicking.">
          <SwitchRow
            label="Auto copy result"
            checked={settings.autoCopy}
            onCheckedChange={(checked) => updateSettings({ autoCopy: checked })}
          />
          <SwitchRow
            label="Launch at login"
            checked={settings.startup}
            onCheckedChange={(checked) => updateSettings({ startup: checked })}
          />
        </SettingGroup>

        <SettingGroup icon={<KeyRound size={17} />} title="Shortcut" description="Record a shortcut instead of typing syntax manually.">
          <SwitchRow
            label="Enable shortcut"
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
              {recordingShortcut ? "Press shortcut..." : "Record Shortcut"}
            </Button>
          </div>
          {shortcutError ? (
            <p className="text-xs text-destructive">{shortcutError}. Try Ctrl + Alt + T.</p>
          ) : (
            <p className="text-xs text-muted-foreground">If a shortcut is already used by the OS, TransPop keeps running and lets you record another one.</p>
          )}
        </SettingGroup>

        <SettingGroup icon={<Type size={17} />} title="Font Size" description="Keyboard-friendly font scaling for accessibility.">
          <Field label={`Scale ${settings.fontScale.toFixed(2)}×`}>
            <input
              className="w-full accent-primary"
              aria-label="Font scale"
              type="range"
              min="0.9"
              max="1.2"
              step="0.05"
              value={settings.fontScale}
              onChange={(event) => updateSettings({ fontScale: Number(event.currentTarget.value) })}
            />
          </Field>
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

interface SettingGroupProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

function SettingGroup({ icon, title, description, children }: SettingGroupProps) {
  return (
    <Card className="border-border/70 bg-background/75">
      <CardHeader className="grid grid-cols-[32px_1fr] gap-3 pb-3">
        <span className="grid size-8 place-items-center rounded-[10px] bg-primary/10 text-primary" aria-hidden="true">{icon}</span>
        <div>
          <CardTitle className="text-sm">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">{children}</CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-medium text-muted-foreground">
      {label}
      {children}
    </label>
  );
}

function SwitchRow({ label, checked, onCheckedChange }: { label: string; checked: boolean; onCheckedChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between gap-4 rounded-[12px] border border-border bg-background px-3 py-2 text-sm">
      <span>{label}</span>
      <Switch checked={checked} onChange={(event) => onCheckedChange(event.currentTarget.checked)} />
    </label>
  );
}
