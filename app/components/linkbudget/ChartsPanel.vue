<script setup lang="ts">
import type { LineAnalysis } from '~/utils/linkBudget'

const props = defineProps<{ a: LineAnalysis; dec: number }>()
const PALETTE = ['#56B4E9', '#E69F00', '#009E73', '#F0E442', '#0072B2', '#D55E00', '#CC79A7', '#999999']

const refLines = (x: number[], req: number) => [
  { name: '0 dB', color: '#a1a1aa', x: [x[0]!, x[x.length - 1]!], y: [0, 0] },
  { name: `${req} dB (istenen)`, color: '#E69F00', x: [x[0]!, x[x.length - 1]!], y: [req, req] },
]
const dist = computed(() => ({
  title: 'Marj – yatay/eğik mesafe',
  xLabel: props.a.result.inputs.geoMode === 'horizontal' ? 'Yatay mesafe (km)' : 'Eğik mesafe (km)',
  yLabel: 'Link marjı (dB)',
  series: [{ name: 'Marj', color: '#56B4E9', x: props.a.distCurve.x, y: props.a.distCurve.y }, ...refLines(props.a.distCurve.x, props.a.result.inputs.minMarginDb)],
}))
const alt = computed(() => {
  const c = props.a.altCurve
  if (!c) return null
  return {
    title: `Marj – roket irtifası (sabit ${(props.a.result.geometry.horizM / 1000).toFixed(1).replace('.', ',')} km yatay mesafe)`,
    xLabel: 'Roket irtifası (m)', yLabel: 'Link marjı (dB)', xDigits: 0,
    series: [{ name: 'Marj', color: '#009E73', x: c.x, y: c.y }, ...refLines(c.x, props.a.result.inputs.minMarginDb)],
  }
})
const sfLabels = computed(() => props.a.sfRows.map((r) => `SF${r.sf}`))
const activeIdx = computed(() => props.a.sfRows.findIndex((r) => r.active))
const segments = computed(() => {
  const r = props.a.result
  const out = [
    { label: 'Yol kaybı (L_fs)', value: r.pathLossDb },
    { label: 'Verici kaybı (L_tx)', value: r.inputs.ltxDb },
    { label: 'Alıcı kaybı (L_rx)', value: r.inputs.lrxDb },
    ...r.items.map((x) => ({ label: x.label, value: x.value })),
  ].filter((s) => s.value > 0)
  return out.map((s, k) => ({ ...s, color: PALETTE[k % PALETTE.length]! }))
})
</script>

<template>
  <section class="space-y-4" aria-label="Grafikler">
    <div class="grid gap-4 xl:grid-cols-2">
      <ParachuteLineChart v-bind="dist" :y-digits="0" />
      <ParachuteLineChart v-if="alt" v-bind="alt" :y-digits="0" />
      <div v-else class="panel grid place-items-center text-center text-sm text-zinc-400">
        <p><Icon name="lucide:info" size="18" class="mb-2 inline-block" /><br />İrtifa eğrisi yalnızca "Yatay mesafe + irtifa" girişinde çizilir.</p>
      </div>
    </div>
    <div class="grid gap-4 md:grid-cols-2">
      <LinkbudgetBarChart title="SF'e göre menzil (0 dB marj)" :labels="sfLabels" :values="a.sfRows.map((r) => r.rangeKm)" :active="activeIdx" unit="km" y-label="Menzil (km)" />
      <LinkbudgetBarChart title="SF'e göre airtime" :labels="sfLabels" :values="a.sfRows.map((r) => r.airtimeMs)" :active="activeIdx" unit="ms" y-label="Airtime (ms)" color="#CC79A7" />
    </div>
    <LinkbudgetStackedBar title="Kayıp kalemleri" :segments="segments" :dec="dec" />
  </section>
</template>
