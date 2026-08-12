<script setup lang="ts">
import { store } from "../lib/store";

function cancel() {
  store.confirm?.resolve(false);
  store.confirm = null;
}

function confirm() {
  store.confirm?.resolve(true);
  store.confirm = null;
}
</script>

<template>
  <div
    v-if="store.confirm"
    class="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
    @click.self="cancel"
  >
    <div class="theme-surface w-full max-w-sm rounded-2xl p-5 shadow-2xl" role="alertdialog" aria-modal="true">
      <h3 class="text-base font-medium">{{ store.confirm.title }}</h3>
      <p class="mt-2 text-[13px] leading-relaxed text-[var(--app-muted)]">{{ store.confirm.message }}</p>
      <div class="mt-5 flex justify-end gap-2">
        <button type="button" class="theme-btn" @click="cancel">{{ store.confirm.cancelText }}</button>
        <button
          type="button"
          class="theme-btn"
          :class="store.confirm.danger ? 'theme-btn-danger' : 'theme-btn-primary'"
          @click="confirm"
        >
          {{ store.confirm.confirmText }}
        </button>
      </div>
    </div>
  </div>
</template>
