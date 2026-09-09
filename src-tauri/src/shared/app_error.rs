//! IPC 边界错误：稳定错误码 + 用户可读文案。

use crate::domain::error::DomainError;

/// 稳定的 IPC 错误码集合，供前端按码分支。
///
/// 错误码一经发布即视为契约，只增不改；用户文案与错误码解耦。
pub mod codes {
    /// 输入文本为空。
    pub const TEXT_EMPTY: &str = "TEXT_EMPTY";
    /// 输入文本超长。
    pub const TEXT_TOO_LONG: &str = "TEXT_TOO_LONG";
    /// API 密钥未配置。
    pub const API_KEY_MISSING: &str = "API_KEY_MISSING";
    /// 设置字段不合法。
    pub const SETTINGS_INVALID: &str = "SETTINGS_INVALID";
    /// 历史条目不存在。
    pub const HISTORY_NOT_FOUND: &str = "HISTORY_NOT_FOUND";
    /// 历史条目 ID 为空。
    pub const HISTORY_ID_EMPTY: &str = "HISTORY_ID_EMPTY";
    /// 本地存储读写失败。
    pub const STORAGE_FAILED: &str = "STORAGE_FAILED";
    /// 翻译服务请求失败。
    pub const REQUEST_FAILED: &str = "REQUEST_FAILED";
    /// 翻译服务响应无法解析。
    pub const RESPONSE_PARSE_FAILED: &str = "RESPONSE_PARSE_FAILED";
    /// 快捷键为空。
    pub const SHORTCUT_EMPTY: &str = "SHORTCUT_EMPTY";
    /// 快捷键注册失败。
    pub const SHORTCUT_REGISTER_FAILED: &str = "SHORTCUT_REGISTER_FAILED";
    /// 主窗口不可用。
    pub const WINDOW_UNAVAILABLE: &str = "WINDOW_UNAVAILABLE";
    /// 窗口操作失败。
    pub const WINDOW_OP_FAILED: &str = "WINDOW_OP_FAILED";
    /// 未分类内部错误。
    pub const INTERNAL: &str = "INTERNAL";
}

/// IPC 边界错误：携带稳定错误码与已脱敏的用户文案。
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct AppError {
    code: &'static str,
    message: String,
}

impl AppError {
    /// 由显式错误码与文案构造。
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    /// 稳定错误码。
    pub fn code(&self) -> &'static str {
        self.code
    }

    /// 面向用户的文案（不含内部堆栈与敏感信息）。
    pub fn message(&self) -> &str {
        &self.message
    }
}

/// 将领域错误统一映射为稳定错误码。
///
/// 技术性变体（存储、网络、窗口等）的用户文案做通用化脱敏，
/// 原始细节仅写入日志；业务规则类文案（如「输入文本为空」）直接可用。
impl From<DomainError> for AppError {
    fn from(error: DomainError) -> Self {
        let code = match error {
            DomainError::EmptyInput => codes::TEXT_EMPTY,
            DomainError::InputTooLong { .. } => codes::TEXT_TOO_LONG,
            DomainError::ApiKeyMissing => codes::API_KEY_MISSING,
            DomainError::InvalidSettings(_) => codes::SETTINGS_INVALID,
            DomainError::HistoryNotFound(_) => codes::HISTORY_NOT_FOUND,
            DomainError::EmptyHistoryId => codes::HISTORY_ID_EMPTY,
            DomainError::Storage(_) => codes::STORAGE_FAILED,
            DomainError::RequestFailed(_) => codes::REQUEST_FAILED,
            DomainError::ResponseParse(_) => codes::RESPONSE_PARSE_FAILED,
            DomainError::EmptyShortcut => codes::SHORTCUT_EMPTY,
            DomainError::ShortcutRegister(_) => codes::SHORTCUT_REGISTER_FAILED,
            DomainError::WindowUnavailable => codes::WINDOW_UNAVAILABLE,
            DomainError::WindowOperation(_) => codes::WINDOW_OP_FAILED,
            DomainError::Configuration(_) => codes::INTERNAL,
        };

        let message = match &error {
            // 业务规则文案对用户有意义，原样保留。
            DomainError::EmptyInput
            | DomainError::InputTooLong { .. }
            | DomainError::ApiKeyMissing
            | DomainError::InvalidSettings(_)
            | DomainError::HistoryNotFound(_)
            | DomainError::EmptyHistoryId
            | DomainError::EmptyShortcut => error.to_string(),
            // 技术性细节只进日志，不透传前端。
            DomainError::Storage(details) => {
                log::warn!("存储操作失败：{details}");
                "本地数据读写失败，请重试".to_string()
            }
            DomainError::RequestFailed(details) => {
                log::warn!("翻译服务请求失败：{details}");
                "无法连接翻译服务，请检查网络".to_string()
            }
            DomainError::ResponseParse(details) => {
                log::warn!("翻译服务响应解析失败：{details}");
                "翻译服务响应异常，请重试".to_string()
            }
            DomainError::ShortcutRegister(details) => {
                log::warn!("快捷键注册失败：{details}");
                "快捷键注册失败，请尝试其他组合键".to_string()
            }
            DomainError::WindowOperation(details) => {
                log::warn!("窗口操作失败：{details}");
                "窗口操作失败".to_string()
            }
            DomainError::WindowUnavailable => "主窗口不可用".to_string(),
            DomainError::Configuration(details) => {
                log::error!("应用配置异常：{details}");
                "应用内部异常".to_string()
            }
        };

        Self::new(code, message)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn domain_errors_map_to_stable_codes() {
        assert_eq!(
            AppError::from(DomainError::EmptyInput).code(),
            codes::TEXT_EMPTY
        );
        assert_eq!(
            AppError::from(DomainError::InputTooLong { max: 10 }).code(),
            codes::TEXT_TOO_LONG
        );
        assert_eq!(
            AppError::from(DomainError::ApiKeyMissing).code(),
            codes::API_KEY_MISSING
        );
        assert_eq!(
            AppError::from(DomainError::HistoryNotFound("x".to_string())).code(),
            codes::HISTORY_NOT_FOUND
        );
    }

    #[test]
    fn internal_code_is_reachable_via_configuration_error() {
        let error = AppError::from(DomainError::Configuration("图标缺失".to_string()));
        assert_eq!(error.code(), codes::INTERNAL);
        // 技术细节不进入用户文案。
        assert!(!error.message().contains("图标缺失"));
        assert_eq!(error.message(), "应用内部异常");
    }

    #[test]
    fn storage_details_never_reach_user_message() {
        let error = AppError::from(DomainError::Storage(
            "sqlite: table app_settings is locked (0x5)".to_string(),
        ));
        assert_eq!(error.code(), codes::STORAGE_FAILED);
        assert_eq!(error.message(), "本地数据读写失败，请重试");
    }

    #[test]
    fn business_rule_messages_pass_through() {
        let error = AppError::from(DomainError::InputTooLong { max: 10_000 });
        assert_eq!(error.message(), "输入文本超过 10000 个字符的上限");
    }
}
