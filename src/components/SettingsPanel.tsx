import { Check, KeyRound, Monitor, Palette, PlugZap, Power, Type } from "lucide-react";
import type { ReactNode } from "react";
import { useAppStore } from "../store/appStore";
import { LANGUAGE_OPTIONS, PROVIDER_OPTIONS, THEME_OPTIONS } from "../utils/constants";
import type { Language, ThemeMode, TranslationProvider } from "../types/translation";

const navItems = ["General", "Translation", "Appearance", "Shortcut", "About"];

export function SettingsPanel() {
  const { settings, updateSettings } = useAppStore();

  return (
    <section className="settings-layout" aria-label="Settings">
      <nav className="settings-nav" aria-label="Settings sections">
        {navItems.map((item, index) => (
          <button className={index === 0 ? "nav-item active" : "nav-item"} type="button" key={item}>
            {item}
          </button>
        ))}
      </nav>

      <div className="settings-content">
        <SettingGroup icon={<PlugZap size={17} />} title="API" description="Tauri IPC is reserved; frontend keeps provider settings ready.">
          <label className="field-label" htmlFor="provider">Provider</label>
          <select
            id="provider"
            value={settings.provider}
            onChange={(event) => updateSettings({ provider: event.currentTarget.value as TranslationProvider })}
          >
            {PROVIDER_OPTIONS.map((provider) => <option key={provider}>{provider}</option>)}
          </select>

          <label className="field-label" htmlFor="api-key">API Key</label>
          <input
            id="api-key"
            value={settings.apiKey}
            type="password"
            placeholder="Stored by tauri-plugin-store"
            onChange={(event) => updateSettings({ apiKey: event.currentTarget.value })}
          />
        </SettingGroup>

        <SettingGroup icon={<Monitor size={17} />} title="Language" description="Auto-detect source language, then translate to target.">
          <label className="field-label" htmlFor="target-language">Target Language</label>
          <select
            id="target-language"
            value={settings.targetLanguage}
            onChange={(event) => updateSettings({ targetLanguage: event.currentTarget.value as Language })}
          >
            {LANGUAGE_OPTIONS.map((language) => <option key={language}>{language}</option>)}
          </select>
        </SettingGroup>

        <SettingGroup icon={<Palette size={17} />} title="Theme" description="Supports light, dark and system modes via design tokens.">
          <div className="segmented-control" role="group" aria-label="Theme">
            {THEME_OPTIONS.map((theme) => (
              <button
                className={settings.theme === theme ? "segment active" : "segment"}
                type="button"
                key={theme}
                onClick={() => updateSettings({ theme: theme as ThemeMode })}
              >
                {settings.theme === theme && <Check size={14} />} {theme}
              </button>
            ))}
          </div>
        </SettingGroup>

        <SettingGroup icon={<Power size={17} />} title="Startup" description="Reserved for Tauri startup and tray integration.">
          <label className="switch-row">
            <span>Launch at login</span>
            <input
              type="checkbox"
              checked={settings.startup}
              onChange={(event) => updateSettings({ startup: event.currentTarget.checked })}
            />
          </label>
        </SettingGroup>

        <SettingGroup icon={<KeyRound size={17} />} title="Shortcut" description="Global shortcut registration is handled by Tauri.">
          <label className="switch-row">
            <span>Enable shortcut</span>
            <input
              type="checkbox"
              checked={settings.shortcutEnabled}
              onChange={(event) => updateSettings({ shortcutEnabled: event.currentTarget.checked })}
            />
          </label>
          <label className="field-label" htmlFor="shortcut">Open Window</label>
          <input
            id="shortcut"
            value={settings.shortcut}
            onChange={(event) => updateSettings({ shortcut: event.currentTarget.value })}
          />
        </SettingGroup>

        <SettingGroup icon={<Type size={17} />} title="Font Size" description="Keyboard-friendly font scaling for accessibility.">
          <input
            className="range-input"
            aria-label="Font scale"
            type="range"
            min="0.9"
            max="1.2"
            step="0.05"
            value={settings.fontScale}
            onChange={(event) => updateSettings({ fontScale: Number(event.currentTarget.value) })}
          />
        </SettingGroup>
      </div>
    </section>
  );
}

interface SettingGroupProps {
  icon: ReactNode;
  title: string;
  description: string;
  children: ReactNode;
}

function SettingGroup({ icon, title, description, children }: SettingGroupProps) {
  return (
    <section className="setting-group">
      <div className="setting-heading">
        <span className="setting-icon" aria-hidden="true">{icon}</span>
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
      </div>
      <div className="setting-fields">{children}</div>
    </section>
  );
}
