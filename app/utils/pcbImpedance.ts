// Empedans: mikroşerit (Hammerstad–Jensen, kalınlık düzeltmeli), simetrik şerit hat (IPC-2141),
// kenar kenara bağlı diferansiyel çift (IPC-2141 yaklaşığı). Birimler: mm, Ω, ps/mm.
import type { PcbWarning } from './pcbUnits'

const ETA0 = 376.730313 // Ω
const C_MM_PS = 0.299792458 // mm/ps

/** Quasi-static homojen ortam empedansı Z01(u), u = W/h. */
function z01(u: number): number {
  const f = 6 + (2 * Math.PI - 6) * Math.exp(-((30.666 / u) ** 0.7528))
  return (ETA0 / (2 * Math.PI)) * Math.log(f / u + Math.sqrt(1 + (2 / u) ** 2))
}
/** Statik efektif dielektrik sabiti (Hammerstad–Jensen). */
function eeff0(u: number, er: number): number {
  const a =
    1 +
    (1 / 49) * Math.log((u ** 4 + (u / 52) ** 2) / (u ** 4 + 0.432)) +
    (1 / 18.7) * Math.log(1 + (u / 18.1) ** 3)
  const b = 0.564 * ((er - 0.9) / (er + 3)) ** 0.053
  return (er + 1) / 2 + ((er - 1) / 2) * (1 + 10 / u) ** (-a * b)
}

export interface MicrostripIn { wMm: number; hMm: number; tMm: number; er: number }
export interface LineOut { z0: number; eeff: number; delayPsPerMm: number }

export function microstrip(i: MicrostripIn): LineOut {
  const u = i.wMm / i.hMm
  const th = i.tMm / i.hMm
  let du1 = 0
  if (th > 0) {
    const coth = 1 / Math.tanh(Math.sqrt(6.517 * u))
    du1 = (th / Math.PI) * Math.log(1 + (4 * Math.E) / (th * coth * coth))
  }
  const dur = 0.5 * du1 * (1 + 1 / Math.cosh(Math.sqrt(i.er - 1)))
  const u1 = u + du1
  const ur = u + dur
  const z0 = z01(ur) / Math.sqrt(eeff0(ur, i.er))
  const eeff = eeff0(ur, i.er) * (z01(u1) / z01(ur)) ** 2
  return { z0, eeff, delayPsPerMm: Math.sqrt(eeff) / C_MM_PS }
}

/** Diferansiyel çift (mikroşerit): Zdiff ≈ 2·Z0·(1 − 0,48·e^(−0,96·s/h)). */
export function microstripDiff(i: MicrostripIn & { sMm: number }): number {
  return 2 * microstrip(i).z0 * (1 - 0.48 * Math.exp((-0.96 * i.sMm) / i.hMm))
}

/** Simetrik şerit hat (IPC-2141): Z0 = 60/√εr · ln(4b / (0,67π(0,8w + t))); b = iki düzlem arası. */
export function stripline(i: { wMm: number; bMm: number; tMm: number; er: number }): LineOut {
  const arg = (4 * i.bMm) / (0.67 * Math.PI * (0.8 * i.wMm + i.tMm))
  const z0 = (60 / Math.sqrt(i.er)) * Math.log(arg)
  return { z0, eeff: i.er, delayPsPerMm: Math.sqrt(i.er) / C_MM_PS }
}

/** Z0 genişlikle azalır; [lo, hi] aralığında ikiye bölme. Hedef aralık dışındaysa null. */
export function solveWidth(z: (wMm: number) => number, target: number, lo: number, hi: number): number | null {
  const zlo = z(lo)
  const zhi = z(hi)
  if (!(zlo >= target && zhi <= target)) return null
  for (let k = 0; k < 200; k++) {
    const mid = (lo + hi) / 2
    if (z(mid) > target) lo = mid
    else hi = mid
    if (hi - lo < 1e-12 * hi) break
  }
  return (lo + hi) / 2
}

export function widthForZ0Microstrip(target: number, hMm: number, tMm: number, er: number): number | null {
  return solveWidth((w) => microstrip({ wMm: w, hMm, tMm, er }).z0, target, 0.01 * hMm, 100 * hMm)
}
export function widthForZ0Stripline(target: number, bMm: number, tMm: number, er: number): number | null {
  // ln argümanı > 1 kalmalı: w < (4b/(0,67π) − t)/0,8
  const wMax = (((4 * bMm) / (0.67 * Math.PI) - tMm) / 0.8) * 0.9999
  return solveWidth((w) => stripline({ wMm: w, bMm, tMm, er }).z0, target, wMax * 1e-4, wMax)
}
/** Hedef Zdiff ve s için mikroşerit iz genişliği. */
export function widthForZdiffMicrostrip(target: number, sMm: number, hMm: number, tMm: number, er: number): number | null {
  return solveWidth((w) => microstripDiff({ wMm: w, hMm, tMm, er, sMm }), target, 0.01 * hMm, 100 * hMm)
}

export function microstripWarnings(i: MicrostripIn): PcbWarning[] {
  const w: PcbWarning[] = []
  const u = i.wMm / i.hMm
  if (u < 0.01 || u > 100) w.push({ level: 'warning', text: 'W/h, Hammerstad–Jensen aralığının (0,01–100) dışında.' })
  if (i.er < 1 || i.er > 128) w.push({ level: 'warning', text: 'εr, 1–128 aralığının dışında.' })
  if (i.tMm / i.hMm > 0.2 || i.tMm > i.wMm / 2) w.push({ level: 'warning', text: 'Kalınlık düzeltmesi t ≪ h ve t < W/2 için geçerli; bu girdide bu koşullar zayıf.' })
  return w
}
export function striplineWarnings(i: { wMm: number; bMm: number; tMm: number }): PcbWarning[] {
  const w: PcbWarning[] = []
  if (i.wMm / (i.bMm - i.tMm) >= 0.35) w.push({ level: 'warning', text: 'IPC-2141 şerit hat formülü w/(b−t) < 0,35 için tanımlı; bu girdide aşılıyor.' })
  if (i.tMm / i.bMm >= 0.25) w.push({ level: 'warning', text: 'IPC-2141 şerit hat formülü t/b < 0,25 için tanımlı; bu girdide aşılıyor.' })
  return w
}
