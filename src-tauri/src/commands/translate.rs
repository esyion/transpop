//! 翻译 IPC 命令。

use tauri::{AppHandle, Manager, Runtime};

use crate::dto::translation::{TranslateRequestDto, TranslationResultDto};
use crate::shared::ipc::IpcResult;
use crate::state::AppState;

/// 执行翻译。
///
/// 安全面约束：接口地址、接口类型与模型一律来自后端设置；请求体中
/// `text` 与 `targetLanguage` 之外的字段不参与任何安全决策。
#[tauri::command]
pub async fn translate<R: Runtime>(
    app: AppHandle<R>,
    request: TranslateRequestDto,
) -> IpcResult<TranslationResultDto> {
    let service = app.state::<AppState>().translate_service();
    service
        .execute(&request.text, &request.target_language)
        .await
        .map(TranslationResultDto::from_entity)
        .into()
}
