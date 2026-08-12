<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps<{
  x: number;
  y: number;
  /** 可选头部说明（如项目/任务名称），超长截断 */
  header?: string;
}>();

const emit = defineEmits<{
  (e: "close"): void;
}>();

const menuRef = ref<HTMLElement | null>(null);
// 挂载前先放到屏幕外，测量实际尺寸后再钳制到可视范围内
const pos = ref({ x: -9999, y: -9999 });

// 菜单已打开时再次右键其他位置：x/y 变化后重新定位，跟随鼠标
watch(
  () => [props.x, props.y] as const,
  () => {
    const el = menuRef.value;
    if (el) {
      pos.value = {
        x: Math.min(props.x, window.innerWidth - el.offsetWidth - 8),
        y: Math.min(props.y, window.innerHeight - el.offsetHeight - 8),
      };
    }
  },
);

function onDocumentClick(event: MouseEvent) {
  if ((event.target as HTMLElement).closest(".app-context-menu")) return;
  emit("close");
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "Escape") emit("close");
}

function onWindowBlur() {
  emit("close");
}

onMounted(() => {
  const el = menuRef.value;
  if (el) {
    pos.value = {
      x: Math.min(props.x, window.innerWidth - el.offsetWidth - 8),
      y: Math.min(props.y, window.innerHeight - el.offsetHeight - 8),
    };
  }
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
    ref="menuRef"
    class="app-context-menu theme-surface fixed z-50 flex w-[168px] flex-col rounded-xl p-1 shadow-2xl"
    :style="{ left: pos.x + 'px', top: pos.y + 'px' }"
    @click.stop
  >
    <span
      v-if="header"
      class="truncate border-b border-[var(--app-border)] px-3 py-1.5 text-xs text-[var(--app-muted)]"
    >
      {{ header }}
    </span>
    <slot />
  </div>
</template>
