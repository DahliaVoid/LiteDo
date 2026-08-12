<script setup lang="ts">
import { computed } from "vue";
import { ArrowLeft, CalendarRange, Pencil, Plus, Target } from "@lucide/vue";
import TaskItem from "../components/TaskItem.vue";
import type { Task } from "../lib/types";
import * as db from "../lib/db";
import { formatShort, today } from "../lib/format";
import {
  confirmDialog,
  currentProject,
  openProjectModal,
  openTaskModal,
  projectTasks,
  refresh,
  store,
  toggleTask,
} from "../lib/store";

const project = computed(() => currentProject());
const tasks = computed(() => (project.value ? projectTasks(project.value.id) : []));
const doneCount = computed(() => tasks.value.filter((t) => t.done).length);
const percent = computed(() => (tasks.value.length ? Math.round((doneCount.value / tasks.value.length) * 100) : 0));

// 状态派生：全部任务完成 → 已完成；日期覆盖今天 → 进行中；否则未开始
const statusLabel = computed(() => {
  if (!project.value) return "";
  if (project.value.task_count > 0 && project.value.done_count === project.value.task_count) return "已完成";
  if (today() >= project.value.start_date && today() <= project.value.end_date) return "进行中";
  return "未开始";
});

async function onToggle(task: Task) {
  await toggleTask(task);
  await refresh();
}

async function onDelete(task: Task) {
  if (!(await confirmDialog({ title: "删除任务", message: `确定删除“${task.title}”？`, confirmText: "删除" }))) return;
  await db.deleteTask(task.id);
  await refresh();
}
</script>

<template>
  <div v-if="project">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <button type="button" class="theme-btn theme-btn-ghost" @click="store.view = 'projects'">
        <ArrowLeft :size="15" /> 返回项目
      </button>
      <div class="flex min-w-0 items-center gap-2">
        <span
          class="h-3 w-3 flex-none rounded-[4px]"
          :class="`task-color-${project.color}`"
          :style="{ background: 'var(--task-color)' }"
        ></span>
        <h2 class="truncate text-lg font-medium">{{ project.name }}</h2>
        <span
          class="rounded-full px-2 py-0.5 text-[11px]"
          :class="{
            'bg-[var(--app-blue-soft)] text-[var(--app-blue)]': statusLabel === '进行中',
            'bg-[var(--app-panel-3)] text-[var(--app-muted)]': statusLabel === '未开始',
            'bg-[var(--app-green-soft)] text-[var(--app-green)]': statusLabel === '已完成',
          }"
        >
          {{ statusLabel }}
        </span>
      </div>
      <button
        type="button"
        class="theme-btn theme-btn-ghost ml-auto"
        @click="openProjectModal(project)"
      >
        <Pencil :size="14" /> 编辑项目
      </button>
    </div>

    <div class="mb-4 flex flex-wrap items-center gap-3 text-[13px] text-[var(--app-muted)]">
      <span class="inline-flex items-center gap-1.5">
        <CalendarRange :size="14" /> {{ formatShort(project.start_date) }} – {{ formatShort(project.end_date) }}
      </span>
      <span class="inline-flex items-center gap-1.5">
        <Target :size="14" /> {{ project.note || "暂无项目目标" }}
      </span>
    </div>

    <div class="theme-surface mb-4 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-4 py-3">
      <span class="text-[13px] text-[var(--app-muted)]">项目进度</span>
      <div class="h-2 overflow-hidden rounded-full bg-[var(--app-panel-3)]">
        <div class="h-full rounded-full bg-[var(--app-primary)] transition-all" :style="{ width: percent + '%' }"></div>
      </div>
      <strong class="text-sm font-medium">{{ doneCount }}/{{ tasks.length }} 任务</strong>
    </div>

    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-[15px] font-medium">项目任务</h2>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
        @click="openTaskModal(project.id)"
      >
        <Plus :size="14" /> 新建任务
      </button>
    </div>

    <ul v-if="tasks.length" class="flex flex-col gap-2.5">
      <TaskItem
        v-for="task in tasks"
        :key="task.id"
        :task="task"
        @toggle="onToggle"
        @edit="openTaskModal(task.project_id, task)"
        @delete="onDelete"
      />
    </ul>
    <div v-else class="theme-surface-2 rounded-xl px-4 py-10 text-center text-[13px] text-[var(--app-muted)]">
      项目还没有任务，点击“新建任务”拆解执行步骤。
    </div>
  </div>
  <div v-else class="theme-surface-2 rounded-xl px-4 py-10 text-center text-[13px] text-[var(--app-muted)]">
    项目不存在或已删除。
  </div>
</template>
