import { hasTauriRuntime } from "./runtime";

export async function writeClipboardText(text: string): Promise<void> {
  if (hasTauriRuntime()) {
    const { writeText } = await import("@tauri-apps/plugin-clipboard-manager");
    await writeText(text);
    return;
  }

  await navigator.clipboard.writeText(text);
}
