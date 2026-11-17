import type { FlightData, FlightEvent } from './flightParser'

export const G0 = 9.80665

/* ---------- Genel yardımcılar ---------- */

export const col = (d: FlightData, key: string): Float64Array | undefined => d.cols[key]

/** Trapez kuralı; eşit olmayan adımlara uygundur. NaN içeren aralıklar atlanır. */
export function trapz(t: ArrayLike<number>, y: ArrayLike<number>, i0 = 0, i1 = t.length - 1): number {
  let s = 0
  for (let i = Math.max(i0, 0); i < Math.min(i1, t.length - 1); i++) {
    const a = y[i]!, b = y[i + 1]!
    if (Number.isNaN(a) || Number.isNaN(b)) continue
    s += 0.5 * (a + b) * (t[i + 1]! - t[i]!)
  }
  return s
}

/** t anında doğrusal ara değer. Komşulardan biri NaN ise diğerini kullanır; ikisi de NaN ise null. */
export function valueAt(t: ArrayLike<number>, y: ArrayLike<number> | undefined, at: number): number | null {
  if (!y || !t.length) return null
  const n = t.length
  if (at <= t[0]!) return Number.isNaN(y[0]!) ? null : y[0]!
  if (at >= t[n - 1]!) return Number.isNaN(y[n - 1]!) ? null : y[n - 1]!
  let lo = 0, hi = n - 1
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid]! <= at) lo = mid
    else hi = mid
  }
  const y0 = y[lo]!, y1 = y[hi]!
  const n0 = Number.isNaN(y0), n1 = Number.isNaN(y1)
  if (n0 && n1) return null
  if (n0) return y1
  if (n1) return y0
  const f = (at - t[lo]!) / (t[hi]! - t[lo]! || 1)
  return y0 + (y1 - y0) * f
}

/** Verilen aralıkta (kapalı) NaN olmayan en büyük/küçük değer ve indeksi */
function extreme(y: ArrayLike<number> | undefined, kind: 'max' | 'min', ok: (i: number) => boolean = () => true): { v: number; i: number } | null {
  if (!y) return null
  let best = NaN, bi = -1
  for (let i = 0; i < y.length; i++) {
    const v = y[i]!
    if (Number.isNaN(v) || !ok(i)) continue
    if (bi === -1 || (kind === 'max' ? v > best : v < best)) { best = v; bi = i }
  }
  return bi === -1 ? null : { v: best, i: bi }
}

export const eventsOf = (d: FlightData, type: string): FlightEvent[] => d.events.filter((e) => e.type === type)
export const eventT = (d: FlightData, type: string): number | null => eventsOf(d, type)[0]?.t ?? null

/* ---------- Faz ve metrik tipleri ---------- */

export interface Phase { key: string; label: string; t0: number; t1: number; color: string }

export interface ChuteDeploy {
  t: number
  /** Toplam hız (m/s), CSV'den */
  speed: number | null
  alt: number | null
  /** Uyarı metninden okunan hız (m/s) */
  warnSpeed: number | null
  name: string | null
}

export interface FlightMetrics {
  apogee: { alt: number; t: number } | null
  maxVel: { v: number; t: number } | null
  maxMach: { v: number; t: number } | null
  maxAccelG: { v: number; t: number } | null
  maxQ: { q: number; t: number; mach: number | null } | null
  railExitSpeed: number | null
  railExitT: number | null
  burnStart: number | null
  burnout: number | null
  burnoutFromEvent: boolean
  burnTime: number | null
  totalImpulse: number | null
  avgThrust: number | null
  peakThrust: number | null
  liftoffTW: number | null
  launchMassKg: number | null
  burnoutMassKg: number | null
  ispApprox: number | null
  stabRail: number | null
  stabBurnout: number | null
  stabMinBurn: { v: number; t: number } | null
  /** Yükseliş boyunca (zirveye kadar) minimum; zirve sonrası takla/paraşüt satırları dışarıda */
  stabMinAll: { v: number; t: number } | null
  maxAoa: { v: number; t: number } | null
  /** Yalnızca motorlu uçuşta (hız ≥ 10 m/s) */
  maxAoaBurn: { v: number; t: number } | null
  landingSpeed: number | null
  chutes: ChuteDeploy[]
  flightTime: number | null
  driftEnd: { dist: number; dir: number | null } | null
  maxLateral: { v: number; t: number } | null
  phases: Phase[]
  /** Olay yokken yedek yöntemle bulunan fazlar */
  fallbacks: string[]
  /** (CP-CG)/refLen ile stab sütunu karşılaştırması */
  stabCheck: { rows: number; maxDiff: number } | null
}

/** Hücum açısı bu hızın altında anlamsız kabul edilir (m/s) */
export const AOA_MIN_SPEED = 10

const PHASE_COLORS = { rail: '#64748b', powered: '#f59e0b', coast: '#6366f1', descent: '#06b6d4', main: '#10b981' }

export function computeMetrics(d: FlightData): FlightMetrics {
  const t = d.cols.time!
  const n = d.rows
  const alt = col(d, 'alt')
  const thrust = col(d, 'thrust')
  const fallbacks: string[] = []
  const tEnd = t[n - 1]!

  // Zirve
  const maxAlt = extreme(alt, 'max')
  const apogeeEv = eventT(d, 'APOGEE')
  const apogee = maxAlt ? { alt: maxAlt.v, t: apogeeEv ?? t[maxAlt.i]! } : null
  if (maxAlt && apogeeEv === null) fallbacks.push('Zirve: APOGEE olayı yok, en yüksek irtifa satırı kullanıldı.')

  const vTotal = col(d, 'vTotal')
  const mv = extreme(vTotal, 'max')
  const mm = extreme(col(d, 'mach'), 'max')
  const ma = extreme(col(d, 'aTotal'), 'max')

  // Dinamik basınç (rho g/cm³ -> kg/m³)
  let maxQ: FlightMetrics['maxQ'] = null
  const rho = col(d, 'rho')
  if (rho && vTotal) {
    let bq = -1, bi = -1
    for (let i = 0; i < n; i++) {
      const q = 0.5 * rho[i]! * 1000 * vTotal[i]! ** 2
      if (!Number.isNaN(q) && q > bq) { bq = q; bi = i }
    }
    if (bi >= 0) maxQ = { q: bq, t: t[bi]!, mach: Number.isNaN(col(d, 'mach')?.[bi] ?? NaN) ? null : col(d, 'mach')![bi]! }
  }

  // Raf çıkışı
  const railT = eventT(d, 'LAUNCHROD')
  const railExitSpeed = railT !== null ? valueAt(t, vTotal, railT) : null

  // Yanma
  const ignT = eventT(d, 'IGNITION')
  let burnStart = ignT
  let burnout = eventT(d, 'BURNOUT')
  const burnoutFromEvent = burnout !== null
  if (thrust) {
    let first = -1
    for (let i = 0; i < n; i++) if (thrust[i]! > 0) { first = i; break }
    if (burnStart === null && first >= 0) burnStart = t[first]!
    if (burnout === null && first >= 0) {
      for (let i = first; i < n; i++) {
        if (thrust[i]! <= 0) { burnout = t[i]!; break }
      }
      if (burnout !== null) fallbacks.push('Yanma sonu: BURNOUT olayı yok, itkinin sıfıra düştüğü an kullanıldı.')
    }
  }
  const burnTime = burnout !== null && burnStart !== null ? burnout - burnStart : null

  const burnoutIdx = burnout === null ? n - 1 : lastIndexAtOrBefore(t, burnout)
  const totalImpulse = thrust ? trapz(t, thrust, 0, n - 1) : null
  const impulseBurn = thrust ? trapz(t, thrust, 0, burnoutIdx) : null
  const peak = extreme(thrust, 'max')
  const avgThrust = impulseBurn !== null && burnTime && burnTime > 0 ? impulseBurn / burnTime : null

  const liftoffT = eventT(d, 'LIFTOFF')
  let liftoffTW: number | null = null
  const tw = col(d, 'tw')
  if (liftoffT !== null) {
    liftoffTW = valueAt(t, tw, liftoffT)
    if (liftoffTW === null && thrust && col(d, 'mass') && col(d, 'g')) {
      const th = valueAt(t, thrust, liftoffT), m = valueAt(t, col(d, 'mass'), liftoffT), g = valueAt(t, col(d, 'g'), liftoffT)
      if (th !== null && m && g) liftoffTW = th / ((m / 1000) * g)
    }
  }

  const mass = col(d, 'mass')
  const launchMassKg = mass && !Number.isNaN(mass[0]!) ? mass[0]! / 1000 : null
  const bm = burnout !== null ? valueAt(t, mass, burnout) : null
  const burnoutMassKg = bm !== null ? bm / 1000 : null

  // Yaklaşık Isp
  let ispApprox: number | null = null
  const mm0 = col(d, 'motorMass')
  if (mm0 && impulseBurn !== null && burnout !== null) {
    const m0 = mm0[0]!
    const m1 = valueAt(t, mm0, burnout)
    if (m1 !== null && !Number.isNaN(m0) && m0 > m1) ispApprox = impulseBurn / (G0 * ((m0 - m1) / 1000))
  }

  // Stabilite
  const stab = col(d, 'stab')
  const stabRail = railT !== null ? valueAt(t, stab, railT) : null
  const stabBurnout = burnout !== null ? valueAt(t, stab, burnout) : null
  const sBurn = extreme(stab, 'min', (i) => burnout === null || t[i]! <= burnout)
  const sAll = extreme(stab, 'min', (i) => !apogee || t[i]! <= apogee.t)
  const stabMinBurn = sBurn ? { v: sBurn.v, t: t[sBurn.i]! } : null
  const stabMinAll = sAll ? { v: sAll.v, t: t[sAll.i]! } : null

  // Hücum açısı: düşük hız satırları dışarıda
  const aoaCol = col(d, 'aoa')
  const aoaE = aoaCol && vTotal ? extreme(aoaCol, 'max', (i) => vTotal[i]! >= AOA_MIN_SPEED) : null
  const maxAoa = aoaE ? { v: aoaE.v, t: t[aoaE.i]! } : null
  const aoaB = aoaCol && vTotal ? extreme(aoaCol, 'max', (i) => vTotal[i]! >= AOA_MIN_SPEED && (burnout === null || t[i]! <= burnout)) : null
  const maxAoaBurn = aoaB ? { v: aoaB.v, t: t[aoaB.i]! } : null

  // Olaylar: yere çarpma, uçuş süresi
  let groundT = eventT(d, 'GROUND_HIT')
  if (groundT === null && alt && apogee) {
    const ai = lastIndexAtOrBefore(t, apogee.t)
    for (let i = ai; i < n; i++) if (alt[i]! <= 0) { groundT = t[i]!; break }
    if (groundT !== null) fallbacks.push('Yere çarpma: olay yok, irtifanın ilk kez ≤ 0 olduğu an kullanıldı.')
  }
  const flightTime = groundT ?? eventT(d, 'SIMULATION_END') ?? tEnd

  // İniş hızı: yere çarpmadan önceki son 2 s içindeki ortalama |dikey hız| (irtifa > 0)
  let landingSpeed: number | null = null
  const vVert = col(d, 'vVert')
  if (vVert) {
    const te = groundT ?? tEnd
    let s = 0, c = 0
    for (let i = 0; i < n; i++) {
      if (t[i]! < te - 2 || t[i]! > te) continue
      if (alt && alt[i]! <= 0) continue
      if (Number.isNaN(vVert[i]!)) continue
      s += Math.abs(vVert[i]!); c++
    }
    if (c) landingSpeed = s / c
    else {
      const last = extreme(vVert.map((v, i) => (i === n - 1 ? v : NaN)), 'max')
      landingSpeed = last ? Math.abs(last.v) : null
    }
  }

  // Paraşüt açılışları
  const warnEvents = eventsOf(d, 'SIM_WARN')
  const chutes: ChuteDeploy[] = eventsOf(d, 'RECOVERY_DEVICE_DEPLOYMENT').map((e) => {
    const w = warnEvents.find((x) => Math.abs(x.t - e.t) < 1e-6 && /Recovery device deployment/i.test(x.note ?? ''))
    const wm = w?.note ? /\(([\d.]+)\s*m\/s\)/.exec(w.note) : null
    const nm = w?.note ? /"([^"]+)"/.exec(w.note) : null
    return {
      t: e.t,
      speed: valueAt(t, vTotal, e.t),
      alt: valueAt(t, alt, e.t),
      warnSpeed: wm ? Number(wm[1]) : null,
      name: nm?.[1] ?? e.note ?? null,
    }
  })
  // Olay yok ama uyarı metninde varsa
  if (!chutes.length) {
    for (const w of d.warnings) {
      const wm = /Recovery device deployment at high speed \(([\d.]+)\s*m\/s\)/i.exec(w)
      if (wm) chutes.push({ t: NaN, speed: null, alt: null, warnSpeed: Number(wm[1]), name: /"([^"]+)"/.exec(w)?.[1] ?? null })
    }
  }

  // Yanal sürüklenme
  const latDist = col(d, 'latDist')
  let driftEnd: FlightMetrics['driftEnd'] = null
  if (latDist) {
    const gi = lastIndexAtOrBefore(t, groundT ?? tEnd)
    const dist = latDist[gi]!
    if (!Number.isNaN(dist)) driftEnd = { dist, dir: valueAt(t, col(d, 'latDir'), t[gi]!) }
  }
  const ml = extreme(latDist, 'max')

  // Fazlar
  const phases = buildPhases(d, { railT: railT ?? liftoffT, burnout, apogeeT: apogee?.t ?? null, groundT: groundT ?? tEnd, chutes })

  // Stabilite tutarlılığı
  let stabCheck: FlightMetrics['stabCheck'] = null
  const cp = col(d, 'cp'), cg = col(d, 'cg'), rl = col(d, 'refLen')
  if (cp && cg && rl && stab) {
    let worst = 0, rows = 0
    for (let i = 0; i < n; i++) {
      const v = (cp[i]! - cg[i]!) / rl[i]!
      if (Number.isNaN(v) || Number.isNaN(stab[i]!)) continue
      worst = Math.max(worst, Math.abs(v - stab[i]!)); rows++
    }
    stabCheck = { rows, maxDiff: worst }
  }

  return {
    apogee,
    maxVel: mv ? { v: mv.v, t: t[mv.i]! } : null,
    maxMach: mm ? { v: mm.v, t: t[mm.i]! } : null,
    maxAccelG: ma ? { v: ma.v / G0, t: t[ma.i]! } : null,
    maxQ,
    railExitSpeed,
    railExitT: railT,
    burnStart,
    burnout,
    burnoutFromEvent,
    burnTime,
    totalImpulse,
    avgThrust,
    peakThrust: peak ? peak.v : null,
    liftoffTW,
    launchMassKg,
    burnoutMassKg,
    ispApprox,
    stabRail,
    stabBurnout,
    stabMinBurn,
    stabMinAll,
    maxAoa,
    maxAoaBurn,
    landingSpeed,
    chutes,
    flightTime,
    driftEnd,
    maxLateral: ml ? { v: ml.v, t: t[ml.i]! } : null,
    phases,
    fallbacks,
    stabCheck,
  }
}

export function lastIndexAtOrBefore(t: ArrayLike<number>, at: number): number {
  let lo = 0, hi = t.length - 1
  if (at >= t[hi]!) return hi
  if (at <= t[0]!) return 0
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1
    if (t[mid]! <= at) lo = mid
    else hi = mid
  }
  return lo
}

function buildPhases(
  d: FlightData,
  p: { railT: number | null; burnout: number | null; apogeeT: number | null; groundT: number; chutes: ChuteDeploy[] },
): Phase[] {
  const t = d.cols.time!
  const t0 = t[0]!
  const out: Phase[] = []
  const cuts: { key: string; label: string; start: number; color: string }[] = [{ key: 'rail', label: 'Rampa', start: t0, color: PHASE_COLORS.rail }]
  const push = (key: keyof typeof PHASE_COLORS, label: string, start: number | null) => {
    if (start === null || Number.isNaN(start)) return
    const last = cuts[cuts.length - 1]!
    if (start < last.start) return
    cuts.push({ key, label, start, color: PHASE_COLORS[key] })
  }
  push('powered', 'Motorlu uçuş', p.railT)
  push('coast', 'Eylemsiz yükseliş', p.burnout)
  const deployTimes = p.chutes.map((c) => c.t).filter((x) => !Number.isNaN(x)).sort((a, b) => a - b)
  push('descent', 'Düşüş', p.apogeeT)
  if (deployTimes.length > 1) push('main', 'Ana paraşüt', deployTimes[deployTimes.length - 1]!)
  const bounds = [...cuts.map((c) => c.start), p.groundT]
  cuts.forEach((c, i) => {
    const end = bounds[i + 1]!
    if (end > c.start) out.push({ key: c.key, label: c.label, t0: c.start, t1: end, color: c.color })
  })
  return out
}

/* ---------- Eşikler ---------- */

export interface Thresholds {
  stabWarn: number | null
  stabCrit: number | null
  railMin: number | null
  landMax: number | null
}
export const DEFAULT_THRESHOLDS: Thresholds = { stabWarn: 1.5, stabCrit: 1.0, railMin: 20, landMax: null }

export type Status = 'ok' | 'warn' | 'crit' | 'none'

/** Yüksek olması iyi olan değer (stabilite, raf çıkış hızı) */
export function statusMin(v: number | null, warn: number | null, crit: number | null): Status {
  if (v === null || (warn === null && crit === null)) return 'none'
  if (crit !== null && v < crit) return 'crit'
  if (warn !== null && v < warn) return 'warn'
  return 'ok'
}

/** Düşük olması iyi olan değer (iniş hızı) */
export function statusMax(v: number | null, limit: number | null): Status {
  if (v === null || limit === null) return 'none'
  return v > limit ? 'crit' : 'ok'
}

export interface ThresholdReport {
  stabRail: Status
  stabBurnout: Status
  stabMinBurn: Status
  railExit: Status
  landing: Status
}

export function evaluateThresholds(m: FlightMetrics, th: Thresholds): ThresholdReport {
  return {
    stabRail: statusMin(m.stabRail, th.stabWarn, th.stabCrit),
    stabBurnout: statusMin(m.stabBurnout, th.stabWarn, th.stabCrit),
    stabMinBurn: statusMin(m.stabMinBurn?.v ?? null, th.stabWarn, th.stabCrit),
    railExit: statusMin(m.railExitSpeed, th.railMin, null),
    landing: statusMax(m.landingSpeed, th.landMax),
  }
}
