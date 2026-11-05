<script setup lang="ts">
import type { Warning } from '~/utils/parachute'
defineProps<{ warnings: Warning[] }>()
</script>

<template>
  <section v-if="warnings.length" aria-labelledby="uyarilar-baslik">
    <ParachuteSectionHeader class="mb-3" heading-id="uyarilar-baslik" icon="lucide:triangle-alert" title="Uyarılar" :subtitle="`${warnings.length} not`" />
    <ul class="space-y-2">
      <li
        v-for="(w, k) in warnings"
        :key="k"
        class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
        :class="w.level === 'danger' ? 'border-rose-500/40 bg-rose-500/10 text-rose-100' : w.level === 'warning' ? 'border-amber-500/30 bg-amber-500/5 text-amber-100' : 'border-space-600 bg-space-800/60 text-zinc-300'"
      >
        <Icon :name="w.level === 'info' ? 'lucide:info' : 'lucide:triangle-alert'" size="16" class="mt-0.5 shrink-0" :class="w.level === 'danger' ? 'text-rose-400' : w.level === 'warning' ? 'text-amber-400' : 'text-zinc-400'" />
        <span><span class="sr-only">{{ w.level === 'danger' ? 'Kritik: ' : w.level === 'warning' ? 'Uyarı: ' : 'Bilgi: ' }}</span>{{ w.text }}</span>
      </li>
    </ul>
  </section>
</template>
