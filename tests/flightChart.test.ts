// Çalıştırmak için: npx vitest run tests/flightChart.test.ts
import { describe, expect, it } from 'vitest'
import { cumTrapz, derivative, dispUnit, evenIdx, pickPts, sampleIdx } from '../app/utils/flightChart'

describe('LTTB örnekleme', () => {
  const n = 50_000
  const x = Float64Array.from({ length: n }, (_, i) => i * 0.01)
  const y = Float64Array.from({ length: n }, (_, i) => Math.sin(i / 300) * 100 + (i === 25_000 ? 400 : 0))
  it('~2000 noktaya indirger, uç noktaları ve zirveyi korur', () => {
    const idx = sampleIdx(x, y, 2000)
    expect(idx.length).toBeLessThanOrEqual(2100)
    expect(idx[0]).toBe(0)
    expect(idx[idx.length - 1]).toBe(n - 1)
    expect(idx).toContain(25_000)
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
  })
  it('NaN boşluğu null olarak korunur, 0 olmaz', () => {
    const yy = Float64Array.from({ length: 100 }, (_, i) => (i >= 40 && i < 60 ? NaN : i))
    const xx = Float64Array.from({ length: 100 }, (_, i) => i)
    const idx = sampleIdx(xx, yy, 30)
    const pts = pickPts(xx, yy, idx)
    expect(pts.some((p) => p[1] === null)).toBe(true)
    expect(pts.some((p) => p[1] === 0 && p[0] !== 0)).toBe(false)
    expect(pts.filter((p) => p[0] >= 40 && p[0] < 60 && p[1] !== null)).toHaveLength(0)
  })
  it('küçük veri olduğu gibi kalır', () => {
    expect(sampleIdx([0, 1, 2], [1, 2, 3], 2000)).toEqual([0, 1, 2])
    expect(evenIdx(5, 2000)).toEqual([0, 1, 2, 3, 4])
  })
})

describe('türev ve birikimli integral', () => {
  it('türev doğrusal seride sabittir', () => {
    const t = Float64Array.from({ length: 200 }, (_, i) => i * 0.01)
    const y = t.map((v) => -3 * v)
    const dy = derivative(t, y, 0.1)
    expect(dy[100]).toBeCloseTo(-3, 6)
  })
  it('cumTrapz eşit olmayan adımda doğru', () => {
    const c = cumTrapz([0, 1, 3], [2, 2, 2])
    expect(c[2]).toBeCloseTo(6)
  })
})

describe('birim dönüşümü', () => {
  it('hız ve ivme', () => {
    expect(dispUnit('vTotal', 'm/s', { speed: 'kmh', acc: 'ms2' })).toEqual({ scale: 3.6, unit: 'km/h' })
    expect(dispUnit('aTotal', 'm/s²', { speed: 'ms', acc: 'g' }).unit).toBe('g')
    expect(dispUnit('mass', 'g', { speed: 'ms', acc: 'ms2' })).toEqual({ scale: 0.001, unit: 'kg' })
    expect(dispUnit('alt', 'm', { speed: 'kmh', acc: 'g' })).toEqual({ scale: 1, unit: 'm' })
  })
})
