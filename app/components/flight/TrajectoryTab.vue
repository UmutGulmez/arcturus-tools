<script setup lang="ts">
import { axisStyle, baseOption, cursorScatter, xyChart } from '~/utils/flightChart'
import { valueAt } from '~/utils/flightMetrics'

const { ctx } = useChartCtx()
const c = computed(() => ctx.value!)

const topOpt = computed(() => {
  const { file, theme: th } = c.value
  const d = file.data
  const t = d.cols.time!, e = d.cols.posEast!, n = d.cols.posNorth!
  const ok: number[] = []
  for (let i = 0; i < d.rows; i++) if (!Number.isNaN(e[i]!) && !Number.isNaN(n[i]!)) ok.push(i)
  const step = Math.max(1, Math.floor(ok.length / 1200))
  const pts = ok.filter((_, k) => k % step === 0 || k === ok.length - 1).map((i) => [e[i]!, n[i]!])
  let xmin = 0, xmax = 0, ymin = 0, ymax = 0
  for (const i of ok) { xmin = Math.min(xmin, e[i]!); xmax = Math.max(xmax, e[i]!); ymin = Math.min(ymin, n[i]!); ymax = Math.max(ymax, n[i]!) }
  const span = Math.max(xmax - xmin, ymax - ymin, 50) * 1.25
  const cx = (xmin + xmax) / 2, cy = (ymin + ymax) / 2
  const lim = (m: number) => [Math.floor(m - span / 2), Math.ceil(m + span / 2)] as const
  const [x0, x1] = lim(cx), [y0, y1] = lim(cy)
  const ap = file.metrics.apogee
  const apI = ap ? ok.reduce((b, i) => (Math.abs(t[i]! - ap.t) < Math.abs(t[b]! - ap.t) ? i : b), ok[0] ?? 0) : null
  const last = ok[ok.length - 1]
  const marks: any[] = [
    { name: 'Kalkış', value: [0, 0], itemStyle: { color: '#34d399' } },
  ]
  if (apI !== null && ok.length) marks.push({ name: 'Zirve', value: [e[apI]!, n[apI]!], itemStyle: { color: '#fbbf24' } })
  if (last !== undefined) marks.push({ name: 'İniş', value: [e[last]!, n[last]!], itemStyle: { color: '#fb7185' } })
  // Rüzgâr oku: windDir "esmeye başladığı yön"; ok, rüzgârın gittiği yöne bakar
  const wd = d.cols.windDir ? Array.from(d.cols.windDir).find((v) => !Number.isNaN(v)) : undefined
  const ml: any[] = []
  if (wd !== undefined) {
    const th2 = ((wd + 180) * Math.PI) / 180
    const L = span * 0.16
    const sx = x0 + span * 0.12, sy = y1 - span * 0.12
    ml.push([{ coord: [sx, sy], symbol: 'none' }, { coord: [sx + L * Math.sin(th2), sy + L * Math.cos(th2)], symbol: 'arrow', symbolSize: 10, label: { show: true, formatter: `Rüzgâr ${Math.round(wd)}°`, color: th.muted, position: 'end', fontSize: 11 } }])
  }
  const ax = axisStyle(th)
  return {
    ...baseOption(th, { legend: false }),
    grid: { left: 58, right: 26, top: 26, bottom: 48 },
    tooltip: { trigger: 'item', confine: true, backgroundColor: th.tip, borderColor: th.grid, textStyle: { color: th.tipText, fontSize: 12 }, formatter: (p: any) => `${p.name || 'Yörünge'}<br/>D ${(+p.value[0]).toFixed(1)} m ; K ${(+p.value[1]).toFixed(1)} m` },
    xAxis: { type: 'value', name: 'Doğu (m)', nameLocation: 'middle', nameGap: 28, min: x0, max: x1, ...ax },
    yAxis: { type: 'value', name: 'Kuzey (m)', min: y0, max: y1, ...ax },
    dataZoom: [],
    series: [
      { name: 'Yörünge', type: 'line', data: pts, showSymbol: false, lineStyle: { color: '#818cf8', width: 2 }, markLine: { silent: true, symbol: 'none', animation: false, lineStyle: { color: th.muted, width: 1.5 }, data: ml } },
      { type: 'scatter', data: marks, symbolSize: 11, label: { show: true, formatter: (p: any) => p.name, position: 'top', color: th.text, fontSize: 11 }, itemStyle: { borderColor: '#fff', borderWidth: 1 } },
      cursorScatter(),
    ],
  }
})
const topCursor = (t: number) => {
  const d = c.value.file.data
  const x = valueAt(d.cols.time!, d.cols.posEast, t), y = valueAt(d.cols.time!, d.cols.posNorth, t)
  return { id: '__cursor', data: x === null || y === null ? [] : [[x, y]] }
}

const sideOpt = computed(() => xyChart(c.value, { xKey: 'latDist', xName: 'Yanal mesafe (m)', ys: [{ key: 'alt', label: 'Yörünge', color: '#34d399' }], yNames: ['İrtifa (m)'] }))
const sideCursor = (t: number) => {
  const d = c.value.file.data
  const x = valueAt(d.cols.time!, d.cols.latDist, t), y = valueAt(d.cols.time!, d.cols.alt, t)
  return { id: '__cursor', data: x === null || y === null ? [] : [[x, y]] }
}
const m = computed(() => c.value.file.metrics)
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-2">
    <FlightChartCard :needs="['posEast', 'posNorth']" title="Üstten görünüş">
      <div class="mx-auto max-w-[520px]">
        <FlightChart title="Üstten görünüş" :option="topOpt" :height="480" :time-x="false" group="" :cursor-fn="topCursor" note="Eksenler eşit ölçeklidir. Kırmızı nokta zaman imlecindeki konumu gösterir." />
      </div>
    </FlightChartCard>
    <FlightChartCard :needs="['latDist', 'alt']" title="Yandan görünüş">
      <FlightChart title="Yandan görünüş" :option="sideOpt" :height="480" :time-x="false" group="" :cursor-fn="sideCursor" :note="m.driftEnd ? `Toplam yanal sürüklenme: ${m.driftEnd.dist.toFixed(0)} m${m.driftEnd.dir !== null ? ` (yön ${m.driftEnd.dir.toFixed(0)}°)` : ''}.` : undefined" />
    </FlightChartCard>
  </div>
</template>
