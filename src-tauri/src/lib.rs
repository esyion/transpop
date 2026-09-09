//! 应用装配入口：注册插件、初始化应用状态与 IPC 命令。

mod application;
mod commands;
mod domain;
mod dto;
mod infrastructure;
mod shared;
mod state;

use tauri::{AppHandle, Manager, Runtime, WindowEvent};
use tauri_plugin_log::{Target, TargetKind};

use crate::domain::error::DomainError;
use crate::infrastructure::os_shortcut;
use crate::infrastructure::window_adapter;
use crate::state::AppState;

/// 应用启动入口（移动端入口同源）。
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let global_shortcut_plugin = tauri_plugin_global_shortcut::Builder::new()
        .with_handler(|app, _shortcut, event| {
            if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
                if let Err(err) = window_adapter::show_main(app) {
                    log::warn!("全局快捷键唤起主窗口失败：{err}");
                }
            }
        })
        .build();

    tauri::Builder::default()
        // single-instance 必须最先注册：在第二次启动初始化自己的窗口、
        // 快捷键或托盘之前就将其拦截。
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Err(err) = window_adapter::show_main(app) {
                log::warn!("二次启动唤起主窗口失败：{err}");
            }
        }))
        .plugin(tauri_plugin_updater::Builder::new().build())
        .plugin(tauri_plugin_process::init())
        .plugin(log_plugin())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            None,
        ))
        .plugin(global_shortcut_plugin)
        .setup(|app| {
            let handle = app.handle().clone();

            let app_state = AppState::build(&handle).map_err(|err| {
                let wrapped: Box<dyn std::error::Error> =
                    format!("应用状态初始化失败：{err}").into();
                wrapped
            })?;
            app.manage(app_state);

            #[cfg(dev)]
            infrastructure::dev_watchdog::start(handle.clone());

            if let Err(err) = infrastructure::tray::create_tray(&handle) {
                log::warn!("创建系统托盘失败：{err}");
            }

            if let Err(err) = window_adapter::apply_main_window_properties(&handle) {
                log::warn!("应用主窗口启动属性失败：{err}");
            }

            if let Err(err) = register_startup_shortcut(&handle) {
                log::warn!("注册全局快捷键失败，展示窗口以便重新配置：{err}");
                if let Err(show_err) = window_adapter::show_main(&handle) {
                    log::warn!("快捷键注册失败后展示主窗口也失败：{show_err}");
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| match event {
            WindowEvent::CloseRequested { api, .. } if window.label() == "main" => {
                // 关闭按钮语义为折叠到托盘，而非退出进程。
                api.prevent_close();
                if let Err(err) = window.hide() {
                    log::warn!("关闭时隐藏主窗口失败：{err}");
                }
            }
            WindowEvent::Focused(false) if window.label() == "main" => {
                if let Err(err) = window.hide() {
                    log::warn!("失焦时隐藏主窗口失败：{err}");
                }
            }
            _ => {}
        })
        .invoke_handler(tauri::generate_handler![
            commands::settings::get_app_settings,
            commands::settings::save_app_settings,
            commands::history::list_recent_history,
            commands::history::delete_history_item,
            commands::history::clear_all_history,
            commands::translate::translate,
            commands::window::hide_main_window,
            commands::shortcut::set_shortcut,
        ])
        .run(tauri::generate_context!())
        .expect("Tauri 应用运行失败（启动期不可恢复错误）");
}

/// 组装日志插件：stdout + 数据目录滚动日志文件，info 级别。
fn log_plugin() -> tauri::plugin::TauriPlugin<tauri::Wry> {
    let targets = vec![
        Target::new(TargetKind::Stdout),
        Target::new(TargetKind::LogDir { file_name: None }),
    ];

    tauri_plugin_log::Builder::new()
        .targets(targets)
        .level(log::LevelFilter::Info)
        .max_file_size(512_000)
        .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepOne)
        .build()
}

/// 按持久化设置注册全局快捷键；读取失败时回退平台默认快捷键。
fn register_startup_shortcut<R: Runtime>(handle: &AppHandle<R>) -> Result<(), DomainError> {
    let (shortcut, enabled) = handle
        .state::<AppState>()
        .settings_service()
        .shortcut_config()
        .unwrap_or_else(|err| {
            log::warn!("读取快捷键设置失败，回退平台默认快捷键：{err}");
            (
                crate::domain::settings::default_shortcut().to_string(),
                true,
            )
        });

    if !enabled {
        return Ok(());
    }

    os_shortcut::register(handle, &shortcut)
}
