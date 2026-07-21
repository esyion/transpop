use tauri::{
    AppHandle, Runtime,
    menu::{Menu, MenuItem},
    tray::{TrayIconBuilder, TrayIconEvent, MouseButton, MouseButtonState},
};

const SHOW_WINDOW_ITEM: &str = "show";
const QUIT_ITEM: &str = "quit";

pub fn create_tray<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let show_i = MenuItem::with_id(app, SHOW_WINDOW_ITEM, "显示窗口", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    let quit_i = MenuItem::with_id(app, QUIT_ITEM, "退出", true, None::<&str>)
        .map_err(|e| e.to_string())?;
    
    let menu = Menu::with_items(app, &[&show_i, &quit_i])
        .map_err(|e| e.to_string())?;

    let _tray = TrayIconBuilder::new()
        .icon(app.default_window_icon().unwrap().clone())
        .menu(&menu)
        .tooltip("TransPop")
        .on_menu_event(|app, event| {
            match event.id.as_ref() {
                SHOW_WINDOW_ITEM => {
                    if let Err(e) = show_main_window(app) {
                        eprintln!("failed to show main window: {}", e);
                    }
                }
                QUIT_ITEM => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click { 
                button: MouseButton::Left, 
                button_state: MouseButtonState::Up,
                ..
            } = event {
                let app = tray.app_handle();
                if let Err(e) = show_main_window(app) {
                    eprintln!("failed to show main window: {}", e);
                }
            }
        })
        .build(app)
        .map_err(|e| e.to_string())?;

    Ok(())
}

fn show_main_window<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    use crate::window;
    window::show_main(app)
}