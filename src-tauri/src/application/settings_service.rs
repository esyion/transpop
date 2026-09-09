//! 设置用例：读取与保存（含密钥保留 / 替换规则）。

use std::sync::Arc;

use crate::domain::error::DomainError;
use crate::domain::settings::TranslationSettings;

use super::ports::{SecretStore, SettingsRecord, SettingsRepository};

/// 设置用例服务。
pub struct SettingsService {
    settings_repository: Arc<dyn SettingsRepository>,
    secret_store: Arc<dyn SecretStore>,
}

impl SettingsService {
    /// 由端口实现组装用例。
    pub fn new(
        settings_repository: Arc<dyn SettingsRepository>,
        secret_store: Arc<dyn SecretStore>,
    ) -> Self {
        Self {
            settings_repository,
            secret_store,
        }
    }

    /// 读取当前设置与密钥状态（密文不出本层）。
    pub fn load(&self) -> Result<SettingsRecord, DomainError> {
        self.settings_repository.load()
    }

    /// 读取当前生效的快捷键配置。
    pub fn shortcut_config(&self) -> Result<(String, bool), DomainError> {
        let record = self.settings_repository.load()?;
        Ok((
            record.settings.shortcut.clone(),
            record.settings.shortcut_enabled,
        ))
    }

    /// 保存设置。
    ///
    /// 密钥保留规则：`new_api_key` 为 `None` 或空白时沿用已存密钥，
    /// 否则加密替换。成功后返回保存后的完整记录。
    pub fn save(
        &self,
        requested: TranslationSettings,
        new_api_key: Option<&str>,
    ) -> Result<SettingsRecord, DomainError> {
        let mut record = self.settings_repository.load()?;

        if let Some(api_key) = new_api_key.map(str::trim).filter(|key| !key.is_empty()) {
            record.secret = self.secret_store.encrypt(api_key)?;
        }

        record.settings = requested.normalized()?;
        self.settings_repository.save(&record)?;
        Ok(record)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::application::ports::SettingsRecord;
    use crate::domain::error::DomainError;
    use crate::domain::settings::{StoredSecret, TranslationSettings, MAX_FONT_SCALE};

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

    /// 原样加解密的假密钥保险箱（密文格式 `enc:<明文>`）。
    struct FakeSecretStore;

    impl SecretStore for FakeSecretStore {
        fn encrypt(&self, plaintext: &str) -> Result<StoredSecret, DomainError> {
            Ok(StoredSecret {
                ciphertext: Some(format!("enc:{plaintext}")),
                nonce: Some("nonce".to_string()),
            })
        }

        fn decrypt(&self, secret: &StoredSecret) -> Result<String, DomainError> {
            Ok(secret
                .ciphertext
                .as_deref()
                .and_then(|value| value.strip_prefix("enc:"))
                .unwrap_or_default()
                .to_string())
        }
    }

    /// 构造被测服务。
    fn service() -> SettingsService {
        SettingsService::new(
            Arc::new(FakeSettingsRepository {
                record: std::sync::Mutex::new(SettingsRecord {
                    settings: TranslationSettings::default(),
                    secret: StoredSecret::default(),
                }),
            }),
            Arc::new(FakeSecretStore),
        )
    }

    #[test]
    fn save_with_new_key_encrypts_and_persists() {
        let service = service();
        let record = service
            .save(TranslationSettings::default(), Some(" sk-live-1 "))
            .unwrap();
        assert!(record.has_api_key());
        assert_eq!(record.secret.ciphertext.as_deref(), Some("enc:sk-live-1"));
    }

    #[test]
    fn save_without_key_keeps_existing_secret() {
        let service = service();
        service
            .save(TranslationSettings::default(), Some("sk-live-1"))
            .unwrap();

        let changed = TranslationSettings {
            target_language: "English".to_string(),
            ..Default::default()
        };
        let record = service.save(changed, None).unwrap();
        assert_eq!(record.secret.ciphertext.as_deref(), Some("enc:sk-live-1"));
        assert_eq!(record.settings.target_language, "English");
    }

    #[test]
    fn save_with_blank_key_keeps_existing_secret() {
        let service = service();
        service
            .save(TranslationSettings::default(), Some("sk-live-1"))
            .unwrap();
        let record = service
            .save(TranslationSettings::default(), Some("  "))
            .unwrap();
        assert_eq!(record.secret.ciphertext.as_deref(), Some("enc:sk-live-1"));
    }

    #[test]
    fn save_rejects_invalid_settings() {
        let service = service();
        let invalid = TranslationSettings {
            font_scale: MAX_FONT_SCALE + 1.0,
            ..Default::default()
        };
        let result = service.save(invalid, Some("sk"));
        assert!(matches!(result, Err(DomainError::InvalidSettings(_))));
    }

    #[test]
    fn shortcut_config_reflects_saved_settings() {
        let service = service();
        let changed = TranslationSettings {
            shortcut: "Ctrl + K".to_string(),
            shortcut_enabled: false,
            ..Default::default()
        };
        service.save(changed, None).unwrap();

        let (shortcut, enabled) = service.shortcut_config().unwrap();
        assert_eq!(shortcut, "Ctrl + K");
        assert!(!enabled);
    }
}
