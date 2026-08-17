# LiteDo 代码索引

> 面向 AI / 新开发者的模块速查手册。修改代码前先读这里，按需深入对应文件。
> 项目：完全离线的个人 Todo / 项目管理桌面应用，以“项目 + 日期”为核心。
> 技术栈：Tauri 2（Windows）+ Vue 3 + TypeScript + Tailwind CSS 4 + SQLite（tauri-plugin-sql）。

## 目录结构

```text
├── index.html                  # Vite 入口 HTML
├── vite.config.ts              # Vite 配置（端口 1420，tailwind/vue 插件）
├── tsconfig.json               # TS 严格模式
├── src/
│   ├── main.ts                 # Vue 应用入口
│   ├── App.vue                 # 根组件：侧边栏导航 + 视图路由 + 全局弹层挂载
│   ├── style.css               # 全局主题（CSS 变量 light/dark）+ 通用组件样式类
│   ├── lib/
│   │   ├── types.ts            # 领域类型：Project / Task / 输入类型
│   │   ├── format.ts           # 日期工具函数（纯函数，无副作用）
│   │   ├── db.ts               # 所有 SQLite 读写操作 + 建表 + 示例数据 seed
│   │   └── store.ts            # 全局响应式状态 + 业务操作（刷新/开关任务/打开弹层）
│   ├── views/
│   │   ├── TodayView.vue       # 今日清单（临时待办 + 项目任务自动追加）
│   │   ├── CalendarView.vue    # 日历 + 甘特图
│   │   ├── ProjectsView.vue    # 项目列表卡片（含统计卡片、右键菜单）
│   │   ├── ProjectDetailView.vue # 项目详情（任务列表 + 进度）
│   │   ├── ArchiveView.vue     # 归档页（归档项目列表 + 恢复）
│   │   └── SettingsView.vue    # 设置页（开机启动）
│   └── components/
│       ├── ProjectModal.vue    # 新建/编辑项目弹窗
│       ├── TaskModal.vue       # 新建/编辑任务弹窗（时间点、提醒、重复）
│       ├── TaskItem.vue        # 单条任务卡片（勾选/编辑/删除）
│       ├── ContextMenu.vue     # 通用右键菜单（跟随鼠标、按可视范围钳制位置，slot 放菜单项）
│       ├── ConfirmDialog.vue   # 主题化确认弹窗（替代原生 confirm，居中显示）
│       ├── ReminderPopup.vue   # 应用内提醒弹窗（右下角）
│       └── ExternalReminderWindow.vue # 托盘隐藏时的独立提醒窗口
├── src-tauri/
│   ├── tauri.conf.json         # 窗口/打包配置
│   ├── capabilities/default.json # 权限：sql、notification、core、动态提醒窗口
│   └── src/lib.rs              # 托盘 + 关闭到托盘逻辑（Rust）
└── docs/INDEX.md               # 本文档
```

## 数据模型（SQLite `litedo.db`，位于 %APPDATA%\com.litedo.desktop）

### projects 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| name | TEXT | 项目名称 |
| start_date / end_date | TEXT | 执行日期范围，格式 `YYYY-MM-DD`（全项目统一字符串比较） |
| color | TEXT | `red/amber/green/blue/purple/teal` |
| priority | TEXT | `P0–P3` |
| note | TEXT | 目标/备注 |
| archived | INTEGER | 0=正常，1=已归档/删除（软删除） |
| created_at | TEXT | 本地时间 |

**注意**：项目没有“状态”字段，状态由视图层派生（进行中/未开始/已完成）。

### tasks 表

| 字段 | 类型 | 说明 |
|---|---|---|
| id | INTEGER PK | 自增 |
| project_id | INTEGER | 所属项目；NULL = 临时待办 |
| title | TEXT | 任务名称 |
| start_date / end_date | TEXT | 日期范围（临时任务两者等于 todo_date） |
| color / priority / note | — | 同上 |
| has_time | INTEGER | 是否具体到时间点 |
| time_point | TEXT | `HH:MM` |
| reminder | INTEGER | 是否开启提醒 |
| reminder_offset_minutes | INTEGER | 提前分钟数（-1=不提醒，存 0/5/15/60；0=到点） |
| done | INTEGER | 0/1 完成状态 |
| is_temp | INTEGER | 1=临时待办（project_id 必为 NULL） |
| todo_date | TEXT | 临时任务所属日期 |
| last_reminded_at | TEXT | 已确认的具体提醒时刻（ISO 字符串；改时间后可再次提醒） |
| repeat | TEXT | 重复规则：`''`=不重复，`daily`/`weekly`/`monthly` |
| archived | INTEGER | 软删除 |
| created_at | TEXT | 本地时间 |

## 各模块详解

### src/lib/format.ts —— 日期纯函数（无 import 依赖，可放心复用）

- `today()` / `toDateStr()` / `parseDate()` / `addDays()` —— 日期运算，注意 `parseDate` 用本地时区 `new Date(y, m-1, d)` 避免 UTC 偏移。
- `formatDate()`（M月D日）/ `formatShort()`（M/D）/ `weekdayCN()`（周X）/ `dateInRange()`（字符串区间比较）。
- `diffDays(start, end)` —— 天数差（甘特图列计算依赖）。
- `monthDays(year, month)` —— 月历格子（含前导空位，7 对齐）。
- `reminderAt(task)` —— 由 time_point - offset 计算提醒时刻的 Date。
- `sortPriority()` —— P0→P3 排序。
- 新增：`addMonths()` / `advanceRepeat(value, repeat)`（重复任务日期推进）。

### src/lib/db.ts —— 唯一数据访问层（其余文件不得直接拼 SQL）

- `getDb()`：懒加载数据库连接；`CREATE TABLE IF NOT EXISTS` 建表；**列不存在时 `ALTER TABLE` 迁移**（新增字段需在此补迁移）；空库写入 `seed()` 示例数据。
- 项目：`listProjects()`（带 task_count/done_count 统计）、`createProject`、`updateProject`、`deleteProject`（软删：项目+其任务 archived=1）。
- 任务：`listTasks()`（LEFT JOIN projects 取 project_name）、`createTask`、`updateTask`、`deleteTask`、`setTaskDone`、`setTaskReminded`、`setTaskDates`（重复任务推进日期用）。
- 归档：`archiveProject(id)`（软删项目+任务）、`listArchivedProjects()`、`restoreProject(id)`（恢复项目+任务）。

### src/lib/store.ts —— 全局响应式状态 + 业务编排

- `store`（reactive 单例）：当前视图 view、projects/tasks 数组、选中项目/日期、各弹窗开关、编辑对象、提醒队列、按提醒时刻记录的 snoozedUntil。
- `refresh()`：重新拉取 projects + archivedProjects + tasks（所有变更后调用）。
- 派生查询：`currentProject()`、`projectTasks()`、`todayTempTasks()`（todo_date=今天且未归档）、`todayProjectTasks()`（未完成且日期覆盖今天）、`tasksOnDate()`。
- 操作：`toggleTask()`（**重复任务勾选完成 = 直接顺延到下一周期、done 保持 0**，不重复任务走 setTaskDone）、`openProject()`、`openProjectModal()`、`openTaskModal()`、`closeModals()`。
- 确认弹窗：`confirmDialog(options)` 返回 Promise<boolean>，写入 `store.confirm` 由 ConfirmDialog.vue 渲染；已全面替代原生 `confirm`。
- 弹窗模式：`editingProject/editingTask` 非空 = 编辑态；`taskModalProjectId` 预选所属项目；`taskModalDate` 日历页新建时预填日期。

### src/views/CalendarView.vue —— 月历 + 甘特图（本文件最复杂）

- `month/year/selected` ref 控制当前月与选中日期；`selectedTasks` 右侧当天待办列表（**右键弹出菜单：编辑任务 / 删除任务**，空白区域右键关闭菜单）。
- **甘特图布局**：外层 grid `150px repeat(N, minmax(22px,1fr))`，`N = ganttDays`（当月天数）。列宽 `1fr` 会随窗口拉伸，因此**“今天”分割线不能用按 minWidth 推算的 left 像素值定位**（缩放后偏移的 bug 根源），而是作为 grid 子元素用 `gridColumn: offset+2 / offset+3` + `gridRow: 1 / -1` 定位，天然对齐任何宽度。
- 行：`ganttLanes` 每个项目一行 + 每任务一行（**已完成任务不显示**）；`barStyle()` 用 `gridColumn: start+2 / end+2` 画条。
- 表头：当天日期格替换为“今天”字样并高亮（`--app-primary` 底白字）；分割线 `justifySelf: start` 左对齐“今天”格子左边界。
- `moveMonth/selectDate` 切换月份/选中日期；`openTaskForDate` 在选中日新建任务。

### src/views/ProjectsView.vue —— 项目列表

- 顶部统计卡片：进行中项目 / 未开始 / 今日到期任务（今日到期 = 覆盖今天且未完成的非临时任务数；已完成项目不计入进行中）。
- 项目卡片：点击进入详情（`openProject`）；**右键打开自定义菜单**（编辑项目/归档）；卡片带 `.project-card` class 供全局右键逻辑识别。
- 状态徽标派生：全部任务完成 → 已完成；日期覆盖今天 → 进行中；否则未开始。
- 进度条：done_count / task_count。
- **右键关闭逻辑**：组件挂载时在 document 上注册**捕获阶段**的 `contextmenu` 监听——目标是卡片则不动（卡片自身 handler 打开菜单），是其他区域则关闭菜单。必须用捕获阶段，否则会在卡片 handler 之后触发导致“刚打开就关闭”。原生右键菜单已由 App.vue 全局禁用。

### src/components/ContextMenu.vue —— 通用右键菜单

- 通用弹层：props 接收 `x/y` 坐标与可选 `header`（超长截断），菜单项由 **slot** 传入。
- 挂载后按菜单实际尺寸钳制到窗口可视范围内；**watch x/y 变化重新定位**（菜单已打开时再次右键其他位置，跟随鼠标而不是卡在第一次右键处）。
- 点击外部 / Escape / 窗口失焦自动 `close`。
- 项目页（编辑项目/归档）、日历页待办（编辑任务/删除任务）均复用此组件。

### src/components/ConfirmDialog.vue —— 主题化确认弹窗

- 替代原生 `confirm`：居中显示、UI 跟随主题（`theme-surface` + `theme-btn`），不会出现 "tauri.localhost 显示" 的原生提示。
- 状态存于 `store.confirm`；`danger` 确认按钮用红色 `theme-btn-danger`。
- 使用方式：`await confirmDialog({ title, message, confirmText, cancelText?, danger? })` 返回 `boolean`；点击遮罩 = 取消。

### src/views/ArchiveView.vue —— 归档页

- 展示 `store.archivedProjects` 卡片列表（半透明 + “已归档”徽标），每个卡片带“恢复”按钮。
- `restore(project)`：db.restoreProject + refresh。

### src/views/ProjectDetailView.vue —— 项目详情

- 头部：返回、项目名、状态徽标、编辑按钮；进度条；`TaskItem` 任务列表（toggle/edit/delete 事件）。
- 任务增删改通过 `openTaskModal(project.id, task?)`。

### src/views/TodayView.vue —— 今日清单

- 临时待办（`todayTempTasks`，含已完成的历史留在当日）+ 项目任务自动追加（`todayProjectTasks`，只看未完成且覆盖今天）。
- 顶部今日进度条。项目任务的完成状态与项目页同步（同一 tasks 表）。

### src/components/TaskModal.vue —— 任务弹窗

- 表单字段与 TaskInput 对应：名称、所属（NULL=临时）、日期（**临时待办也可选日期，单日任务结束日期自动跟随开始日期**）、具体到时间点、提醒（offset 选择）、颜色卡、优先级、备注、重复规则。
- `init()`：编辑态回填；新建态按预选项目/日期默认。`save()` 组装 TaskInput；`remove()` 软删。
- 临时任务：`end_date = start_date`、`todo_date = start_date`。

### src/components/ProjectModal.vue —— 项目弹窗

- 字段：名称、起止日期、颜色卡、优先级、备注；编辑态额外显示“删除项目”。

### src/components/TaskItem.vue —— 任务卡片

- 勾选（emit toggle）、编辑/删除按钮；展示优先级徽标、时间点、提醒标记、日期范围、所属项目（showProject）。
- 颜色通过 `task-color-*` class 设置 `--task-color` CSS 变量。

### src/components/ReminderPopup.vue —— 应用内提醒

- 右下角卡片列表；`dismiss` 写具体提醒时刻防重复；`snooze` 固定 30 分钟后重新提醒。

### src/views/SettingsView.vue —— 设置

- 提供“开机启动”开关，调用 Tauri Autostart 插件向 Windows 注册或移除当前用户的登录启动项。

### src/App.vue —— 根组件

- 侧边栏导航（今日/日历/项目/归档/设置）+ 顶栏（标题 + 新建按钮按视图切换）。
- `checkReminders()` 每 15s 轮询（App.vue 内实现，基于 `store.tasks`）；每次提醒均显示与应用同主题的独立桌面窗口，避免 Windows 开发通知显示为 PowerShell。
- 视图切换靠 `store.view` 字符串（`today/calendar/projects/project-detail/archive/settings`）。
- **全局禁用原生右键菜单**：`onMounted` 注册 document 级 `contextmenu` 监听（`preventDefault`），卸载时移除。
- 底部挂载 ProjectModal / TaskModal / ReminderPopup。

### src/style.css —— 主题

- `:root` 定义 `--app-*` CSS 变量（`light-dark()` 自动跟随系统深浅色）。
- 通用类：`theme-surface`、`theme-surface-2`、`theme-input`、`theme-btn`（含 -primary/-ghost）、`task-color-*`（设置 `--task-color/--task-soft`）。

### src-tauri/src/lib.rs —— 托盘

- 关闭窗口 → hide 到托盘（prevent_close）；托盘左键/菜单恢复窗口；菜单“退出”真正退出。

## 关键业务流程

1. **启动**：`refresh()` 拉取全量数据 → `checkReminders()` 每 15s 检查提醒（需满足：has_time、有 reminder、未完成、日期覆盖今天、该具体时刻尚未确认）。
2. **提醒**：`reminderAt()` 算时刻 → 以“任务 ID + 具体提醒时刻”去重；每次仅显示同主题独立桌面窗口。外部窗口透明，仅保留圆角卡片，按显示器工作区定位以避开任务栏。编辑任务会清除旧提醒记录以便新时间重新提醒；“稍后提醒”为 30 分钟后。
3. **完成重复任务**（store.toggleTask）：勾选完成时不写 done=1，而是把 start/end 按 repeat 规则推进（每日+1 天 / 每周+7 天 / 每月+1 月），若推进后仍在过去则继续推进直到覆盖今天，`todo_date` 同步（临时任务）；任务保持未完成状态。**注意：务必不要通过 setTaskDone 写 done=1 再顺延，否则 DB 会残留已完成状态（已修复的 bug）。**
4. **删除/归档**：全部软删（archived=1）；归档项目在归档页可见，可恢复（restoreProject 置 0）。
5. **甘特图“今天”线**：grid 定位（见 CalendarView 说明），与窗口宽度无关。

## 修改指南速记

- 改字段：`lib/types.ts` → `lib/db.ts`（建表/迁移/INSERT/UPDATE/SELECT）→ 相关 Modal 表单 → store 派生逻辑。
- 新增视图/导航：App.vue 的 `store.view` 分支 + 侧边栏按钮 + pageMeta。
- 新增数据库列：`getDb()` 里补 `ALTER TABLE ... ADD COLUMN`（用 PRAGMA table_info 判断，否则老库启动报错）。
- 校验：`npm run build`（= vue-tsc --noEmit && vite build）。开发：`npm run tauri dev`。
