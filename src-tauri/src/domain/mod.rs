//! 领域层：实体、值对象与业务规则。
//!
//! 本层保持纯 Rust，可脱离 Tauri 运行与测试；禁止在此访问文件、网络或环境变量。

pub mod error;
pub mod history;
pub mod settings;
pub mod translation;
