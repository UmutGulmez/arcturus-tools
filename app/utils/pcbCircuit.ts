// Isıl ve devre yardımcıları. Birimler: V, Ω, F, H, Hz, A, W, °C.

export interface ThermalOut { tj: number; margin: number; pMax: number; ok: boolean }
/** Tj = Ta + P·RθJA; marj = Tj_max − Tj; P_max = (Tj_max − Ta)/RθJA. */
export function junctionTemp(p: { powerW: number; taC: number; rthJA: number; tjMaxC: number }): ThermalOut {
  const tj = p.taC + p.powerW * p.rthJA
  return { tj, margin: p.tjMaxC - tj, pMax: (p.tjMaxC - p.taC) / p.rthJA, ok: tj <= p.tjMaxC }
}

// ---- E serileri
export const E24 = [1.0, 1.1, 1.2, 1.3, 1.5, 1.6, 1.8, 2.0, 2.2, 2.4, 2.7, 3.0, 3.3, 3.6, 3.9, 4.3, 4.7, 5.1, 5.6, 6.2, 6.8, 7.5, 8.2, 9.1]
export const E96 = [
  1.0, 1.02, 1.05, 1.07, 1.10, 1.13, 1.15, 1.18, 1.21, 1.24, 1.27, 1.30, 1.33, 1.37, 1.40, 1.43, 1.47, 1.50, 1.54, 1.58, 1.62, 1.65, 1.69, 1.74,
  1.78, 1.82, 1.87, 1.91, 1.96, 2.00, 2.05, 2.10, 2.15, 2.21, 2.26, 2.32, 2.37, 2.43, 2.49, 2.55, 2.61, 2.67, 2.74, 2.80, 2.87, 2.94, 3.01, 3.09,
  3.16, 3.24, 3.32, 3.40, 3.48, 3.57, 3.65, 3.74, 3.83, 3.92, 4.02, 4.12, 4.22, 4.32, 4.42, 4.53, 4.64, 4.75, 4.87, 4.99, 5.11, 5.23, 5.36, 5.49,
  5.62, 5.76, 5.90, 6.04, 6.19, 6.34, 6.49, 6.65, 6.81, 6.98, 7.15, 7.32, 7.50, 7.68, 7.87, 8.06, 8.25, 8.45, 8.66, 8.87, 9.09, 9.31, 9.53, 9.76,
]
export type Series = 'E24' | 'E96'

/** [rMin, rMax] arasındaki tüm standart değerler (Ω). */
export function seriesValues(series: Series, rMin: number, rMax: number): number[] {
  const base = series === 'E24' ? E24 : E96
  const out: number[] = []
  for (let dec = Math.floor(Math.log10(rMin)) - 1; dec <= Math.ceil(Math.log10(rMax)); dec++) {
    for (const m of base) {
      const r = Number((m * 10 ** dec).toPrecision(6))
      if (r >= rMin * (1 - 1e-9) && r <= rMax * (1 + 1e-9)) out.push(r)
    }
  }
  return out
}

export const dividerVout = (vref: number, r1: number, r2: number) => vref * (1 + r1 / r2)

export interface DividerPair { r1: number; r2: number; vout: number; errPct: number }
/** Vout = Vref·(1 + R1/R2) hedefine en yakın en fazla `top` standart değer çifti. */
export function bestDividers(p: { vout: number; vref: number; series: Series; rMin: number; rMax: number; top?: number }): DividerPair[] {
  const vals = seriesValues(p.series, p.rMin, p.rMax)
  const all: DividerPair[] = []
  for (const r1 of vals) {
    for (const r2 of vals) {
      const v = dividerVout(p.vref, r1, r2)
      all.push({ r1, r2, vout: v, errPct: ((v - p.vout) / p.vout) * 100 })
    }
  }
  all.sort((a, b) => Math.abs(a.errPct) - Math.abs(b.errPct) || a.r1 + a.r2 - (b.r1 + b.r2))
  // Aynı oran ×10^k ile ölçeklenmiş kopyalar tek satırda gösterilir (en küçük değerli olan kalır).
  const seen = new Set<string>()
  const out: DividerPair[] = []
  for (const c of all) {
    const key = (c.r1 / c.r2).toPrecision(9)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(c)
    if (out.length >= (p.top ?? 5)) break
  }
  return out
}

/** C1 = C2 = 2·(CL − Cstray) */
export const crystalLoadCap = (clF: number, cstrayF: number) => 2 * (clF - cstrayF)

// ---- RC ve LC
export const rcCutoff = (r: number, c: number) => 1 / (2 * Math.PI * r * c)
export const rcResistor = (fc: number, c: number) => 1 / (2 * Math.PI * fc * c)
export const rcCapacitor = (fc: number, r: number) => 1 / (2 * Math.PI * fc * r)
export const lcResonance = (l: number, c: number) => 1 / (2 * Math.PI * Math.sqrt(l * c))
export const lcInductor = (f0: number, c: number) => 1 / ((2 * Math.PI * f0) ** 2 * c)
export const lcCapacitor = (f0: number, l: number) => 1 / ((2 * Math.PI * f0) ** 2 * l)
export const lcImpedance = (l: number, c: number) => Math.sqrt(l / c)

// ---- Akım ölçüm shunt
export function shunt(p: { currentA: number; rShunt: number; gain: number; adcBits: number; adcVref: number }) {
  const vShunt = p.currentA * p.rShunt
  const lsbV = p.adcVref / 2 ** p.adcBits
  return {
    vShunt,
    powerW: p.currentA ** 2 * p.rShunt,
    vAdc: vShunt * p.gain,
    lsbA: lsbV / (p.gain * p.rShunt),
    fullScaleA: p.adcVref / (p.gain * p.rShunt),
    saturated: vShunt * p.gain > p.adcVref,
  }
}
