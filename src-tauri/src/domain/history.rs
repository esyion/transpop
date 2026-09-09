//! 翻译历史实体与保留规则。

/// 历史记录的最大保留条数（超出后淘汰最旧记录）。
pub const HISTORY_RETENTION_LIMIT: i64 = 100;

/// 单次查询历史记录的数量上限。
pub const MAX_RECENT_LIMIT: i64 = 100;

/// 翻译历史条目实体。
///
/// 通过 [`HistoryItem::new`] 构造：ID 使用 UUID v4 保证全局唯一，
/// 避免旧版「时间戳 + 长度」方案在并发时的主键冲突。
#[derive(Debug, Clone, PartialEq)]
pub struct HistoryItem {
    /// 全局唯一标识（UUID v4 字符串）。
    pub id: String,
    /// 原文。
    pub input: String,
    /// 译文。
    pub output: String,
    /// 识别出的源语言。
    pub source_language: String,
    /// 目标语言。
    pub target_language: String,
    /// 创建时间（Unix 毫秒时间戳）。
    pub created_at: i64,
}

impl HistoryItem {
    /// 由翻译结果构造新的历史条目，自动生成 UUID v4 主键。
    pub fn new(
        input: String,
        output: String,
        source_language: String,
        target_language: String,
        created_at: i64,
    ) -> Self {
        Self {
            id: uuid::Uuid::new_v4().to_string(),
            input,
            output,
            source_language,
            target_language,
            created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn new_generates_unique_uuid_ids() {
        let first = HistoryItem::new("a".into(), "b".into(), "c".into(), "d".into(), 1);
        let second = HistoryItem::new("a".into(), "b".into(), "c".into(), "d".into(), 1);
        assert_ne!(first.id, second.id);
        assert_eq!(first.id.len(), 36);
    }

    #[test]
    fn retention_limit_is_100() {
        assert_eq!(HISTORY_RETENTION_LIMIT, 100);
        assert_eq!(MAX_RECENT_LIMIT, 100);
    }
}
