// Grafik yardımcıları: örnekleme, türev, birim dönüşümü, ECharts seçenek üreticileri (Vue'dan bağımsız).
import type { FlightData } from './flightParser'
import type { FlightMetrics, Phase, Thresholds } from './flightMetrics'
import { G0, lastIndexAtOrBefore } from './flightMetrics'

/* ---------- Örnekleme (LTTB) ---------- */

/** [s..e] aralığındaki (hepsi sonlu) noktalardan LTTB ile en fazla `n` indeks seçer. */
function lttbRun(x: ArrayLike<number>, y: ArrayLike<number>, s: number, e: number, n: number): number[] {
  const len = e - s + 1
  if (n >= len || n < 3) {
    if (len <= Math.max(n, 2)) return Array.from({ length: len }, (_, i) => s + i)
    return [s, e]
  }
  const out: number[] = [s]
  const every = (len - 2) / (n - 2)
  let a = s
  for (let i = 0; i < n - 2; i++) {
    const nsS = Math.floor((i + 1) * every) + 1 + s
    const nsE = Math.min(Math.floor((i + 2) * every) + 1 + s, e + 1)
    let ax = 0, ay = 0
    const cnt = Math.max(nsE - nsS, 1)
    for (let j = nsS; j < nsS + cnt && j <= e; j++) { ax += x[j]!; ay += y[j]! }
    ax /= cnt; ay /= cnt
    const bs = Math.floor(i * every) + 1 + s
    const be = Math.floor((i + 1) * every) + 1 + s
    const px = x[a]!, py = y[a]!
    let best = -1, bi = bs
    for (let j = bs; j < be && j <= e; j++) {
      const area = Math.abs((px - ax) * (y[j]! - py) - (px - x[j]!) * (ay - py))
      if (area > best) { best = area; bi = j }
    }
    out.push(bi)
    a = bi
  }
  out.push(e)
  return out
}

/**
 * Kılavuz seriye göre en fazla ~max indeks seçer. NaN boşlukları korunur:
 * her sonlu parça kendi içinde örneklenir, aralarına bir NaN indeksi konur (grafikte boşluk).
 * Aynı indeks kümesi birden fazla seri için kullanılabilir.
 */
export function sampleIdx(x: ArrayLike<number>, guide: ArrayLike<number>, max = 2000): number[] {
  const n = x.length
  const runs: [number, number][] = []
  let s = -1
  for (let i = 0; i < n; i++) {
    const ok = !Number.isNaN(guide[i]!) && !Number.isNaN(x[i]!)
    if (ok && s < 0) s = i
    if (!ok && s >= 0) { runs.push([s, i - 1]); s = -1 }
  }
  if (s >= 0) runs.push([s, n - 1])
  const total = runs.reduce((a, r) => a + (r[1] - r[0] + 1), 0)
  const out: number[] = []
  runs.forEach(([a, b], k) => {
    const share = Math.max(3, Math.round((max * (b - a + 1)) / Math.max(total, 1)))
    out.push(...lttbRun(x, guide, a, b, share))
    if (k < runs.length - 1 && b + 1 < n) out.push(b + 1)
  })
  return out
}

export type Pt = [number, number | null]

/** İndekslere göre [x, y*scale] çiftleri; NaN → null (boşluk). */
export function pickPts(x: ArrayLike<number>, y: ArrayLike<number>, idx: number[], scale = 1, mask?: (i: number) => boolean): Pt[] {
  return idx.map((i) => {
    const v = y[i]!
    return [x[i]!, Number.isNaN(v) || (mask && !mask(i)) ? null : v * scale]
  })
}

/** Sayı yok sayılan satırları atlayarak [x,y] noktaları (saçılım için; null yok) */
export function scatterPts(x: ArrayLike<number>, y: ArrayLike<number>, idx: number[], sx = 1, sy = 1): [number, number][] {
  const out: [number, number][] = []
  for (const i of idx) {
    const a = x[i]!, b = y[i]!
    if (!Number.isNaN(a) && !Number.isNaN(b)) out.push([a * sx, b * sy])
  }
  return out
}

/** Ortak ince örnekleme: sonlu satırlardan eşit aralıklı (saçılım için) */
export function evenIdx(n: number, max = 2000): number[] {
  if (n <= max) return Array.from({ length: n }, (_, i) => i)
  const out: number[] = []
  const step = (n - 1) / (max - 1)
  for (let i = 0; i < max; i++) out.push(Math.round(i * step))
  return out
}

/* ---------- Türetilmiş seriler ---------- */

/** Pencereli merkezi türev (gürültüyü azaltmak için ~win saniye) */
export function derivative(t: ArrayLike<number>, y: ArrayLike<number>, win = 0.1): Float64Array {
  const n = t.length
  const out = new Float64Array(n).fill(NaN)
  for (let i = 0; i < n; i++) {
    let a = i, b = i
    while (a > 0 && t[i]! - t[a]! < win / 2) a--
    while (b < n - 1 && t[b]! - t[i]! < win / 2) b++
    const dt = t[b]! - t[a]!
    if (dt > 0 && !Number.isNaN(y[a]!) && !Number.isNaN(y[b]!)) out[i] = (y[b]! - y[a]!) / dt
  }
  return out
}

export function cumTrapz(t: ArrayLike<number>, y: ArrayLike<number>): Float64Array {
  const out = new Float64Array(t.length)
  for (let i = 1; i < t.length; i++) {
    const a = y[i - 1]!, b = y[i]!
    out[i] = out[i - 1]! + (Number.isNaN(a) || Number.isNaN(b) ? 0 : 0.5 * (a + b) * (t[i]! - t[i - 1]!))
  }
  return out
}

export function dynPressure(d: FlightData): Float64Array | null {
  const rho = d.cols.rho, v = d.cols.vTotal
  if (!rho || !v) return null
  const out = new Float64Array(d.rows)
  for (let i = 0; i < d.rows; i++) out[i] = 0.5 * rho[i]! * 1000 * v[i]! ** 2
  return out
}

/* ---------- Birimler ---------- */

export interface UnitPrefs { speed: 'ms' | 'kmh'; acc: 'ms2' | 'g' }
export const DEFAULT_UNITS: UnitPrefs = { speed: 'ms', acc: 'ms2' }

const SPEED_KEYS = new Set(['vVert', 'vTotal', 'vLat', 'windSpeed'])
const ACC_KEYS = new Set(['aVert', 'aTotal', 'aLat'])

/** Sütunun gösterim ölçeği ve birimi */
export function dispUnit(key: string, fileUnit: string, u: UnitPrefs): { scale: number; unit: string } {
  if (SPEED_KEYS.has(key) && u.speed === 'kmh') return { scale: 3.6, unit: 'km/h' }
  if (ACC_KEYS.has(key) && u.acc === 'g') return { scale: 1 / G0, unit: 'g' }
  if (key === 'mass' || key === 'motorMass') return { scale: 0.001, unit: 'kg' }
  if (key === 'rho') return { scale: 1000, unit: 'kg/m³' }
  return { scale: 1, unit: fileUnit }
}

/* ---------- Görünüm sabitleri ---------- */

export const FILE_COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f472b6', '#38bdf8', '#fb7185', '#a3e635', '#c084fc']

export const EVENT_LABELS: Record<string, string> = {
  IGNITION: 'Ateşleme', LAUNCH: 'Fırlatma', LIFTOFF: 'Kalkış', LAUNCHROD: 'Raf çıkışı', BURNOUT: 'Yanma sonu',
  EJECTION_CHARGE: 'Ayırma yükü', RECOVERY_DEVICE_DEPLOYMENT: 'Paraşüt açılışı', APOGEE: 'Zirve', TUMBLE: 'Takla',
  GROUND_HIT: 'Yere çarpma', SIMULATION_END: 'Simülasyon sonu', STAGE_SEPARATION: 'Kademe ayrılması', SIM_WARN: 'Simülasyon uyarısı',
}
export const eventLabel = (type: string) => EVENT_LABELS[type] ?? type

/** Grafiklerde çizgi olarak gösterilmeyecek olaylar */
const HIDE_ON_CHART = new Set(['SIM_WARN', 'IGNITION', 'LAUNCH', 'SIMULATION_END'])

export interface Theme {
  report: boolean
  text: string
  muted: string
  grid: string
  line: string
  tip: string
  tipText: string
  surface: string
}
export const themeOf = (report: boolean): Theme =>
  report
    ? { report, text: '#18181b', muted: '#52525b', grid: '#e4e4e7', line: '#a1a1aa', tip: '#ffffff', tipText: '#18181b', surface: '#ffffff' }
    : { report, text: '#e4e4e7', muted: '#a1a1aa', grid: '#2c2c35', line: '#52525b', tip: '#1f1f25', tipText: '#e4e4e7', surface: '#16161a' }

export interface ChartFile {
  id: string
  name: string
  color: string
  data: FlightData
  metrics: FlightMetrics
}

export interface ChartCtx {
  file: ChartFile
  units: UnitPrefs
  th: Thresholds
  theme: Theme
}

export interface TSeries {
  /** Sütun anahtarı ya da hesaplanmış veri */
  key?: string
  data?: Float64Array
  label: string
  color: string
  axis?: 0 | 1
  /** birim anahtarı (dispUnit için) */
  unitKey?: string
  scale?: number
  step?: boolean
  area?: boolean
  dashed?: boolean
  width?: number
  mask?: (i: number) => boolean
}

export interface TimeChartSpec {
  series: TSeries[]
  yNames: [string, string?]
  events?: boolean
  phases?: boolean
  slider?: boolean
  /** Ek markLine (yatay çizgiler) */
  hLines?: { y: number; label: string; color: string; axis?: 0 | 1 }[]
  /** Ek markArea (yatay bantlar) */
  hBands?: { y0: number; y1: number; color: string }[]
  yMin?: number
  yMax?: number
  /** t aralığı sınırı (ör. yalnızca motorlu uçuş) */
  tMax?: number
  extraSeries?: (idx: number[], tt: ArrayLike<number>) => any[]
}

export const baseText = (th: Theme) => ({ color: th.text, fontFamily: 'Inter, system-ui, sans-serif', fontSize: 12 })

export const tipFmt = (v: unknown) => (typeof v === 'number' ? String(+v.toPrecision(5)) : String(v ?? '—'))

export function baseOption(th: Theme, o: { right?: boolean; slider?: boolean; legend?: boolean; bottomName?: string } = {}) {
  return {
    animation: false,
    backgroundColor: 'transparent',
    textStyle: baseText(th),
    grid: { left: 60, right: o.right ? 60 : 22, top: o.legend === false ? 22 : 40, bottom: o.slider ? 66 : 38 },
    tooltip: {
      trigger: 'axis',
      confine: true,
      backgroundColor: th.tip,
      borderColor: th.grid,
      textStyle: { color: th.tipText, fontSize: 12 },
      axisPointer: { type: 'line', lineStyle: { color: th.line } },
      valueFormatter: tipFmt,
    },
    legend: { show: o.legend !== false, top: 4, type: 'scroll', textStyle: { color: th.muted }, icon: 'roundRect', itemWidth: 14, itemHeight: 3 },
  }
}

export const axisStyle = (th: Theme) => ({
  axisLine: { lineStyle: { color: th.line } },
  axisTick: { lineStyle: { color: th.line } },
  axisLabel: { color: th.muted },
  nameTextStyle: { color: th.muted },
  splitLine: { lineStyle: { color: th.grid, type: 'dashed' as const } },
})

/** Zaman ekseni çizgisi için gizli imleç serisi (FlightChart.client.vue ile güncellenir) */
export const cursorSeries = (th: Theme) => ({
  id: '__cursor', type: 'line', data: [], silent: true, showSymbol: false, tooltip: { show: false },
  markLine: { symbol: 'none', silent: true, animation: false, lineStyle: { color: '#f43f5e', width: 1.5, type: 'solid' }, label: { show: false }, data: [] },
  z: 10, name: th.report ? '' : '',
})

export function eventMarks(file: ChartFile, th: Theme) {
  const seen = new Set<string>()
  const data: any[] = []
  for (const e of file.data.events) {
    if (HIDE_ON_CHART.has(e.type)) continue
    const k = `${e.type}@${e.t}`
    if (seen.has(k)) continue
    seen.add(k)
    data.push({
      xAxis: e.t,
      label: { formatter: eventLabel(e.type), position: 'insideEndTop', rotate: 90, color: th.muted, fontSize: 10 },
      lineStyle: { color: th.line, type: 'dashed', width: 1 },
    })
  }
  return { symbol: 'none', silent: true, animation: false, data }
}

export function phaseAreas(phases: Phase[], th: Theme) {
  return {
    silent: true,
    data: phases.map((p) => [
      { xAxis: p.t0, itemStyle: { color: p.color, opacity: th.report ? 0.12 : 0.1 }, label: { show: false } },
      { xAxis: p.t1 },
    ]),
  }
}

/** Genel zaman-serisi grafiği */
export function timeChart(ctx: ChartCtx, spec: TimeChartSpec): any {
  const { file, units, theme: th } = ctx
  const d = file.data
  const t = d.cols.time!
  const two = spec.series.some((s) => s.axis === 1)
  const usable = spec.series.filter((s) => s.data || (s.key && d.cols[s.key]))
  const guideSrc = usable[0]?.data ?? (usable[0]?.key ? d.cols[usable[0].key] : undefined) ?? t
  const lastI = spec.tMax !== undefined ? lastIndexAtOrBefore(t, spec.tMax) : t.length - 1
  const tt = lastI === t.length - 1 ? t : t.subarray(0, lastI + 1)
  const guide = guideSrc.length === tt.length ? guideSrc : guideSrc.subarray(0, lastI + 1)
  const idx = sampleIdx(tt, guide, 2000)

  const series: any[] = usable.map((s, k) => {
    const raw = s.data ?? d.cols[s.key!]!
    const u = s.key ? dispUnit(s.key, '', units) : { scale: 1 }
    const scale = s.scale ?? u.scale
    const own = sampleIdx(tt, raw, 2000)
    const pts = pickPts(tt, raw, s.key === usable[0]?.key || s.data === usable[0]?.data ? idx : own, scale, s.mask)
    const base: any = {
      name: s.label, type: 'line', yAxisIndex: s.axis ?? 0, data: pts, showSymbol: false, sampling: undefined,
      lineStyle: { width: s.width ?? 1.6, color: s.color, type: s.dashed ? 'dashed' : 'solid' },
      itemStyle: { color: s.color }, step: s.step ? 'end' : false, connectNulls: false, emphasis: { disabled: true },
    }
    if (s.area) base.areaStyle = { color: s.color, opacity: 0.12 }
    if (k === 0) {
      if (spec.events !== false) base.markLine = eventMarks(file, th)
      if (spec.phases !== false && file.metrics.phases.length) base.markArea = phaseAreas(file.metrics.phases, th)
    }
    return base
  })

  if (spec.hLines?.length) {
    const target = series[0]
    if (target) {
      const ml = target.markLine ?? { symbol: 'none', silent: true, animation: false, data: [] }
      ml.data = [
        ...ml.data,
        ...spec.hLines.map((h) => ({ yAxis: h.y, label: { formatter: h.label, position: 'insideStartTop', color: h.color, fontSize: 10 }, lineStyle: { color: h.color, type: 'dashed', width: 1.2 } })),
      ]
      target.markLine = ml
    }
  }
  if (spec.hBands?.length && series[0]) {
    const ma = series[0].markArea ?? { silent: true, data: [] }
    ma.data = [...ma.data, ...spec.hBands.map((b) => [{ yAxis: b.y0, itemStyle: { color: b.color } }, { yAxis: b.y1 }])]
    series[0].markArea = ma
  }
  if (spec.extraSeries) series.push(...spec.extraSeries(idx, tt))
  series.push(cursorSeries(th))

  const ax = axisStyle(th)
  return {
    ...baseOption(th, { right: two, slider: spec.slider }),
    xAxis: { type: 'value', name: 'Zaman (s)', nameLocation: 'middle', nameGap: 24, min: tt[0], max: tt[tt.length - 1], ...ax, splitLine: { show: false } },
    yAxis: [
      { type: 'value', name: spec.yNames[0], scale: true, min: spec.yMin, max: spec.yMax, ...ax },
      ...(two ? [{ type: 'value', name: spec.yNames[1] ?? '', scale: true, ...ax, splitLine: { show: false } }] : []),
    ],
    dataZoom: [
      { type: 'inside', xAxisIndex: 0, filterMode: 'none' },
      ...(spec.slider ? [{ type: 'slider', xAxisIndex: 0, height: 16, bottom: 8, filterMode: 'none', borderColor: th.grid, textStyle: { color: th.muted } }] : []),
    ],
    series,
  }
}

/* ---------- Zaman dışı eksenli grafikler ---------- */

export const cursorScatter = () => ({ id: '__cursor', type: 'scatter', data: [], symbolSize: 12, itemStyle: { color: '#f43f5e', borderColor: '#fff', borderWidth: 1.5 }, z: 10, silent: true, tooltip: { show: false } })

const itemTip = (th: Theme) => ({
  trigger: 'item', confine: true, backgroundColor: th.tip, borderColor: th.grid, textStyle: { color: th.tipText, fontSize: 12 },
  formatter: (p: any) => (Array.isArray(p.value) ? `${p.seriesName}<br/>${tipFmt(p.value[0])} ; ${tipFmt(p.value[1])}` : ''),
})

function valueAxes(th: Theme, xName: string, yName: string, extra: { x?: any; y?: any } = {}) {
  const ax = axisStyle(th)
  return {
    xAxis: { type: 'value', name: xName, nameLocation: 'middle', nameGap: 26, scale: true, ...ax, ...extra.x },
    yAxis: { type: 'value', name: yName, scale: true, ...ax, ...extra.y },
  }
}

/** Faza göre renkli saçılım (ör. Cd–Mach). */
export function phaseScatter(ctx: ChartCtx, o: { xKey: string; yKey: string; xName: string; yName: string; tMax?: number; ySc?: number; xSc?: number }): any {
  const { file, theme: th } = ctx
  const d = file.data
  const t = d.cols.time!, x = d.cols[o.xKey]!, y = d.cols[o.yKey]!
  const series: any[] = []
  for (const p of file.metrics.phases) {
    const t1 = o.tMax !== undefined ? Math.min(p.t1, o.tMax) : p.t1
    if (t1 <= p.t0) continue
    const rows: number[] = []
    for (let i = 0; i < d.rows; i++) {
      if (t[i]! >= p.t0 && t[i]! <= t1 && !Number.isNaN(x[i]!) && !Number.isNaN(y[i]!)) rows.push(i)
    }
    if (!rows.length) continue
    const keep = evenIdx(rows.length, 700).map((k) => rows[k]!)
    series.push({
      name: p.label, type: 'scatter', symbolSize: 4, itemStyle: { color: p.color, opacity: 0.8 },
      data: keep.map((i) => [x[i]! * (o.xSc ?? 1), y[i]! * (o.ySc ?? 1)]),
    })
  }
  series.push(cursorScatter())
  return {
    ...baseOption(th, { legend: true }),
    tooltip: itemTip(th),
    ...valueAxes(th, o.xName, o.yName),
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }, { type: 'inside', yAxisIndex: 0, filterMode: 'none' }],
    series,
  }
}

/** Genel X–Y çizgi grafiği (grafik oluşturucu ve atmosfer için). */
export function xyChart(ctx: ChartCtx, o: {
  xKey: string
  xName: string
  ys: { key?: string; data?: Float64Array; label: string; color: string; axis?: 0 | 1; scale?: number }[]
  yNames: [string, string?]
  xScale?: number
  split?: { label: string; i0: number; i1: number }[]
  swap?: boolean
}): any {
  const { file, theme: th } = ctx
  const d = file.data
  const x = o.xKey === 'time' ? d.cols.time! : d.cols[o.xKey]!
  const two = o.ys.some((y) => y.axis === 1)
  const series: any[] = []
  o.ys.forEach((yy) => {
    const y = yy.data ?? d.cols[yy.key!]
    if (!y) return
    const parts = o.split?.length ? o.split : [{ label: yy.label, i0: 0, i1: d.rows - 1 }]
    parts.forEach((part, pi) => {
      const xs = x.subarray(part.i0, part.i1 + 1), ys = y.subarray(part.i0, part.i1 + 1)
      const idx = sampleIdx(xs, ys, 900)
      const pts: any[] = idx.map((i) => {
        const a = xs[i]!, b = ys[i]!
        return [Number.isNaN(a) ? null : a * (o.xScale ?? 1), Number.isNaN(b) ? null : b * (yy.scale ?? 1)]
      })
      series.push({
        name: o.split?.length && o.ys.length === 1 ? part.label : o.split?.length ? `${yy.label} (${part.label})` : yy.label,
        type: 'line', yAxisIndex: yy.axis ?? 0, data: o.swap ? pts.map((p) => [p[1], p[0]]) : pts, showSymbol: true, symbolSize: 2.5,
        lineStyle: { width: 1.4, color: yy.color, type: pi ? 'dashed' : 'solid' }, itemStyle: { color: yy.color }, connectNulls: false, emphasis: { disabled: true },
      })
    })
  })
  const isTime = o.xKey === 'time'
  series.push(isTime ? cursorSeries(th) : cursorScatter())
  const ax = axisStyle(th)
  const opt: any = {
    ...baseOption(th, { right: two, legend: true }),
    tooltip: isTime ? baseOption(th).tooltip : itemTip(th),
    xAxis: { type: 'value', name: o.xName, nameLocation: 'middle', nameGap: 26, scale: true, ...ax, splitLine: isTime ? { show: false } : ax.splitLine },
    yAxis: [{ type: 'value', name: o.yNames[0], scale: true, ...ax }, ...(two ? [{ type: 'value', name: o.yNames[1] ?? '', scale: true, ...ax, splitLine: { show: false } }] : [])],
    dataZoom: [{ type: 'inside', xAxisIndex: 0, filterMode: 'none' }],
    series,
  }
  if (o.swap) { const xa = opt.xAxis; opt.xAxis = opt.yAxis[0]; opt.yAxis = [xa] }
  return opt
}
