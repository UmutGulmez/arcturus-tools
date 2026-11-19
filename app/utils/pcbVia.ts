// Via: akım (yaklaşık), ısıl direnç, endüktans. Birimler: mm, µm, A, K/W, nH.
import { currentForArea, type Layer } from './pcbTrace'
import { MIL_MM } from './pcbUnits'

export const K_CU_THERMAL = 385 // W/(m·K)

/** Namlu kesit alanı A = π·(D − t)·t (mm²); D delik çapı (mm), t kaplama (µm). */
export function barrelAreaMm2(holeMm: number, platingUm: number): number {
  const t = platingUm / 1000
  return Math.PI * (holeMm - t) * t
}

/** IPC-2221 formülüyle yaklaşık via akım kapasitesi. */
export function viaCurrent(i: { holeMm: number; platingUm: number; deltaT: number; layer: Layer }) {
  const areaMm2 = barrelAreaMm2(i.holeMm, i.platingUm)
  const areaMil2 = areaMm2 / (MIL_MM * MIL_MM)
  return { areaMm2, areaMil2, currentA: currentForArea(areaMil2, i.deltaT, i.layer) }
}

/** R = L/(k·A); N via paralel: R/N. */
export function viaThermal(i: { holeMm: number; platingUm: number; lengthMm: number; n: number }) {
  const aM2 = barrelAreaMm2(i.holeMm, i.platingUm) * 1e-6
  const single = (i.lengthMm / 1000) / (K_CU_THERMAL * aM2)
  return { single, parallel: single / i.n }
}

/** Güç bileşeni altı: ΔT_izin altında P'yi geçirmek için gereken via sayısı (1B iletim). */
export function viaCountForPower(i: { powerW: number; deltaTK: number; holeMm: number; platingUm: number; lengthMm: number }) {
  const { single } = viaThermal({ ...i, n: 1 })
  return { single, count: Math.ceil((i.powerW * single) / i.deltaTK - 1e-9) }
}

/** Johnson: L ≈ 5,08·h·[ln(4h/d) + 1] nH; h ve d inç. */
export function viaInductanceNh(boardMm: number, holeMm: number): number {
  const h = boardMm / 25.4
  const d = holeMm / 25.4
  return 5.08 * h * (Math.log((4 * h) / d) + 1)
}
