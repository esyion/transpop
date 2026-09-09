import { hasTauriRuntime } from "@/lib/runtime";

import { invokeIpc } from "@/services/ipc";

/**
 * 隐藏主窗口（Esc / 关闭按钮的语义：折叠到托盘而非退出）。
 * 浏览器开发模式下无窗口可隐藏，静默返回。
 */
export async function hideMainWindow(): Promise<void> {
  if (!hasTauriRuntime()) return;
  await invokeIpc("hide_main_window");
}
