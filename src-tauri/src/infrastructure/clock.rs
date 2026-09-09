//! 系统时钟适配器。

use crate::application::ports::Clock;

/// 返回当前 Unix 毫秒时间戳；系统时钟早于 Unix 纪元时回退为 0。
pub fn now_millis() -> i64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|duration| duration.as_millis() as i64)
        .unwrap_or_default()
}

/// [`Clock`] 端口的系统时钟实现。
pub struct SystemClock;

impl Clock for SystemClock {
    fn now_millis(&self) -> i64 {
        now_millis()
    }
}
