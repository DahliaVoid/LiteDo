<script setup lang="ts">
import { onBeforeUnmount, onMounted } from "vue";
import { Archive, Pencil } from "@lucide/vue";
import type { ProjectWithCount } from "../lib/types";

const props = defineProps<{
  project: ProjectWithCount;
  x: number;
  y: number;
}>();

const emit = defineEmits<{
  (e: "edit", project: ProjectWithCount): void;
  (e: "archive", project: ProjectWithCount): void;
  (e: "close"): void;
}>();

const MENU_W = 168;
const MENU_H = 88;

// 限制在窗口可视范围内，避免菜单超出屏幕
function clampPos(): { x: number; y: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  return {
    x: Math.min(props.x, vw - MENU_W - 8),
    y: Math.min(props.y, vh - MENU_H - 8),
  };
}

function onDocumentClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest(".project-context-menu")) return;
  emit("close");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

function onWindowBlur() {
  emit("close");
}

onMounted(() => {
  document.addEventListener("click", onDocumentClick);
  document.addEventListener("keydown", onKeydown);
  window.addEventListener("blur", onWindowBlur);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocumentClick);
  document.removeEventListener("keydown", onKeydown);
  window.removeEventListener("blur", onWindowBlur);
});
</script>

<template>
  <div
    class="project-context-menu theme-surface fixed z-50 flex w-[168px] flex-col rounded-xl p-1 shadow-2xl"
    :style="{ left: clampPos().x + 'px', top: clampPos().y + 'px' }"
    @click.stop
  >
    <span class="truncate border-b border-[var(--app-border)] px-3 py-1.5 text-xs text-[var(--app-muted)]">
      {{ project.name }}
    </span>
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--app-text)] transition hover:bg-[var(--app-panel-2)]"
      @click="emit('edit', project)"
    >
      <Pencil :size="14" class="flex-none text-[var(--app-muted)]" /> 编辑项目
    </button>
    <button
      type="button"
      class="flex items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-[var(--app-text)] transition hover:bg-[var(--app-panel-2)]"
      @click="emit('archive', project)"
    >
      <Archive :size="14" class="flex-none text-[var(--app-muted)]" /> 归档
    </button>
  </div>
</template>
