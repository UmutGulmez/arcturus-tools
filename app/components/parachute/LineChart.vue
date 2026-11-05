<script setup lang="ts">
import { niceScale } from '~/utils/chart'
import { fmt } from '~/utils/format'

export interface ChartSeries {
  name: string
  color: string
  x: number[]
  y: number[]
}

const props = withDefaults(
  defineProps<{
    title: string
    xLabel: string
    yLabel: string
    series: ChartSeries[]
    xDigits?: number
    yDigits?: number
  }>(),
  { xDigits: 2, yDigits: 2 },
)

const W = 640
const H = 320
const M = { l: 64, r: 16, t: 12, b: 52 }
const MAX_POINTS = 500

function decimate(s: ChartSeries): [number, number][] {
  const n = s.x.length
  const step = Math.max(1, Math.ceil(n / MAX_POINTS))
  const pts: [number, number][] = []
  for (let k = 0; k < n; k += step) pts.push([s.x[k]!, s.y[k]!])
  if ((n - 1) % step !== 0) pts.push([s.x[n - 1]!, s.y[n - 1]!])
  return pts
}

const data = computed(() => props.series.map((s) => ({ ...s, pts: decimate(s) })))

const scales = computed(() => {
  const xs = data.value.flatMap((s) => s.pts.map((p) => p[0]))
  const ys = data.value.flatMap((s) => s.pts.map((p) => p[1]))
  return { x: niceScale(Math.min(...xs), Math.max(...xs)), y: niceScale(Math.min(...ys), Math.max(...ys)) }
})

const sx = (v: number) => M.l + ((v - scales.value.x.min) / (scales.value.x.max - scales.value.x.min)) * (W - M.l - M.r)
const sy = (v: number) => H - M.b - ((v - scales.value.y.min) / (scales.value.y.max - scales.value.y.min)) * (H - M.t - M.b)

const paths = computed(() =>
  data.value.map((s) => ({
    name: s.name,
    color: s.color,
    d: s.pts.map((p, k) => `${k ? 'L' : 'M'}${sx(p[0]).toFixed(1)} ${sy(p[1]).toFixed(1)}`).join(' '),
  })),
)

// ---- üzerine gelince değer okuma
const svg = ref<SVGSVGElement | null>(null)
const hover = ref<{ name: string; color: string; x: number; y: number }[] | null>(null)

function onMove(e: PointerEvent) {
  const el = svg.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  const px = ((e.clientX - rect.left) / rect.width) * W
  hover.value = data.value.map((s) => {
    let best = s.pts[0]!
    for (const p of s.pts) if (Math.abs(sx(p[0]) - px) < Math.abs(sx(best[0]) - px)) best = p
    return { name: s.name, color: s.color, x: best[0], y: best[1] }
  })
}
</script>

<template>
  <figure class="panel !p-4">
    <figcaption class="mb-2 text-sm font-medium text-zinc-200">{{ title }}</figcaption>
    <svg
      ref="svg"
      :viewBox="`0 0 ${W} ${H}`"
      class="h-auto w-full touch-none text-zinc-400"
      role="img"
      :aria-label="`${title}: ${xLabel} ile ${yLabel} grafiği`"
      @pointermove="onMove"
      @pointerleave="hover = null"
    >
      <title>{{ title }}</title>
      <g stroke="currentColor" stroke-opacity="0.15">
        <line v-for="t in scales.y.ticks" :key="`gy${t}`" :x1="M.l" :x2="W - M.r" :y1="sy(t)" :y2="sy(t)" />
        <line v-for="t in scales.x.ticks" :key="`gx${t}`" :y1="M.t" :y2="H - M.b" :x1="sx(t)" :x2="sx(t)" />
      </g>
      <g stroke="currentColor" stroke-opacity="0.5">
        <line :x1="M.l" :x2="W - M.r" :y1="H - M.b" :y2="H - M.b" />
        <line :x1="M.l" :x2="M.l" :y1="M.t" :y2="H - M.b" />
      </g>
      <g fill="currentColor" font-size="11" text-anchor="end">
        <text v-for="t in scales.y.ticks" :key="`ty${t}`" :x="M.l - 8" :y="sy(t) + 4">{{ fmt(t, yDigits > 1 ? 0 : yDigits) }}</text>
      </g>
      <g fill="currentColor" font-size="11" text-anchor="middle">
        <text v-for="t in scales.x.ticks" :key="`tx${t}`" :x="sx(t)" :y="H - M.b + 16">{{ fmt(t, xDigits > 1 ? 0 : xDigits) }}</text>
      </g>
      <text :x="(M.l + W - M.r) / 2" :y="H - 8" text-anchor="middle" font-size="12" fill="currentColor">{{ xLabel }}</text>
      <text :transform="`translate(14 ${(M.t + H - M.b) / 2}) rotate(-90)`" text-anchor="middle" font-size="12" fill="currentColor">{{ yLabel }}</text>

      <path v-for="p in paths" :key="p.name" :d="p.d" fill="none" :stroke="p.color" stroke-width="2.25" stroke-linejoin="round" />

      <g v-if="hover">
        <line :x1="sx(hover[0]!.x)" :x2="sx(hover[0]!.x)" :y1="M.t" :y2="H - M.b" stroke="currentColor" stroke-opacity="0.4" stroke-dasharray="3 3" />
        <circle v-for="h in hover" :key="h.name" :cx="sx(h.x)" :cy="sy(h.y)" r="4.5" :fill="h.color" stroke="#09090b" stroke-width="1.5" />
      </g>
    </svg>
    <p class="mt-1 min-h-5 text-xs tabular-nums text-zinc-400" aria-live="off">
      <template v-if="hover">
        <span v-for="h in hover" :key="h.name" class="mr-3">
          <span v-if="series.length > 1" :style="{ color: h.color }">{{ h.name }}: </span>{{ xLabel.split(' (')[0] }} {{ fmt(h.x, xDigits) }} · {{ yLabel.split(' (')[0] }} {{ fmt(h.y, yDigits) }}
        </span>
      </template>
      <template v-else>Değer görmek için grafiğin üzerine gelin.</template>
    </p>
  </figure>
</template>
