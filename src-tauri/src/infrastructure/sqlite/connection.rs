//! SQLite 连接与数据库路径解析。

use std::{fs, path::PathBuf};

use rusqlite::Connection;
use tauri::{AppHandle, Manager, Runtime};

use crate::domain::error::DomainError;

/// 数据库文件名。
pub const DB_FILE_NAME: &str = "transpop.sqlite3";

/// 解析数据库文件路径（应用数据目录）并确保目录存在。
pub fn db_path<R: Runtime>(app: &AppHandle<R>) -> Result<PathBuf, DomainError> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|err| DomainError::Configuration(format!("无法解析应用数据目录：{err}")))?;
    fs::create_dir_all(&dir)
        .map_err(|err| DomainError::Storage(format!("无法创建数据目录：{err}")))?;
    Ok(dir.join(DB_FILE_NAME))
}

/// 打开（必要时创建）SQLite 数据库连接。
pub fn open(path: &std::path::Path) -> Result<Connection, DomainError> {
    Connection::open(path).map_err(|err| DomainError::Storage(format!("无法打开本地数据库：{err}")))
}
