//! 应用设置 IPC DTO。

use serde::{Deserialize, Serialize};

use crate::application::ports::SettingsRecord;
use crate::domain::error::DomainError;
use crate::domain::settings::{ApiMode, ThemeMode, TranslationSettings};

/// 应用设置 DTO。
///
/// 安全面约束：明文 API 密钥永不回传（`apiKey` 仅在请求方向出现），
/// 响应方向只携带 `apiKeyConfigured` 布尔位。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettingsDto {
    /// OpenAI 兼容接口地址。
    pub api_base_url: String,
    /// 接口类型（`responses` / `chat_completions`）。
    pub api_mode: String,
    /// 模型名。
    pub model: String,
    /// 默认目标语言。
    pub target_language: String,
    /// 智能目标语言开关。
    pub smart_target_language: bool,
    /// 全局快捷键描述串。
    pub shortcut: String,
    /// 快捷键开关。
    pub shortcut_enabled: bool,
    /// 主题（`system` / `light` / `dark`）。
    pub theme: String,
    /// 字体缩放。
    pub font_scale: f64,
    /// 开机自启。
    pub startup: bool,
    /// 自动复制。
    pub auto_copy: bool,
    /// 前端显式提交的新 API 密钥；响应方向恒为 `None`。
    #[serde(default)]
    pub api_key: Option<String>,
    /// 是否已配置 API 密钥。
    #[serde(default)]
    pub api_key_configured: bool,
}

impl AppSettingsDto {
    /// 从设置记录序列化为响应 DTO（明文密钥不出现）。
    pub fn from_record(record: &SettingsRecord) -> Self {
        let settings = &record.settings;
        Self {
            api_base_url: settings.api_base_url.clone(),
            api_mode: settings.api_mode.as_str().to_string(),
            model: settings.model.clone(),
            target_language: settings.target_language.clone(),
            smart_target_language: settings.smart_target_language,
            shortcut: settings.shortcut.clone(),
            shortcut_enabled: settings.shortcut_enabled,
            theme: settings.theme.as_str().to_string(),
            font_scale: settings.font_scale,
            startup: settings.startup,
            auto_copy: settings.auto_copy,
            api_key: None,
            api_key_configured: record.has_api_key(),
        }
    }

    /// 把请求 DTO 转为领域实体；`apiKey` 字段不参与（另行提取）。
    ///
    /// 枚举字段在此完成字符串 → 枚举转换，未知主题直接报错，
    /// 未知接口类型交由领域层宽松归一化（回退 Responses）。
    pub fn to_domain(&self) -> Result<TranslationSettings, DomainError> {
        Ok(TranslationSettings {
            api_base_url: self.api_base_url.clone(),
            api_mode: ApiMode::normalized(&self.api_mode),
            model: self.model.clone(),
            target_language: self.target_language.clone(),
            smart_target_language: self.smart_target_language,
            shortcut: self.shortcut.clone(),
            shortcut_enabled: self.shortcut_enabled,
            theme: ThemeMode::from_str_raw(&self.theme)
                .ok_or_else(|| DomainError::InvalidSettings(format!("未知主题：{}", self.theme)))?,
            font_scale: self.font_scale,
            startup: self.startup,
            auto_copy: self.auto_copy,
        })
    }

    /// 提取前端显式提交的新 API 密钥（`None` 或空白表示「不修改」）。
    pub fn submitted_api_key(&self) -> Option<&str> {
        self.api_key.as_deref()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::SettingsRecord;
    use crate::domain::settings::StoredSecret;

    /// 构造默认设置记录。
    fn default_record() -> SettingsRecord {
        SettingsRecord {
            settings: TranslationSettings::default(),
            secret: StoredSecret::default(),
        }
    }

    #[test]
    fn serializes_with_camel_case_keys() {
        let record = default_record();
        let value = serde_json::to_value(AppSettingsDto::from_record(&record)).unwrap();
        assert_eq!(value["apiBaseUrl"], "https://api.openai.com/v1");
        assert_eq!(value["apiKeyConfigured"], false);
        assert_eq!(value["smartTargetLanguage"], true);
        assert!(value.get("api_key").is_none());
    }

    #[test]
    fn response_never_carries_plaintext_key() {
        let record = default_record();
        let dto = AppSettingsDto::from_record(&record);
        assert!(dto.api_key.is_none());
    }

    #[test]
    fn to_domain_rejects_unknown_theme() {
        let dto = AppSettingsDto {
            api_base_url: String::new(),
            api_mode: "responses".to_string(),
            model: String::new(),
            target_language: "Chinese".to_string(),
            smart_target_language: true,
            shortcut: "Alt + `".to_string(),
            shortcut_enabled: true,
            theme: "solarized".to_string(),
            font_scale: 1.0,
            startup: false,
            auto_copy: true,
            api_key: None,
            api_key_configured: false,
        };
        assert!(matches!(
            dto.to_domain(),
            Err(DomainError::InvalidSettings(_))
        ));
    }

    #[test]
    fn deserializes_camel_case_request() {
        let raw = r#"{
            "apiBaseUrl": "https://api.example.com/v1",
            "apiMode": "responses",
            "model": "gpt-5.4",
            "targetLanguage": "Chinese",
            "smartTargetLanguage": true,
            "shortcut": "Alt + `",
            "shortcutEnabled": true,
            "theme": "system",
            "fontScale": 1.0,
            "startup": false,
            "autoCopy": true,
            "apiKey": "sk-test",
            "apiKeyConfigured": false
        }"#;
        let dto: AppSettingsDto = serde_json::from_str(raw).unwrap();
        assert_eq!(dto.api_base_url, "https://api.example.com/v1");
        assert_eq!(dto.submitted_api_key(), Some("sk-test"));
    }
}
