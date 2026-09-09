//! 翻译用例：校验输入 → 读取设置与密钥 → 调用翻译端口 → 落库。

use std::sync::Arc;

use crate::domain::error::DomainError;
use crate::domain::history::HistoryItem;
use crate::domain::settings::StoredSecret;
use crate::domain::translation::{validate_input, TranslationOutput, TranslationQuery};

use super::ports::{Clock, HistoryRepository, SecretStore, SettingsRepository, TranslatorClient};

/// 翻译用例服务：编排输入校验、密钥解密、远端翻译与历史写入。
pub struct TranslateService {
    settings_repository: Arc<dyn SettingsRepository>,
    history_repository: Arc<dyn HistoryRepository>,
    secret_store: Arc<dyn SecretStore>,
    translator: Arc<dyn TranslatorClient>,
    clock: Arc<dyn Clock>,
}

impl TranslateService {
    /// 由端口实现组装用例。
    pub fn new(
        settings_repository: Arc<dyn SettingsRepository>,
        history_repository: Arc<dyn HistoryRepository>,
        secret_store: Arc<dyn SecretStore>,
        translator: Arc<dyn TranslatorClient>,
        clock: Arc<dyn Clock>,
    ) -> Self {
        Self {
            settings_repository,
            history_repository,
            secret_store,
            translator,
            clock,
        }
    }

    /// 执行一次翻译。
    ///
    /// 安全面约束：接口地址、接口类型与模型一律来自后端保存的设置
    /// （而非前端请求体），解密后的 API 密钥只经 Bearer 头发往该地址。
    pub async fn execute(
        &self,
        raw_input: &str,
        raw_target_language: &str,
    ) -> Result<TranslationOutput, DomainError> {
        let text = validate_input(raw_input)?;
        let target_language = raw_target_language.trim();
        if target_language.is_empty() {
            return Err(DomainError::InvalidSettings("目标语言不能为空".to_string()));
        }

        let record = self.settings_repository.load()?;
        let api_key = self.decrypt_api_key(&record.secret)?;

        let query = TranslationQuery {
            text: text.to_string(),
            target_language: target_language.to_string(),
            api_base_url: record.settings.api_base_url.clone(),
            api_mode: record.settings.api_mode,
            model: record.settings.model.clone(),
            api_key,
        };

        let output = self.translator.translate(query).await?;

        let item = HistoryItem::new(
            text.to_string(),
            output.result.clone(),
            output.source_language.clone(),
            output.target_language.clone(),
            self.clock.now_millis(),
        );
        self.history_repository.insert(&item)?;

        Ok(output)
    }

    /// 解密已保存的 API 密钥；未配置或为空时返回 [`DomainError::ApiKeyMissing`]。
    fn decrypt_api_key(&self, secret: &StoredSecret) -> Result<String, DomainError> {
        if secret.is_empty() {
            return Err(DomainError::ApiKeyMissing);
        }
        let plaintext = self.secret_store.decrypt(secret)?;
        let key = plaintext.trim().to_string();
        if key.is_empty() {
            return Err(DomainError::ApiKeyMissing);
        }
        Ok(key)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::SettingsRecord;
    use crate::domain::settings::{StoredSecret, TranslationSettings};

    /// 内存版设置仓储 fake。
    struct FakeSettingsRepository {
        record: std::sync::Mutex<SettingsRecord>,
    }

    impl SettingsRepository for FakeSettingsRepository {
        fn load(&self) -> Result<SettingsRecord, DomainError> {
            Ok(self.record.lock().unwrap().clone())
        }

        fn save(&self, record: &SettingsRecord) -> Result<(), DomainError> {
            *self.record.lock().unwrap() = record.clone();
            Ok(())
        }
    }

    /// 内存版历史仓储 fake，可注入写入失败。
    #[derive(Default)]
    struct FakeHistoryRepository {
        items: std::sync::Mutex<Vec<HistoryItem>>,
        fail_insert: bool,
    }

    impl HistoryRepository for FakeHistoryRepository {
        fn recent(&self, limit: i64) -> Result<Vec<HistoryItem>, DomainError> {
            let items = self.items.lock().unwrap();
            Ok(items.iter().rev().take(limit as usize).cloned().collect())
        }

        fn insert(&self, item: &HistoryItem) -> Result<(), DomainError> {
            if self.fail_insert {
                return Err(DomainError::Storage("insert failed".to_string()));
            }
            self.items.lock().unwrap().push(item.clone());
            Ok(())
        }

        fn delete(&self, id: &str) -> Result<(), DomainError> {
            let mut items = self.items.lock().unwrap();
            let len_before = items.len();
            items.retain(|item| item.id != id);
            if items.len() == len_before {
                return Err(DomainError::HistoryNotFound(id.to_string()));
            }
            Ok(())
        }

        fn clear(&self) -> Result<(), DomainError> {
            self.items.lock().unwrap().clear();
            Ok(())
        }
    }

    /// 原样加解密的假密钥保险箱（密文格式 `enc:<明文>`）。
    struct FakeSecretStore;

    impl FakeSecretStore {
        /// 用假密文包装明文。
        fn wrap(plaintext: &str) -> StoredSecret {
            StoredSecret {
                ciphertext: Some(format!("enc:{plaintext}")),
                nonce: Some("nonce".to_string()),
            }
        }
    }

    impl SecretStore for FakeSecretStore {
        fn encrypt(&self, plaintext: &str) -> Result<StoredSecret, DomainError> {
            Ok(Self::wrap(plaintext))
        }

        fn decrypt(&self, secret: &StoredSecret) -> Result<String, DomainError> {
            secret
                .ciphertext
                .as_deref()
                .and_then(|value| value.strip_prefix("enc:"))
                .map(str::to_string)
                .ok_or_else(|| DomainError::Storage("corrupt secret".to_string()))
        }
    }

    /// 返回固定输出的假翻译客户端，同时记录收到的请求。
    struct FakeTranslator;

    #[async_trait::async_trait]
    impl TranslatorClient for FakeTranslator {
        async fn translate(
            &self,
            _query: TranslationQuery,
        ) -> Result<TranslationOutput, DomainError> {
            Ok(TranslationOutput {
                source_language: "Auto".to_string(),
                target_language: "Chinese".to_string(),
                result: "fake".to_string(),
            })
        }
    }

    /// 固定时钟 fake。
    struct FixedClock(i64);

    impl Clock for FixedClock {
        fn now_millis(&self) -> i64 {
            self.0
        }
    }

    /// 构造被测服务。
    fn service(record: SettingsRecord, history: Arc<FakeHistoryRepository>) -> TranslateService {
        TranslateService::new(
            Arc::new(FakeSettingsRepository {
                record: std::sync::Mutex::new(record),
            }),
            history,
            Arc::new(FakeSecretStore),
            Arc::new(FakeTranslator),
            Arc::new(FixedClock(42)),
        )
    }

    /// 构造已配置密钥的记录。
    fn record_with_key(key: &str) -> SettingsRecord {
        SettingsRecord {
            settings: TranslationSettings::default(),
            secret: FakeSecretStore::wrap(key),
        }
    }

    /// 构造未配置密钥的默认记录。
    fn record_without_key() -> SettingsRecord {
        SettingsRecord {
            settings: TranslationSettings::default(),
            secret: StoredSecret::default(),
        }
    }

    #[test]
    fn execute_without_api_key_fails_fast() {
        let history = Arc::new(FakeHistoryRepository::default());
        let result = tauri::async_runtime::block_on(
            service(record_without_key(), history.clone()).execute("hello", "Chinese"),
        );
        assert!(matches!(result, Err(DomainError::ApiKeyMissing)));
        assert!(history.items.lock().unwrap().is_empty());
    }

    #[test]
    fn execute_rejects_empty_and_overlong_input() {
        let history = Arc::new(FakeHistoryRepository::default());
        let translate = service(record_with_key("sk"), history);

        assert!(matches!(
            tauri::async_runtime::block_on(translate.execute("   ", "Chinese")),
            Err(DomainError::EmptyInput)
        ));

        let long = "字".repeat(10_001);
        assert!(matches!(
            tauri::async_runtime::block_on(translate.execute(&long, "Chinese")),
            Err(DomainError::InputTooLong { .. })
        ));
    }

    #[test]
    fn execute_rejects_empty_target_language() {
        let history = Arc::new(FakeHistoryRepository::default());
        let result = tauri::async_runtime::block_on(
            service(record_with_key("sk"), history).execute("hello", "  "),
        );
        assert!(matches!(result, Err(DomainError::InvalidSettings(_))));
    }

    #[test]
    fn execute_records_history_with_uuid_id() {
        let history = Arc::new(FakeHistoryRepository::default());
        tauri::async_runtime::block_on(
            service(record_with_key("sk"), history.clone()).execute("hello", "Chinese"),
        )
        .unwrap();

        let items = history.items.lock().unwrap();
        assert_eq!(items.len(), 1);
        assert_eq!(items[0].created_at, 42);
        assert_eq!(items[0].input, "hello");
        assert_eq!(items[0].id.len(), 36);
    }

    #[test]
    fn execute_fails_when_history_cannot_be_written() {
        let history = Arc::new(FakeHistoryRepository {
            fail_insert: true,
            ..Default::default()
        });
        let result = tauri::async_runtime::block_on(
            service(record_with_key("sk"), history).execute("hello", "Chinese"),
        );
        assert!(matches!(result, Err(DomainError::Storage(_))));
    }
}
