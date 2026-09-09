//! 设置仓储的 SQLite 实现。

use std::path::PathBuf;

use rusqlite::{params, Connection};

use crate::application::ports::{SettingsRecord, SettingsRepository};
use crate::domain::error::DomainError;
use crate::domain::settings::default_shortcut;
use crate::domain::settings::{
    sanitize_base_url, ApiMode, StoredSecret, ThemeMode, TranslationSettings,
};
use crate::infrastructure::clock;
use crate::infrastructure::sqlite::{connection, migrations};

/// SQLite 版设置仓储：短连接模式，迁移与初始化由组合根在启动时统一执行。
pub struct SqliteSettingsRepository {
    path: PathBuf,
}

impl SqliteSettingsRepository {
    /// 以数据库文件路径构造仓储。
    pub fn new(path: PathBuf) -> Self {
        Self { path }
    }

    /// 启动期初始化：执行迁移、保证默认设置行存在、修复旧版快捷键数据。
    pub fn init(&self) -> Result<(), DomainError> {
        self.with_conn(|conn| {
            migrations::run(conn)?;
            ensure_settings_row(conn)?;
            migrate_legacy_shortcut(conn)?;
            Ok(())
        })
    }

    /// 打开短连接并执行回调。
    fn with_conn<T>(
        &self,
        operation: impl FnOnce(&Connection) -> Result<T, DomainError>,
    ) -> Result<T, DomainError> {
        let conn = connection::open(&self.path)?;
        operation(&conn)
    }
}

impl SettingsRepository for SqliteSettingsRepository {
    fn load(&self) -> Result<SettingsRecord, DomainError> {
        self.with_conn(|conn| {
            ensure_settings_row(conn)?;
            load_record(conn)
        })
    }

    fn save(&self, record: &SettingsRecord) -> Result<(), DomainError> {
        self.with_conn(|conn| {
            ensure_settings_row(conn)?;
            let settings = &record.settings;
            conn.execute(
                "UPDATE app_settings
                 SET api_base_url = ?1,
                     api_mode = ?2,
                     model = ?3,
                     target_language = ?4,
                     smart_target_language = ?5,
                     shortcut = ?6,
                     shortcut_enabled = ?7,
                     theme = ?8,
                     font_scale = ?9,
                     startup = ?10,
                     auto_copy = ?11,
                     api_key_ciphertext = ?12,
                     api_key_nonce = ?13,
                     updated_at = ?14
                 WHERE id = 1",
                params![
                    settings.api_base_url,
                    settings.api_mode.as_str(),
                    settings.model,
                    settings.target_language,
                    settings.smart_target_language as i64,
                    settings.shortcut,
                    settings.shortcut_enabled as i64,
                    settings.theme.as_str(),
                    settings.font_scale,
                    settings.startup as i64,
                    settings.auto_copy as i64,
                    record.secret.ciphertext,
                    record.secret.nonce,
                    clock::now_millis(),
                ],
            )
            .map_err(super::storage_error)?;
            Ok(())
        })
    }
}

/// 保证单例设置行存在；快捷键列使用平台默认值而非 DDL 默认值。
fn ensure_settings_row(conn: &Connection) -> Result<(), DomainError> {
    let now = clock::now_millis();
    conn.execute(
        "INSERT OR IGNORE INTO app_settings (id, created_at, updated_at, shortcut)
         VALUES (1, ?1, ?1, ?2)",
        params![now, default_shortcut()],
    )
    .map_err(super::storage_error)?;
    Ok(())
}

/// 旧版数据迁移：旧默认快捷键 Alt + Space 在 Windows 被系统占用，迁移到平台默认。
fn migrate_legacy_shortcut(conn: &Connection) -> Result<(), DomainError> {
    conn.execute(
        "UPDATE app_settings SET shortcut = ?1 WHERE shortcut = 'Alt + Space'",
        params![default_shortcut()],
    )
    .map_err(super::storage_error)?;
    Ok(())
}

/// 读取设置记录：设置实体 + 已存密钥密文。
fn load_record(conn: &Connection) -> Result<SettingsRecord, DomainError> {
    let raw = conn
        .query_row(
            "SELECT api_base_url, api_mode, model, target_language, smart_target_language,
                    shortcut, shortcut_enabled, theme, font_scale, startup, auto_copy,
                    api_key_ciphertext, api_key_nonce
             FROM app_settings WHERE id = 1",
            [],
            |row| {
                Ok((
                    row.get::<_, String>(0)?,
                    row.get::<_, String>(1)?,
                    row.get::<_, String>(2)?,
                    row.get::<_, String>(3)?,
                    row.get::<_, i64>(4)?,
                    row.get::<_, String>(5)?,
                    row.get::<_, i64>(6)?,
                    row.get::<_, String>(7)?,
                    row.get::<_, f64>(8)?,
                    row.get::<_, i64>(9)?,
                    row.get::<_, i64>(10)?,
                    row.get::<_, Option<String>>(11)?,
                    row.get::<_, Option<String>>(12)?,
                ))
            },
        )
        .map_err(super::storage_error)?;

    let api_mode_raw = raw.1.as_str();
    let theme_raw = raw.7.as_str();

    Ok(SettingsRecord {
        settings: TranslationSettings {
            api_base_url: sanitize_base_url(&raw.0),
            api_mode: ApiMode::from_str_raw(api_mode_raw).ok_or_else(|| {
                DomainError::InvalidSettings(format!("未知接口类型：{api_mode_raw}"))
            })?,
            model: raw.2,
            target_language: raw.3,
            smart_target_language: raw.4 != 0,
            shortcut: raw.5,
            shortcut_enabled: raw.6 != 0,
            theme: ThemeMode::from_str_raw(theme_raw)
                .ok_or_else(|| DomainError::InvalidSettings(format!("未知主题：{theme_raw}")))?,
            font_scale: raw.8,
            startup: raw.9 != 0,
            auto_copy: raw.10 != 0,
        },
        secret: StoredSecret {
            ciphertext: raw.11,
            nonce: raw.12,
        },
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::settings::DEFAULT_API_BASE_URL;

    /// 在系统临时目录构造唯一的测试库路径。
    fn temp_db_path() -> PathBuf {
        static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let unique = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "transpop-test-settings-{}-{unique}.sqlite3",
            std::process::id()
        ))
    }

    /// 构造已初始化的仓储，并注册清理。
    fn initialized_repository() -> SqliteSettingsRepository {
        let repository = SqliteSettingsRepository::new(temp_db_path());
        repository.init().expect("设置仓储初始化失败");
        repository
    }

    #[test]
    fn load_after_init_returns_defaults() {
        let repository = initialized_repository();
        let record = repository.load().unwrap();
        assert_eq!(record.settings.api_mode, ApiMode::Responses);
        assert!(record.secret.is_empty());
        assert!(!record.has_api_key());
    }

    #[test]
    fn save_persists_settings_and_secret() {
        let repository = initialized_repository();

        let settings = TranslationSettings {
            target_language: "English".to_string(),
            font_scale: 1.2,
            ..Default::default()
        };
        let secret = StoredSecret {
            ciphertext: Some("cipher".to_string()),
            nonce: Some("nonce".to_string()),
        };
        repository
            .save(&SettingsRecord { settings, secret })
            .unwrap();

        let loaded = repository.load().unwrap();
        assert_eq!(loaded.settings.target_language, "English");
        assert!((loaded.settings.font_scale - 1.2).abs() < f64::EPSILON);
        assert_eq!(loaded.secret.ciphertext.as_deref(), Some("cipher"));
    }

    #[test]
    fn init_twice_is_idempotent() {
        let repository = initialized_repository();
        repository.init().expect("二次初始化应幂等");
    }

    #[test]
    fn init_migrates_legacy_shortcut() {
        let repository = SqliteSettingsRepository::new(temp_db_path());
        repository.init().unwrap();

        repository
            .with_conn(|conn| {
                conn.execute(
                    "UPDATE app_settings SET shortcut = 'Alt + Space' WHERE id = 1",
                    [],
                )
                .map_err(super::super::storage_error)?;
                migrate_legacy_shortcut(conn)?;
                Ok(())
            })
            .unwrap();

        let record = repository.load().unwrap();
        assert_eq!(record.settings.shortcut, default_shortcut());
    }

    #[test]
    fn load_sanitizes_legacy_invalid_base_url() {
        let repository = initialized_repository();
        repository
            .with_conn(|conn| {
                conn.execute(
                    "UPDATE app_settings SET api_base_url = 'file:///etc/passwd' WHERE id = 1",
                    [],
                )
                .map_err(|err| DomainError::Storage(err.to_string()))?;
                Ok(())
            })
            .unwrap();

        let record = repository.load().unwrap();
        assert_eq!(record.settings.api_base_url, DEFAULT_API_BASE_URL);
    }
}
