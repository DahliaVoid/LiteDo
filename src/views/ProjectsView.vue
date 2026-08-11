<script setup lang="ts">
import { computed } from "vue";
import { CalendarRange, Plus } from "@lucide/vue";
import type { ProjectWithCount } from "../lib/types";
import { dateInRange, formatShort, today } from "../lib/format";
import { openProject, openProjectModal, store, tasksOnDate } from "../lib/store";

const todayValue = today();
const activeProjects = computed(() => store.projects.filter((p) => dateInRange(todayValue, p.start_date, p.end_date)));
const upcomingProjects = computed(() => store.projects.filter((p) => p.start_date > todayValue));
const todayDue = computed(() => tasksOnDate(todayValue).filter((t) => !t.is_temp && !t.done).length);

function progress(p: ProjectWithCount): number {
  return p.task_count ? Math.round((p.done_count / p.task_count) * 100) : 0;
}
</script>

<template>
  <div>
    <div class="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
      <div class="theme-surface rounded-xl px-4 py-3">
        <span class="text-xs text-[var(--app-muted)]">进行中项目</span>
        <strong class="mt-0.5 block text-lg font-medium">{{ activeProjects.length }}</strong>
      </div>
      <div class="theme-surface rounded-xl px-4 py-3">
        <span class="text-xs text-[var(--app-muted)]">未开始</span>
        <strong class="mt-0.5 block text-lg font-medium">{{ upcomingProjects.length }}</strong>
      </div>
      <div class="theme-surface rounded-xl px-4 py-3">
        <span class="text-xs text-[var(--app-muted)]">今日到期任务</span>
        <strong class="mt-0.5 block text-lg font-medium">{{ todayDue }}</strong>
      </div>
    </div>

    <div class="mb-3 flex items-center justify-between">
      <h2 class="text-[15px] font-medium">全部项目</h2>
      <button
        type="button"
        class="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-[13px] text-[var(--app-primary)] hover:bg-[var(--app-primary-soft)]"
        @click="openProjectModal()"
      >
        <Plus :size="14" /> 新建项目
      </button>
    </div>

    <div v-if="store.projects.length" class="grid grid-cols-1 gap-3.5 sm:grid-cols-2 xl:grid-cols-3">
      <article
        v-for="project in store.projects"
        :key="project.id"
        class="cursor-pointer rounded-2xl border border-[var(--app-border)] border-t-4 bg-[var(--app-panel)] p-4 transition hover:-translate-y-0.5 hover:border-[var(--app-primary)]"
        :class="`task-color-${project.color}`"
        :style="{ borderTopColor: 'var(--task-color)' }"
        role="button"
        tabindex="0"
        @click="openProject(project.id)"
        @keydown.enter="openProject(project.id)"
      >
        <div class="flex items-center gap-2">
          <span class="h-2.5 w-2.5 flex-none rounded-[4px]" :style="{ background: 'var(--task-color)' }"></span>
          <h3 class="min-w-0 flex-1 truncate text-[15px] font-medium">{{ project.name }}</h3>
          <span
            class="rounded-full px-2 py-0.5 text-[11px]"
            :class="{
              'bg-[var(--app-blue-soft)] text-[var(--app-blue)]': dateInRange(todayValue, project.start_date, project.end_date),
              'bg-[var(--app-panel-3)] text-[var(--app-muted)]': project.start_date > todayValue,
            }"
          >
            {{ dateInRange(todayValue, project.start_date, project.end_date) ? "进行中" : "未开始" }}
          </span>
        </div>

        <p class="mt-3 flex items-center gap-1.5 text-xs text-[var(--app-muted)]">
          <CalendarRange :size="13" />
          {{ formatShort(project.start_date) }} – {{ formatShort(project.end_date) }}
        </p>
        <p class="mt-1.5 line-clamp-2 min-h-[2.4em] text-[13px] text-[var(--app-muted)]">
          {{ project.note || "暂无项目目标备注" }}
        </p>

        <div class="mt-3 flex items-center gap-2.5 text-xs text-[var(--app-muted)]">
          <div class="h-2 flex-1 overflow-hidden rounded-full bg-[var(--app-panel-3)]">
            <div class="h-full rounded-full bg-[var(--app-primary)]" :style="{ width: progress(project) + '%' }"></div>
          </div>
          <span class="whitespace-nowrap">{{ project.done_count }}/{{ project.task_count }} 任务</span>
        </div>
      </article>
    </div>
    <div v-else class="theme-surface-2 rounded-xl px-4 py-10 text-center text-[13px] text-[var(--app-muted)]">
      还没有项目，点击右上角“新建项目”开始。
    </div>
  </div>
</template>
