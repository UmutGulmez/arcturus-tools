<script setup lang="ts">
import { niceScale } from '~/utils/chart'
import { fmt } from '~/utils/format'

const props = defineProps<{ title: string; labels: string[]; values: number[]; active?: number; unit: string; yLabel: string; digits?: number; color?: string }>()
const W = 360
const H = 230
const M = { l: 52, r: 10, t: 14, b: 40 }
const sc = computed(() => niceScale(0, Math.max(...props.values, 1e-9), 5, true))
const sy = (v: number) => H - M.b - ((v - sc.value.min) / (sc.value.max - sc.value.min)) * (H - M.t - M.b)
const bw = computed(() => (W - M.l - M.r) / props.values.length)
</script>

<template>
  <figure class="panel !p-4">
    <figcaption class="mb-2 text-sm font-medium text-zinc-200">{{ title }}</figcaption>
    <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full text-zinc-400" role="img" :aria-label="title">
      <title>{{ title }}</title>
      <g stroke="currentColor" stroke-opacity="0.15"><line v-for="t in sc.ticks" :key="t" :x1="M.l" :x2="W - M.r" :y1="sy(t)" :y2="sy(t)" /></g>
      <g fill="currentColor" font-size="10" text-anchor="end"><text v-for="t in sc.ticks" :key="`t${t}`" :x="M.l - 6" :y="sy(t) + 3">{{ fmt(t, 0) }}</text></g>
      <g v-for="(v, k) in values" :key="k">
        <rect :x="M.l + k * bw + bw * 0.15" :y="sy(v)" :width="bw * 0.7" :height="sy(0) - sy(v)" :fill="k === active ? '#E69F00' : (color ?? '#56B4E9')" rx="2" />
        <text :x="M.l + k * bw + bw / 2" :y="sy(v) - 4" font-size="9" text-anchor="middle" fill="currentColor">{{ fmt(v, digits ?? 0) }}</text>
        <text :x="M.l + k * bw + bw / 2" :y="H - M.b + 14" font-size="10" text-anchor="middle" fill="currentColor" :font-weight="k === active ? 700 : 400">{{ labels[k] }}</text>
      </g>
      <line :x1="M.l" :x2="W - M.r" :y1="sy(0)" :y2="sy(0)" stroke="currentColor" stroke-opacity="0.5" />
      <text :transform="`translate(12 ${(M.t + H - M.b) / 2}) rotate(-90)`" text-anchor="middle" font-size="11" fill="currentColor">{{ yLabel }}</text>
      <text :x="(M.l + W - M.r) / 2" :y="H - 6" text-anchor="middle" font-size="11" fill="currentColor">Yayılma faktörü (aktif SF turuncu)</text>
    </svg>
  </figure>
</template>
