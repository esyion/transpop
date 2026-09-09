/**
 * 判断当前是否运行在 Tauri 运行时内。
 * 浏览器开发模式（`next dev` 直接访问）为 false，界面走占位数据。
 */
export function hasTauriRuntime(): boolean {
  return typeof window !== "undefined" && "__TAURI_INTERNALS__" in window;
}
