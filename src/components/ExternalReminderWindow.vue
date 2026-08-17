<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { BellRing } from "@lucide/vue";
import { emitTo } from "@tauri-apps/api/event";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { Task } from "../lib/types";

interface ReminderPayload {
  task: Task;
  scheduledAt: string;
}

function initialPayload(): ReminderPayload | null {
  const value = new URLSearchParams(window.location.search).get("task");
  if (!value) return null;
  try {
    return JSON.parse(decodeURIComponent(value)) as ReminderPayload;
  } catch {
    return null;
  }
}

const reminder = ref<ReminderPayload | null>(initialPayload());
let unlisten: (() => void) | undefined;

async function act(action: "dismiss" | "snooze") {
  if (!reminder.value) return;
  await emitTo("main", "external-reminder-action", {
    action,
    taskId: reminder.value.task.id,
    scheduledAt: reminder.value.scheduledAt,
  });
  await getCurrentWindow().close();
}

onMounted(async () => {
  unlisten = await getCurrentWindow().listen<ReminderPayload>("reminder-task", (event) => {
    reminder.value = event.payload;
  });
});

onUnmounted(() => unlisten?.());
</script>

<template>
  <main class="h-full p-3">
    <div v-if="reminder" class="theme-surface flex h-full items-start gap-3 rounded-2xl p-3.5 shadow-2xl">
      <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
        <BellRing :size="17" />
      </span>
      <div class="min-w-0 flex-1">
        <strong class="block text-sm font-medium">{{ reminder.task.time_point }} 提醒</strong>
        <p class="mt-0.5 truncate text-[13px] text-[var(--app-muted)]">{{ reminder.task.title }}</p>
      </div>
      <div class="flex flex-none flex-col gap-1.5">
        <button type="button" class="theme-btn px-2.5 py-1 text-xs" @click="act('dismiss')">知道了</button>
        <button type="button" class="theme-btn theme-btn-primary px-2.5 py-1 text-xs" @click="act('snooze')">稍后提醒</button>
      </div>
    </div>
  </main>
</template>
