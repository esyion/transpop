//! 版本化迁移执行器（以 `PRAGMA user_version` 为水位线）。

use rusqlite::Connection;

use crate::domain::error::DomainError;

/// 内嵌迁移脚本：`(版本号, SQL)`。
///
/// 版本号严格递增；每个脚本需保证「对尚未执行它的库」执行一次成功，
/// 且对已执行过的库不重复生效（水位线保证）。
const MIGRATIONS: &[(i64, &str)] = &[(1, include_str!("../../../migrations/0001_init.sql"))];

/// 把所有未应用的迁移按版本顺序执行到目标数据库。
///
/// 每个迁移在独立事务中执行，成功后推进 `user_version` 水位线。
pub fn run(conn: &Connection) -> Result<(), DomainError> {
    let current: i64 = conn
        .query_row("PRAGMA user_version", [], |row| row.get(0))
        .map_err(super::storage_error)?;

    for &(version, sql) in MIGRATIONS {
        if version <= current {
            continue;
        }

        let batch = format!("BEGIN;\n{sql}\nCOMMIT;\nPRAGMA user_version = {version};");
        conn.execute_batch(&batch).map_err(|err| {
            DomainError::Storage(format!("数据库迁移 v{version} 执行失败：{err}"))
        })?;
        log::info!("已应用数据库迁移 v{version}");
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    /// 打开内存数据库供测试。
    fn memory_connection() -> Connection {
        Connection::open_in_memory().expect("内存数据库创建失败")
    }

    #[test]
    fn migrations_are_idempotent_across_repeated_runs() {
        let conn = memory_connection();
        run(&conn).unwrap();
        let version: i64 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version, 1);

        // 第二次执行不得报错，也不得推进版本。
        run(&conn).unwrap();
        let version_again: i64 = conn
            .query_row("PRAGMA user_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(version_again, 1);
    }

    #[test]
    fn migration_creates_expected_tables() {
        let conn = memory_connection();
        run(&conn).unwrap();

        for table in ["app_settings", "translation_history"] {
            let count: i64 = conn
                .query_row(
                    "SELECT count(*) FROM sqlite_master WHERE type = 'table' AND name = ?1",
                    [table],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "表 {table} 应存在");
        }
    }
}
