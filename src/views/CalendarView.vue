<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { Bell, CalendarRange, ChevronLeft, ChevronRight, Pencil, Plus, Trash2 } from "@lucide/vue";
import ContextMenu from "../components/ContextMenu.vue";
import type { Task } from "../lib/types";
import { addDays, diffDays, formatDate, formatShort, monthDays, pad, today, weekdayCN } from "../lib/format";
import * as db from "../lib/db";
import { confirmDialog, openTaskModal, refresh, store, tasksOnDate, toggleTask } from "../lib/store";

interface GanttLane {
  id: string;
  type: "project" | "task";
  title: string;
  color: string;
  start: string;
  end: string;
}

const now = new Date();
const year = ref(now.getFullYear());
const month = ref(now.getMonth());
const selected = ref(store.selectedDate);
const todayValue = today();

const cells = computed(() => monthDays(year.value, month.value));
const selectedTasks = computed(() => tasksOnDate(selected.value));
const monthLabel = computed(() => `${year.value}年${month.value + 1}月`);

const monthStart = computed(() => `${year.value}-${pad(month.value + 1)}-01`);
const monthEnd = computed(() => {
  const last = new Date(year.value, month.value + 1, 0);
  return `${year.value}-${pad(month.value + 1)}-${pad(last.getDate())}`;
});
const ganttDays = computed(() => diffDays(monthStart.value, monthEnd.value) + 1);
const ganttWidth = computed(() => 150 + ganttDays.value * 24);
const ganttColumns = computed(() => `150px repeat(${ganttDays.value}, minmax(22px, 1fr))`);
const laneColumns = computed(() => `repeat(${ganttDays.value}, minmax(22px, 1fr))`);
const headerDays = computed(() =>
  Array.from({ length: ganttDays.value }, (_, i) => addDays(monthStart.value, i)),
);

const ganttLanes = computed<GanttLane[]>(() => {
  const lanes: GanttLane[] = [];
  for (const project of store.projects) {
    lanes.push({
      id: `project-${project.id}`,
      type: "project",
      title: project.name,
      color: project.color,
      start: project.start_date,
      end: project.end_date,
    });
    for (const task of store.tasks.filter((t) => t.project_id === project.id && !t.archived && !t.done)) {
      lanes.push({
        id: `task-${task.id}`,
        type: "task",
        title: task.title,
        color: task.color,
        start: task.start_date,
        end: task.end_date,
      });
    }
  }
  return lanes;
});

// “今天”线用网格列号定位（第 1 列是 150px 标签列），而非按最小宽度推算像素，
// 这样窗口缩放导致 1fr 列拉伸时，线始终与对应日期列边界对齐。
const todayColumn = computed<number | null>(() => {
  const offset = diffDays(monthStart.value, todayValue);
  if (offset < 0 || offset >= ganttDays.value) return null;
  return offset + 2;
});
const ganttRowEnd = computed(() => 2 + ganttLanes.value.length * 2);

function moveMonth(delta: number) {
  const date = new Date(year.value, month.value + delta, 1);
  year.value = date.getFullYear();
  month.value = date.getMonth();
}

function selectDate(date: string) {
  selected.value = date;
  store.selectedDate = date;
}

function dotColors(date: string): string[] {
  return [...new Set(tasksOnDate(date).slice(0, 3).map((t) => t.color))];
}

function dayNumber(value: string): string {
  return formatShort(value).split("/")[1];
}

function laneStart(lane: GanttLane): number {
  return Math.max(diffDays(monthStart.value, lane.start), 0);
}

function laneEnd(lane: GanttLane): number {
  return Math.min(diffDays(monthStart.value, lane.end) + 1, ganttDays.value);
}

function barStyle(lane: GanttLane) {
  const start = laneStart(lane);
  const end = laneEnd(lane);
  if (end <= start) return { display: "none" };
  const isProject = lane.type === "project";
  return {
    gridColumn: `${start + 2} / ${end + 2}`,
    background: isProject ? "transparent" : "var(--task-color)",
    color: isProject ? "var(--task-color)" : "#fff",
    border: isProject ? "1.5px dashed var(--task-color)" : "none",
  };
}

function openTaskForDate() {
  store.taskModalDate = selected.value;
  openTaskModal();
}

// 右侧待办列表：右键弹出“编辑任务”菜单，而非直接编辑
const taskMenu = ref<{ task: Task; x: number; y: number } | null>(null);

function openTaskMenu(task: Task, event: MouseEvent) {
  taskMenu.value = { task, x: event.clientX, y: event.clientY };
}

function onMenuEdit(task: Task) {
  taskMenu.value = null;
  openTaskModal(task.project_id, task);
}

async function onMenuDelete(task: Task) {
  taskMenu.value = null;
  if (!(await confirmDialog({ title: "删除任务", message: `确定删除“${task.title}”？`, confirmText: "删除" }))) return;
  await db.deleteTask(task.id);
  await refresh();
}

// 右键空白区域关闭菜单（原生菜单已由 App.vue 全局禁用）
function onDocContextMenu(event: MouseEvent) {
  if ((event.target as HTMLElement).closest(".calendar-task-item")) return;
  taskMenu.value = null;
}

onMounted(() => document.addEventListener("contextmenu", onDocContextMenu, true));
onBeforeUnmount(() => document.removeEventListener("contextmenu", onDocContextMenu, true));

async function onToggle(task: Task) {
  await toggleTask(task);
  await refresh();
}
</script>

<template>
  <div>
    <div class="theme-surface mb-4 flex items-center justify-between rounded-xl px-3 py-2">
      <button type="button" class="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-panel-2)]" aria-label="上个月" @click="moveMonth(-1)">
        <ChevronLeft :size="16" />
      </button>
      <strong class="text-sm font-medium">{{ monthLabel }}</strong>
      <button type="button" class="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-panel-2)]" aria-label="下个月" @click="moveMonth(1)">
        <ChevronRight :size="16" />
      </button>
    </div>

    <div class="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_260px]">
      <div class="theme-surface rounded-2xl p-4">
        <div class="mb-2 grid grid-cols-7">
          <span v-for="w in ['一', '二', '三', '四', '五', '六', '日']" :key="w" class="py-1 text-center text-[11px] text-[var(--app-muted)]">
            {{ w }}
          </span>
        </div>
        <div class="grid grid-cols-7 gap-1">
          <template v-for="(cell, index) in cells" :key="cell.date || `empty-${index}`">
            <button
              v-if="cell.day"
              type="button"
              class="flex min-h-10 flex-col items-center justify-center gap-1 rounded-lg text-xs transition hover:bg-[var(--app-panel-2)]"
              :class="{
                'bg-[var(--app-primary)] font-medium text-white': cell.date === todayValue,
                'outline-2 outline-offset-1 outline-[var(--app-primary)]': cell.date === selected,
              }"
              @click="selectDate(cell.date)"
            >
              {{ cell.day }}
              <span v-if="dotColors(cell.date).length" class="flex gap-0.5">
                <span
                  v-for="color in dotColors(cell.date)"
                  :key="color"
                  class="h-1 w-1 rounded-full"
                  :class="[`task-color-${color}`]"
                  :style="{ background: 'var(--task-color)' }"
                ></span>
              </span>
            </button>
            <span v-else class="min-h-10"></span>
          </template>
        </div>
      </div>

      <div class="theme-surface rounded-2xl p-4">
        <div class="flex items-center justify-between gap-2">
          <div>
            <h3 class="text-[15px] font-medium">{{ formatDate(selected) }} · {{ weekdayCN(selected) }}</h3>
            <p class="mt-0.5 text-xs text-[var(--app-muted)]">
              {{ selected === todayValue ? "今天" : "" }} · {{ selectedTasks.length }} 项待办
            </p>
          </div>
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
            @click="openTaskForDate"
          >
            <Plus :size="13" /> 添加
          </button>
        </div>

        <ul v-if="selectedTasks.length" class="mt-3 flex flex-col gap-2">
          <li
            v-for="task in selectedTasks"
            :key="task.id"
            class="calendar-task-item flex items-center gap-2 rounded-lg border-l-[3px] bg-[var(--app-panel-2)] px-2.5 py-2 text-[13px] transition hover:bg-[var(--app-panel-3)]"
            :class="`task-color-${task.color}`"
            :style="{ borderLeftColor: 'var(--task-color)' }"
            @contextmenu.prevent="openTaskMenu(task, $event)"
          >
            <label class="relative flex h-4 w-4 flex-none cursor-pointer items-center">
              <input type="checkbox" class="peer sr-only" :checked="Boolean(task.done)" @change="onToggle(task)" />
              <span class="absolute inset-0 rounded border-[1.5px] border-[var(--app-border)] peer-checked:border-[var(--app-green)] peer-checked:bg-[var(--app-green)]"></span>
              <span class="pointer-events-none absolute inset-0 hidden items-center justify-center text-[10px] text-white peer-checked:flex">✓</span>
            </label>
            <span class="min-w-0 flex-1 truncate" :class="{ 'text-[var(--app-muted)] line-through': task.done }">
              {{ task.title }}
            </span>
            <span v-if="task.time_point" class="flex-none text-xs text-[var(--app-muted)]">{{ task.time_point }}</span>
            <Bell v-if="task.has_time && task.reminder" :size="13" class="flex-none text-[var(--app-primary)]" />
          </li>
        </ul>
        <p v-else class="mt-6 text-center text-[13px] text-[var(--app-muted)]">暂无安排</p>
      </div>
    </div>

    <ContextMenu
      v-if="taskMenu"
      :x="taskMenu.x"
      :y="taskMenu.y"
      :header="taskMenu.task.title"
      @close="taskMenu = null"
    >
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--app-text)] transition hover:bg-[var(--app-panel-2)]"
        @click="onMenuEdit(taskMenu.task)"
      >
        <Pencil :size="14" class="flex-none text-[var(--app-muted)]" /> 编辑任务
      </button>
      <div class="mx-1 my-1 border-t border-[var(--app-border)]"></div>
      <button
        type="button"
        class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--app-red)] transition hover:bg-[var(--app-red-soft)]"
        @click="onMenuDelete(taskMenu.task)"
      >
        <Trash2 :size="14" class="flex-none" /> 删除任务
      </button>
    </ContextMenu>

    <div class="theme-surface mt-4 rounded-2xl p-4">
      <div class="mb-3 flex items-center justify-between">
        <h2 class="flex items-center gap-1.5 text-[15px] font-medium">
          <CalendarRange :size="16" /> 项目任务甘特图
        </h2>
        <span class="text-xs text-[var(--app-muted)]">{{ monthLabel }}</span>
      </div>

      <div class="overflow-x-auto">
        <div class="relative" :style="{ minWidth: ganttWidth + 'px' }">
          <div class="relative grid overflow-hidden rounded-xl border border-[var(--app-border)] bg-[var(--app-panel)]" :style="{ gridTemplateColumns: ganttColumns }">
            <div class="border-b border-r border-[var(--app-border)] bg-[var(--app-panel-2)] px-2.5 py-2 text-xs">项目 / 任务</div>
            <div class="grid border-b border-[var(--app-border)]" :style="{ gridTemplateColumns: laneColumns, gridColumn: '2 / -1' }">
              <span
                v-for="date in headerDays"
                :key="date"
                class="border-l border-[var(--app-border)] px-1 py-2 text-center text-[11px]"
                :class="date === todayValue ? 'bg-[var(--app-primary)] font-medium text-white' : 'text-[var(--app-muted)]'"
              >
                {{ date === todayValue ? "今天" : dayNumber(date) }}
              </span>
            </div>

            <template v-for="lane in ganttLanes" :key="lane.id">
              <div class="flex items-center truncate border-b border-r border-[var(--app-border)] bg-[var(--app-panel-2)] px-2.5 py-2 text-xs">
                {{ lane.title }}
              </div>
              <div class="grid border-b border-[var(--app-border)]" :style="{ gridTemplateColumns: laneColumns, gridColumn: '2 / -1' }">
                <div
                  v-if="barStyle(lane).display !== 'none'"
                  class="mx-0.5 my-1 flex h-6 items-center overflow-hidden rounded-md px-2 text-[11px] whitespace-nowrap"
                  :class="`task-color-${lane.color}`"
                  :style="barStyle(lane)"
                >
                  {{ lane.title }}
                </div>
              </div>
            </template>

            <div
              v-if="todayColumn !== null"
              class="pointer-events-none absolute top-0 bottom-0 z-10 w-0.5 bg-[var(--app-primary)]"
              :style="{ gridColumn: `${todayColumn} / ${todayColumn + 1}`, gridRow: `1 / ${ganttRowEnd}`, justifySelf: 'start' }"
            ></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
