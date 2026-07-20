use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};

use crate::{db, window};

const FALLBACK_SHORTCUT: &str = "alt+space";

fn normalize_shortcut(shortcut: &str) -> String {
    shortcut
        .split_whitespace()
        .collect::<String>()
        .to_ascii_lowercase()
}

fn register_shortcut<R: tauri::Runtime>(app: &AppHandle<R>, shortcut: &str) -> Result<(), String> {
    let normalized = normalize_shortcut(shortcut);
    if normalized.is_empty() {
        return Err("shortcut is empty".to_string());
    }

    app.global_shortcut()
        .on_shortcut(normalized.as_str(), |app, _shortcut, event| {
            if event.state == ShortcutState::Pressed {
                if let Err(err) = window::show_main(app) {
                    eprintln!("failed to show main window from shortcut: {err}");
                }
            }
        })
        .map_err(|err| err.to_string())
}

pub fn register_configured_shortcut<R: tauri::Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let (shortcut, enabled) = db::get_shortcut_settings(app)
        .unwrap_or_else(|_| (FALLBACK_SHORTCUT.to_string(), true));

    if !enabled {
        return Ok(());
    }

    register_shortcut(app, &shortcut)
}

#[tauri::command]
pub fn set_shortcut<R: tauri::Runtime>(
    app: AppHandle<R>,
    shortcut: String,
    enabled: bool,
) -> Result<(), String> {
    app.global_shortcut()
        .unregister_all()
        .map_err(|err| err.to_string())?;

    if enabled {
        register_shortcut(&app, &shortcut)?;
    }

    Ok(())
}
