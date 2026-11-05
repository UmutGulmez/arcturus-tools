<script setup lang="ts">
import { fmt } from '~/utils/format'

export interface Segment { label: string; value: number; color: string }
const props = defineProps<{ title: string; segments: Segment[]; dec: number }>()
const total = computed(() => props.segments.reduce((s, x) => s + x.value, 0))
const segs = computed(() => {
  let acc = 0
  return props.segments.map((s) => {
    const w = total.value > 0 ? (s.value / total.value) * 100 : 0
    const o = { ...s, x: acc, w, pct: w }
    acc += w
    return o
  })
})
</script>

<template>
  <figure class="panel !p-4">
    <figcaption class="mb-3 text-sm font-medium text-zinc-200">{{ title }} <span class="font-normal text-zinc-500">· toplam {{ fmt(total, dec) }} dB</span></figcaption>
    <svg viewBox="0 0 100 10" preserveAspectRatio="none" class="h-9 w-full overflow-hidden rounded-lg" role="img" :aria-label="`${title}: ${segments.map((s) => `${s.label} ${fmt(s.value, dec)} dB`).join(', ')}`">
      <rect v-for="s in segs" :key="s.label" :x="s.x" y="0" :width="s.w" height="10" :fill="s.color" stroke="#16161a" stroke-width="0.25" />
    </svg>
    <ul class="mt-3 grid gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
      <li v-for="s in segs" :key="s.label" class="flex items-center gap-2">
        <span class="h-3 w-3 shrink-0 rounded-sm" :style="{ background: s.color }" aria-hidden="true" />
        <span class="min-w-0 flex-1 truncate text-zinc-300">{{ s.label }}</span>
        <span class="tabular-nums text-zinc-100">{{ fmt(s.value, dec) }} dB</span>
        <span class="w-12 text-right text-xs tabular-nums text-zinc-500">%{{ fmt(s.pct, 0) }}</span>
      </li>
    </ul>
  </figure>
</template>
