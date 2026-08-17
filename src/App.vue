<script setup lang="ts">
import { computed, onMounted, onUnmounted } from "vue";
import {
  Archive,
  CalendarDays,
  CalendarCheck2,
  FolderKanban,
  Plus,
  Settings,
  Sun,
} from "@lucide/vue";
import { emitTo, listen } from "@tauri-apps/api/event";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";
import { currentMonitor, PhysicalPosition } from "@tauri-apps/api/window";
import TodayView from "./views/TodayView.vue";
import CalendarView from "./views/CalendarView.vue";
import ProjectsView from "./views/ProjectsView.vue";
import ProjectDetailView from "./views/ProjectDetailView.vue";
import ArchiveView from "./views/ArchiveView.vue";
import SettingsView from "./views/SettingsView.vue";
import ProjectModal from "./components/ProjectModal.vue";
import TaskModal from "./components/TaskModal.vue";
import ConfirmDialog from "./components/ConfirmDialog.vue";
import type { Task } from "./lib/types";
import { dateInRange, reminderAt, today } from "./lib/format";
import { dismissReminder, openProjectModal, openTaskModal, refresh, reminderKey, snoozeReminder, store } from "./lib/store";

const pageMeta: Record<string, { title: string; sub: string }> = {
  today: { title: "今日清单", sub: "临时待办 + 日期覆盖今天的项目任务" },
  calendar: { title: "日历", sub: "日历待办 + 项目甘特图" },
  projects: { title: "项目", sub: "按执行日期管理项目和细化任务" },
  "project-detail": { title: "项目详情", sub: "项目任务与执行日期" },
  archive: { title: "归档", sub: "归档项目可随时恢复" },
  settings: { title: "设置", sub: "应用偏好与启动方式" },
};

const meta = computed(() => pageMeta[store.view]);

let reminderTimer: number | undefined;
let unlistenReminderAction: (() => void) | undefined;

function navTo(name: string) {
  if (name === "archive") {
    store.view = "archive";
  } else if (name === "settings") {
    store.view = "settings";
  } else {
    store.view = name as typeof store.view;
  }
}

function isActive(name: string): boolean {
  if (name === "archive") return store.view === "archive";
  if (name === "settings") return store.view === "settings";
  return store.view === name;
}

function handleNewTask() {
  if (store.view === "calendar") {
    store.taskModalDate = store.selectedDate;
    openTaskModal();
    return;
  }
  if (store.view === "project-detail") {
    openTaskModal(store.selectedProjectId);
    return;
  }
  openTaskModal();
}

async function showExternalReminder(task: Task, scheduledAt: string) {
  const payload = { task, scheduledAt };
  const existing = await WebviewWindow.getByLabel("reminder");
  if (existing) {
    await emitTo("reminder", "reminder-task", payload);
    await existing.show();
    return;
  }

  const taskQuery = encodeURIComponent(JSON.stringify(payload));
  const popup = new WebviewWindow("reminder", {
    url: `/?reminder=1&task=${taskQuery}`,
    title: "LiteDo 提醒",
    width: 380,
    height: 150,
    decorations: false,
    transparent: true,
    shadow: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    visible: false,
  });
  popup.once("tauri://created", async () => {
    const monitor = await currentMonitor();
    if (monitor) {
      const scale = monitor.scaleFactor;
      const workArea = monitor.workArea;
      await popup.setPosition(new PhysicalPosition(
        workArea.position.x + workArea.size.width - Math.round(404 * scale),
        // 工作区底部已排除任务栏，再额外留出 24px 呼吸空间。
        workArea.position.y + workArea.size.height - Math.round(174 * scale),
      ));
    }
    await popup.show();
  });
}

async function checkReminders() {
  const now = new Date();
  for (const task of store.tasks) {
    if (!task.has_time || !task.reminder || !task.time_point || task.done) continue;
    if (!dateInRange(today(), task.start_date, task.end_date)) continue;
    const at = reminderAt(task);
    if (!at || now < at) continue;
    const scheduledAt = at.toISOString();
    const key = reminderKey(task, scheduledAt);
    if (task.last_reminded_at === scheduledAt) continue;
    if (store.snoozedUntil[key] && new Date(store.snoozedUntil[key]) > now) continue;
    if (store.reminders.some((item) => reminderKey(item) === key)) continue;
    store.reminders.push(task);
    // 与之前的 Windows 系统通知一致：主窗口可见时也显示桌面提醒。
    try {
      await showExternalReminder(task, scheduledAt);
    } catch (error) {
      // 外部窗口失败时仍保留应用内提醒，并在开发者控制台保留诊断信息。
      console.error("创建桌面提醒窗口失败", error);
    }
  }
}

onMounted(async () => {
  // 全局禁用原生右键菜单（项目卡片区域由 ProjectsView 弹出自定义菜单）
  document.addEventListener("contextmenu", preventContextMenu);
  try {
    await refresh();
  } catch (error) {
    console.error("数据库初始化失败", error);
  }
  unlistenReminderAction = await listen<{
    action: "dismiss" | "snooze";
    taskId: number;
    scheduledAt: string;
  }>("external-reminder-action", async (event) => {
    const task = store.tasks.find((item) => item.id === event.payload.taskId);
    if (!task) return;
    if (event.payload.action === "dismiss") await dismissReminder(task, event.payload.scheduledAt);
    else snoozeReminder(task, event.payload.scheduledAt);
  });
  checkReminders();
  reminderTimer = window.setInterval(checkReminders, 15000);
});

function preventContextMenu(event: MouseEvent) {
  event.preventDefault();
}

onUnmounted(() => {
  if (reminderTimer) window.clearInterval(reminderTimer);
  unlistenReminderAction?.();
  document.removeEventListener("contextmenu", preventContextMenu);
});
</script>

<template>
  <div class="flex h-screen overflow-hidden">
    <aside class="flex w-52 flex-none flex-col border-r border-[var(--app-border)] bg-[var(--app-panel)] px-3 py-4">
      <div class="mb-5 flex items-center gap-2.5 border-b border-[var(--app-border)] px-2 pb-4">
        <span class="grid h-9 w-9 place-items-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
          <CalendarCheck2 :size="18" />
        </span>
        <span>
          <strong class="block text-[15px] font-medium">LiteDo</strong>
          <small class="block text-xs text-[var(--app-muted)]">本地待办</small>
        </span>
      </div>

      <nav class="flex flex-col gap-1">
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition"
          :class="isActive('today') ? 'bg-[var(--app-primary-soft)] font-medium text-[var(--app-primary)]' : 'text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]'"
          @click="navTo('today')"
        >
          <Sun :size="16" /> 今日清单
        </button>
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition"
          :class="isActive('calendar') ? 'bg-[var(--app-primary-soft)] font-medium text-[var(--app-primary)]' : 'text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]'"
          @click="navTo('calendar')"
        >
          <CalendarDays :size="16" /> 日历
        </button>
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition"
          :class="isActive('projects') || store.view === 'project-detail' ? 'bg-[var(--app-primary-soft)] font-medium text-[var(--app-primary)]' : 'text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]'"
          @click="navTo('projects')"
        >
          <FolderKanban :size="16" /> 项目
        </button>
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm transition"
          :class="isActive('archive') ? 'bg-[var(--app-primary-soft)] font-medium text-[var(--app-primary)]' : 'text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]'"
          @click="navTo('archive')"
        >
          <Archive :size="16" /> 归档
        </button>
      </nav>

      <div class="mt-auto flex flex-col gap-1">
        <button
          type="button"
          class="flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm text-[var(--app-muted)] transition hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
          @click="navTo('settings')"
        >
          <Settings :size="16" /> 设置
        </button>
        <p class="mt-2 flex items-center gap-2 px-2.5 text-xs text-[var(--app-muted)]">
          <span class="h-2 w-2 rounded-full bg-[var(--app-green)] shadow-[0_0_0_3px_var(--app-green-soft)]"></span>
          本地数据 · 离线可用
        </p>
      </div>
    </aside>

    <main class="flex min-w-0 flex-1 flex-col">
      <header class="flex items-center justify-between gap-4 border-b border-[var(--app-border)] bg-[var(--app-bg)] px-6 py-4">
        <div>
          <h1 class="text-xl font-medium">{{ meta.title }}</h1>
          <p class="mt-0.5 text-[13px] text-[var(--app-muted)]">{{ meta.sub }}</p>
        </div>
        <div class="flex flex-none items-center gap-2">
          <button
            v-if="store.view === 'projects'"
            type="button"
            class="theme-btn theme-btn-primary"
            @click="openProjectModal()"
          >
            <Plus :size="14" /> 新建项目
          </button>
          <button
            v-else-if="store.view === 'today' || store.view === 'calendar' || store.view === 'project-detail'"
            type="button"
            class="theme-btn theme-btn-primary"
            @click="handleNewTask"
          >
            <Plus :size="14" /> 新建任务
          </button>
        </div>
      </header>

      <div class="min-h-0 flex-1 overflow-y-auto px-6 py-5">
        <TodayView v-if="store.view === 'today'" />
        <CalendarView v-else-if="store.view === 'calendar'" />
        <ProjectsView v-else-if="store.view === 'projects'" />
        <ProjectDetailView v-else-if="store.view === 'project-detail'" />
        <ArchiveView v-else-if="store.view === 'archive'" />
        <SettingsView v-else-if="store.view === 'settings'" />
      </div>
    </main>

    <ProjectModal />
    <TaskModal />
    <ConfirmDialog />
  </div>
</template>
