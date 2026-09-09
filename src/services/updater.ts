import { getVersion } from "@tauri-apps/api/app";
import { relaunch } from "@tauri-apps/plugin-process";
import { check, type Update } from "@tauri-apps/plugin-updater";

import { hasTauriRuntime } from "@/lib/runtime";

/**
 * 读取应用当前版本号；非 Tauri 环境返回空字符串。
 */
export async function getCurrentVersion(): Promise<string> {
  if (!hasTauriRuntime()) return "";
  return getVersion();
}

/**
 * 检查可用更新；非 Tauri 环境返回 `null`。
 *
 * @param timeoutMs 检查请求超时（毫秒）。
 */
export async function checkForUpdate(timeoutMs: number): Promise<Update | null> {
  if (!hasTauriRuntime()) return null;
  return check({ timeout: timeoutMs });
}

/**
 * 关闭上一次检查得到的更新对象（若有）。
 */
export async function discardUpdate(update: Update | null): Promise<void> {
  if (!update) return;
  await update.close().catch(() => undefined);
}

/**
 * 下载并安装更新，`onProgress` 以百分比汇报下载进度（100 表示进入安装）。
 */
export async function downloadAndInstallUpdate(
  update: Update,
  onProgress: (percent: number) => void,
): Promise<void> {
  let downloadedBytes = 0;
  let totalBytes: number | undefined;

  await update.downloadAndInstall((event) => {
    if (event.event === "Started") {
      downloadedBytes = 0;
      totalBytes = event.data.contentLength;
      onProgress(totalBytes ? 0 : Number.NaN);
      return;
    }

    if (event.event === "Progress") {
      downloadedBytes += event.data.chunkLength;
      if (!totalBytes) return;
      onProgress(Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)));
      return;
    }

    onProgress(100);
  });
}

/**
 * 重启应用以完成更新安装；非 Tauri 环境静默返回。
 */
export async function relaunchApp(): Promise<void> {
  if (!hasTauriRuntime()) return;
  await relaunch();
}
