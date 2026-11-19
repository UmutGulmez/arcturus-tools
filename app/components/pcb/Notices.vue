<script setup lang="ts">
import type { PcbWarning } from '~/utils/pcbUnits'
defineProps<{ items: PcbWarning[]; errors?: string[] }>()
</script>

<template>
  <ul v-if="items.length || errors?.length" class="space-y-2" aria-label="Uyarılar">
    <li v-for="(e, k) in errors" :key="`e${k}`" class="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
      <Icon name="lucide:circle-alert" size="16" class="mt-0.5 shrink-0 text-rose-400" /><span><span class="sr-only">Hata: </span>{{ e }}</span>
    </li>
    <li
      v-for="(w, k) in items"
      :key="`w${k}`"
      class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
      :class="w.level === 'error' ? 'border-rose-500/40 bg-rose-500/10 text-rose-100' : 'border-amber-500/30 bg-amber-500/5 text-amber-100'"
    >
      <Icon name="lucide:triangle-alert" size="16" class="mt-0.5 shrink-0" :class="w.level === 'error' ? 'text-rose-400' : 'text-amber-400'" />
      <span><span class="sr-only">{{ w.level === 'error' ? 'Hata: ' : 'Uyarı: ' }}</span>{{ w.text }}</span>
    </li>
  </ul>
</template>
