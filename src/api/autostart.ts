import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";
import { hasTauriRuntime } from "@/lib/runtime";

export async function getStartupEnabled(): Promise<boolean | null> {
  if (!hasTauriRuntime()) return null;
  return isEnabled();
}

export async function setStartupEnabled(enabled: boolean): Promise<void> {
  if (!hasTauriRuntime()) return;

  if (enabled) {
    await enable();
  } else {
    await disable();
  }
}
