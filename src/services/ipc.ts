import { invoke } from "@tauri-apps/api/core";

/**
 * IPC 统一响应信封：所有 Tauri 命令的返回结构。
 *
 * 成功：`{ ok: true, data }`；失败：`{ ok: false, error: { code, message } }`。
 */
export type IpcResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string } };

/**
 * IPC 调用失败错误。
 *
 * 携带后端稳定错误码（见 src-tauri `shared/app_error.rs` codes），
 * 界面按 `code` 分支，不应对 `message` 做字符串匹配。
 */
export class IpcError extends Error {
  /** 稳定错误码，如 `API_KEY_MISSING`、`TEXT_TOO_LONG`。 */
  readonly code: string;

  constructor(code: string, message: string) {
    super(message);
    this.name = "IpcError";
    this.code = code;
  }
}

/**
 * 调用 Tauri 命令并解包 IPC 信封。
 *
 * 仅应在 Tauri 运行时内调用；浏览器开发模式由各 feature 的 api 层分流。
 * 命令失败时抛出 {@link IpcError}。
 */
export async function invokeIpc<T>(
  command: string,
  args?: Record<string, unknown>,
): Promise<T> {
  const result = await invoke<IpcResult<T>>(command, args);
  if (!result.ok) {
    throw new IpcError(result.error.code, result.error.message);
  }
  return result.data;
}
