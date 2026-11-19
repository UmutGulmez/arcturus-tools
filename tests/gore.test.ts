import { describe, expect, it } from 'vitest'
import {
  buildGore, expectedMiterArea, goreStats, goreWarnings, halfWidthAt, polyArea, polyPerimeter, sideLength, sphereRadius,
  sphericalWidth, stations, ventArc, type GoreInput,
} from '../app/utils/gore'

const base: GoreInput = {
  d0: 1.0, shape: 'hemisphere', capAngleDeg: 90, n: 8, ventCm: 10,
  seam: { right: 0, top: 0, left: 0, bottom: 0 }, hemCm: 0, join: 'miter',
}
const withIn = (o: Partial<GoreInput>): GoreInput => ({ ...base, ...o })

describe('küre geometrisi', () => {
  it('yarım kürede R = D0/(2√2) ve 2πR² = πD0²/4', () => {
    const R = sphereRadius(1, Math.PI / 2)
    expect(R).toBeCloseTo(100 / (2 * Math.SQRT2), 9)
    expect(2 * Math.PI * R * R).toBeCloseTo((Math.PI * 100 * 100) / 4, 6)
  })
  it('kapak açısı için alan nominal alana eşit kalır', () => {
    for (const deg of [45, 60, 90, 120, 150]) {
      const phi = (deg * Math.PI) / 180
      const R = sphereRadius(2.4, phi)
      expect(2 * Math.PI * R * R * (1 - Math.cos(phi))).toBeCloseTo((Math.PI * 240 * 240) / 4, 4)
    }
  })
  it('N × w(ekvator) = ekvator çevresi', () => {
    const R = sphereRadius(1, Math.PI / 2)
    expect(8 * sphericalWidth(R, 8, R * (Math.PI / 2))).toBeCloseTo(2 * Math.PI * R, 9)
  })
  it('tepe deliği: s0 = R·asin(dv/2R), o noktada w(s0)·N/(2π) = dv/2', () => {
    const R = sphereRadius(1, Math.PI / 2)
    const s0 = ventArc(R, 10)
    expect(s0).toBeCloseTo(R * Math.asin(10 / (2 * R)), 12)
    // delik çevresinin küre üzerindeki yarıçapı R·sin(s0/R) = dv/2
    expect(R * Math.sin(s0 / R)).toBeCloseTo(5, 9)
    expect((8 * sphericalWidth(R, 8, s0)) / (2 * Math.PI)).toBeCloseTo(5, 9)
  })
})

describe('dilim alanı', () => {
  it('N × dilim alanı ≈ küre kapağı bölge alanı (tolerans %1)', () => {
    const g = buildGore(base)
    const R = g.sphereR!
    const zone = 2 * Math.PI * R * R * (Math.cos(g.s0 / R) - Math.cos(g.phi!))
    expect(goreStats(g).canopyArea / zone).toBeGreaterThan(0.99)
    expect(goreStats(g).canopyArea / zone).toBeLessThan(1.01)
  })
  it('tepe deliği yokken yarım kürede toplam alan ≈ πD0²/4', () => {
    const g = buildGore(withIn({ ventCm: 0 }))
    expect(goreStats(g).canopyArea / g.nominalArea).toBeCloseTo(1, 2)
  })
  it('küre kapağı (120°) için de alan eşleşir', () => {
    const g = buildGore(withIn({ shape: 'cap', capAngleDeg: 120, ventCm: 0, n: 12 }))
    expect(goreStats(g).canopyArea / g.nominalArea).toBeCloseTo(1, 2)
  })
  it('düz kubbede N × alan = πD0²/4 (delik yok)', () => {
    const g = buildGore(withIn({ shape: 'flat', ventCm: 0 }))
    expect(goreStats(g).canopyArea / g.nominalArea).toBeCloseTo(1, 9)
  })
  it('düz kubbe: w(y) = 2·y·tan(π/N)', () => {
    const g = buildGore(withIn({ shape: 'flat', ventCm: 6 }))
    expect(2 * halfWidthAt(g, 0)).toBeCloseTo(2 * 3 * Math.tan(Math.PI / 8), 9)
    expect(g.widthBottom).toBeCloseTo(2 * g.apothem! * Math.tan(Math.PI / 8), 9)
  })
  it('yükseklik ve genişlikler istasyonlarda tutarlı', () => {
    const g = buildGore(base)
    const st = stations(g, 5)
    expect(st[0]!.y).toBe(0)
    expect(st.at(-1)!.y).toBeCloseTo(g.height, 9)
    expect(st.at(-1)!.width).toBeCloseTo(g.widthBottom, 6)
    expect(st[1]!.y).toBe(5)
  })
})

describe('dikiş payı ofseti', () => {
  it('sabit pay + miter: alan A + P·d + d²·Σtan(açı/2) ile tutar', () => {
    const d = 1.5
    const g = buildGore(withIn({ seam: { right: d, top: d, left: d, bottom: d } }))
    const expected = expectedMiterArea(g.contour, d)
    expect(Math.abs(polyArea(g.cut))).toBeCloseTo(expected, 3)
    expect(Math.abs(polyArea(g.cut))).toBeGreaterThan(Math.abs(polyArea(g.contour)) + polyPerimeter(g.contour) * d)
  })
  it('bevel alanı miter alanından küçük, düz ofsetten (A + P·d) büyük', () => {
    const d = 2
    const seam = { right: d, top: d, left: d, bottom: d }
    const m = buildGore(withIn({ seam, join: 'miter' }))
    const b = buildGore(withIn({ seam, join: 'bevel' }))
    const A = Math.abs(polyArea(m.contour))
    expect(Math.abs(polyArea(b.cut))).toBeLessThan(Math.abs(polyArea(m.cut)))
    expect(Math.abs(polyArea(b.cut))).toBeGreaterThan(A + polyPerimeter(m.contour) * d)
  })
  it('payı sıfır olunca kesim = dikiş çizgisi', () => {
    const g = buildGore(base)
    expect(Math.abs(polyArea(g.cut))).toBeCloseTo(Math.abs(polyArea(g.contour)), 9)
  })
  it('ayrı pay: yalnızca sağ kenar kalınlaşır', () => {
    const g0 = buildGore(base)
    const g = buildGore(withIn({ seam: { right: 2, top: 0, left: 0, bottom: 0 } }))
    const w0 = goreStats(g0).boundsW
    expect(goreStats(g).boundsW).toBeCloseTo(w0 + 2, 1)
  })
  it('etek katlama payı alt kenarı uzatır', () => {
    const g0 = buildGore(base)
    const g = buildGore(withIn({ hemCm: 3 }))
    expect(goreStats(g).boundsH).toBeCloseTo(goreStats(g0).boundsH + 3, 6)
  })
  it('miter çok uzarsa bevel’e düşer (dar tepe açısı)', () => {
    const g = buildGore(withIn({ shape: 'flat', n: 4, ventCm: 0, seam: { right: 1, top: 1, left: 1, bottom: 1 } }))
    expect(g.cut.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true)
  })
})

describe('uyarılar ve doğrulama', () => {
  it('N<6, büyük delik ve geniş dilim uyarıları', () => {
    const inp = withIn({ n: 5, ventCm: 25 })
    const g = buildGore(inp)
    const w = goreWarnings(inp, g, 20)
    expect(w.some((x) => /poligonla/.test(x.text))).toBe(true)
    expect(w.some((x) => /%20/.test(x.text))).toBe(true)
  })
  it('hiçbir yönde sığmayan dilim hata verir', () => {
    const inp = withIn({ d0: 3, n: 4 })
    const g = buildGore(inp)
    expect(goreWarnings(inp, g, 20).some((x) => x.level === 'error')).toBe(true)
  })
  it('geçersiz girdiler hata fırlatır', () => {
    expect(() => buildGore(withIn({ n: 3 }))).toThrow()
    expect(() => buildGore(withIn({ d0: 0 }))).toThrow()
    expect(() => buildGore(withIn({ ventCm: 200 }))).toThrow()
  })
  it('yan kenar uzunluğu yaklaşık yay uzunluğundan büyük (eğri)', () => {
    const g = buildGore(base)
    expect(sideLength(g)).toBeGreaterThan(g.height)
  })
})
