//! IPC 响应信封：所有命令统一返回 `{ ok, data | error }` 结构。
//!
//! 命令层永不返回 Tauri 的 `Err`，错误一律序列化进信封，
//! 前端网关据此解包并抛出带 `code` 的 `IpcError`。

use serde::Serialize;

use super::app_error::AppError;
use crate::domain::error::DomainError;

/// 成功响应体：`{ ok: true, data }`。
#[derive(Debug, Serialize)]
pub struct IpcSuccess<T> {
    ok: bool,
    data: T,
}

/// 失败响应体：`{ ok: false, error: { code, message } }`。
#[derive(Debug, Serialize)]
pub struct IpcFailure {
    ok: bool,
    error: IpcErrorBody,
}

/// 错误详情：稳定错误码 + 用户可读文案。
#[derive(Debug, Serialize)]
pub struct IpcErrorBody {
    code: &'static str,
    message: String,
}

/// 统一 IPC 响应信封。
#[derive(Debug, Serialize)]
#[serde(untagged)]
pub enum IpcResult<T> {
    /// 成功：携带业务数据。
    Success(IpcSuccess<T>),
    /// 失败：携带错误码与文案。
    Failure(IpcFailure),
}

impl<T> IpcResult<T> {
    /// 构造成功响应。
    pub fn ok(data: T) -> Self {
        IpcResult::Success(IpcSuccess { ok: true, data })
    }
}

impl<T> From<DomainError> for IpcResult<T> {
    fn from(error: DomainError) -> Self {
        IpcResult::from(Result::<T, DomainError>::Err(error))
    }
}

impl<T, E> From<Result<T, E>> for IpcResult<T>
where
    E: Into<AppError>,
{
    fn from(result: Result<T, E>) -> Self {
        match result {
            Ok(data) => IpcResult::ok(data),
            Err(err) => {
                let app_error: AppError = err.into();
                log::warn!(target: "ipc", "command failed: code={} message={}", app_error.code(), app_error.message());
                IpcResult::Failure(IpcFailure {
                    ok: false,
                    error: IpcErrorBody {
                        code: app_error.code(),
                        message: app_error.message().to_string(),
                    },
                })
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::domain::error::DomainError;
    use serde_json::json;

    #[test]
    fn success_serializes_with_ok_true() {
        let value = serde_json::to_value(IpcResult::ok(42_u32)).unwrap();
        assert_eq!(value, json!({ "ok": true, "data": 42 }));
    }

    #[test]
    fn failure_serializes_code_and_message() {
        let result: IpcResult<u32> =
            Result::<u32, DomainError>::Err(DomainError::EmptyInput).into();
        let value = serde_json::to_value(result).unwrap();
        assert_eq!(
            value,
            json!({
                "ok": false,
                "error": { "code": "TEXT_EMPTY", "message": "输入文本为空" }
            })
        );
    }

    #[test]
    fn internal_errors_never_leak_debug_details_by_default() {
        let result: IpcResult<()> =
            Result::<(), DomainError>::Err(DomainError::Storage("sqlite busy".to_string())).into();
        let value = serde_json::to_value(result).unwrap();
        assert_eq!(value["error"]["code"], json!("STORAGE_FAILED"));
    }
}
