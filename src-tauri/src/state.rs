//! 应用状态：组合根，集中组装端口实现并向命令层提供应用服务。

use std::sync::Arc;

use tauri::{AppHandle, Runtime};

use crate::application::history_service::HistoryService;
use crate::application::ports::{
    Clock, HistoryRepository, SecretStore, SettingsRepository, TranslatorClient,
};
use crate::application::settings_service::SettingsService;
use crate::application::translate_service::TranslateService;
use crate::domain::error::DomainError;
use crate::infrastructure::clock::SystemClock;
use crate::infrastructure::crypto::KeyringSecretStore;
use crate::infrastructure::http_translator::OpenAiCompatibleTranslator;
use crate::infrastructure::sqlite::connection;
use crate::infrastructure::sqlite::history_repository::SqliteHistoryRepository;
use crate::infrastructure::sqlite::settings_repository::SqliteSettingsRepository;

/// 应用状态：全部端口实现在此完成具体到抽象的绑定，经 `app.manage` 注入。
pub struct AppState {
    settings_repository: Arc<dyn SettingsRepository>,
    history_repository: Arc<dyn HistoryRepository>,
    secret_store: Arc<dyn SecretStore>,
    translator: Arc<dyn TranslatorClient>,
    clock: Arc<dyn Clock>,
}

impl AppState {
    /// 组合根：解析数据库路径、执行版本化迁移并完成依赖绑定。
    ///
    /// 仅在应用启动时调用一次；失败属于启动期不可恢复错误，由调用方
    /// 记录日志并终止启动。
    pub fn build<R: Runtime>(app: &AppHandle<R>) -> Result<Self, DomainError> {
        let db_path = connection::db_path(app)?;

        let sqlite_settings = SqliteSettingsRepository::new(db_path.clone());
        sqlite_settings.init()?;

        Ok(Self {
            settings_repository: Arc::new(sqlite_settings),
            history_repository: Arc::new(SqliteHistoryRepository::new(db_path)),
            secret_store: Arc::new(KeyringSecretStore::new()),
            translator: Arc::new(OpenAiCompatibleTranslator::new()?),
            clock: Arc::new(SystemClock),
        })
    }

    /// 设置用例。
    pub fn settings_service(&self) -> SettingsService {
        SettingsService::new(self.settings_repository.clone(), self.secret_store.clone())
    }

    /// 历史用例。
    pub fn history_service(&self) -> HistoryService {
        HistoryService::new(self.history_repository.clone())
    }

    /// 翻译用例。
    pub fn translate_service(&self) -> TranslateService {
        TranslateService::new(
            self.settings_repository.clone(),
            self.history_repository.clone(),
            self.secret_store.clone(),
            self.translator.clone(),
            self.clock.clone(),
        )
    }
}
