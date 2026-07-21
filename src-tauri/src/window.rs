use tauri::{AppHandle, Emitter, Manager, Runtime};

const MAIN_WINDOW_LABEL: &str = "main";
const FOCUS_INPUT_EVENT: &str = "transpop://focus-input";

pub fn show_main<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "main window not found".to_string())?;

    // Unhide and bring to front first
    window.show().map_err(|err| err.to_string())?;
    
    // Request user attention to ensure window is visually prominent
    window.request_user_attention(Some(tauri::UserAttentionType::Informational))
        .map_err(|err| err.to_string())?;

    // Set focus with a small delay to ensure window is ready
    std::thread::sleep(std::time::Duration::from_millis(50));
    window.set_focus().map_err(|err| err.to_string())?;
    
    // Emit focus event after window is ready
    app.emit(FOCUS_INPUT_EVENT, ())
        .map_err(|err| err.to_string())?;

    Ok(())
}

pub fn hide_main<R: Runtime>(app: &AppHandle<R>) -> Result<(), String> {
    let window = app
        .get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| "main window not found".to_string())?;

    window.hide().map_err(|err| err.to_string())
}

#[tauri::command]
pub fn show_main_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    show_main(&app)
}

#[tauri::command]
pub fn hide_main_window<R: Runtime>(app: AppHandle<R>) -> Result<(), String> {
    hide_main(&app)
}
