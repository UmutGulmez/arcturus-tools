<script setup lang="ts">
import { LOSS_GROUP } from '~/utils/linkBudgetFields'
import type { LineForm } from '~/utils/linkBudgetFields'

defineProps<{ form: LineForm; errors: Record<string, string>; idPrefix: string }>()
const POL = [
  { label: 'Aynı lineer · 0 dB', v: '0' },
  { label: 'Lineer–dairesel · 3 dB', v: '3' },
  { label: 'Çapraz lineer · 20 dB', v: '20' },
]
</script>

<template>
  <details class="group/d rounded-xl border border-space-700 bg-space-900/40" open>
    <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
      <Icon :name="LOSS_GROUP.icon" size="14" /> {{ LOSS_GROUP.title }}
      <Icon name="lucide:chevron-down" size="14" class="ml-auto transition group-open/d:rotate-180" />
    </summary>
    <div class="space-y-3 px-3 pb-3">
      <div v-if="form.single !== '1'" class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Polarizasyon hazır değerleri">
        <span class="text-xs text-zinc-500">Polarizasyon:</span>
        <button
          v-for="p in POL" :key="p.v" type="button"
          class="rounded-lg border px-2 py-1 text-xs transition"
          :class="form.pol === p.v ? 'border-arc-500 bg-arc-500/15 text-white' : 'border-space-600 bg-space-900 text-zinc-300 hover:border-arc-500'"
          @click="form.pol = p.v"
        >{{ p.label }}</button>
      </div>
      <LinkbudgetFieldGroup :group="LOSS_GROUP" :form="form" :errors="errors" :id-prefix="idPrefix" />
    </div>
  </details>
</template>
