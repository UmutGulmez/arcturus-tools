<script setup lang="ts">
import { MAIN_GROUPS } from '~/utils/linkBudgetFields'
import type { LineForm } from '~/utils/linkBudgetFields'

defineProps<{ form: LineForm; errors: Record<string, string>; idPrefix: string }>()
const FREQS = ['433', '868', '915', '2400']
</script>

<template>
  <div class="space-y-3">
    <details v-for="g in MAIN_GROUPS" :key="g.id" class="group/d rounded-xl border border-space-700 bg-space-900/40" open>
      <summary class="flex cursor-pointer list-none items-center gap-2 px-3 py-2.5 text-[11px] font-medium uppercase tracking-widest text-zinc-400">
        <Icon :name="g.icon" size="14" /> {{ g.title }}
        <Icon name="lucide:chevron-down" size="14" class="ml-auto transition group-open/d:rotate-180" />
      </summary>
      <div class="space-y-3 px-3 pb-3">
        <div v-if="g.id === 'tx'" class="flex flex-wrap items-center gap-1.5" role="group" aria-label="Hazır frekanslar">
          <span class="text-xs text-zinc-500">Hazır:</span>
          <button
            v-for="f in FREQS" :key="f" type="button"
            class="rounded-lg border px-2 py-1 text-xs transition"
            :class="form.freq === f ? 'border-arc-500 bg-arc-500/15 text-white' : 'border-space-600 bg-space-900 text-zinc-300 hover:border-arc-500'"
            @click="form.freq = f"
          >{{ f }} MHz</button>
        </div>
        <LinkbudgetFieldGroup :group="g" :form="form" :errors="errors" :id-prefix="idPrefix" />
        <LinkbudgetPowerConverter v-if="g.id === 'tx'" :dbm="form.ptx!" @set="form.ptx = $event" />
      </div>
    </details>
  </div>
</template>
