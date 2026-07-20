use tauri::{Manager, WindowEvent};

mod shortcut;
mod translate;
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
        .plugin(tauri_plugin_log::Builder::new().build())
        .plugin(tauri_plugin_store::Builder::default().build())
        .plugin(global_shortcut_plugin)
        .plugin(tauri_plugin_opener::init())
        .setup(|app| {
            let handle = app.handle().clone();

            if let Some(window) = app.get_webview_window("main") {
                window.center()?;
                window.set_always_on_top(true)?;
                window.set_skip_taskbar(true)?;
                window.set_decorations(false)?;
            }

            if let Err(err) = shortcut::register_default_shortcut(&handle) {
                eprintln!("failed to register default shortcut; showing window for reconfiguration: {err}");
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
            translate::translate,
            window::show_main_window,
            window::hide_main_window,
            shortcut::set_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}



