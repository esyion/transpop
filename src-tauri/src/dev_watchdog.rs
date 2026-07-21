use std::{
    net::{TcpStream, ToSocketAddrs},
    thread,
    time::Duration,
};

use tauri::{AppHandle, Runtime};
use tauri_plugin_global_shortcut::GlobalShortcutExt;

const CHECK_INTERVAL: Duration = Duration::from_millis(500);
const CONNECT_TIMEOUT: Duration = Duration::from_millis(300);
const MAX_CONSECUTIVE_FAILURES: u8 = 4;

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
        let mut consecutive_failures = 0;

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

            eprintln!(
                "development server at {host}:{port} is unavailable; exiting TransPop dev process"
            );
            let _ = app.global_shortcut().unregister_all();
            std::process::exit(0);
        }
    });
}

fn server_is_reachable(host: &str, port: u16) -> bool {
    let Ok(addresses) = (host, port).to_socket_addrs() else {
        return false;
    };

    addresses
        .into_iter()
        .any(|address| TcpStream::connect_timeout(&address, CONNECT_TIMEOUT).is_ok())
}
