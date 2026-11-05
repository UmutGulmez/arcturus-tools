<script setup lang="ts">
import { fmt } from '~/utils/format'

const props = defineProps<{ value: number; limit?: number | null }>()

const W = 220
const H = 128
const cx = 110
const cy = 108
const R = 88

const max = computed(() => {
  const raw = Math.max(props.value * 1.25, (props.limit ?? 0) * 1.25, 10)
  const step = raw > 60 ? 10 : 5
  return Math.ceil(raw / step) * step
})

const pt = (f: number, r = R): [number, number] => {
  const a = Math.PI + f * Math.PI
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)]
}
function arc(f0: number, f1: number): string {
  if (f1 - f0 <= 0.0005) return ''
  const [x0, y0] = pt(f0)
  const [x1, y1] = pt(f1)
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`
}

const fv = computed(() => Math.min(1, props.value / max.value))
const fl = computed(() => (props.limit ? Math.min(1, props.limit / max.value) : null))
const pass = computed(() => props.limit == null || props.value <= props.limit)
const valueColor = computed(() => (props.limit == null ? '#818cf8' : pass.value ? '#34d399' : '#fb7185'))
const limitTick = computed(() => (fl.value === null ? null : { a: pt(fl.value, R - 14), b: pt(fl.value, R + 14), label: pt(fl.value, R + 22) }))
</script>

<template>
  <svg :viewBox="`0 0 ${W} ${H}`" class="h-auto w-full" role="img" :aria-label="`Terminal hız göstergesi: ${fmt(value, 2)} m/s${limit ? `, limit ${fmt(limit, 2)} m/s` : ''}`">
    <path :d="arc(0, 1)" fill="none" stroke="#2c2c35" stroke-width="14" stroke-linecap="round" />
    <path v-if="fl !== null" :d="arc(0, fl)" fill="none" stroke="#34d399" stroke-opacity="0.18" stroke-width="14" />
    <path v-if="fl !== null" :d="arc(fl, 1)" fill="none" stroke="#fb7185" stroke-opacity="0.18" stroke-width="14" />
    <path :d="arc(0, fv)" fill="none" :stroke="valueColor" stroke-width="14" stroke-linecap="round" />
    <g v-if="limitTick">
      <line :x1="limitTick.a[0]" :y1="limitTick.a[1]" :x2="limitTick.b[0]" :y2="limitTick.b[1]" stroke="#e4e4e7" stroke-width="2.5" />
      <text :x="limitTick.label[0]" :y="limitTick.label[1]" font-size="9" fill="#a1a1aa" text-anchor="middle">limit</text>
    </g>
    <text :x="cx" :y="cy - 14" text-anchor="middle" font-size="30" font-weight="700" fill="#fff" style="font-variant-numeric: tabular-nums">{{ fmt(value, 2) }}</text>
    <text :x="cx" :y="cy + 4" text-anchor="middle" font-size="11" fill="#a1a1aa">m/s</text>
    <text :x="cx - R" :y="cy + 18" text-anchor="middle" font-size="9" fill="#71717a">0</text>
    <text :x="cx + R" :y="cy + 18" text-anchor="middle" font-size="9" fill="#71717a">{{ max }}</text>
  </svg>
</template>
