import type { UnlistenFn } from "@tauri-apps/api/event";
import { listen } from "@tauri-apps/api/event";

import { hasTauriRuntime } from "@/lib/runtime";

/** 后端唤起主窗口后广播的事件名，与 Rust `window_adapter::FOCUS_INPUT_EVENT` 对应。 */
const FOCUS_INPUT_EVENT = "transpop://focus-input";

/**
 * 订阅「窗口已唤起、请聚焦翻译输入框」事件。
 * 浏览器开发模式下返回空注销函数。
 */
export async function onFocusInput(handler: () => void): Promise<UnlistenFn> {
  if (!hasTauriRuntime()) {
    return () => undefined;
  }
  return listen(FOCUS_INPUT_EVENT, handler);
}
