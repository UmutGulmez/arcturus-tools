<script setup lang="ts">
import type { RunStatus } from '~/composables/useParachuteWorker'
defineProps<{ status: RunStatus; error?: string | null; stale?: boolean }>()
</script>

<template>
  <p v-if="status === 'running'" class="inline-flex items-center gap-2 text-sm text-zinc-300" role="status">
    <Icon name="lucide:loader-circle" size="16" class="animate-spin" /> Hesaplanıyor…
  </p>
  <p v-else-if="status === 'error'" class="inline-flex items-center gap-2 text-sm text-rose-300" role="alert">
    <Icon name="lucide:circle-alert" size="16" /> Hata: {{ error }}
  </p>
  <p v-else-if="stale" class="inline-flex items-center gap-2 text-sm text-amber-300" role="status">
    <Icon name="lucide:triangle-alert" size="16" /> Girdiler değişti; sonuçlar eski. Yeniden hesaplayın.
  </p>
</template>
