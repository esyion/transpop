//! 全局快捷键 OS 适配器（global-shortcut 插件封装）。

use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::domain::error::DomainError;
use crate::infrastructure::window_adapter;

/// 规整快捷键描述串：去除全部空白并转小写。
pub fn normalize(raw: &str) -> String {
    raw.split_whitespace()
        .collect::<String>()
        .to_ascii_lowercase()
}

/// 注册全局快捷键，按下时唤起主窗口。
pub fn register<R: Runtime>(app: &AppHandle<R>, shortcut: &str) -> Result<(), DomainError> {
    let normalized = normalize(shortcut);
    if normalized.is_empty() {
        return Err(DomainError::EmptyShortcut);
    }

    app.global_shortcut()
        .on_shortcut(normalized.as_str(), |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(err) = window_adapter::show_main(app) {
                    log::warn!("快捷键唤起主窗口失败：{err}");
                }
            }
        })
        .map_err(|err| DomainError::ShortcutRegister(err.to_string()))
}

/// 先注销全部快捷键，再按需注册（设置变更时调用）。
pub fn apply<R: Runtime>(
    app: &AppHandle<R>,
    shortcut: &str,
    enabled: bool,
) -> Result<(), DomainError> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|err| DomainError::ShortcutRegister(err.to_string()))?;

    if enabled {
        register(app, shortcut)?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn normalize_strips_whitespace_and_lowercases() {
        assert_eq!(normalize("Ctrl + Alt + T"), "ctrl+alt+t");
        assert_eq!(normalize("  "), "");
    }
}
