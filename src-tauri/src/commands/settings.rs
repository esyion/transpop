//! 应用设置 IPC 命令。

use tauri::State;

use crate::dto::settings::AppSettingsDto;
use crate::shared::ipc::IpcResult;
use crate::state::AppState;

/// 读取应用设置（明文密钥不回传，只返回「已配置」布尔位）。
#[tauri::command]
pub fn get_app_settings(state: State<'_, AppState>) -> IpcResult<AppSettingsDto> {
    state
        .settings_service()
        .load()
        .map(|record| AppSettingsDto::from_record(&record))
        .into()
}

/// 保存应用设置；填写了新 API 密钥则加密替换，否则沿用已存密钥。
#[tauri::command]
pub fn save_app_settings(
    state: State<'_, AppState>,
    settings: AppSettingsDto,
) -> IpcResult<AppSettingsDto> {
    let requested = match settings.to_domain() {
        Ok(domain) => domain,
        Err(err) => return err.into(),
    };

    state
        .settings_service()
        .save(requested, settings.submitted_api_key())
        .map(|record| AppSettingsDto::from_record(&record))
        .into()
}
