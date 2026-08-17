<script setup lang="ts">
import { onMounted, ref } from "vue";
import { Power } from "@lucide/vue";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

const autostartEnabled = ref(false);
const loading = ref(true);
const errorMessage = ref("");

onMounted(async () => {
  try {
    autostartEnabled.value = await isEnabled();
  } catch {
    errorMessage.value = "无法读取开机启动状态，请在已安装的 LiteDo 中使用此设置。";
  } finally {
    loading.value = false;
  }
});

async function toggleAutostart() {
  if (loading.value) return;
  const next = !autostartEnabled.value;
  loading.value = true;
  errorMessage.value = "";
  try {
    if (next) await enable();
    else await disable();
    autostartEnabled.value = await isEnabled();
  } catch {
    errorMessage.value = "设置未能保存，请稍后重试。";
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <section class="mx-auto max-w-2xl">
    <div class="theme-surface overflow-hidden rounded-2xl">
      <div class="flex items-start gap-3 border-b border-[var(--app-border)] px-5 py-4">
        <span class="grid h-10 w-10 place-items-center rounded-xl bg-[var(--app-primary-soft)] text-[var(--app-primary)]">
          <Power :size="18" />
        </span>
        <div>
          <h2 class="text-[15px] font-medium">应用启动</h2>
          <p class="mt-1 text-[13px] text-[var(--app-muted)]">管理 LiteDo 的开机运行方式。</p>
        </div>
      </div>

      <div class="flex items-center justify-between gap-4 px-5 py-4">
        <div>
          <h3 class="text-sm font-medium">开机启动</h3>
          <p class="mt-1 text-[13px] text-[var(--app-muted)]">登录 Windows 后自动启动 LiteDo。</p>
        </div>
        <button
          type="button"
          class="relative inline-flex h-6 w-11 flex-none items-center rounded-full transition"
          :class="autostartEnabled ? 'bg-[var(--app-primary)]' : 'bg-[var(--app-panel-3)]'"
          :disabled="loading"
          :aria-pressed="autostartEnabled"
          aria-label="开机启动"
          @click="toggleAutostart"
        >
          <span
            class="h-5 w-5 rounded-full bg-white shadow transition"
            :class="autostartEnabled ? 'translate-x-5' : 'translate-x-0.5'"
          ></span>
        </button>
      </div>
    </div>
    <p v-if="errorMessage" class="mt-3 text-[13px] text-[var(--app-red)]">{{ errorMessage }}</p>
  </section>
</template>
