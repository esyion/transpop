//! 翻译设置实体与业务规则。

use super::error::DomainError;

/// 默认的 OpenAI 兼容接口地址。
pub const DEFAULT_API_BASE_URL: &str = "https://api.openai.com/v1";

/// 默认的模型名。
pub const DEFAULT_MODEL: &str = "gpt-5.4";

/// 默认的目标语言。
pub const DEFAULT_TARGET_LANGUAGE: &str = "Chinese";

/// 字体缩放允许的最小值。
pub const MIN_FONT_SCALE: f64 = 0.5;

/// 字体缩放允许的最大值。
pub const MAX_FONT_SCALE: f64 = 2.0;

/// 全局快捷键的平台默认值：macOS 用 Cmd + `，其余平台用 Alt + `。
///
/// 旧版默认的 Alt + Space 在 Windows 上被系统输入菜单占用，无法注册。
pub fn default_shortcut() -> &'static str {
    if cfg!(target_os = "macos") {
        "Command + `"
    } else {
        "Alt + `"
    }
}

/// 大模型接口类型。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ApiMode {
    /// OpenAI Responses 接口。
    Responses,
    /// OpenAI 兼容聊天补全接口。
    ChatCompletions,
}

impl ApiMode {
    /// 返回用于持久化与 IPC 传输的字符串表示。
    pub fn as_str(self) -> &'static str {
        match self {
            ApiMode::Responses => "responses",
            ApiMode::ChatCompletions => "chat_completions",
        }
    }

    /// 从存储或 IPC 中的字符串解析接口类型，未知值返回 `None`。
    pub fn from_str_raw(value: &str) -> Option<Self> {
        match value {
            "responses" => Some(ApiMode::Responses),
            "chat_completions" => Some(ApiMode::ChatCompletions),
            _ => None,
        }
    }

    /// 宽松归一化：未知值回退为 Responses 接口（与旧版行为一致）。
    pub fn normalized(value: &str) -> Self {
        Self::from_str_raw(value).unwrap_or(ApiMode::Responses)
    }
}

/// 界面主题模式。
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ThemeMode {
    /// 跟随系统。
    System,
    /// 浅色。
    Light,
    /// 深色。
    Dark,
}

impl ThemeMode {
    /// 返回用于持久化与 IPC 传输的字符串表示。
    pub fn as_str(self) -> &'static str {
        match self {
            ThemeMode::System => "system",
            ThemeMode::Light => "light",
            ThemeMode::Dark => "dark",
        }
    }

    /// 从存储或 IPC 中的字符串解析主题，未知值返回 `None`。
    pub fn from_str_raw(value: &str) -> Option<Self> {
        match value {
            "system" => Some(ThemeMode::System),
            "light" => Some(ThemeMode::Light),
            "dark" => Some(ThemeMode::Dark),
            _ => None,
        }
    }
}

/// API 密钥密文值对象：只承载密文与 nonce，不含明文。
#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct StoredSecret {
    /// AES-GCM 加密后的 Base64 密文；未配置密钥时为 `None`。
    pub ciphertext: Option<String>,
    /// 加密使用的 Base64 nonce；未配置密钥时为 `None`。
    pub nonce: Option<String>,
}

impl StoredSecret {
    /// 判断是否尚未配置密钥。
    pub fn is_empty(&self) -> bool {
        self.ciphertext.is_none() || self.nonce.is_none()
    }
}

/// 翻译设置实体（不含明文 API 密钥）。
///
/// 通过 [`TranslationSettings::normalized`] 构造，保证字段始终满足业务约束。
#[derive(Debug, Clone, PartialEq)]
pub struct TranslationSettings {
    /// OpenAI 兼容接口地址。
    pub api_base_url: String,
    /// 接口类型。
    pub api_mode: ApiMode,
    /// 模型名。
    pub model: String,
    /// 默认目标语言。
    pub target_language: String,
    /// 是否启用智能目标语言（中文译英、其他译中）。
    pub smart_target_language: bool,
    /// 全局快捷键描述串。
    pub shortcut: String,
    /// 是否启用全局快捷键。
    pub shortcut_enabled: bool,
    /// 界面主题。
    pub theme: ThemeMode,
    /// 字体缩放系数。
    pub font_scale: f64,
    /// 是否开机自启。
    pub startup: bool,
    /// 翻译完成后是否自动复制。
    pub auto_copy: bool,
}

impl Default for TranslationSettings {
    fn default() -> Self {
        Self {
            api_base_url: DEFAULT_API_BASE_URL.to_string(),
            api_mode: ApiMode::Responses,
            model: DEFAULT_MODEL.to_string(),
            target_language: DEFAULT_TARGET_LANGUAGE.to_string(),
            smart_target_language: true,
            shortcut: default_shortcut().to_string(),
            shortcut_enabled: true,
            theme: ThemeMode::System,
            font_scale: 1.0,
            startup: false,
            auto_copy: true,
        }
    }
}

impl TranslationSettings {
    /// 规范化并校验全部字段，返回满足业务约束的设置实体。
    ///
    /// 空的接口地址、模型名回退为默认值；接口类型未知值回退为 Responses；
    /// 其余字段不合法时返回 [`DomainError::InvalidSettings`]。
    pub fn normalized(self) -> Result<Self, DomainError> {
        let mut settings = self;
        settings.api_base_url = normalize_base_url(&settings.api_base_url)?;
        settings.api_mode = ApiMode::normalized(settings.api_mode.as_str());
        settings.model = normalize_model(&settings.model);
        settings.target_language = settings.target_language.trim().to_string();
        settings.shortcut = settings.shortcut.trim().to_string();

        if settings.target_language.is_empty() {
            return Err(DomainError::InvalidSettings("目标语言不能为空".to_string()));
        }
        if settings.shortcut_enabled && settings.shortcut.is_empty() {
            return Err(DomainError::InvalidSettings(
                "启用快捷键时快捷键不能为空".to_string(),
            ));
        }
        if !(MIN_FONT_SCALE..=MAX_FONT_SCALE).contains(&settings.font_scale) {
            return Err(DomainError::InvalidSettings(format!(
                "字体缩放必须在 {MIN_FONT_SCALE}~{MAX_FONT_SCALE} 之间"
            )));
        }

        Ok(settings)
    }
}
/// 归一化接口地址：去空白与尾部斜杠，空值回退默认地址，并要求 http(s) 协议。
fn normalize_base_url(value: &str) -> Result<String, DomainError> {
    let trimmed = value.trim().trim_end_matches('/');
    if trimmed.is_empty() {
        return Ok(DEFAULT_API_BASE_URL.to_string());
    }

    let lower = trimmed.to_ascii_lowercase();
    let has_valid_scheme = lower.starts_with("https://") || lower.starts_with("http://");
    let has_host = lower
        .split_once("://")
        .is_some_and(|(_, rest)| !rest.is_empty());
    if !has_valid_scheme || !has_host {
        return Err(DomainError::InvalidSettings(format!(
            "接口地址必须是合法的 http(s) URL：{trimmed}"
        )));
    }

    Ok(trimmed.to_string())
}

/// 宽松修复接口地址：空或非法值回退默认地址。
///
/// 用于加载历史存量数据（旧库可能残留未经校验的地址）；
/// 保存路径仍走严格校验的 [`TranslationSettings::normalized`]。
pub fn sanitize_base_url(value: &str) -> String {
    normalize_base_url(value).unwrap_or(DEFAULT_API_BASE_URL.to_string())
}

/// 归一化模型名：去空白，空值回退默认模型。
fn normalize_model(value: &str) -> String {
    let trimmed = value.trim();
    if trimmed.is_empty() {
        DEFAULT_MODEL.to_string()
    } else {
        trimmed.to_string()
    }
}

#[cfg(test)]
#[path = "tests.rs"]
mod tests;
