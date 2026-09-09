//! IPC 命令接口层：参数接收 → 边界校验 → 调用应用用例 → 结果序列化。
//!
//! 命令是薄适配器：不访问文件、数据库、网络，不承载业务规则。

pub mod history;
pub mod settings;
pub mod shortcut;
pub mod translate;
pub mod window;
