use std::sync::Mutex;

use tauri::{Manager, State, WindowEvent};

mod db;
mod shortcut;
mod translate;
mod window;

#[derive(Default)]
struct UiRuntimeState {
    hide_on_blur: Mutex<bool>,
}

#[tauri::command]
fn set_hide_on_blur(state: State<'_, UiRuntimeState>, enabled: bool) -> Result<(), String> {
    *state.hide_on_blur.lock().map_err(|err| err.to_string())? = enabled;
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let global_shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                if let Err(err) = window::show_main(app) {
                    eprintln!("failed to show main window from global shortcut: {err}");
                }
            }
        })
        .build();

    tauri::Builder::default()
        .manage(UiRuntimeState { hide_on_blur: Mutex::new(true) })
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(global_shortcut_plugin)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            db::init(&handle)?;

            if let Some(window) = app.get_webview_window("main") {
                window.center()?;
                window.set_always_on_top(true)?;
                window.set_skip_taskbar(true)?;
                window.set_decorations(false)?;
            }

            if let Err(err) = shortcut::register_configured_shortcut(&handle) {
                eprintln!("failed to register configured shortcut; showing window for reconfiguration: {err}");
                if let Err(show_err) = window::show_main(&handle) {
                    eprintln!("failed to show main window after shortcut registration failure: {show_err}");
                }
            }
            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                api.prevent_close();
                let _ = window.hide();
            }
            WindowEvent::Focused(false) if window.label() == "main" => {
                let should_hide = window
                    .state::<UiRuntimeState>()
                    .hide_on_blur
                    .lock()
                    .map(|value| *value)
                    .unwrap_or(true);
                if should_hide {
                    let _ = window.hide();
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            db::get_app_settings,
            db::save_app_settings,
            db::list_recent_history,
            translate::translate,
            window::show_main_window,
            window::hide_main_window,
            shortcut::set_shortcut,
            set_hide_on_blur,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

