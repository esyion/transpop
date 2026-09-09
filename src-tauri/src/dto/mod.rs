//! IPC 数据契约：请求与响应 DTO。
//!
//! DTO 是前后端之间的稳定契约：字段一律 camelCase（serde 显式映射），
//! 不携带内部实体、密文或明文密钥。

pub mod history;
pub mod settings;
pub mod translation;
