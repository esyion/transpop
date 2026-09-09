//! 翻译历史 IPC DTO。

use serde::{Deserialize, Serialize};

use crate::domain::history::HistoryItem;

/// 历史条目 DTO。
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HistoryItemDto {
    /// 条目 ID（UUID 字符串）。
    pub id: String,
    /// 原文。
    pub input: String,
    /// 译文。
    pub output: String,
    /// 源语言。
    pub source_language: String,
    /// 目标语言。
    pub target_language: String,
    /// 创建时间（Unix 毫秒）。
    pub created_at: i64,
}

impl HistoryItemDto {
    /// 由领域实体转换。
    pub fn from_entity(item: &HistoryItem) -> Self {
        Self {
            id: item.id.clone(),
            input: item.input.clone(),
            output: item.output.clone(),
            source_language: item.source_language.clone(),
            target_language: item.target_language.clone(),
            created_at: item.created_at,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn serializes_with_camel_case_keys() {
        let item = HistoryItem::new(
            "hello".to_string(),
            "你好".to_string(),
            "English".to_string(),
            "Chinese".to_string(),
            1_700_000_000_000,
        );
        let value = serde_json::to_value(HistoryItemDto::from_entity(&item)).unwrap();
        assert_eq!(value["sourceLanguage"], "English");
        assert_eq!(value["targetLanguage"], "Chinese");
        assert_eq!(value["createdAt"], 1_700_000_000_000_i64);
    }
}
