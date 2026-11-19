// İz genişliği/akım (IPC-2221) ve iz direnci. Birimler: mm, µm, A, K, Ω.
import { MIL_MM, mmToMil, umToMil, type PcbWarning } from './pcbUnits'

export type Layer = 'external' | 'internal'
export const K_IPC: Record<Layer, number> = { external: 0.048, internal: 0.024 }
// Bakır özdirenci (Ω·m, 20 °C) ve sıcaklık katsayısı (1/°C)
export const RHO_CU = 1.72e-8
export const ALPHA_CU = 0.00393

/** I = k·ΔT^0,44·A^0,725  →  A (mil²) */
export function areaForCurrent(currentA: number, deltaT: number, layer: Layer): number {
  return (currentA / (K_IPC[layer] * deltaT ** 0.44)) ** (1 / 0.725)
}
/** A (mil²) → I (A) */
export function currentForArea(areaMil2: number, deltaT: number, layer: Layer): number {
  return K_IPC[layer] * deltaT ** 0.44 * areaMil2 ** 0.725
}

export interface TraceInput { deltaT: number; copperUm: number; layer: Layer }

/** Akım + ΔT + bakır → genişlik. */
export function widthForCurrent(i: TraceInput & { currentA: number }) {
  const areaMil2 = areaForCurrent(i.currentA, i.deltaT, i.layer)
  const widthMil = areaMil2 / umToMil(i.copperUm)
  return { areaMil2, widthMil, widthMm: widthMil * MIL_MM }
}
/** Genişlik + ΔT + bakır → maksimum akım. */
export function maxCurrent(i: TraceInput & { widthMm: number }) {
  const areaMil2 = mmToMil(i.widthMm) * umToMil(i.copperUm)
  return { areaMil2, currentA: currentForArea(areaMil2, i.deltaT, i.layer) }
}

export function traceWarnings(i: Omit<TraceInput, "layer"> & { currentA: number; widthMm: number }): PcbWarning[] {
  const w: PcbWarning[] = []
  if (i.deltaT < 10 || i.deltaT > 100) w.push({ level: 'warning', text: 'ΔT, IPC-2221 grafiklerinin kapsadığı 10–100 °C aralığının dışında; sonuç dışdeğerlemedir.' })
  if (i.copperUm < 17.5 || i.copperUm > 105) w.push({ level: 'warning', text: 'Bakır kalınlığı 0,5–3 oz (17,5–105 µm) aralığının dışında.' })
  if (i.currentA > 35) w.push({ level: 'warning', text: 'Akım 35 A üzerinde; IPC-2221 grafikleri bu değere kadardır.' })
  if (mmToMil(i.widthMm) > 400) w.push({ level: 'warning', text: 'İz genişliği 400 mil (10,16 mm) üzerinde; IPC-2221 grafik aralığının dışında.' })
  return w
}

export interface TraceRes { r20: number; rT: number; vDrop: number; powerW: number }

/** R = ρ·L/(w·t); R(T) = R20·(1 + 0,00393·(T − 20)). */
export function traceResistance(i: { lengthMm: number; widthMm: number; copperUm: number; tempC: number; currentA: number }): TraceRes {
  const r20 = (RHO_CU * (i.lengthMm / 1000)) / ((i.widthMm / 1000) * (i.copperUm / 1e6))
  const rT = r20 * (1 + ALPHA_CU * (i.tempC - 20))
  return { r20, rT, vDrop: i.currentA * rT, powerW: i.currentA ** 2 * rT }
}

export interface CurvePoint { widthMm: number; external: number; internal: number }
/** Genişlik–akım eğrisi (iki katman). */
export function widthCurrentCurve(copperUm: number, deltaT: number, maxWidthMm: number, n = 60): CurvePoint[] {
  const pts: CurvePoint[] = []
  for (let k = 1; k <= n; k++) {
    const widthMm = (maxWidthMm * k) / n
    pts.push({
      widthMm,
      external: maxCurrent({ widthMm, copperUm, deltaT, layer: 'external' }).currentA,
      internal: maxCurrent({ widthMm, copperUm, deltaT, layer: 'internal' }).currentA,
    })
  }
  return pts
}
