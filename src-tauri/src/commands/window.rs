//! 主窗口 IPC 命令。

use tauri::{AppHandle, Runtime};

use crate::infrastructure::window_adapter;
use crate::shared::ipc::IpcResult;

/// 隐藏主窗口（Esc / 关闭按钮的语义：折叠到托盘而非退出）。
#[tauri::command]
pub fn hide_main_window<R: Runtime>(app: AppHandle<R>) -> IpcResult<()> {
    window_adapter::hide_main(&app).into()
}
