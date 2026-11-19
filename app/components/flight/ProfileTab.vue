<script setup lang="ts">
import { dispUnit, timeChart } from '~/utils/flightChart'

const { ctx, s } = useChartCtx()
const c = computed(() => ctx.value!)
const sp = computed(() => dispUnit('vTotal', 'm/s', s.units).unit)
const ac = computed(() => dispUnit('aTotal', 'm/s²', s.units).unit)

const altOpt = computed(() => timeChart(c.value, { series: [{ key: 'alt', label: 'İrtifa (AGL)', color: '#818cf8', area: true }, ...(c.value.file.data.cols.altAsl ? [{ key: 'altAsl', label: 'İrtifa (deniz seviyesi)', color: '#38bdf8', dashed: true }] : [])], yNames: ['İrtifa (m)'], slider: true }))
const velOpt = computed(() => timeChart(c.value, { series: [
  { key: 'vTotal', label: 'Toplam hız', color: '#818cf8' },
  { key: 'vVert', label: 'Dikey hız', color: '#34d399' },
  { key: 'mach', label: 'Mach', color: '#fbbf24', axis: 1, dashed: true },
], yNames: [`Hız (${sp.value})`, 'Mach'] }))
const accOpt = computed(() => timeChart(c.value, { series: [
  { key: 'aTotal', label: 'Toplam ivme', color: '#f472b6' },
  { key: 'aVert', label: 'Dikey ivme', color: '#38bdf8' },
], yNames: [`İvme (${ac.value})`] }))
</script>

<template>
  <div class="space-y-4">
    <FlightChartCard :needs="['alt']" title="İrtifa – zaman">
      <FlightChart title="İrtifa – zaman" :option="altOpt" :height="340" note="Gölgeli bölgeler uçuş fazlarıdır; kesikli çizgiler OpenRocket olaylarıdır. Fareyle gezinmek tüm grafiklerde zaman imlecini taşır, tıklayınca imleç sabitlenir." />
    </FlightChartCard>
    <div class="grid gap-4 xl:grid-cols-2">
      <FlightChartCard :needs="['vTotal']" title="Hız ve Mach">
        <FlightChart title="Hız ve Mach" :option="velOpt" />
      </FlightChartCard>
      <FlightChartCard :needs="['aTotal']" title="İvme">
        <FlightChart title="İvme" :option="accOpt" />
      </FlightChartCard>
    </div>
  </div>
</template>
