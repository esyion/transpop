//! 主窗口操作适配器。

use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::domain::error::DomainError;

/// 主窗口标签。
const MAIN_WINDOW_LABEL: &str = "main";
/// 窗口唤起完成后广播给前端的事件：回到翻译页并聚焦输入框。
pub const FOCUS_INPUT_EVENT: &str = "transpop://focus-input";
/// 部分平台（尤其 Windows）show 之后立刻 set_focus 会失效，需要短暂延迟。
const FOCUS_DELAY_MS: u64 = 50;

/// 显示主窗口并请求焦点；焦点与输入事件在后台线程延迟触发，不阻塞调用方。
///
/// 此函数位于全局快捷键与托盘的事件回调路径上，禁止同步 sleep。
pub fn show_main<R: Runtime>(app: &AppHandle<R>) -> Result<(), DomainError> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or(DomainError::WindowUnavailable)?;

    window
        .show()
        .map_err(|err| DomainError::WindowOperation(format!("显示窗口失败：{err}")))?;
    window
        .request_user_attention(Some(tauri::UserAttentionType::Informational))
        .map_err(|err| DomainError::WindowOperation(format!("请求注意失败：{err}")))?;

    let focus_app = app.clone();
    let focus_window = window;
    std::thread::Builder::new()
        .name("focus-main-window".to_string())
        .spawn(move || {
            std::thread::sleep(std::time::Duration::from_millis(FOCUS_DELAY_MS));
            if let Err(err) = focus_window.set_focus() {
                log::warn!("主窗口聚焦失败：{err}");
            }
            if let Err(err) = focus_app.emit(FOCUS_INPUT_EVENT, ()) {
                log::warn!("广播聚焦事件失败：{err}");
            }
        })
        .map_err(|err| DomainError::WindowOperation(format!("聚焦线程创建失败：{err}")))?;

    Ok(())
}

/// 隐藏主窗口（Esc / 关闭按钮均折叠到托盘，而非退出进程）。
pub fn hide_main<R: Runtime>(app: &AppHandle<R>) -> Result<(), DomainError> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or(DomainError::WindowUnavailable)?;
    window
        .hide()
        .map_err(|err| DomainError::WindowOperation(format!("隐藏窗口失败：{err}")))
}

/// 应用主窗口启动属性：居中、置顶、跳过任务栏、无边框。
pub fn apply_main_window_properties<R: Runtime>(app: &AppHandle<R>) -> Result<(), DomainError> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or(DomainError::WindowUnavailable)?;

    window
        .center()
        .map_err(|err| DomainError::WindowOperation(format!("窗口居中失败：{err}")))?;
    window
        .set_always_on_top(true)
        .map_err(|err| DomainError::WindowOperation(format!("置顶设置失败：{err}")))?;
    window
        .set_skip_taskbar(true)
        .map_err(|err| DomainError::WindowOperation(format!("跳过任务栏设置失败：{err}")))?;
    window
        .set_decorations(false)
        .map_err(|err| DomainError::WindowOperation(format!("无边框设置失败：{err}")))?;
    Ok(())
}
