// Paraşüt dilim (gore) kalıbı geometrisi. Saf TypeScript, tarayıcı/Node bağımsız.
//
// Model (hepsi bu dosyada kendi türetilmiştir):
//  - Kubbe, yüzey alanı nominal alana (S0 = πD0²/4) eşit bir küre kapağıdır.
//    Kapak yarı açısı φ için alan = 2πR²(1 − cos φ)  ->  R = D0 / (2·√(2(1 − cos φ))).
//    Yarım kürede φ = 90°, R = D0/(2√2).
//  - Meridyen dilimi, tepeden etek yönüne yay uzunluğu s boyunca
//    w(s) = (2πR/N)·sin(s/R) genişliğindedir. Tepe deliği (çap dv) için s0 = R·asin(dv/(2R)),
//    etek için s_end = R·φ.
//  - Düz kubbe: N kenarlı düzgün çokgen. Alan eşitliğinden apotem a = (D0/2)·√(π/(N·tan(π/N))).
//    Dilim, tepe noktasından a'ya uzanan ikizkenar üçgendir: w(y) = 2·y·tan(π/N).
//    Tepe deliği y0 = dv/2 seviyesinde kesilir (yamuk).
//
// Koordinatlar: x yatay (eksen = 0), y aşağı doğru dilim ekseni boyunca (y = 0 tepe deliği kenarı). Birim: cm.

export type Shape = 'hemisphere' | 'cap' | 'flat'
export type JoinStyle = 'miter' | 'bevel'

export interface Pt { x: number; y: number }

export interface GoreInput {
  d0: number // m, nominal çap
  shape: Shape
  capAngleDeg: number // küre kapağı yarı açısı (yalnızca shape = 'cap')
  n: number // dilim sayısı
  ventCm: number // tepe deliği çapı (cm)
  seam: { right: number; top: number; left: number; bottom: number } // dikiş payları (cm)
  hemCm: number // etek katlama payı (cm), alt dikiş payına eklenir
  join: JoinStyle
}

export type EdgeKind = 'top' | 'right' | 'bottom' | 'left'

export interface Gore {
  input: GoreInput
  /** Kubbe küresinin yarıçapı (cm); düz kubbede null. */
  sphereR: number | null
  /** Kapak yarı açısı (rad); düz kubbede null. */
  phi: number | null
  /** Düz kubbede apotem (cm). */
  apothem: number | null
  /** Nominal alan πD0²/4 (cm²). */
  nominalArea: number
  /** Tepe deliği kenarının dilim ekseni üzerindeki konumu (yay uzunluğu veya y, cm). */
  s0: number
  sEnd: number
  height: number // sEnd − s0
  /** Dikiş çizgisi (kalıp çizgisi) konturu, saat yönünde (ekranda: üstten sağa, aşağı, geri). */
  contour: Pt[]
  /** Her kenar için tür: edge[i] contour[i] -> contour[i+1]. */
  edges: EdgeKind[]
  /** Dikiş payı dahil kesim konturu. */
  cut: Pt[]
  widthTop: number
  widthBottom: number
}

export const MIN_N = 4
const SIDE_SEGMENTS = 96

const rad = (deg: number) => (deg * Math.PI) / 180

/** Küre yarıçapı (cm), nominal çaptan (m). */
export function sphereRadius(d0m: number, phi: number): number {
  const d = d0m * 100
  return d / (2 * Math.sqrt(2 * (1 - Math.cos(phi))))
}

/** Dilim genişliği w(s), küresel model. */
export function sphericalWidth(R: number, n: number, s: number): number {
  return ((2 * Math.PI * R) / n) * Math.sin(s / R)
}

/** Tepe deliği için dilim ekseni üzerindeki başlangıç s0. */
export function ventArc(R: number, ventCm: number): number {
  return R * Math.asin(Math.min(1, ventCm / (2 * R)))
}

export function polyArea(p: Pt[]): number {
  let a = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length]!
    a += p[i]!.x * q.y - q.x * p[i]!.y
  }
  return a / 2
}

export function polyPerimeter(p: Pt[]): number {
  let L = 0
  for (let i = 0; i < p.length; i++) {
    const q = p[(i + 1) % p.length]!
    L += Math.hypot(q.x - p[i]!.x, q.y - p[i]!.y)
  }
  return L
}

/**
 * Dışbükey kontura kenar başına farklı mesafeli dış ofset.
 * Komşu ofset doğrularının kesişimi (miter) alınır. `corner[i]` true ise i. köşede seçilen birleşim
 * (miter/bevel) uygulanır; false ise (ince bölütlü yan eğriler) her zaman miter.
 * Miter uzunluğu `miterLimit × ofset` değerini aşarsa bevel'e düşer.
 */
export function offsetConvex(
  pts: Pt[],
  dist: number[], // dist[i]: pts[i] -> pts[i+1] kenarının ofseti
  corner: boolean[], // corner[i]: pts[i] köşesinde birleşim stili uygulansın
  join: JoinStyle,
  miterLimit = 4,
): Pt[] {
  const n = pts.length
  // Yön: alan işaretine göre dış normal
  const sign = polyArea(pts) >= 0 ? 1 : -1
  const nx: number[] = []
  const ny: number[] = []
  for (let i = 0; i < n; i++) {
    const a = pts[i]!
    const b = pts[(i + 1) % n]!
    const dx = b.x - a.x
    const dy = b.y - a.y
    const len = Math.hypot(dx, dy) || 1
    // alan > 0 (saat yönü tersi, matematiksel yönelim): dış normal = (dy, -dx)
    nx.push((sign * dy) / len)
    ny.push((-sign * dx) / len)
  }
  const out: Pt[] = []
  for (let i = 0; i < n; i++) {
    const p = (i + n - 1) % n // önceki kenar
    const di = dist[p]!
    const dn = dist[i]!
    const v = pts[i]!
    // Önceki kenarın ofset noktası (v'den dik) ve sonraki kenarın ofset noktası
    const a: Pt = { x: v.x + nx[p]! * di, y: v.y + ny[p]! * di }
    const b: Pt = { x: v.x + nx[i]! * dn, y: v.y + ny[i]! * dn }
    // Kesişim: a + t·u = b + k·w; u, w kenar yönleri
    const ux = -ny[p]! * sign
    const uy = nx[p]! * sign
    const wx = -ny[i]! * sign
    const wy = nx[i]! * sign
    const det = ux * wy - uy * wx
    let m: Pt | null = null
    if (Math.abs(det) > 1e-9) {
      const t = ((b.x - a.x) * wy - (b.y - a.y) * wx) / det
      m = { x: a.x + t * ux, y: a.y + t * uy }
    }
    const useBevel = corner[i] && join === 'bevel'
    const tooLong = m && Math.hypot(m.x - v.x, m.y - v.y) > miterLimit * Math.max(di, dn, 1e-9)
    if (m && !(corner[i] && (useBevel || tooLong))) out.push(m)
    else {
      // bevel: iki ofset kenarın uç noktaları ayrı ayrı alınır
      out.push(a)
      if (Math.abs(a.x - b.x) > 1e-12 || Math.abs(a.y - b.y) > 1e-12) out.push(b)
    }
  }
  return out
}

/** Miter ofsette beklenen alan: A + P·d + d²·Σtan(dış_açı/2) (sabit d, dışbükey). */
export function expectedMiterArea(pts: Pt[], d: number): number {
  const n = pts.length
  const sign = polyArea(pts) >= 0 ? 1 : -1
  let sum = 0
  for (let i = 0; i < n; i++) {
    const a = pts[(i + n - 1) % n]!
    const b = pts[i]!
    const c = pts[(i + 1) % n]!
    const a1 = Math.atan2(b.y - a.y, b.x - a.x)
    const a2 = Math.atan2(c.y - b.y, c.x - b.x)
    let ext = (a2 - a1) * sign
    while (ext > Math.PI) ext -= 2 * Math.PI
    while (ext < -Math.PI) ext += 2 * Math.PI
    sum += Math.tan(ext / 2)
  }
  return Math.abs(polyArea(pts)) + polyPerimeter(pts) * d + d * d * sum
}

/** Dilim geometrisini üretir. Geçersiz girdide hata fırlatır (UI doğrulaması önceden yapar). */
export function buildGore(inp: GoreInput): Gore {
  const n = Math.round(inp.n)
  if (!(inp.d0 > 0)) throw new Error('Nominal çap pozitif olmalı.')
  if (n < MIN_N) throw new Error(`Dilim sayısı en az ${MIN_N} olmalı.`)
  const D = inp.d0 * 100
  const nominalArea = (Math.PI * D * D) / 4
  const top: Pt[] = [] // sağ yan, yukarıdan aşağı
  let sphereR: number | null = null
  let phi: number | null = null
  let apothem: number | null = null
  let s0: number
  let sEnd: number
  let half: (s: number) => number

  if (inp.shape === 'flat') {
    const alpha = Math.PI / n
    const a = (D / 2) * Math.sqrt(Math.PI / (n * Math.tan(alpha)))
    apothem = a
    s0 = inp.ventCm / 2
    sEnd = a
    half = (y) => y * Math.tan(alpha)
  } else {
    phi = inp.shape === 'hemisphere' ? Math.PI / 2 : rad(inp.capAngleDeg)
    sphereR = sphereRadius(inp.d0, phi)
    const R = sphereR
    if (inp.ventCm >= 2 * R * Math.sin(phi) - 1e-9) throw new Error('Tepe deliği kubbeden büyük olamaz.')
    s0 = ventArc(R, inp.ventCm)
    sEnd = R * phi
    half = (s) => sphericalWidth(R, n, s) / 2
  }
  if (!(sEnd > s0)) throw new Error('Tepe deliği dilim boyunu tüketiyor.')
  const height = sEnd - s0

  // Sağ yan eğri: yukarıdan aşağı. Düz kubbede yan kenarlar doğru, tek bölüt yeter.
  const seg = inp.shape === 'flat' ? 1 : SIDE_SEGMENTS
  for (let i = 0; i <= seg; i++) {
    const s = s0 + (height * i) / seg
    top.push({ x: half(s), y: s - s0 })
  }
  // Kontur (matematiksel eksende saat yönü ters olmayabilir; ofset işareti otomatik bulur):
  // sol-üst -> sağ-üst -> sağ yan (aşağı) -> sağ-alt -> sol-alt -> sol yan (yukarı)
  const right = top
  const contour: Pt[] = [{ x: -right[0]!.x, y: 0 }]
  const edges: EdgeKind[] = ['top']
  for (let i = 0; i < right.length; i++) {
    contour.push(right[i]!)
    if (i < right.length - 1) edges.push('right')
  }
  edges.push('bottom')
  for (let i = right.length - 1; i >= 0; i--) {
    contour.push({ x: -right[i]!.x, y: right[i]!.y })
    if (i > 0) edges.push('left')
  }
  // Son nokta (sol-üst) ilk noktayla çakışır -> kaldır; son kenar 'left'ten sol-üste dönüyor
  contour.pop()
  // kenar sayısı = köşe sayısı; sol yanın son kenarı sol-alt'tan sol-üst'e gider
  while (edges.length < contour.length) edges.push('left')
  while (edges.length > contour.length) edges.pop()

  // Köşe işaretleri: top/right, right/bottom, bottom/left, left/top birleşimleri
  const corner = contour.map((_, i) => edges[(i + edges.length - 1) % edges.length] !== edges[i])
  const dist = edges.map((e) => {
    const s = inp.seam
    if (e === 'top') return s.top
    if (e === 'right') return s.right
    if (e === 'left') return s.left
    return s.bottom + inp.hemCm
  })
  const cut = offsetConvex(contour, dist, corner, inp.join)

  return {
    input: inp,
    sphereR,
    phi,
    apothem,
    nominalArea,
    s0,
    sEnd,
    height,
    contour,
    edges,
    cut,
    widthTop: 2 * right[0]!.x,
    widthBottom: 2 * right[right.length - 1]!.x,
  }
}

/** Yarı genişlik fonksiyonu (dikiş çizgisi): y = 0 tepe deliği kenarı. */
export function halfWidthAt(g: Gore, y: number): number {
  const yy = Math.min(Math.max(y, 0), g.height)
  const s = g.s0 + yy
  const { sphereR: R, phi } = g
  if (R !== null && phi !== null) return sphericalWidth(R, g.input.n, s) / 2
  return s * Math.tan(Math.PI / g.input.n)
}

/** Sağ yan eğrinin uzunluğu (cm), dikiş çizgisinde. */
export function sideLength(g: Gore): number {
  let L = 0
  for (let i = 0; i < g.contour.length; i++) {
    if (g.edges[i] !== 'right') continue
    const a = g.contour[i]!
    const b = g.contour[(i + 1) % g.contour.length]!
    L += Math.hypot(b.x - a.x, b.y - a.y)
  }
  return L
}

export interface Station { y: number; width: number; cutWidth: number }

/** Her `stepCm` istasyonunda genişlik (tepe deliği kenarından), son istasyon = etek. */
export function stations(g: Gore, stepCm = 5): Station[] {
  const ys: number[] = []
  for (let y = 0; y < g.height - 1e-9; y += stepCm) ys.push(y)
  ys.push(g.height)
  return ys.map((y) => ({ y, width: 2 * halfWidthAt(g, y), cutWidth: cutWidthAt(g, y) }))
}

/** Dikiş payı dahil kesim konturunun y'deki toplam genişliği. */
export function cutWidthAt(g: Gore, y: number): number {
  const c = g.cut
  // y'de konturla kesişen x aralığını bul
  let xmin = Infinity
  let xmax = -Infinity
  for (let i = 0; i < c.length; i++) {
    const a = c[i]!
    const b = c[(i + 1) % c.length]!
    if ((a.y - y) * (b.y - y) > 0) continue
    if (Math.abs(b.y - a.y) < 1e-12) {
      xmin = Math.min(xmin, a.x, b.x)
      xmax = Math.max(xmax, a.x, b.x)
      continue
    }
    const t = (y - a.y) / (b.y - a.y)
    const x = a.x + t * (b.x - a.x)
    xmin = Math.min(xmin, x)
    xmax = Math.max(xmax, x)
  }
  return xmax - xmin
}

export interface GoreStats {
  area: number // dilim alanı, dikiş payı hariç (cm²)
  cutArea: number // dikiş payı dahil (cm²)
  seamPerimeter: number // dilim çevresi (dikiş çizgisi)
  sideLength: number
  totalSeamLength: number // N × yan kenar (her dikiş iki dilimi birleştirir)
  totalHemLength: number // N × etek kenarı
  totalVentEdge: number // N × tepe kenarı
  canopyArea: number // N × dilim alanı
  boundsW: number // kesim konturunun en geniş yeri
  boundsH: number
}

export function goreStats(g: Gore): GoreStats {
  const n = Math.round(g.input.n)
  const area = Math.abs(polyArea(g.contour))
  const side = sideLength(g)
  const xs = g.cut.map((p) => p.x)
  const ys = g.cut.map((p) => p.y)
  return {
    area,
    cutArea: Math.abs(polyArea(g.cut)),
    seamPerimeter: polyPerimeter(g.contour),
    sideLength: side,
    totalSeamLength: n * side,
    totalHemLength: n * g.widthBottom,
    totalVentEdge: n * g.widthTop,
    canopyArea: n * area,
    boundsW: Math.max(...xs) - Math.min(...xs),
    boundsH: Math.max(...ys) - Math.min(...ys),
  }
}

export interface Warning { level: 'warning' | 'error'; text: string }

export function goreWarnings(inp: GoreInput, g: Gore | null, rollWidthCm: number | null): Warning[] {
  const w: Warning[] = []
  if (inp.n < 6) w.push({ level: 'warning', text: `Dilim sayısı ${inp.n}: kubbe poligonlaşır, gerçek şişmiş şekil küreden belirgin sapar. Genelde en az 6–8 dilim önerilir.` })
  if (inp.ventCm > 0.2 * inp.d0 * 100) w.push({ level: 'warning', text: 'Tepe deliği nominal çapın %20’sinden büyük. Bu kadar büyük delik kubbenin şeklini ve sürüklenme katsayısını ciddi etkiler.' })
  if (g && rollWidthCm !== null) {
    const st = goreStats(g)
    if (st.boundsW > rollWidthCm && st.boundsH > rollWidthCm)
      w.push({ level: 'error', text: `Dilim (dikiş payıyla ${st.boundsW.toFixed(1)} × ${st.boundsH.toFixed(1)} cm) kumaş enine (${rollWidthCm} cm) hiçbir yönde sığmıyor. Daha geniş rulo, daha çok dilim veya daha küçük çap gerekir.` })
    else if (st.boundsW > rollWidthCm)
      w.push({ level: 'warning', text: `Dilim genişliği (${st.boundsW.toFixed(1)} cm) kumaş enini (${rollWidthCm} cm) aşıyor; dilim ekseni rulo enine dik yerleştirilecek.` })
  }
  return w
}
