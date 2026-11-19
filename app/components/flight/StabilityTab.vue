<script setup lang="ts">
import { phaseScatter, sampleIdx, timeChart } from '~/utils/flightChart'
import { valueAt } from '~/utils/flightMetrics'

const { ctx } = useChartCtx()
const c = computed(() => ctx.value!)
const apT = computed(() => c.value.file.metrics.apogee?.t)

const cpcgOpt = computed(() => {
  const d = c.value.file.data
  const cp = d.cols.cp!, cg = d.cols.cg!
  const extra = (idx: number[], tt: ArrayLike<number>) => {
    const base: any[] = [], band: any[] = []
    for (const i of idx) {
      const a = cp[i]!, b = cg[i]!
      const ok = !Number.isNaN(a) && !Number.isNaN(b)
      base.push([tt[i]!, ok ? Math.min(a, b) : null])
      band.push([tt[i]!, ok ? Math.abs(a - b) : null])
    }
    const common = { type: 'line', stack: 'band', showSymbol: false, silent: true, tooltip: { show: false }, emphasis: { disabled: true } }
    return [
      { ...common, name: '__base', data: base, lineStyle: { opacity: 0 }, areaStyle: { opacity: 0 } },
      { ...common, name: 'Stabilite bandı', data: band, lineStyle: { opacity: 0 }, areaStyle: { color: '#818cf8', opacity: 0.18 } },
    ]
  }
  const o = timeChart(c.value, {
    series: [
      { key: 'cg', label: 'CG konumu', color: '#34d399' },
      { key: 'cp', label: 'CP konumu', color: '#fbbf24' },
    ],
    yNames: ['Burundan uzaklık (cm)'], slider: true, tMax: apT.value, extraSeries: extra,
  })
  o.legend.data = ['CG konumu', 'CP konumu', 'Stabilite bandı']
  return o
})

const stabOpt = computed(() => {
  const { file, th } = c.value
  const d = file.data
  const st = d.cols.stab!
  const t = d.cols.time!
  let lo = Infinity, hi = -Infinity
  for (let i = 0; i < d.rows; i++) {
    if (apT.value !== undefined && t[i]! > apT.value) break
    const v = st[i]!
    if (Number.isNaN(v)) continue
    lo = Math.min(lo, v); hi = Math.max(hi, v)
  }
  if (!Number.isFinite(lo)) { lo = 0; hi = 3 }
  const yMin = Math.floor(Math.min(lo, th.stabCrit ?? lo, 0) * 2 - 1) / 2
  const yMax = Math.ceil(Math.max(hi, th.stabWarn ?? hi) * 2 + 1) / 2
  const hLines: any[] = []
  const hBands: any[] = []
  if (th.stabWarn !== null) hLines.push({ y: th.stabWarn, label: `Uyarı ${th.stabWarn}`, color: '#fbbf24' })
  if (th.stabCrit !== null) hLines.push({ y: th.stabCrit, label: `Kritik ${th.stabCrit}`, color: '#f43f5e' })
  if (th.stabCrit !== null) hBands.push({ y0: yMin, y1: th.stabCrit, color: 'rgba(244,63,94,0.16)' })
  if (th.stabWarn !== null) hBands.push({ y0: th.stabCrit ?? yMin, y1: th.stabWarn, color: 'rgba(251,191,36,0.10)' })
  return timeChart(c.value, { series: [{ key: 'stab', label: 'Stabilite marjı', color: '#818cf8', width: 2 }], yNames: ['Kalibre'], tMax: apT.value, yMin, yMax, hLines, hBands })
})

const machOpt = computed(() => phaseScatter(c.value, { xKey: 'mach', yKey: 'stab', xName: 'Mach', yName: 'Stabilite marjı (kalibre)', tMax: apT.value }))
const machCursor = (t: number) => {
  const d = c.value.file.data
  const x = valueAt(d.cols.time!, d.cols.mach, t), y = valueAt(d.cols.time!, d.cols.stab, t)
  return { id: '__cursor', data: x === null || y === null ? [] : [[x, y]] }
}

const aoaOpt = computed(() => {
  const v = c.value.file.data.cols.vTotal
  return timeChart(c.value, { series: [{ key: 'aoa', label: 'Hücum açısı', color: '#f472b6', mask: v ? (i) => v[i]! >= 10 : undefined }], yNames: ['Hücum açısı (°)'] })
})
</script>

<template>
  <div class="space-y-4">
    <FlightChartCard :needs="['cp', 'cg']" title="CP ve CG konumu">
      <FlightChart title="CP ve CG konumu" :option="cpcgOpt" :height="320" note="Konumlar burun ucundan ölçülür; CP, CG'nin arkasında kaldığı sürece roket kararlıdır. Zirve sonrası satırlar gösterilmez." />
    </FlightChartCard>
    <div class="grid gap-4 xl:grid-cols-2">
      <FlightChartCard :needs="['stab']" title="Stabilite marjı">
        <FlightChart title="Stabilite marjı" :option="stabOpt" note="Kırmızı bölge kritik, sarı bölge uyarı eşiğinin altıdır (Ayarlar'dan değiştirilir). Zirve sonrası satırlar gösterilmez." />
      </FlightChartCard>
      <FlightChartCard :needs="['stab', 'mach']" title="Stabilite – Mach">
        <FlightChart title="Stabilite – Mach" :option="machOpt" :time-x="false" group="" :cursor-fn="machCursor" note="Yükseliş boyunca (zirveye kadar) marjın Mach sayısıyla değişimi." />
      </FlightChartCard>
    </div>
    <FlightChartCard :needs="['aoa']" title="Hücum açısı">
      <FlightChart title="Hücum açısı" :option="aoaOpt" note="Toplam hız 10 m/s'nin altındaki satırlar gösterilmez: bu hızlarda hücum açısı anlamsızdır (ör. kalkıştan hemen önce/sonra yüksek değerler)." />
    </FlightChartCard>
  </div>
</template>
