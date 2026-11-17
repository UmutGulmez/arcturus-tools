<script setup lang="ts">
import { axisStyle, baseOption, cursorSeries, dispUnit, pickPts, sampleIdx, themeOf } from '~/utils/flightChart'
import { buildKpis, fmtKpi, kpiCsv } from '~/utils/flightKpi'
import { downloadText } from '~/utils/export'

const s = useFlight()
const files = computed(() => s.files.value)
const th = computed(() => themeOf(s.report.value))

function chart(key: string, name: string, tMaxOf?: (f: (typeof files.value)[number]) => number | undefined) {
  const t = th.value
  const series: any[] = []
  for (const f of files.value) {
    const y = f.data.cols[key]
    if (!y) continue
    const tt = f.data.cols.time!
    const tm = tMaxOf?.(f)
    const n = tm === undefined ? tt.length : tt.findIndex((x) => x > tm)
    const end = n < 0 ? tt.length : n
    const x = tt.subarray(0, end), yy = y.subarray(0, end)
    series.push({ name: f.name, type: 'line', showSymbol: false, data: pickPts(x, yy, sampleIdx(x, yy, 2000), dispUnit(key, '', s.units).scale), lineStyle: { width: 1.7, color: f.color }, itemStyle: { color: f.color }, emphasis: { disabled: true } })
  }
  if (!series.length) return null
  series.push(cursorSeries(t))
  const ax = axisStyle(t)
  return {
    ...baseOption(t, {}),
    xAxis: { type: 'value', name: 'Zaman (s)', nameLocation: 'middle', nameGap: 24, ...ax, splitLine: { show: false } },
    yAxis: { type: 'value', name, scale: true, ...ax },
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }],
    series,
  }
}
const apT = (f: (typeof files.value)[number]) => f.metrics.apogee?.t
const charts = computed(() => [
  { title: 'İrtifa', opt: chart('alt', 'İrtifa (m)') },
  { title: 'Hız', opt: chart('vTotal', `Toplam hız (${dispUnit('vTotal', 'm/s', s.units).unit})`) },
  { title: 'Stabilite marjı', opt: chart('stab', 'Kalibre', apT) },
  { title: 'İtki', opt: chart('thrust', 'İtki (N)', (f) => (f.metrics.burnout !== null ? f.metrics.burnout + 1 : undefined)) },
])

const kp = computed(() => files.value.map((f) => ({ f, kpis: buildKpis(f.metrics, s.thresholds, s.units) })))
const rows = computed(() => {
  const seen = new Map<string, { id: string; label: string; unit: string; digits: number; group: string }>()
  for (const x of kp.value) for (const k of x.kpis) if (!seen.has(k.id)) seen.set(k.id, k)
  return [...seen.values()].map((m) => ({ ...m, vals: kp.value.map((x) => x.kpis.find((k) => k.id === m.id) ?? null) }))
})
const diff = (r: (typeof rows.value)[number], i: number) => {
  const a = r.vals[0]?.value, b = r.vals[i]?.value
  if (a == null || b == null) return null
  const d = b - a
  return { d, pct: a !== 0 ? (d / Math.abs(a)) * 100 : null }
}
const fmtD = (v: number, digits: number) => (v > 0 ? '+' : '') + new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(v)
const exportCsv = () => downloadText('ucus-karsilastirma.csv', kpiCsv(kp.value.map((x) => ({ name: x.f.name, kpis: x.kpis }))), 'text/csv')
</script>

<template>
  <div v-if="files.length < 2" class="panel grid min-h-[14rem] place-items-center text-center">
    <div class="max-w-md">
      <Icon name="lucide:git-compare" size="28" class="mx-auto mb-3 text-arc-400" />
      <h2 class="text-base font-semibold text-white">Karşılaştırma için en az iki dosya gerekir</h2>
      <p class="mt-1 text-sm text-zinc-400">Farklı motor, kütle veya rüzgâr senaryolarının CSV dosyalarını yukarıdan ekleyin; aynı grafikte üst üste çizilir.</p>
    </div>
  </div>
  <div v-else class="space-y-4">
    <div class="grid gap-4 xl:grid-cols-2">
      <template v-for="c in charts" :key="c.title">
        <div v-if="c.opt" class="panel min-w-0 !p-4" :class="s.report.value ? '!border-zinc-300 !bg-white' : ''">
          <FlightChart :title="`${c.title} karşılaştırması`" :option="c.opt" />
        </div>
      </template>
    </div>
    <section class="panel !p-0">
      <div class="flex items-center justify-between p-4">
        <h2 class="text-sm font-semibold text-white">KPI karşılaştırması</h2>
        <button type="button" class="btn !py-1 text-xs" @click="exportCsv"><Icon name="lucide:download" size="14" />CSV</button>
      </div>
      <div class="relative overflow-x-auto">
        <table class="data-table min-w-full">
          <thead>
            <tr>
              <th>Gösterge</th>
              <template v-for="(x, i) in kp" :key="x.f.id">
                <th class="num"><span class="mr-1.5 inline-block h-2 w-2 rounded-full" :style="{ background: x.f.color }" />{{ x.f.name }}</th>
                <th v-if="i > 0" class="num">Fark ({{ i + 1 }}−1)</th>
              </template>
            </tr>
          </thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td>{{ r.label }} <span v-if="r.unit" class="text-xs text-zinc-500">({{ r.unit }})</span></td>
              <template v-for="(v, i) in r.vals" :key="i">
                <td class="num">{{ v ? fmtKpi(v) : '—' }}</td>
                <td v-if="i > 0" class="num text-zinc-400">
                  <template v-if="diff(r, i)">{{ fmtD(diff(r, i)!.d, r.digits) }}<span v-if="diff(r, i)!.pct !== null" class="ml-1 text-xs text-zinc-500">({{ fmtD(diff(r, i)!.pct!, 1) }}%)</span></template>
                  <template v-else>—</template>
                </td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
