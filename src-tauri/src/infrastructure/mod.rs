//! 基础设施层：数据库、加密、网络与 OS 适配器。
//!
//! 本层实现 `application::ports` 声明的端口，并封装 Tauri 运行时细节；
//! 不向上层泄露驱动类型。

pub mod clock;
pub mod crypto;
#[cfg(dev)]
pub mod dev_watchdog;
pub mod http_translator;
pub mod os_shortcut;
pub mod sqlite;
pub mod tray;
pub mod window_adapter;
