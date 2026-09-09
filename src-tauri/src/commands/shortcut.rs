//! 全局快捷键 IPC 命令。

use tauri::{AppHandle, Runtime};

use crate::domain::error::DomainError;
use crate::infrastructure::os_shortcut;
use crate::shared::ipc::IpcResult;

/// 重新注册全局快捷键（设置变更时由前端调用；持久化仍走 save_app_settings）。
#[tauri::command]
pub fn set_shortcut<R: Runtime>(
    app: AppHandle<R>,
    shortcut: String,
    enabled: bool,
) -> IpcResult<()> {
    if shortcut.trim().is_empty() {
        return DomainError::EmptyShortcut.into();
    }
    os_shortcut::apply(&app, &shortcut, enabled).into()
}
