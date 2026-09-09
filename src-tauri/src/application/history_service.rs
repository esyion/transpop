//! 历史用例：最近列表、单条删除与清空。

use std::sync::Arc;

use crate::domain::error::DomainError;
use crate::domain::history::{HistoryItem, MAX_RECENT_LIMIT};

use super::ports::HistoryRepository;

/// 历史用例服务。
pub struct HistoryService {
    history_repository: Arc<dyn HistoryRepository>,
}

impl HistoryService {
    /// 由端口实现组装用例。
    pub fn new(history_repository: Arc<dyn HistoryRepository>) -> Self {
        Self { history_repository }
    }

    /// 查询最近历史：`limit` 缺省为 3，并收敛到 `[1, MAX_RECENT_LIMIT]`。
    pub fn recent(&self, limit: Option<i64>) -> Result<Vec<HistoryItem>, DomainError> {
        self.history_repository
            .recent(limit.unwrap_or(3).clamp(1, MAX_RECENT_LIMIT))
    }

    /// 删除单条历史；ID 去空白后为空时返回 [`DomainError::EmptyHistoryId`]。
    pub fn delete(&self, id: &str) -> Result<(), DomainError> {
        let trimmed = id.trim();
        if trimmed.is_empty() {
            return Err(DomainError::EmptyHistoryId);
        }
        self.history_repository.delete(trimmed)
    }

    /// 清空全部历史。
    pub fn clear(&self) -> Result<(), DomainError> {
        self.history_repository.clear()
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::Mutex;

    /// 内存版历史仓储 fake。
    #[derive(Default)]
    struct FakeHistoryRepository {
        items: Mutex<Vec<HistoryItem>>,
    }

    impl FakeHistoryRepository {
        /// 追加 n 条历史（输入即 id）。
        fn seed(&self, count: usize) {
            let mut items = self.items.lock().unwrap();
            for index in 0..count {
                items.push(HistoryItem::new(
                    format!("input-{index}"),
                    format!("output-{index}"),
                    "Auto".to_string(),
                    "Chinese".to_string(),
                    index as i64,
                ));
            }
        }
    }

    impl HistoryRepository for FakeHistoryRepository {
        fn recent(&self, limit: i64) -> Result<Vec<HistoryItem>, DomainError> {
            let items = self.items.lock().unwrap();
            Ok(items.iter().rev().take(limit as usize).cloned().collect())
        }

        fn insert(&self, item: &HistoryItem) -> Result<(), DomainError> {
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

    /// 构造已播种 n 条历史的被测服务。
    fn service_seeded(count: usize) -> (HistoryService, Arc<FakeHistoryRepository>) {
        let repository = Arc::new(FakeHistoryRepository::default());
        repository.seed(count);
        (HistoryService::new(repository.clone()), repository)
    }

    #[test]
    fn recent_defaults_to_three_and_orders_desc() {
        let (service, repository) = service_seeded(5);
        let recent = service.recent(None).unwrap();
        assert_eq!(recent.len(), 3);
        assert_eq!(recent[0].input, "input-4");

        let all = service.recent(Some(MAX_RECENT_LIMIT + 10)).unwrap();
        assert_eq!(all.len(), repository.items.lock().unwrap().len());
    }

    #[test]
    fn recent_clamps_limit_to_at_least_one() {
        let (service, _) = service_seeded(3);
        assert_eq!(service.recent(Some(0)).unwrap().len(), 1);
        assert_eq!(service.recent(Some(-5)).unwrap().len(), 1);
    }

    #[test]
    fn delete_rejects_blank_id() {
        let (service, _) = service_seeded(1);
        assert!(matches!(
            service.delete("   "),
            Err(DomainError::EmptyHistoryId)
        ));
    }

    #[test]
    fn delete_missing_item_maps_to_not_found() {
        let (service, _) = service_seeded(1);
        assert!(matches!(
            service.delete("missing"),
            Err(DomainError::HistoryNotFound(_))
        ));
    }

    #[test]
    fn clear_empties_repository() {
        let (service, repository) = service_seeded(4);
        service.clear().unwrap();
        assert!(repository.items.lock().unwrap().is_empty());
    }
}
