//! 开发期看门狗：dev server 挂掉后自动退出 Tauri 进程，防止残留僵尸窗口。
//!
//! 仅在 `cfg(dev)`（`tauri dev`）构建中编译，release 产物不含本模块。

use std::{
    net::{TcpStream, ToSocketAddrs},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

/// 探测间隔。
const CHECK_INTERVAL: Duration = Duration::from_millis(500);
/// TCP 连接超时。
const CONNECT_TIMEOUT: Duration = Duration::from_millis(300);
/// 连续失败多少次后退出进程。
const MAX_CONSECUTIVE_FAILURES: u8 = 4;

/// 启动看门狗线程；未配置 devUrl 时直接返回。
pub fn start<R: Runtime>(app: AppHandle<R>) {
    let Some(dev_url) = app.config().build.dev_url.as_ref() else {
        return;
    };
    let Some(host) = dev_url.host_str().map(str::to_owned) else {
        return;
    };
    let Some(port) = dev_url.port_or_known_default() else {
        return;
    };

    thread::spawn(move || {
        let mut consecutive_failures = 0_u8;

        loop {
            thread::sleep(CHECK_INTERVAL);

            if server_is_reachable(&host, port) {
                consecutive_failures = 0;
                continue;
            }

            consecutive_failures += 1;
            if consecutive_failures < MAX_CONSECUTIVE_FAILURES {
                continue;
            }

            log::warn!("dev server {host}:{port} 已不可达，退出 TransPop 开发进程");
            if let Err(err) = app.global_shortcut().unregister_all() {
                log::warn!("退出前注销全局快捷键失败：{err}");
            }
            std::process::exit(0);
        }
    });
}

/// 探测 dev server TCP 端口是否可达。
fn server_is_reachable(host: &str, port: u16) -> bool {
    let Ok(addresses) = (host, port).to_socket_addrs() else {
        return false;
    };

    addresses
        .into_iter()
        .any(|address| TcpStream::connect_timeout(&address, CONNECT_TIMEOUT).is_ok())
}
