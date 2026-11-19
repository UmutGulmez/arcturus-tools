<script setup lang="ts">
import { niceScale } from '~/utils/chart'
import { fmt } from '~/utils/format'

const props = defineProps<{
  title: string
  xLabel: string
  yLabel: string
  x: number[]
  external: number[]
  internal: number[]
  point: { x: number; y: number } | null
}>()
const W = 640
const H = 300
const M = { l: 56, r: 16, t: 12, b: 48 }
const sc = computed(() => ({
  x: niceScale(0, Math.max(...props.x, props.point?.x ?? 0)),
  y: niceScale(0, Math.max(...props.external, ...props.internal, props.point?.y ?? 0)),
}))
const sx = (v: number) => M.l + ((v - sc.value.x.min) / (sc.value.x.max - sc.value.x.min)) * (W - M.l - M.r)
const sy = (v: number) => H - M.b - ((v - sc.value.y.min) / (sc.value.y.max - sc.value.y.min)) * (H - M.t - M.b)
const path = (ys: number[]) => props.x.map((x, k) => `${k ? 'L' : 'M'}${sx(x).toFixed(1)} ${sy(ys[k]!).toFixed(1)}`).join(' ')
const inRange = computed(() => !!props.point && props.point.x <= sc.value.x.max && props.point.y <= sc.value.y.max)
</script>

<template>
  <figure class="panel !p-4">
    <figcaption class="mb-2 flex flex-wrap items-center justify-between gap-2 text-sm font-medium text-zinc-200">
      <span>{{ title }}</span>
      <span class="flex items-center gap-4 text-xs font-normal text-zinc-400">
        <span class="inline-flex items-center gap-1.5"><span class="h-0.5 w-4 bg-sky-400" /> Dış katman</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-0.5 w-4 bg-amber-400" /> İç katman</span>
        <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full bg-white" /> Seçilen nokta</span>
      </span>
    </figcaption>
    <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full text-zinc-400" role="img" :aria-label="`${title}: ${xLabel} ile ${yLabel}`">
      <g stroke="currentColor" stroke-opacity="0.15">
        <line v-for="t in sc.y.ticks" :key="`gy${t}`" :x1="M.l" :x2="W - M.r" :y1="sy(t)" :y2="sy(t)" />
        <line v-for="t in sc.x.ticks" :key="`gx${t}`" :y1="M.t" :y2="H - M.b" :x1="sx(t)" :x2="sx(t)" />
      </g>
      <g stroke="currentColor" stroke-opacity="0.5">
        <line :x1="M.l" :x2="W - M.r" :y1="H - M.b" :y2="H - M.b" />
        <line :x1="M.l" :x2="M.l" :y1="M.t" :y2="H - M.b" />
      </g>
      <g fill="currentColor" font-size="11" text-anchor="end"><text v-for="t in sc.y.ticks" :key="`ty${t}`" :x="M.l - 8" :y="sy(t) + 4">{{ fmt(t, t % 1 ? 1 : 0) }}</text></g>
      <g fill="currentColor" font-size="11" text-anchor="middle"><text v-for="t in sc.x.ticks" :key="`tx${t}`" :x="sx(t)" :y="H - M.b + 16">{{ fmt(t, t % 1 ? 1 : 0) }}</text></g>
      <text :x="(M.l + W - M.r) / 2" :y="H - 8" text-anchor="middle" font-size="12" fill="currentColor">{{ xLabel }}</text>
      <text :transform="`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`" text-anchor="middle" font-size="12" fill="currentColor">{{ yLabel }}</text>
      <path :d="path(props.external)" fill="none" stroke="#38bdf8" stroke-width="2.25" stroke-linejoin="round" />
      <path :d="path(props.internal)" fill="none" stroke="#fbbf24" stroke-width="2.25" stroke-linejoin="round" />
      <g v-if="point && inRange">
        <line :x1="sx(point.x)" :x2="sx(point.x)" :y1="sy(point.y)" :y2="H - M.b" stroke="#fff" stroke-opacity="0.5" stroke-dasharray="3 3" />
        <line :x1="M.l" :x2="sx(point.x)" :y1="sy(point.y)" :y2="sy(point.y)" stroke="#fff" stroke-opacity="0.5" stroke-dasharray="3 3" />
        <circle :cx="sx(point.x)" :cy="sy(point.y)" r="5.5" fill="#fff" stroke="#09090b" stroke-width="1.5" />
      </g>
    </svg>
    <p v-if="point && !inRange" class="mt-1 text-xs text-amber-300">Seçilen nokta grafik aralığının dışında.</p>
  </figure>
</template>
