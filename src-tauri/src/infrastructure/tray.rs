//! 系统托盘适配器。

use tauri::{
    menu::{Menu, MenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Runtime,
};

use crate::domain::error::DomainError;
use crate::infrastructure::window_adapter;

/// 托盘菜单项：显示主窗口。
const SHOW_ITEM_ID: &str = "show";
/// 托盘菜单项：退出应用。
const QUIT_ITEM_ID: &str = "quit";

/// 创建系统托盘：左键单击或菜单「显示窗口」唤起主窗口，菜单「退出」结束进程。
pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), DomainError> {
    let show_item = MenuItem::with_id(app, SHOW_ITEM_ID, "显示窗口", true, None::<&str>)
        .map_err(|err| DomainError::Configuration(format!("托盘菜单项创建失败：{err}")))?;
    let quit_item = MenuItem::with_id(app, QUIT_ITEM_ID, "退出", true, None::<&str>)
        .map_err(|err| DomainError::Configuration(format!("托盘菜单项创建失败：{err}")))?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])
        .map_err(|err| DomainError::Configuration(format!("托盘菜单创建失败：{err}")))?;

    let icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| DomainError::Configuration("应用图标资源缺失".to_string()))?;

    TrayIconBuilder::new()
        .icon(icon)
        .menu(&menu)
        .tooltip("TransPop")
        .on_menu_event(|app, event| match event.id.as_ref() {
            SHOW_ITEM_ID => {
                if let Err(err) = window_adapter::show_main(app) {
                    log::warn!("托盘菜单唤起主窗口失败：{err}");
                }
            }
            QUIT_ITEM_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                if let Err(err) = window_adapter::show_main(tray.app_handle()) {
                    log::warn!("托盘单击唤起主窗口失败：{err}");
                }
            }
        })
        .build(app)
        .map_err(|err| DomainError::Configuration(format!("托盘创建失败：{err}")))?;

    Ok(())
}
