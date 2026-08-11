<script setup lang="ts">
import { reactive, watch } from "vue";
import { Trash2, X } from "@lucide/vue";
import type { Color, Priority, ProjectInput } from "../lib/types";
import * as db from "../lib/db";
import { closeModals, refresh, store } from "../lib/store";
import { addDays, today } from "../lib/format";

const colors: Color[] = ["red", "amber", "green", "blue", "purple", "teal"];
const priorities: Priority[] = ["P0", "P1", "P2", "P3"];

const form = reactive({
  name: "",
  start_date: today(),
  end_date: addDays(today(), 7),
  color: "blue" as Color,
  priority: "P2" as Priority,
  note: "",
});

watch(
  () => store.projectModalOpen,
  (open) => {
    if (open) init();
  },
);

function init() {
  const project = store.editingProject;
  form.name = project?.name ?? "";
  form.start_date = project?.start_date ?? today();
  form.end_date = project?.end_date ?? addDays(today(), 7);
  form.color = project?.color ?? "blue";
  form.priority = project?.priority ?? "P2";
  form.note = project?.note ?? "";
}

async function save() {
  if (!form.name.trim()) return;
  const input: ProjectInput = {
    name: form.name.trim(),
    start_date: form.start_date,
    end_date: form.end_date,
    color: form.color,
    priority: form.priority,
    note: form.note.trim(),
  };
  if (store.editingProject) {
    await db.updateProject(store.editingProject.id, input);
  } else {
    await db.createProject(input);
  }
  closeModals();
  await refresh();
}

async function remove() {
  if (!store.editingProject) return;
  if (!confirm("确定删除该项目？项目下的任务会一起删除。")) return;
  await db.deleteProject(store.editingProject.id);
  closeModals();
  store.selectedProjectId = null;
  store.view = "projects";
  await refresh();
}
</script>

<template>
  <div
    v-if="store.projectModalOpen"
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
  >
    <div class="theme-surface w-full max-w-lg rounded-2xl p-5 shadow-2xl">
      <div class="mb-4 flex items-center justify-between">
        <h3 class="text-base font-medium">
          {{ store.editingProject ? "编辑项目" : "新建项目" }}
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
          <span class="text-[13px] font-medium">项目名称</span>
          <input v-model="form.name" class="theme-input" placeholder="例如：新品立项" />
        </label>

        <div class="grid grid-cols-2 gap-3">
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium">开始日期</span>
            <input v-model="form.start_date" type="date" class="theme-input" />
          </label>
          <label class="flex flex-col gap-1.5">
            <span class="text-[13px] font-medium">结束日期</span>
            <input v-model="form.end_date" type="date" class="theme-input" />
          </label>
        </div>

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

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">项目优先级</span>
          <select v-model="form.priority" class="theme-input">
            <option v-for="p in priorities" :key="p" :value="p">{{ p }}</option>
          </select>
        </label>

        <label class="flex flex-col gap-1.5">
          <span class="text-[13px] font-medium">项目目标 / 备注</span>
          <textarea v-model="form.note" rows="3" class="theme-input resize-y" placeholder="例如：8月20日前完成新品上架所需全部物料"></textarea>
        </label>

        <div class="mt-2 flex items-center justify-between gap-2">
          <button
            v-if="store.editingProject"
            type="button"
            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] font-medium text-[var(--app-red)] hover:bg-[var(--app-red-soft)]"
            @click="remove"
          >
            <Trash2 :size="14" /> 删除项目
          </button>
          <span v-else></span>
          <div class="flex gap-2">
            <button type="button" class="theme-btn" @click="closeModals">取消</button>
            <button type="submit" class="theme-btn theme-btn-primary">保存项目</button>
          </div>
        </div>
      </form>
    </div>
  </div>
</template>
