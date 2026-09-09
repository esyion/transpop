/** OpenAI 兼容接口类型。 */
export type ApiMode = "responses" | "chat_completions";

/** 界面主题模式。 */
export type ThemeMode = "system" | "light" | "dark";

/** 应用设置（与后端 `dto/settings.rs` AppSettingsDto 对应）。 */
export type TranslationSettings = {
  /** OpenAI 兼容接口地址。 */
  apiBaseUrl: string;
  /** 接口类型。 */
  apiMode: ApiMode;
  /** 模型名。 */
  model: string;
  /** 明文 API 密钥；仅存在于内存表单，后端返回时恒为空串。 */
  apiKey: string;
  /** 是否已配置 API 密钥。 */
  apiKeyConfigured: boolean;
  /** 默认目标语言。 */
  targetLanguage: string;
  /** 智能目标语言（中文译英、其他译中）。 */
  smartTargetLanguage: boolean;
  /** 全局快捷键描述串。 */
  shortcut: string;
  /** 是否启用全局快捷键。 */
  shortcutEnabled: boolean;
  /** 界面主题。 */
  theme: ThemeMode;
  /** 字体缩放系数。 */
  fontScale: number;
  /** 开机自启。 */
  startup: boolean;
  /** 翻译完成后自动复制。 */
  autoCopy: boolean;
};

/** 设置默认值（与后端 `domain/settings.rs` Default 保持一致）。 */
export const DEFAULT_SETTINGS: TranslationSettings = {
  apiBaseUrl: "https://api.openai.com/v1",
  apiMode: "responses",
  model: "gpt-5.4",
  apiKey: "",
  apiKeyConfigured: false,
  targetLanguage: "Chinese",
  smartTargetLanguage: true,
  shortcut: "Alt + `",
  shortcutEnabled: true,
  theme: "system",
  fontScale: 1,
  startup: false,
  autoCopy: true,
};
