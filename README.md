# LiteDo 本地待办与项目管理

一个完全离线的个人 Todo / 项目管理桌面应用，以“项目 + 日期”为核心。

## 已实现功能

- 今日清单：临时待办 + 日期覆盖今天的未完成项目任务自动追加
- 项目：新建/编辑/删除项目，项目下有多个细化任务，任务和项目都有执行日期范围
- 日历：月历点选查看当天待办，同一页下方展示项目任务甘特图
- 格式操作：完成划线、颜色卡、P0–P3 优先级、备注
- 提醒：任务可开启“具体到时间点”，支持到点 / 提前 5 / 15 / 60 分钟提醒
- 提醒仅在应用运行时生效；关闭窗口会最小化到托盘，托盘菜单可恢复窗口或退出
- 数据全部保存在本地 SQLite，无需联网

## 技术栈

- 前端：Vue 3 + TypeScript + Tailwind CSS 4
- 桌面：Tauri 2（Windows）
- 数据库：SQLite（tauri-plugin-sql）
- 通知：tauri-plugin-notification

## 开发

```bash
npm install
npm run tauri dev
```

## 构建 Windows 安装包

```bash
npm run tauri build
```

构建产物：

- 免安装 exe：`src-tauri/target/release/litedo.exe`
- NSIS 安装包：`src-tauri/target/release/bundle/nsis/LiteDo_0.1.0_x64-setup.exe`

## 数据位置

SQLite 数据库文件由 Tauri 创建在系统应用数据目录：

```text
%APPDATA%\com.litedo.desktop\litedo.db
```

首次启动会写入一组示例项目/任务，方便直接查看效果；示例数据可以在界面中编辑或删除。

## 使用说明

- 点击窗口右上角关闭按钮或侧边栏“最小化到托盘”会隐藏到系统托盘
- 从托盘点击图标或菜单“显示 LiteDo”恢复窗口
- 托盘菜单“退出”才会真正结束应用
- 提醒到点时：窗口可见则显示应用内提醒卡片；窗口隐藏到托盘时发送 Windows 系统通知
