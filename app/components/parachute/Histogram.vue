<script setup lang="ts">
import { niceScale } from '~/utils/chart'
import { fmt } from '~/utils/format'

const props = defineProps<{
  edges: number[]
  counts: number[]
  vLimit?: number | null
  mean?: number
  xLabel: string
}>()

const W = 640
const H = 300
const M = { l: 56, r: 16, t: 20, b: 52 }
const BAR = '#56B4E9'
const LIMIT = '#D55E00'
const MEAN = '#E69F00'

const xs = computed(() => {
  const lo = Math.min(props.edges[0]!, props.vLimit ?? Infinity)
  const hi = Math.max(props.edges[props.edges.length - 1]!, props.vLimit ?? -Infinity)
  return niceScale(lo, hi, 6, false)
})
const ys = computed(() => niceScale(0, Math.max(...props.counts), 5))
const sx = (v: number) => M.l + ((v - xs.value.min) / (xs.value.max - xs.value.min)) * (W - M.l - M.r)
const sy = (v: number) => H - M.b - ((v - ys.value.min) / (ys.value.max - ys.value.min)) * (H - M.t - M.b)
</script>

<template>
  <figure class="panel !p-4">
    <figcaption class="mb-2 text-sm font-medium text-zinc-200">Monte Carlo hız dağılımı</figcaption>
    <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full text-zinc-400" role="img" aria-label="Monte Carlo terminal hız histogramı">
      <title>Monte Carlo terminal hız histogramı</title>
      <g stroke="currentColor" stroke-opacity="0.15">
        <line v-for="t in ys.ticks" :key="`gy${t}`" :x1="M.l" :x2="W - M.r" :y1="sy(t)" :y2="sy(t)" />
      </g>
      <rect
        v-for="(c, k) in counts"
        :key="k"
        :x="sx(edges[k]!) + 0.5"
        :y="sy(c)"
        :width="Math.max(0, sx(edges[k + 1]!) - sx(edges[k]!) - 1)"
        :height="sy(0) - sy(c)"
        :fill="BAR"
        fill-opacity="0.85"
      />
      <g stroke="currentColor" stroke-opacity="0.5">
        <line :x1="M.l" :x2="W - M.r" :y1="H - M.b" :y2="H - M.b" />
        <line :x1="M.l" :x2="M.l" :y1="M.t" :y2="H - M.b" />
      </g>
      <g fill="currentColor" font-size="11" text-anchor="end">
        <text v-for="t in ys.ticks" :key="`ty${t}`" :x="M.l - 8" :y="sy(t) + 4">{{ fmt(t, 0) }}</text>
      </g>
      <g fill="currentColor" font-size="11" text-anchor="middle">
        <text v-for="t in xs.ticks" :key="`tx${t}`" :x="sx(t)" :y="H - M.b + 16">{{ fmt(t, 1) }}</text>
      </g>
      <text :x="(M.l + W - M.r) / 2" :y="H - 8" text-anchor="middle" font-size="12" fill="currentColor">{{ xLabel }}</text>
      <text :transform="`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`" text-anchor="middle" font-size="12" fill="currentColor">Örnek sayısı</text>

      <g v-if="mean !== undefined">
        <line :x1="sx(mean)" :x2="sx(mean)" :y1="M.t" :y2="H - M.b" :stroke="MEAN" stroke-width="2" stroke-dasharray="2 4" />
      </g>
      <g v-if="vLimit">
        <line :x1="sx(vLimit)" :x2="sx(vLimit)" :y1="M.t" :y2="H - M.b" :stroke="LIMIT" stroke-width="2.5" stroke-dasharray="7 4" />
        <text :x="sx(vLimit) + 5" :y="M.t + 10" font-size="11" :fill="LIMIT">Limit {{ fmt(vLimit, 2) }}</text>
      </g>
    </svg>
    <p class="mt-1 flex flex-wrap gap-x-4 text-xs text-zinc-400">
      <span class="inline-flex items-center gap-1.5"><span class="inline-block h-2.5 w-2.5 rounded-sm" :style="{ background: BAR }" /> Dağılım</span>
      <span v-if="mean !== undefined" class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-4" :style="{ background: MEAN }" /> Ortalama</span>
      <span v-if="vLimit" class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-4" :style="{ background: LIMIT }" /> Hız limiti</span>
    </p>
  </figure>
</template>
