//! SQLite 存储适配器。

pub mod connection;
pub mod history_repository;
pub mod migrations;
pub mod settings_repository;

use crate::domain::error::DomainError;

/// 将 rusqlite 错误统一映射为领域存储错误。
pub(crate) fn storage_error(err: rusqlite::Error) -> DomainError {
    DomainError::Storage(err.to_string())
}
