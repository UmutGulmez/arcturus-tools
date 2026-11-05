// Paraşüt terminal iniş hızı: saf hesap fonksiyonları.
// Vue / DOM bağımlılığı yoktur; tarayıcıda, Web Worker'da ve testlerde aynen kullanılır.
// Birimler SI: kg, m, s, N, J, Pa, K.

import { fmt } from './format'

// ---------------------------------------------------------------- sabitler
export const R_SPECIFIC = 287.05 // J/(kg·K)
export const P0 = 101325 // Pa
export const T0 = 288.15 // K
export const LAPSE = 0.0065 // K/m (troposfer)
export const ISA_MAX_ALTITUDE = 11000 // m

// ---------------------------------------------------------------- tipler
export interface Atmosphere {
  T: number
  p: number
  rho: number
}

export interface StaticInputs {
  /** Sistem kütlesi [kg] */
  m: number
  /** Paraşüt kütlesi [kg], toplam kütleye eklenir */
  mChute: number
  /** Nominal ÇAP [m] */
  d: number
  cd: number
  /** Saha rakımı [m] */
  h: number
  /** ISA'ya göre sıcaklık sapması [K] */
  dT: number
  g: number
  /** İzdüşüm çapı / nominal çap */
  proj: number
  /** Tepe deliği çapı [m] (yalnızca bilgi/uyarı) */
  holeD: number
  /** Verilirse ISA yerine kullanılan sabit yoğunluk [kg/m³] */
  rhoFixed: number | null
}

export interface Targets {
  vTarget: number | null
  vLimit: number | null
  eLimit: number | null
}

export interface StaticResult {
  atm: Atmosphere
  rho: number
  rhoSource: 'isa' | 'fixed'
  totalMass: number
  area: number
  cdA: number
  v: number
  vKmh: number
  energy: number
  dropHeight: number
  weight: number
}

export interface LimitCheck {
  limit: number
  value: number
  pass: boolean
  /** (limit - değer) / limit * 100 */
  marginPct: number
}

export interface LimitEvaluation {
  speed: LimitCheck | null
  energy: LimitCheck | null
  overall: 'pass' | 'fail' | 'none'
}

export interface InverseSizing {
  vTarget: number
  dRequired: number
  /** dRequired - d [m]; pozitif → daha büyük paraşüt gerekir */
  diff: number
  diffPct: number
}

export type SensKey = 'm' | 'd' | 'cd' | 'rho' | 'proj'

export interface SensRow {
  key: SensKey
  label: string
  nominal: number
  unit: string
  vMinus: number
  vPlus: number
  dMinusPct: number
  dPlusPct: number
  /** max(|Δ-|, |Δ+|) */
  impactPct: number
}

export interface SensitivityResult {
  baseV: number
  rows: SensRow[]
  topKeys: SensKey[]
}

export interface Warning {
  level: 'danger' | 'warning' | 'info'
  text: string
}

export interface Analysis {
  inputs: StaticInputs
  targets: Targets
  result: StaticResult
  limits: LimitEvaluation
  inverse: InverseSizing | null
  sensitivity: SensitivityResult
  warnings: Warning[]
}

// ---------------------------------------------------------------- atmosfer
/** ISA troposfer. T'ye dT eklenir; basınç ISA'dan alınır. h [0, 11000] m aralığına sıkıştırılır. */
export function isaAtmosphere(h: number, dT = 0): Atmosphere {
  const hc = Math.min(Math.max(h, 0), ISA_MAX_ALTITUDE)
  const T = T0 + dT - LAPSE * hc
  const p = P0 * (1 - 2.25577e-5 * hc) ** 5.25588
  return { T, p, rho: p / (R_SPECIFIC * T) }
}

// ---------------------------------------------------------------- temel formüller
export function projectedArea(d: number, proj: number): number {
  const r = (proj * d) / 2
  return Math.PI * r * r
}

export function terminalVelocity(mass: number, g: number, rho: number, cd: number, area: number): number {
  return Math.sqrt((2 * mass * g) / (rho * cd * area))
}

/** Hedef hız için gereken nominal çap [m]. */
export function requiredDiameter(
  mass: number,
  g: number,
  rho: number,
  cd: number,
  vTarget: number,
  proj: number,
): number {
  return (2 / proj) * Math.sqrt((2 * mass * g) / (Math.PI * rho * cd * vTarget * vTarget))
}

export const kineticEnergy = (mass: number, v: number) => 0.5 * mass * v * v
export const equivalentDropHeight = (v: number, g: number) => (v * v) / (2 * g)

export const totalMass = (i: StaticInputs) => i.m + i.mChute
export const densityUsed = (i: StaticInputs) => i.rhoFixed ?? isaAtmosphere(i.h, i.dT).rho

export function computeStatic(i: StaticInputs): StaticResult {
  const atm = isaAtmosphere(i.h, i.dT)
  const rho = i.rhoFixed ?? atm.rho
  const mass = totalMass(i)
  const area = projectedArea(i.d, i.proj)
  const cdA = i.cd * area
  const v = terminalVelocity(mass, i.g, rho, i.cd, area)
  return {
    atm,
    rho,
    rhoSource: i.rhoFixed === null ? 'isa' : 'fixed',
    totalMass: mass,
    area,
    cdA,
    v,
    vKmh: v * 3.6,
    energy: kineticEnergy(mass, v),
    dropHeight: equivalentDropHeight(v, i.g),
    weight: mass * i.g,
  }
}

function checkLimit(limit: number | null, value: number): LimitCheck | null {
  if (limit === null) return null
  return { limit, value, pass: value <= limit, marginPct: ((limit - value) / limit) * 100 }
}

export function evaluateLimits(res: StaticResult, t: Targets): LimitEvaluation {
  const speed = checkLimit(t.vLimit, res.v)
  const energy = checkLimit(t.eLimit, res.energy)
  const checks = [speed, energy].filter((c): c is LimitCheck => c !== null)
  const overall = checks.length === 0 ? 'none' : checks.every((c) => c.pass) ? 'pass' : 'fail'
  return { speed, energy, overall }
}

export function computeInverse(i: StaticInputs, vTarget: number): InverseSizing {
  const dRequired = requiredDiameter(totalMass(i), i.g, densityUsed(i), i.cd, vTarget, i.proj)
  const diff = dRequired - i.d
  return { vTarget, dRequired, diff, diffPct: (diff / i.d) * 100 }
}

// ---------------------------------------------------------------- duyarlılık
/** Çarpansal sapmalarla terminal hız (f: çarpanlar, varsayılan 1). */
export function terminalSpeedWith(i: StaticInputs, f: Partial<Record<SensKey, number>> = {}): number {
  const mass = totalMass(i) * (f.m ?? 1)
  const rho = densityUsed(i) * (f.rho ?? 1)
  const cd = i.cd * (f.cd ?? 1)
  const area = projectedArea(i.d * (f.d ?? 1), i.proj * (f.proj ?? 1))
  return terminalVelocity(mass, i.g, rho, cd, area)
}

export function sensitivity(i: StaticInputs, delta = 0.1): SensitivityResult {
  const base = terminalSpeedWith(i)
  const defs: { key: SensKey; label: string; nominal: number; unit: string }[] = [
    { key: 'm', label: 'Kütle (m)', nominal: totalMass(i), unit: 'kg' },
    { key: 'd', label: 'Nominal çap (d)', nominal: i.d, unit: 'm' },
    { key: 'cd', label: 'Sürüklenme katsayısı (Cd)', nominal: i.cd, unit: '' },
    { key: 'rho', label: 'Hava yoğunluğu (ρ)', nominal: densityUsed(i), unit: 'kg/m³' },
    { key: 'proj', label: 'İzdüşüm oranı', nominal: i.proj, unit: '' },
  ]
  const rows: SensRow[] = defs.map((d) => {
    const vMinus = terminalSpeedWith(i, { [d.key]: 1 - delta })
    const vPlus = terminalSpeedWith(i, { [d.key]: 1 + delta })
    const dMinusPct = (vMinus / base - 1) * 100
    const dPlusPct = (vPlus / base - 1) * 100
    return { ...d, vMinus, vPlus, dMinusPct, dPlusPct, impactPct: Math.max(Math.abs(dMinusPct), Math.abs(dPlusPct)) }
  })
  const maxImpact = Math.max(...rows.map((r) => r.impactPct))
  const topKeys = rows.filter((r) => maxImpact - r.impactPct < 1e-9).map((r) => r.key)
  return { baseV: base, rows, topKeys }
}

// ---------------------------------------------------------------- uyarılar
export function buildWarnings(i: StaticInputs, res: StaticResult): Warning[] {
  const w: Warning[] = []
  if (i.proj < 0.65 || i.proj > 1.0) {
    w.push({
      level: 'warning',
      text: `İzdüşüm oranı ${fmt(i.proj)} önerilen 0,65–1,0 aralığının dışında. Cd değerinin bu orana göre seçildiğinden emin olun.`,
    })
  }
  if (i.holeD > 0.2 * i.d) {
    w.push({
      level: 'warning',
      text: `Tepe deliği çapı (${fmt(i.holeD)} m) nominal çapın %20'sinden büyük (${fmt((i.holeD / i.d) * 100, 0)} %). Cd değeri bu delik geometrisine ait olmalı.`,
    })
  } else if (i.holeD > 0) {
    w.push({
      level: 'info',
      text: 'Tepe deliği alandan düşülmez; etkisi Cd içine gömülüdür. Kullandığınız Cd değeri bu delikli geometriye ait olmalı.',
    })
  }
  if (i.h > 3000) {
    const rho0 = isaAtmosphere(0, i.dT).rho
    const drop = (1 - res.atm.rho / rho0) * 100
    w.push({
      level: 'warning',
      text: `Saha rakımı yüksek (${fmt(i.h, 0)} m): hava yoğunluğu deniz seviyesine göre yaklaşık %${fmt(drop, 0)} daha düşük, iniş hızı bu yüzden artar.`,
    })
  }
  if (i.cd < 0.5 || i.cd > 1.5) {
    w.push({
      level: 'warning',
      text: `Cd = ${fmt(i.cd)} literatürdeki tipik aralığın (0,5–1,5) dışında. Değerin kaynağını kontrol edin.`,
    })
  }
  if (i.rhoFixed !== null) {
    w.push({
      level: 'info',
      text: `Sabit hava yoğunluğu (${fmt(i.rhoFixed, 3)} kg/m³) kullanılıyor; rakım ve sıcaklık etkisi yok sayılır (ISA ρ = ${fmt(res.atm.rho, 3)} kg/m³).`,
    })
  }
  return w
}

export function analyze(inputs: StaticInputs, targets: Targets): Analysis {
  const result = computeStatic(inputs)
  return {
    inputs,
    targets,
    result,
    limits: evaluateLimits(result, targets),
    inverse: targets.vTarget === null ? null : computeInverse(inputs, targets.vTarget),
    sensitivity: sensitivity(inputs),
    warnings: buildWarnings(inputs, result),
  }
}

// ---------------------------------------------------------------- dinamik iniş (RK4)
export interface SimParams {
  inputs: StaticInputs
  /** Başlangıç hızı [m/s], aşağı yön pozitif */
  v0: number
  /** Başlangıç irtifası, yerden yükseklik [m] */
  h0: number
  dt?: number
  /** Her `stride` adımda bir nokta kaydedilir */
  stride?: number
  maxTime?: number
}

export interface SimResult {
  t: number[]
  h: number[]
  v: number[]
  /** dv/dt, aşağı yön pozitif [m/s²] */
  a: number[]
  /** Sürüklenme kuvveti [N] */
  drag: number[]
  totalTime: number
  impactSpeed: number
  terminalSpeed: number
  /** Terminal hızın %95'ine ulaşma süresi ve o sürede kaybedilen irtifa */
  t95: number | null
  hLost95: number | null
  /** v0 terminal hızdan büyükse: hız terminalin %105'ine inene kadar süre ve mesafe */
  decel: { time: number; distance: number } | null
  truncated: boolean
}

export function simulateDescent(p: SimParams): SimResult {
  const { inputs } = p
  const dt = p.dt ?? 0.01
  const stride = p.stride ?? 5
  const maxTime = p.maxTime ?? 7200
  const mass = totalMass(inputs)
  const cdA = inputs.cd * projectedArea(inputs.d, inputs.proj)
  const g = inputs.g
  const vt = computeStatic(inputs).v

  const rhoAt = (hAgl: number) => inputs.rhoFixed ?? isaAtmosphere(inputs.h + hAgl, inputs.dT).rho
  const dragAt = (hAgl: number, v: number) => 0.5 * rhoAt(hAgl) * v * v * cdA
  const acc = (hAgl: number, v: number) => g - dragAt(hAgl, v) / mass

  const out: SimResult = {
    t: [], h: [], v: [], a: [], drag: [],
    totalTime: 0, impactSpeed: p.v0, terminalSpeed: vt,
    t95: null, hLost95: null, decel: null, truncated: false,
  }
  const push = (t: number, h: number, v: number) => {
    const D = dragAt(h, v)
    out.t.push(t); out.h.push(h); out.v.push(v)
    out.a.push(g - D / mass); out.drag.push(D)
  }

  let t = 0
  let h = p.h0
  let v = p.v0
  push(t, h, v)
  if (h <= 0) return out

  const needT95 = v < 0.95 * vt
  const needDecel = v > 1.05 * vt
  let n = 0

  for (;;) {
    const k1h = -v
    const k1v = acc(h, v)
    const k2h = -(v + 0.5 * dt * k1v)
    const k2v = acc(h + 0.5 * dt * k1h, v + 0.5 * dt * k1v)
    const k3h = -(v + 0.5 * dt * k2v)
    const k3v = acc(h + 0.5 * dt * k2h, v + 0.5 * dt * k2v)
    const k4h = -(v + dt * k3v)
    const k4v = acc(h + dt * k3h, v + dt * k3v)
    const hn = h + (dt / 6) * (k1h + 2 * k2h + 2 * k3h + k4h)
    const vn = v + (dt / 6) * (k1v + 2 * k2v + 2 * k3v + k4v)

    if (hn <= 0) {
      const frac = h / (h - hn)
      const tl = t + frac * dt
      const vl = v + frac * (vn - v)
      push(tl, 0, vl)
      out.totalTime = tl
      out.impactSpeed = vl
      return out
    }

    n++
    t = n * dt
    h = hn
    v = vn

    if (needT95 && out.t95 === null && v >= 0.95 * vt) {
      out.t95 = t
      out.hLost95 = p.h0 - h
    }
    if (needDecel && out.decel === null && v <= 1.05 * vt) {
      out.decel = { time: t, distance: p.h0 - h }
    }
    if (n % stride === 0) push(t, h, v)

    if (t >= maxTime) {
      push(t, h, v)
      out.totalTime = t
      out.impactSpeed = v
      out.truncated = true
      return out
    }
  }
}

// ---------------------------------------------------------------- Monte Carlo
/** Seed'li hızlı PRNG, [0, 1) üretir. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Box–Muller ile standart normal örnekleyici. */
export function normalSampler(rng: () => number): () => number {
  let spare: number | null = null
  return () => {
    if (spare !== null) {
      const s = spare
      spare = null
      return s
    }
    let u1 = rng()
    if (u1 < 1e-12) u1 = 1e-12
    const u2 = rng()
    const r = Math.sqrt(-2 * Math.log(u1))
    spare = r * Math.sin(2 * Math.PI * u2)
    return r * Math.cos(2 * Math.PI * u2)
  }
}

export interface McConfig {
  n: number
  seed: number
  /** Göreli standart sapmalar (0.02 = %2) */
  sigmaM: number
  sigmaCd: number
  sigmaRho: number
  sigmaProj: number
  vLimit: number | null
  bins?: number
}

export interface McResult {
  n: number
  seed: number
  nominal: number
  mean: number
  std: number
  min: number
  max: number
  p5: number
  p50: number
  p95: number
  /** P(v > hız limiti) */
  exceedProb: number | null
  vLimit: number | null
  hist: { edges: number[]; counts: number[] }
}

function percentile(sorted: Float64Array, q: number): number {
  const pos = (sorted.length - 1) * q
  const lo = Math.floor(pos)
  const hi = Math.ceil(pos)
  return sorted[lo]! + (sorted[hi]! - sorted[lo]!) * (pos - lo)
}

export function monteCarlo(inputs: StaticInputs, cfg: McConfig): McResult {
  const n = Math.max(1, Math.floor(cfg.n))
  const rng = mulberry32(cfg.seed)
  const normal = normalSampler(rng)
  const mass0 = totalMass(inputs)
  const rho0 = densityUsed(inputs)
  const area0 = (proj: number) => projectedArea(inputs.d, proj)
  const factor = (sigma: number) => Math.max(0.05, 1 + sigma * normal())

  const vals = new Float64Array(n)
  let mean = 0
  let m2 = 0
  let exceed = 0
  for (let k = 0; k < n; k++) {
    const mass = mass0 * factor(cfg.sigmaM)
    const cd = inputs.cd * factor(cfg.sigmaCd)
    const rho = rho0 * factor(cfg.sigmaRho)
    const proj = inputs.proj * factor(cfg.sigmaProj)
    const v = terminalVelocity(mass, inputs.g, rho, cd, area0(proj))
    vals[k] = v
    const delta = v - mean
    mean += delta / (k + 1)
    m2 += delta * (v - mean)
    if (cfg.vLimit !== null && v > cfg.vLimit) exceed++
  }
  const std = n > 1 ? Math.sqrt(m2 / (n - 1)) : 0

  const sorted = Float64Array.from(vals).sort()
  const min = sorted[0]!
  const max = sorted[n - 1]!

  const binCount = cfg.bins ?? 30
  let lo = min
  let hi = max
  if (hi - lo < 1e-12) {
    lo -= 0.5
    hi += 0.5
  }
  const width = (hi - lo) / binCount
  const counts = new Array<number>(binCount).fill(0)
  for (let k = 0; k < n; k++) {
    const b = Math.min(binCount - 1, Math.floor((vals[k]! - lo) / width))
    counts[b]!++
  }
  const edges = Array.from({ length: binCount + 1 }, (_, k) => lo + k * width)

  return {
    n,
    seed: cfg.seed,
    nominal: terminalSpeedWith(inputs),
    mean,
    std,
    min,
    max,
    p5: percentile(sorted, 0.05),
    p50: percentile(sorted, 0.5),
    p95: percentile(sorted, 0.95),
    exceedProb: cfg.vLimit === null ? null : exceed / n,
    vLimit: cfg.vLimit,
    hist: { edges, counts },
  }
}
