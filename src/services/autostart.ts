import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

import { hasTauriRuntime } from "@/lib/runtime";

/**
 * 读取开机自启状态；非 Tauri 环境返回 `null`（未知）。
 */
export async function getStartupEnabled(): Promise<boolean | null> {
  if (!hasTauriRuntime()) return null;
  return isEnabled();
}

/**
 * 设置开机自启状态；非 Tauri 环境静默返回。
 */
export async function setStartupEnabled(enabled: boolean): Promise<void> {
  if (!hasTauriRuntime()) return;

  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
