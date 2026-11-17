<script setup lang="ts">
import { xyChart } from '~/utils/flightChart'
import { valueAt } from '~/utils/flightMetrics'

const { ctx } = useChartCtx()
const c = computed(() => ctx.value!)

const defs = [
  { key: 'temp', title: 'Sıcaklık', unit: '°C', color: '#fb7185', scale: 1 },
  { key: 'pressure', title: 'Basınç', unit: 'mbar', color: '#38bdf8', scale: 1 },
  { key: 'rho', title: 'Yoğunluk', unit: 'kg/m³', color: '#a3e635', scale: 1000 },
  { key: 'sos', title: 'Ses hızı', unit: 'm/s', color: '#fbbf24', scale: 1 },
  { key: 'windSpeed', title: 'Rüzgâr hızı', unit: 'm/s', color: '#818cf8', scale: 1 },
]

const opts = computed(() => {
  const d = c.value.file.data
  const apI = c.value.file.metrics.apogee ? d.cols.time!.findIndex((x) => x >= c.value.file.metrics.apogee!.t) : -1
  const split = apI > 0 ? [{ label: 'Yükseliş', i0: 0, i1: apI }, { label: 'İniş', i0: apI, i1: d.rows - 1 }] : undefined
  return defs.map((df) => ({
    ...df,
    option: d.cols[df.key]
      ? xyChart(c.value, { xKey: df.key, xName: `${df.title} (${df.unit})`, xScale: df.scale, ys: [{ key: 'alt', label: df.title, color: df.color }], yNames: ['İrtifa (m)'], split, swap: false })
      : null,
    cursor: (t: number) => {
      const x = valueAt(d.cols.time!, d.cols[df.key], t), y = valueAt(d.cols.time!, d.cols.alt, t)
      return { id: '__cursor', data: x === null || y === null ? [] : [[x * df.scale, y]] }
    },
  }))
})
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <FlightChartCard v-for="o in opts" :key="o.key" :needs="['alt', o.key]" :title="`${o.title} – irtifa`">
      <FlightChart v-if="o.option" :title="`${o.title} – irtifa`" :option="o.option" :time-x="false" group="" :cursor-fn="o.cursor" note="Kesikli çizgi zirveden sonraki (iniş) kısmıdır." />
    </FlightChartCard>
  </div>
</template>
