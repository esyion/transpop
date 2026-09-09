//! 应用层端口定义。
//!
//! 端口由应用层声明、由基础设施层实现（SQLite、Keyring、reqwest），
//! 使用例可脱离真实 I/O 用 fake 测试。

use async_trait::async_trait;

use crate::domain::error::DomainError;
use crate::domain::history::HistoryItem;
use crate::domain::settings::{StoredSecret, TranslationSettings};
use crate::domain::translation::{TranslationOutput, TranslationQuery};

/// 设置仓储的聚合记录：设置实体 + 已加密密钥。
#[derive(Debug, Clone)]
pub struct SettingsRecord {
    /// 当前生效的设置。
    pub settings: TranslationSettings,
    /// 已加密存储的 API 密钥；尚未配置时为空。
    pub secret: StoredSecret,
}

impl SettingsRecord {
    /// 判断是否已配置 API 密钥。
    pub fn has_api_key(&self) -> bool {
        !self.secret.is_empty()
    }
}

/// 设置仓储端口：负责设置实体与 API 密钥密文的持久化。
pub trait SettingsRepository: Send + Sync {
    /// 读取当前设置与已存密钥密文；首次运行时保证存在默认行。
    fn load(&self) -> Result<SettingsRecord, DomainError>;

    /// 写入设置与密钥密文。
    fn save(&self, record: &SettingsRecord) -> Result<(), DomainError>;
}

/// 历史仓储端口：负责翻译历史的增删查与保留策略落地。
pub trait HistoryRepository: Send + Sync {
    /// 按 `created_at` 倒序返回最多 `limit` 条历史。
    fn recent(&self, limit: i64) -> Result<Vec<HistoryItem>, DomainError>;

    /// 写入一条历史，并按保留上限淘汰最旧记录。
    fn insert(&self, item: &HistoryItem) -> Result<(), DomainError>;

    /// 删除单条历史；条目不存在时返回 [`DomainError::HistoryNotFound`]。
    fn delete(&self, id: &str) -> Result<(), DomainError>;

    /// 清空全部历史。
    fn clear(&self) -> Result<(), DomainError>;
}

/// 密钥保险箱端口：负责 API 密钥的加解密（主密钥托管在系统钥匙串）。
pub trait SecretStore: Send + Sync {
    /// 加密明文密钥，返回可持久化的密文值对象。
    fn encrypt(&self, plaintext: &str) -> Result<StoredSecret, DomainError>;

    /// 解密密文值对象，还原明文密钥。
    fn decrypt(&self, secret: &StoredSecret) -> Result<String, DomainError>;
}

/// 翻译客户端端口：屏蔽具体的 OpenAI 兼容协议实现。
///
/// 使用 `#[async_trait]` 以支持 `Arc<dyn TranslatorClient>` 动态分发。
#[async_trait]
pub trait TranslatorClient: Send + Sync {
    /// 调用远端模型完成一次翻译。
    async fn translate(&self, query: TranslationQuery) -> Result<TranslationOutput, DomainError>;
}

/// 时钟端口：为用例提供可注入的当前时间。
pub trait Clock: Send + Sync {
    /// 返回当前 Unix 毫秒时间戳。
    fn now_millis(&self) -> i64;
}
