<script setup lang="ts">
import { computed } from "vue";
import { Bell, Pencil, Repeat2, Trash2 } from "@lucide/vue";
import type { Task } from "../lib/types";
import { formatShort } from "../lib/format";

const props = defineProps<{
  task: Task;
  showProject?: boolean;
}>();

const emit = defineEmits<{
  (e: "toggle", task: Task): void;
  (e: "edit", task: Task): void;
  (e: "delete", task: Task): void;
}>();

const done = computed(() => Boolean(props.task.done));
const repeatLabel = computed(() => {
  if (props.task.repeat === "daily") return "每天";
  if (props.task.repeat === "weekly") return "每周";
  if (props.task.repeat === "monthly") return "每月";
  return "";
});
</script>

<template>
  <li
    class="flex items-start gap-3 rounded-xl border border-[var(--app-border)] border-l-4 bg-[var(--app-panel)] p-3.5 transition"
    :class="[`task-color-${task.color}`, { 'opacity-70': done }]"
    :style="{ borderLeftColor: 'var(--task-color)' }"
  >
    <label class="relative mt-0.5 h-5 w-5 flex-none cursor-pointer">
      <input
        type="checkbox"
        class="peer sr-only"
        :checked="done"
        @change="emit('toggle', task)"
      />
      <span
        class="absolute inset-0 rounded-md border-[1.5px] border-[var(--app-border)] bg-[var(--app-panel)] transition peer-checked:border-[var(--app-green)] peer-checked:bg-[var(--app-green)]"
      ></span>
      <span
        class="pointer-events-none absolute inset-0 hidden items-center justify-center text-xs text-white peer-checked:flex"
      >✓</span>
    </label>

    <div class="min-w-0 flex-1">
      <p
        class="break-words text-sm font-medium"
        :class="done ? 'text-[var(--app-muted)] line-through' : ''"
      >
        {{ task.title }}
      </p>
      <p class="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--app-muted)]">
        <span
          class="rounded-full px-2 py-0.5 text-[11px] font-medium"
          :class="{
            'bg-[var(--app-red-soft)] text-[var(--app-red)]': task.priority === 'P0',
            'bg-[var(--app-amber-soft)] text-[var(--app-amber)]': task.priority === 'P1',
            'bg-[var(--app-blue-soft)] text-[var(--app-blue)]': task.priority === 'P2',
            'bg-[var(--app-panel-3)] text-[var(--app-muted)]': task.priority === 'P3',
          }"
        >
          {{ task.priority }}
        </span>
        <span v-if="task.time_point">{{ task.time_point }}</span>
        <span v-if="task.has_time && task.reminder" class="inline-flex items-center gap-1 text-[var(--app-primary)]">
          <Bell :size="12" /> 提醒
        </span>
        <span v-if="repeatLabel" class="inline-flex items-center gap-1 text-[var(--app-primary)]">
          <Repeat2 :size="12" /> {{ repeatLabel }}
        </span>
        <span v-if="task.is_temp || task.start_date !== task.end_date">
          {{ formatShort(task.start_date) }}{{ task.start_date !== task.end_date ? " – " + formatShort(task.end_date) : "" }}
        </span>
        <span
          v-if="showProject && task.project_name"
          class="rounded-lg border border-[var(--app-border)] bg-[var(--app-panel-2)] px-2 py-0.5"
        >
          {{ task.project_name }}
        </span>
      </p>
    </div>

    <div class="flex flex-none items-center gap-1">
      <button
        type="button"
        class="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-panel-2)] hover:text-[var(--app-text)]"
        :aria-label="`编辑 ${task.title}`"
        @click="emit('edit', task)"
      >
        <Pencil :size="14" />
      </button>
      <button
        type="button"
        class="rounded-lg p-1.5 text-[var(--app-muted)] hover:bg-[var(--app-red-soft)] hover:text-[var(--app-red)]"
        :aria-label="`删除 ${task.title}`"
        @click="emit('delete', task)"
      >
        <Trash2 :size="14" />
      </button>
    </div>
  </li>
</template>
