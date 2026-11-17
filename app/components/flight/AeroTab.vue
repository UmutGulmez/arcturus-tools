<script setup lang="ts">
import { dynPressure, phaseScatter, timeChart } from '~/utils/flightChart'
import { valueAt } from '~/utils/flightMetrics'

const { ctx } = useChartCtx()
const c = computed(() => ctx.value!)
const apT = computed(() => c.value.file.metrics.apogee?.t)

const cdMach = computed(() => phaseScatter(c.value, { xKey: 'mach', yKey: 'cd', xName: 'Mach', yName: 'Cd' }))
const cdCursor = (t: number) => {
  const d = c.value.file.data
  const x = valueAt(d.cols.time!, d.cols.mach, t), y = valueAt(d.cols.time!, d.cols.cd, t)
  return { id: '__cursor', data: x === null || y === null ? [] : [[x, y]] }
}
const cdTime = computed(() => timeChart(c.value, { series: [
  { key: 'cd', label: 'Cd (toplam)', color: '#818cf8', width: 2 },
  { key: 'cdPressure', label: 'Cd basınç', color: '#fbbf24', dashed: true },
  { key: 'cdFriction', label: 'Cd sürtünme', color: '#34d399', dashed: true },
  { key: 'cdBase', label: 'Cd taban', color: '#f472b6', dashed: true },
], yNames: ['Cd'], slider: true, tMax: apT.value }))
const dragOpt = computed(() => timeChart(c.value, { series: [{ key: 'dragForce', label: 'Sürükleme kuvveti', color: '#fb7185' }], yNames: ['Kuvvet (N)'], tMax: apT.value }))
const qOpt = computed(() => timeChart(c.value, { series: [{ data: dynPressure(c.value.file.data)!, label: 'Dinamik basınç q', color: '#38bdf8', scale: 0.001 }], yNames: ['q (kPa)'], tMax: apT.value }))
const reOpt = computed(() => timeChart(c.value, { series: [{ key: 'reynolds', label: 'Reynolds sayısı', color: '#a3e635' }], yNames: ['Re'], tMax: apT.value }))
const hasQ = computed(() => !!dynPressure(c.value.file.data))
</script>

<template>
  <div class="space-y-4">
    <FlightChartCard :needs="['cd']" title="Cd – zaman">
      <FlightChart title="Cd – zaman" :option="cdTime" :height="320" note="Zirve sonrası (paraşüt) satırlar gösterilmez." />
    </FlightChartCard>
    <div class="grid gap-4 xl:grid-cols-2">
      <FlightChartCard :needs="['cd', 'mach']" title="Cd – Mach">
        <FlightChart title="Cd – Mach" :option="cdMach" :time-x="false" group="" :cursor-fn="cdCursor" note="Noktalar uçuş fazına göre renklidir." />
      </FlightChartCard>
      <FlightChartCard :needs="['dragForce']" title="Sürükleme kuvveti"><FlightChart title="Sürükleme kuvveti" :option="dragOpt" /></FlightChartCard>
      <FlightChartCard :needs="hasQ ? [] : ['rho', 'vTotal']" title="Dinamik basınç">
        <FlightChart v-if="hasQ" title="Dinamik basınç" :option="qOpt" note="q = ½·ρ·v²; ρ, CSV'deki g/cm³ değerinin 1000 ile çarpılmasıyla kg/m³ alınır." />
      </FlightChartCard>
      <FlightChartCard :needs="['reynolds']" title="Reynolds sayısı"><FlightChart title="Reynolds sayısı" :option="reOpt" /></FlightChartCard>
    </div>
  </div>
</template>
