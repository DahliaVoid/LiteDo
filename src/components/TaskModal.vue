<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { Repeat2, Trash2, X } from "@lucide/vue";
import type { Color, Priority, Repeat, TaskInput } from "../lib/types";
import * as db from "../lib/db";
import { closeModals, refresh, store } from "../lib/store";
import { today } from "../lib/format";

const colors: Color[] = ["red", "amber", "green", "blue", "purple", "teal"];
const priorities: Priority[] = ["P0", "P1", "P2", "P3"];
const repeatOptions: Array<{ value: Repeat; label: string; hint: string }> = [
  { value: "", label: "不重复", hint: "" },
  { value: "daily", label: "每天", hint: "完成后顺延到次日" },
  { value: "weekly", label: "每周", hint: "完成后顺延 7 天" },
  { value: "monthly", label: "每月", hint: "完成后顺延到下月同日" },
];

const form = reactive({
  project_id: null as number | null,
  title: "",
  start_date: today(),
  end_date: today(),
  color: "blue" as Color,
  priority: "P2" as Priority,
  note: "",
  has_time: false,
  time_point: "09:00",
  reminder: false,
  reminder_offset_minutes: 0,
  repeat: "" as Repeat,
});

const repeatHint = computed(() => repeatOptions.find((o) => o.value === form.repeat)?.hint ?? "");
const isTemp = computed(() => form.project_id === null);

// 临时待办是单日任务：结束日期跟随开始日期
watch(
  () => [form.project_id, form.start_date] as const,
  () => {
    if (form.project_id === null) form.end_date = form.start_date;
  },
);

watch(
  () => store.taskModalOpen,
  (open) => {
    if (open) init();
  },
);

function init() {
  const task = store.editingTask;
  if (task) {
    form.project_id = task.project_id;
    form.title = task.title;
    form.start_date = task.start_date;
    form.end_date = task.end_date;
    form.color = task.color;
    form.priority = task.priority;
    form.note = task.note;
    form.has_time = Boolean(task.has_time);
    form.time_point = task.time_point ?? "09:00";
    form.reminder = Boolean(task.reminder);
    form.reminder_offset_minutes = task.reminder ? task.reminder_offset_minutes : -1;
    form.repeat = task.repeat ?? "";
    return;
  }

  const project = store.projects.find((p) => p.id === store.taskModalProjectId) ?? null;
  form.project_id = store.taskModalProjectId;
  form.title = "";
  form.start_date = project?.start_date ?? store.taskModalDate ?? today();
  form.end_date = project?.end_date ?? store.taskModalDate ?? today();
  form.color = project?.color ?? "blue";
  form.priority = "P2";
  form.note = "";
  form.has_time = false;
  form.time_point = "09:00";
  form.reminder = false;
  form.reminder_offset_minutes = -1;
  form.repeat = "";
}

async function save() {
  if (!form.title.trim()) return;
  const isTemp = form.project_id === null;
  const input: TaskInput = {
    project_id: form.project_id,
    title: form.title.trim(),
    start_date: form.start_date,
    end_date: isTemp ? form.start_date : form.end_date,
    color: form.color,
    priority: form.priority,
    note: form.note.trim(),
    has_time: form.has_time ? 1 : 0,
    time_point: form.has_time ? form.time_point : null,
    reminder: form.has_time && form.reminder_offset_minutes >= 0 ? 1 : 0,
    reminder_offset_minutes: form.has_time && form.reminder_offset_minutes >= 0 ? form.reminder_offset_minutes : 0,
    is_temp: isTemp ? 1 : 0,
    todo_date: isTemp ? form.start_date : null,
    repeat: form.repeat,
  };

  if (store.editingTask) {
    await db.updateTask(store.editingTask.id, input);
  } else {
    await db.createTask(input);
  }
  closeModals();
  await refresh();
}

async function remove() {
  if (!store.editingTask) return;
  if (!confirm("确定删除该任务？")) return;
  await db.deleteTask(store.editingTask.id);
  closeModals();
  await refresh();
}
</script>

<template>
  <div
    v-if="store.taskModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
  >
    <div class="theme-surface w-full max-w-lg rounded-2xl p-5 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-medium">
          {{ store.editingTask ? "编辑任务" : "新建任务" }}
        </h3>
        <button
          type="button"
          class="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-panel-2)]"
          aria-label="关闭"
          @click="closeModals"
        >
          <X :size="16" />
        </button>
      </div>

      <form class="flex flex-col gap-3" @submit.prevent="save">
        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">任务名称</span>
          <input v-model="form.title" class="theme-input" placeholder="例如：确认供应商寄样" />
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">所属</span>
          <select v-model="form.project_id" class="theme-input">
            <option :value="null">无 · 临时待办</option>
            <option v-for="project in store.projects" :key="project.id" :value="project.id">
              {{ project.name }}
            </option>
          </select>
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium">日期</span>
            <input v-model="form.start_date" type="date" class="theme-input" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium">结束日期</span>
            <input v-model="form.end_date" type="date" class="theme-input" :disabled="isTemp" />
            <span v-if="isTemp" class="text-xs text-[var(--app-muted)]">临时待办为单日，跟随所选日期</span>
          </label>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex items-center justify-between rounded-xl border border-[var(--app-border)] bg-[var(--app-panel-2)] px-3 py-2.5">
            <span class="text-[13px] font-medium">具体到时间点</span>
            <input v-model="form.has_time" type="checkbox" class="peer sr-only" />
            <span class="relative inline-flex h-5 w-9 flex-none cursor-pointer items-center">
              <span class="absolute inset-0 rounded-full bg-[var(--app-panel-3)] transition peer-checked:bg-[var(--app-primary)]"></span>
              <span class="absolute left-0.5 h-4 w-4 rounded-full bg-white shadow transition peer-checked:translate-x-4"></span>
            </span>
          </label>
          <label v-if="form.has_time" class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium">时间点</span>
            <input v-model="form.time_point" type="time" class="theme-input" />
          </label>
          <div v-else></div>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">提醒</span>
          <select v-model="form.reminder_offset_minutes" class="theme-input" :disabled="!form.has_time">
            <option :value="-1">不提醒</option>
            <option :value="0">到点提醒</option>
            <option :value="5">提前 5 分钟</option>
            <option :value="15">提前 15 分钟</option>
            <option :value="60">提前 1 小时</option>
          </select>
          <span class="text-xs text-[var(--app-muted)]">
            {{ form.has_time && form.reminder_offset_minutes >= 0 ? "应用运行时到点弹窗；最小化到托盘也会提醒" : form.has_time ? "不提醒" : "需先开启“具体到时间点”" }}
          </span>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="flex items-center gap-1 text-[13px] font-medium">
            <Repeat2 :size="13" /> 重复
          </span>
          <select v-model="form.repeat" class="theme-input">
            <option v-for="option in repeatOptions" :key="option.value" :value="option.value">
              {{ option.label }}
            </option>
          </select>
          <span class="text-xs text-[var(--app-muted)]">
            {{ repeatHint || "任务完成后保持完成，不会自动顺延" }}
          </span>
        </label>

        <div class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">颜色卡</span>
          <div class="flex flex-wrap gap-2">
            <button
              v-for="color in colors"
              :key="color"
              type="button"
              class="h-7 w-7 rounded-lg border-2 transition"
              :class="[`task-color-${color}`, form.color === color ? 'border-[var(--app-text)]' : 'border-transparent']"
              :style="{ background: 'var(--task-color)' }"
              :aria-label="`颜色 ${color}`"
              @click="form.color = color"
            ></button>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium">优先级</span>
            <select v-model="form.priority" class="theme-input">
              <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
            </select>
          </label>
        </div>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">备注</span>
          <textarea v-model="form.note" rows="2" class="theme-input resize-y" placeholder="执行说明、交付标准等"></textarea>
        </label>

        <div class="mt-2 flex items-center justify-between gap-2">
          <button
            v-if="store.editingTask"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--app-red)] hover:bg-[var(--app-red-soft)]"
            @click="remove"
          >
            <Trash2 :size="14" /> 删除
          </button>
          <span v-else></span>
          <div class="flex gap-2">
            <button type="button" class="theme-btn" @click="closeModals">取消</button>
            <button type="submit" class="theme-btn theme-btn-primary">保存任务</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
