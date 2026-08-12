use tauri::{
  menu::{Menu, MenuItem},
  tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
  Manager, WindowEvent,
};

pub fn run() {
  tauri::Builder::default()
    // 单实例：重复启动时退出新进程，并把焦点还给已运行实例的主窗口
    .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
      if let Some(window) = app.get_webview_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
      }
    }))
    .plugin(tauri_plugin_sql::Builder::default().build())
    .plugin(tauri_plugin_notification::init())
    .on_window_event(|window, event| {
      if let WindowEvent::CloseRequested { api, .. } = event {
        let _ = window.hide();
        api.prevent_close();
      }
    })
    .setup(|app| {
      let show = MenuItem::with_id(app, "show", "显示 LiteDo", true, None::<&str>)?;
      let quit = MenuItem::with_id(app, "quit", "退出", true, None::<&str>)?;
      let menu = Menu::with_items(app, &[&show, &quit])?;

      let mut builder = TrayIconBuilder::with_id("main-tray")
        .menu(&menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| match event.id.as_ref() {
          "show" => {
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.unminimize();
              let _ = window.set_focus();
            }
          }
          "quit" => app.exit(0),
          _ => {}
        })
        .on_tray_icon_event(|tray, event| {
          if let TrayIconEvent::Click {
            button: MouseButton::Left,
            button_state: MouseButtonState::Up,
            ..
          } = event
          {
            let app = tray.app_handle();
            if let Some(window) = app.get_webview_window("main") {
              let _ = window.show();
              let _ = window.unminimize();
              let _ = window.set_focus();
            }
          }
        });

      if let Some(icon) = app.default_window_icon().cloned() {
        builder = builder.icon(icon);
      }

      builder.build(app)?;
      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
