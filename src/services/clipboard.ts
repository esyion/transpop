import { hasTauriRuntime } from "@/lib/runtime";

/**
 * 写文本到系统剪贴板。
 * Tauri 环境走剪贴板插件（capability 仅授予写权限），浏览器走 Web API。
 */
export async function writeClipboardText(text: string): Promise<void> {
  if (hasTauriRuntime()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }

  await navigator.clipboard.writeText(text);
}
