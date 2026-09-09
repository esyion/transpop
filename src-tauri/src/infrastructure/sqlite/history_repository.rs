//! 历史仓储的 SQLite 实现。

use std::path::PathBuf;

use rusqlite::{params, Connection};

use crate::application::ports::HistoryRepository;
use crate::domain::error::DomainError;
use crate::domain::history::{HistoryItem, HISTORY_RETENTION_LIMIT};
use crate::infrastructure::sqlite::connection;

/// SQLite 版历史仓储：短连接模式。
pub struct SqliteHistoryRepository {
    path: PathBuf,
}

impl SqliteHistoryRepository {
    /// 以数据库文件路径构造仓储。
    pub fn new(path: PathBuf) -> Self {
        Self { path }
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

impl HistoryRepository for SqliteHistoryRepository {
    fn recent(&self, limit: i64) -> Result<Vec<HistoryItem>, DomainError> {
        self.with_conn(|conn| {
            let limit = limit.clamp(1, HISTORY_RETENTION_LIMIT);
            let mut statement = conn
                .prepare(
                    "SELECT id, input, output, source_language, target_language, created_at
                     FROM translation_history
                     ORDER BY created_at DESC
                     LIMIT ?1",
                )
                .map_err(super::storage_error)?;

            let items = statement
                .query_map(params![limit], |row| {
                    Ok(HistoryItem {
                        id: row.get(0)?,
                        input: row.get(1)?,
                        output: row.get(2)?,
                        source_language: row.get(3)?,
                        target_language: row.get(4)?,
                        created_at: row.get(5)?,
                    })
                })
                .map_err(super::storage_error)?
                .collect::<Result<Vec<_>, _>>()
                .map_err(super::storage_error)?;

            Ok(items)
        })
    }

    fn insert(&self, item: &HistoryItem) -> Result<(), DomainError> {
        self.with_conn(|conn| {
            conn.execute(
                "INSERT INTO translation_history
                     (id, input, output, source_language, target_language, created_at)
                 VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
                params![
                    item.id,
                    item.input,
                    item.output,
                    item.source_language,
                    item.target_language,
                    item.created_at,
                ],
            )
            .map_err(super::storage_error)?;

            // 保留策略：只保留最近 HISTORY_RETENTION_LIMIT 条。
            conn.execute(
                "DELETE FROM translation_history
                 WHERE id NOT IN (
                     SELECT id FROM translation_history
                     ORDER BY created_at DESC
                     LIMIT ?1
                 )",
                params![HISTORY_RETENTION_LIMIT],
            )
            .map_err(super::storage_error)?;

            Ok(())
        })
    }

    fn delete(&self, id: &str) -> Result<(), DomainError> {
        self.with_conn(|conn| {
            let deleted = conn
                .execute("DELETE FROM translation_history WHERE id = ?1", params![id])
                .map_err(super::storage_error)?;

            if deleted == 0 {
                return Err(DomainError::HistoryNotFound(id.to_string()));
            }
            Ok(())
        })
    }

    fn clear(&self) -> Result<(), DomainError> {
        self.with_conn(|conn| {
            conn.execute("DELETE FROM translation_history", [])
                .map_err(super::storage_error)?;
            Ok(())
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::infrastructure::sqlite::migrations;

    /// 在系统临时目录构造唯一的测试库路径。
    fn temp_db_path() -> PathBuf {
        static COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(0);
        let unique = COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        std::env::temp_dir().join(format!(
            "transpop-test-history-{}-{unique}.sqlite3",
            std::process::id()
        ))
    }

    /// 构造已完成迁移的仓储。
    fn initialized_repository() -> SqliteHistoryRepository {
        let path = temp_db_path();
        migrations::run(&connection::open(&path).unwrap()).unwrap();
        SqliteHistoryRepository::new(path)
    }

    /// 构造历史条目（created_at 即序号）。
    fn item(created_at: i64) -> HistoryItem {
        HistoryItem::new(
            format!("input-{created_at}"),
            format!("output-{created_at}"),
            "Auto".to_string(),
            "Chinese".to_string(),
            created_at,
        )
    }

    #[test]
    fn recent_orders_by_created_at_desc() {
        let repository = initialized_repository();
        for index in 0..5 {
            repository.insert(&item(index)).unwrap();
        }

        let recent = repository.recent(3).unwrap();
        assert_eq!(recent.len(), 3);
        assert_eq!(recent[0].created_at, 4);
        assert_eq!(recent[2].created_at, 2);
    }

    #[test]
    fn insert_trims_beyond_retention_limit() {
        let repository = initialized_repository();
        for index in 0..(HISTORY_RETENTION_LIMIT + 10) {
            repository.insert(&item(index)).unwrap();
        }

        let recent = repository.recent(HISTORY_RETENTION_LIMIT).unwrap();
        assert_eq!(recent.len() as i64, HISTORY_RETENTION_LIMIT);
        assert_eq!(recent[0].created_at, HISTORY_RETENTION_LIMIT + 9);
    }

    #[test]
    fn delete_missing_item_maps_to_not_found() {
        let repository = initialized_repository();
        let result = repository.delete("missing");
        assert!(matches!(result, Err(DomainError::HistoryNotFound(_))));
    }

    #[test]
    fn clear_removes_all_items() {
        let repository = initialized_repository();
        for index in 0..3 {
            repository.insert(&item(index)).unwrap();
        }

        repository.clear().unwrap();
        assert!(repository.recent(10).unwrap().is_empty());
    }
}
