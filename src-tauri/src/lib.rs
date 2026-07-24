use tauri::{Manager, WindowEvent};

mod db;
#[cfg(dev)]
mod dev_watchdog;
mod shortcut;
mod translate;
mod tray;
mod window;

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
        // This plugin must be registered first so a second launch is stopped
        // before it can initialize its own window, shortcuts, or tray icon.
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Err(err) = window::show_main(app) {
                eprintln!("failed to show main window from second instance: {err}");
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(global_shortcut_plugin)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();
            db::init(&handle)?;

            #[cfg(dev)]
            dev_watchdog::start(handle.clone());

            // Create system tray
            if let Err(err) = tray::create_tray(&handle) {
                eprintln!("failed to create system tray: {}", err);
            }

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
                let _ = window.hide();
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            db::get_app_settings,
            db::save_app_settings,
            db::list_recent_history,
            db::delete_history_item,
            db::clear_all_history,
            translate::translate,
            window::show_main_window,
            window::hide_main_window,
            shortcut::set_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
