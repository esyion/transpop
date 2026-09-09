//! 翻译历史 IPC 命令。

use tauri::State;

use crate::dto::history::HistoryItemDto;
use crate::shared::ipc::IpcResult;
use crate::state::AppState;

/// 查询最近翻译历史（`limit` 缺省 3，上限 100）。
#[tauri::command]
pub fn list_recent_history(
    state: State<'_, AppState>,
    limit: Option<i64>,
) -> IpcResult<Vec<HistoryItemDto>> {
    state
        .history_service()
        .recent(limit)
        .map(|items| items.iter().map(HistoryItemDto::from_entity).collect())
        .into()
}

/// 删除单条历史记录。
#[tauri::command]
pub fn delete_history_item(state: State<'_, AppState>, id: String) -> IpcResult<()> {
    state.history_service().delete(&id).into()
}

/// 清空全部历史记录。
#[tauri::command]
pub fn clear_all_history(state: State<'_, AppState>) -> IpcResult<()> {
    state.history_service().clear().into()
}
