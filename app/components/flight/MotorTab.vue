<script setup lang="ts">
import { cumTrapz, derivative, dispUnit, timeChart } from '~/utils/flightChart'

const { ctx, s } = useChartCtx()
const c = computed(() => ctx.value!)
const tMax = computed(() => (c.value.file.metrics.burnout !== null ? c.value.file.metrics.burnout + 1 : undefined))
const base = computed(() => ({ tMax: tMax.value }))

const thrustOpt = computed(() => timeChart(c.value, { series: [{ key: 'thrust', label: 'İtki', color: '#fbbf24', area: true }], yNames: ['İtki (N)'], slider: true, ...base.value }))
const massOpt = computed(() => timeChart(c.value, { series: [
  { key: 'mass', label: 'Toplam kütle', color: '#818cf8' },
  { key: 'motorMass', label: 'Motor kütlesi', color: '#34d399' },
], yNames: ['Kütle (kg)'], tMax: tMax.value ? tMax.value + 4 : undefined }))
const twOpt = computed(() => timeChart(c.value, { series: [{ key: 'tw', label: 'İtki/ağırlık', color: '#f472b6' }], yNames: ['T/W'], ...base.value }))
const impOpt = computed(() => {
  const d = c.value.file.data
  return timeChart(c.value, { series: [{ data: cumTrapz(d.cols.time!, d.cols.thrust!), label: 'Kümülatif impuls', color: '#38bdf8', area: true }], yNames: ['İmpuls (N·s)'], ...base.value })
})
const flowOpt = computed(() => {
  const d = c.value.file.data
  const dm = derivative(d.cols.time!, d.cols.motorMass!, 0.1).map((v) => -v * 0.001)
  return timeChart(c.value, { series: [{ data: dm, label: 'Kütle akış hızı', color: '#fb7185' }], yNames: ['−dm/dt (kg/s)'], ...base.value })
})
void s; void dispUnit
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-4 xl:grid-cols-2">
      <FlightChartCard :needs="['thrust']" title="İtki"><FlightChart title="İtki" :option="thrustOpt" note="Grafikler yanma sonundan yaklaşık 1 s sonrasına kadar gösterilir." /></FlightChartCard>
      <FlightChartCard :needs="['thrust']" title="Kümülatif impuls"><FlightChart title="Kümülatif impuls" :option="impOpt" /></FlightChartCard>
      <FlightChartCard :needs="['mass', 'motorMass']" title="Kütle"><FlightChart title="Kütle" :option="massOpt" /></FlightChartCard>
      <FlightChartCard :needs="['tw']" title="İtki/ağırlık oranı"><FlightChart title="İtki/ağırlık oranı" :option="twOpt" /></FlightChartCard>
    </div>
    <FlightChartCard :needs="['motorMass']" title="Kütle akış hızı">
      <FlightChart title="Kütle akış hızı" :option="flowOpt" note="Motor kütlesinin ~0,1 s pencereli türevidir; OpenRocket kütleyi sınırlı hassasiyetle yazdığı için gürültülü olabilir." />
    </FlightChartCard>
  </div>
</template>
