<script setup lang="ts">
import { Archive, CalendarRange, RotateCcw } from "@lucide/vue";
import type { ProjectWithCount } from "../lib/types";
import * as db from "../lib/db";
import { formatShort } from "../lib/format";
import { refresh, store } from "../lib/store";

async function restore(project: ProjectWithCount) {
  await db.restoreProject(project.id);
  await refresh();
}
</script>

<template>
  <div>
    <div class="mb-4 flex items-center gap-2 text-[13px] text-[var(--app-muted)]">
      <Archive :size="15" />
      归档的项目不会出现在项目页，可随时恢复。
    </div>

    <div v-if="store.archivedProjects.length" class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="project in store.archivedProjects"
        :key="project.id"
        class="rounded-2xl border border-[var(--app-border)] bg-[var(--app-panel)] p-4 opacity-80"
        :class="`task-color-${project.color}`"
        :style="{ borderTopColor: 'var(--task-color)' }"
      >
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 flex-none rounded-[4px]" :style="{ background: 'var(--task-color)' }"></span>
          <h3 class="min-w-0 flex-1 truncate text-[15px] font-medium">{{ project.name }}</h3>
          <span class="rounded-full bg-[var(--app-panel-3)] px-2 py-0.5 text-[11px] text-[var(--app-muted)]">已归档</span>
        </div>

        <p class="mt-3 flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
          <CalendarRange :size="13" />
          {{ formatShort(project.start_date) }} – {{ formatShort(project.end_date) }}
        </p>
        <p class="mt-1.5 line-clamp-2 min-h-[2.4em] text-[13px] text-[var(--app-muted)]">
          {{ project.note || "暂无项目目标备注" }}
        </p>

        <div class="mt-3 flex justify-end">
          <button
            type="button"
            class="inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-[var(--app-primary)] transition hover:bg-[var(--app-primary-soft)]"
            @click="restore(project)"
          >
            <RotateCcw :size="13" /> 恢复
          </button>
        </div>
      </article>
    </div>
    <div v-else class="theme-surface-2 rounded-xl px-4 py-10 text-center text-[13px] text-[var(--app-muted)]">
      暂无归档项目，在项目页对项目右键选择“归档”后出现在这里。
    </div>
  </div>
</template>
