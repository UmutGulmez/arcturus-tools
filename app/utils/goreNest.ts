// Dilimleri kumaş rulosuna dizme (basit satır dizilimi, baş-sonlu) ve kordon listesi.
import type { Gore, Pt } from './gore'
import { goreStats } from './gore'

export interface FabricInput {
  rollWidthCm: number
  pricePerM: number | null // TL/m (kumaş boyu için), opsiyonel
}

export type NestOrientation = 'along' | 'across'

export interface NestResult {
  feasible: boolean
  message?: string
  orientation?: NestOrientation
  perRow?: number
  rows?: number
  lengthCm?: number
  usedAreaCm2?: number
  wastePct?: number
  cost?: number | null
  /** Rulo koordinatında yerleşmiş dilim konturları (X: rulo eni yönü, Y: rulo boyu yönü), cm. */
  polys?: Pt[][]
}

interface Profile {
  ymin: number
  ymax: number
  /** Kontur köşelerinin y değerleri (parçalı doğrusal profilin kırılma noktaları). */
  ys: number[]
  rightAt: (y: number) => number | null
  leftAt: (y: number) => number | null
}

function profile(cut: Pt[]): Profile {
  const ys = cut.map((p) => p.y)
  const ymin = Math.min(...ys)
  const ymax = Math.max(...ys)
  const span = (y: number): [number, number] | null => {
    let lo = Infinity
    let hi = -Infinity
    for (let i = 0; i < cut.length; i++) {
      const a = cut[i]!
      const b = cut[(i + 1) % cut.length]!
      if ((a.y - y) * (b.y - y) > 1e-12) continue
      if (Math.abs(b.y - a.y) < 1e-12) {
        lo = Math.min(lo, a.x, b.x)
        hi = Math.max(hi, a.x, b.x)
        continue
      }
      const t = (y - a.y) / (b.y - a.y)
      const x = a.x + t * (b.x - a.x)
      lo = Math.min(lo, x)
      hi = Math.max(hi, x)
    }
    return isFinite(hi) ? [lo, hi] : null
  }
  return { ymin, ymax, ys, rightAt: (y) => span(y)?.[1] ?? null, leftAt: (y) => span(y)?.[0] ?? null }
}

/**
 * Ardışık (alternatif baş-sonlu) dilimler için merkezden merkeze mesafeler: [p(A→B), p(B→C)].
 * Profil parçalı doğrusal olduğundan R(y) + R(y*) en büyük değerini köşe y'lerinde (ve yansımalarında) alır;
 * bu yüzden hesap örneklemesiz ve kesindir.
 */
function pitches(pr: Profile): [number, number] {
  const sum = pr.ymin + pr.ymax
  const cand = [...pr.ys, ...pr.ys.map((y) => sum - y)]
  let p1 = 0
  let p2 = 0
  for (const y of cand) {
    const ym = sum - y // 180° dönüşte y yansıması
    const r = pr.rightAt(y)
    const rm = pr.rightAt(ym)
    const l = pr.leftAt(y)
    const lm = pr.leftAt(ym)
    if (r !== null && rm !== null) p1 = Math.max(p1, r + rm)
    if (l !== null && lm !== null) p2 = Math.max(p2, -l - lm)
  }
  return [p1, p2]
}

interface Slot { c: number; flip: boolean; lo: number; hi: number }

/** m dilimlik tek hat (dilim x ekseni yönünde); toplam genişlik ve yerleşim. */
function line(pr: Profile, m: number, minL: number, maxR: number): { width: number; slots: Slot[] } {
  const [p1, p2] = pitches(pr)
  const slots: Slot[] = []
  let c = 0
  for (let i = 0; i < m; i++) {
    const flip = i % 2 === 1
    const lo = flip ? c - maxR : c + minL
    const hi = flip ? c - minL : c + maxR
    slots.push({ c, flip, lo, hi })
    c += i % 2 === 0 ? p1 : p2
  }
  const lo = Math.min(...slots.map((s) => s.lo))
  const hi = Math.max(...slots.map((s) => s.hi))
  return { width: hi - lo, slots: slots.map((s) => ({ ...s, c: s.c - lo })) }
}

function place(cut: Pt[], pr: Profile, s: Slot): Pt[] {
  const cy = (pr.ymin + pr.ymax) / 2
  return cut.map((p) => {
    // dilim çerçevesi: flip ise 180° dönüş (x,y) -> (-x, 2cy-y)
    const x = s.flip ? -p.x : p.x
    const y = s.flip ? 2 * cy - p.y : p.y
    return { x: x + s.c, y: y - pr.ymin }
  })
}

export function nestGores(g: Gore, n: number, f: FabricInput): NestResult {
  const W = f.rollWidthCm
  if (!(W > 0)) return { feasible: false, message: 'Rulo eni pozitif olmalı.' }
  const cut = g.cut
  const pr = profile(cut)
  const minL = Math.min(...cut.map((q) => q.x))
  const maxR = Math.max(...cut.map((q) => q.x))
  const Hc = pr.ymax - pr.ymin
  const used = n * goreStats(g).cutArea

  type Cand = { o: NestOrientation; perRow: number; rows: number; length: number; polys: Pt[][] }
  const cands: Cand[] = []

  // 1) 'along': dilim ekseni rulo boyu yönünde; satırda yan yana (baş-sonlu), satırlar boyuna dizilir.
  if (maxR - minL <= W + 1e-9) {
    let perRow = 1
    while (perRow < n && line(pr, perRow + 1, minL, maxR).width <= W + 1e-9) perRow++
    const rows = Math.ceil(n / perRow)
    const polys: Pt[][] = []
    let idx = 0
    for (let r = 0; r < rows; r++) {
      const cnt = Math.min(perRow, n - idx)
      const ln = line(pr, cnt, minL, maxR)
      for (const s of ln.slots) {
        polys.push(place(cut, pr, s).map((p) => ({ x: p.x, y: p.y + r * Hc })))
        idx++
      }
    }
    cands.push({ o: 'along', perRow, rows, length: rows * Hc, polys })
  }
  // 2) 'across': dilim ekseni rulo eni yönünde; dilimler boyuna alternatif sıralanır.
  if (Hc <= W + 1e-9) {
    const lines = Math.max(1, Math.floor((W + 1e-9) / Hc))
    const per = Math.ceil(n / lines)
    const polys: Pt[][] = []
    let idx = 0
    let maxLen = 0
    for (let j = 0; j < lines; j++) {
      const cnt = Math.min(per, n - idx)
      if (cnt <= 0) break
      const ln = line(pr, cnt, minL, maxR)
      maxLen = Math.max(maxLen, ln.width)
      for (const s of ln.slots) {
        // dilim yerleşiminde (X: hat yönü, Y: dilim ekseni) -> rulo (X: rulo eni, Y: rulo boyu): takas
        polys.push(place(cut, pr, s).map((p) => ({ x: p.y + j * Hc, y: p.x })))
        idx++
      }
    }
    cands.push({ o: 'across', perRow: lines, rows: per, length: maxLen, polys })
  }
  if (!cands.length) {
    return {
      feasible: false,
      message: `Dilim (dikiş payıyla ${(maxR - minL).toFixed(1)} × ${Hc.toFixed(1)} cm) ${W} cm enindeki ruloya hiçbir yönde sığmıyor.`,
    }
  }
  cands.sort((a, b) => a.length - b.length)
  const best = cands[0]!
  const waste = (1 - used / (W * best.length)) * 100
  return {
    feasible: true,
    orientation: best.o,
    perRow: best.perRow,
    rows: best.rows,
    lengthCm: best.length,
    usedAreaCm2: used,
    wastePct: waste,
    cost: f.pricePerM !== null ? (best.length / 100) * f.pricePerM : null,
    polys: best.polys,
  }
}

export interface CordInput {
  factor: number // × D0
  allowanceCm: number // bağlantı payı (düğüm/halka), kordon başına
}

export interface CordList { count: number; lengthCm: number; baseCm: number; totalM: number }

export function cordList(d0m: number, n: number, c: CordInput): CordList {
  const base = c.factor * d0m * 100
  const len = base + c.allowanceCm
  return { count: n, lengthCm: len, baseCm: base, totalM: (len * n) / 100 }
}
