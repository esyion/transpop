//! 领域错误定义。

use thiserror::Error;

/// 领域层与端口契约共用的错误类型。
///
/// 覆盖业务规则违规（输入为空、设置非法等）与端口失败（存储、网络、窗口），
/// 由边界层（`shared::app_error`）统一映射为稳定的 IPC 错误码。
#[derive(Debug, Error)]
pub enum DomainError {
    /// 输入文本为空。
    #[error("输入文本为空")]
    EmptyInput,

    /// 输入文本超过长度上限。
    #[error("输入文本超过 {max} 个字符的上限")]
    InputTooLong {
        /// 允许的最大字符数。
        max: usize,
    },

    /// API 密钥未配置或为空。
    #[error("API 密钥未配置")]
    ApiKeyMissing,

    /// 设置字段未通过校验。
    #[error("设置不合法：{0}")]
    InvalidSettings(String),

    /// 指定的历史条目不存在。
    #[error("历史条目不存在：{0}")]
    HistoryNotFound(String),

    /// 历史条目 ID 为空。
    #[error("历史条目 ID 为空")]
    EmptyHistoryId,

    /// 存储层（SQLite）操作失败。
    #[error("本地存储操作失败：{0}")]
    Storage(String),

    /// 翻译服务请求失败。
    #[error("翻译服务请求失败：{0}")]
    RequestFailed(String),

    /// 翻译服务响应无法解析。
    #[error("翻译服务响应无法解析：{0}")]
    ResponseParse(String),

    /// 全局快捷键为空。
    #[error("快捷键为空")]
    EmptyShortcut,

    /// 全局快捷键注册失败。
    #[error("快捷键注册失败：{0}")]
    ShortcutRegister(String),

    /// 主窗口不可用（未创建或已销毁）。
    #[error("主窗口不可用")]
    WindowUnavailable,

    /// 窗口操作失败。
    #[error("窗口操作失败：{0}")]
    WindowOperation(String),

    /// 启动或运行所需的配置缺失。
    #[error("配置错误：{0}")]
    Configuration(String),
}
