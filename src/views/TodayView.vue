<script setup lang="ts">
import { computed } from "vue";
import { Plus, Sparkles } from "@lucide/vue";
import TaskItem from "../components/TaskItem.vue";
import type { Task } from "../lib/types";
import * as db from "../lib/db";
import {
  openTaskModal,
  refresh,
  store,
  todayProjectTasks,
  todayTempTasks,
  toggleTask,
} from "../lib/store";

const tempTasks = computed(() => todayTempTasks());
const projectTasks = computed(() => todayProjectTasks());

const total = computed(() => tempTasks.value.length + projectTasks.value.length);
const doneCount = computed(() => tempTasks.value.filter((t) => t.done).length);
const percent = computed(() => (total.value ? Math.round((doneCount.value / total.value) * 100) : 0));

async function onToggle(task: Task) {
  await toggleTask(task);
  await refresh();
}

async function onDelete(task: Task) {
  if (!confirm(`确定删除“${task.title}”？`)) return;
  await db.deleteTask(task.id);
  await refresh();
}
</script>

<template>
  <div>
    <div class="theme-surface mb-5 grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl px-4 py-3 max-sm:grid-cols-1">
      <span class="text-[13px] text-[var(--app-muted)]">今日进度</span>
      <div class="h-2 overflow-hidden rounded-full bg-[var(--app-panel-3)]">
        <div class="h-full rounded-full bg-[var(--app-primary)] transition-all" :style="{ width: percent + '%' }"></div>
      </div>
      <strong class="text-sm font-medium">{{ doneCount }} / {{ total }}</strong>
    </div>

    <div class="mb-2 flex items-center justify-between">
      <h2 class="text-[15px] font-medium">临时待办</h2>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
        @click="openTaskModal()"
      >
        <Plus :size="14" /> 添加临时任务
      </button>
    </div>

    <ul v-if="tempTasks.length" class="flex flex-col gap-2.5">
      <TaskItem
        v-for="task in tempTasks"
        :key="task.id"
        :task="task"
        @toggle="onToggle"
        @edit="openTaskModal(task.project_id, task)"
        @delete="onDelete"
      />
    </ul>
    <div v-else class="theme-surface-2 rounded-xl px-4 py-8 text-center text-[13px] text-[var(--app-muted)]">
      今天还没有临时待办，点击右上角添加。
    </div>

    <div class="mt-7 border-t border-dashed border-[var(--app-border)] pt-5">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-[15px] font-medium">项目任务自动追加</h2>
        <span class="rounded-full border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2.5 py-0.5 text-xs text-[var(--app-muted)]">
          日期覆盖今天
        </span>
      </div>
      <p class="mb-3 flex items-center gap-2 rounded-lg bg-[var(--app-primary-soft)] px-3 py-2 text-xs text-[var(--app-primary)]">
        <Sparkles :size="14" />
        未完成且日期覆盖今天的项目任务会自动出现在这里，完成状态与项目页同步。
      </p>

      <ul v-if="projectTasks.length" class="flex flex-col gap-2.5">
        <TaskItem
          v-for="task in projectTasks"
          :key="task.id"
          :task="task"
          show-project
          @toggle="onToggle"
          @edit="openTaskModal(task.project_id, task)"
          @delete="onDelete"
        />
      </ul>
      <div v-else class="theme-surface-2 rounded-xl px-4 py-8 text-center text-[13px] text-[var(--app-muted)]">
        当前没有日期覆盖今天的项目任务。
      </div>
    </div>
  </div>
</template>
