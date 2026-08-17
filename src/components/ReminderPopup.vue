<script setup lang="ts">
import { BellRing } from "@lucide/vue";
import type { Task } from "../lib/types";
import { dismissReminder, snoozeReminder, store } from "../lib/store";

async function dismiss(task: Task) {
  await dismissReminder(task);
}

function snooze(task: Task) {
  snoozeReminder(task);
}
</script>

<template>
  <div v-if="store.reminders.length" class="fixed right-4 bottom-4 z-40 flex w-80 flex-col gap-2.5">
    <div
      v-for="task in store.reminders"
      :key="task.id"
      class="theme-surface flex items-start gap-3 rounded-2xl p-3.5 shadow-2xl"
    >
      <span class="grid h-9 w-9 flex-none place-items-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
        <BellRing :size="17" />
      </span>
      <div class="min-w-0 flex-1">
        <strong class="block text-sm font-medium">{{ task.time_point }} 提醒</strong>
        <p class="mt-0.5 truncate text-[13px] text-[var(--app-muted)]">{{ task.title }}</p>
      </div>
      <div class="flex flex-none flex-col gap-1.5">
        <button type="button" class="theme-btn px-2.5 py-1 text-xs" @click="dismiss(task)">知道了</button>
        <button type="button" class="theme-btn theme-btn-primary px-2.5 py-1 text-xs" @click="snooze(task)">稍后提醒</button>
      </div>
    </div>
  </div>
</template>
