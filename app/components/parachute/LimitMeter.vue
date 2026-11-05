<script setup lang="ts">
import type { LimitCheck } from '~/utils/parachute'
import { fmt } from '~/utils/format'

const props = defineProps<{ label: string; check: LimitCheck; unit: string; digits?: number }>()
// çubuk: değer / (limit·1.25) — limit çizgisi %80'de
const pct = computed(() => Math.min(100, (props.check.value / (props.check.limit * 1.25)) * 100))
</script>

<template>
  <div>
    <div class="flex items-baseline justify-between text-xs">
      <span class="text-zinc-400">{{ label }}</span>
      <span class="tabular-nums" :class="check.pass ? 'text-emerald-300' : 'text-rose-300'">
        {{ fmt(check.value, digits ?? 2) }} / {{ fmt(check.limit, digits ?? 2) }} {{ unit }} ·
        {{ check.pass ? 'marj' : 'aşım' }} %{{ fmt(Math.abs(check.marginPct), 1) }}
      </span>
    </div>
    <div class="relative mt-1.5 h-2 rounded-full bg-space-700" role="meter" :aria-label="label" :aria-valuenow="check.value" :aria-valuemin="0" :aria-valuemax="check.limit">
      <div class="h-full rounded-full transition-all duration-500" :class="check.pass ? 'bg-emerald-400' : 'bg-rose-400'" :style="{ width: `${pct}%` }" />
      <div class="absolute -top-1 h-4 w-0.5 rounded bg-zinc-200" style="left: 80%" title="Limit" />
    </div>
  </div>
</template>
