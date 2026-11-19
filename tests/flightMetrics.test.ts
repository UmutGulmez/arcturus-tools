// Çalıştırmak için: npx vitest run tests/flightMetrics.test.ts
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { computeMetrics, DEFAULT_THRESHOLDS, evaluateThresholds, statusMax, statusMin, trapz, valueAt } from '../app/utils/flightMetrics'
import { parseFlightText } from '../app/utils/flightParser'

const sample = parseFlightText(readFileSync(new URL('./fixtures/ornek-ucus.csv', import.meta.url), 'utf8'))
const m = computeMetrics(sample)

describe('trapz / valueAt', () => {
  it('eşit olmayan zaman adımında impuls', () => {
    // 0..1 s sabit 10 N, 1..3 s 10 -> 0 N rampa: 10 + 10 = 20 Ns
    expect(trapz([0, 0.25, 1, 3], [10, 10, 10, 0])).toBeCloseTo(20, 10)
    // NaN içeren aralık atlanır
    expect(trapz([0, 1, 2], [4, NaN, 4])).toBe(0)
  })
  it('doğrusal ara değer ve NaN davranışı', () => {
    expect(valueAt([0, 1, 3], [0, 10, 30], 2)).toBeCloseTo(20)
    expect(valueAt([0, 1], [NaN, 5], 0.5)).toBe(5)
    expect(valueAt([0, 1], [NaN, NaN], 0.5)).toBeNull()
    expect(valueAt([0, 1], undefined, 0.5)).toBeNull()
  })
})

describe('örnek uçuş metrikleri', () => {
  it('temel değerler makul ve tutarlı', () => {
    console.info(JSON.stringify({ ...m, phases: m.phases.map((p) => `${p.label} ${p.t0}-${p.t1}`) }, null, 1))
    expect(m.apogee!.t).toBeCloseTo(40.006, 3)
    expect(m.apogee!.alt).toBeGreaterThan(1000)
    expect(m.railExitT).toBeCloseTo(0.389, 3)
    expect(m.burnout).toBeCloseTo(4.613, 3)
    expect(m.burnoutFromEvent).toBe(true)
    expect(m.burnTime).toBeCloseTo(4.613, 3)
    expect(m.flightTime).toBeCloseTo(358.114, 3)
    expect(m.chutes).toHaveLength(2)
    expect(m.chutes[1]!.warnSpeed).toBe(25.3)
    expect(m.chutes[1]!.name).toBe('Ana Paraşüt')
    expect(m.launchMassKg).toBeCloseTo(28.23, 6)
    expect(m.burnoutMassKg!).toBeLessThan(m.launchMassKg!)
    expect(m.phases.map((p) => p.key)).toEqual(['rail', 'powered', 'coast', 'descent', 'main'])
  })
  it('impuls, ortalama itki ve Isp birbiriyle tutarlı', () => {
    expect(m.totalImpulse!).toBeGreaterThan(1000)
    expect(m.avgThrust! * m.burnTime!).toBeLessThanOrEqual(m.totalImpulse! * 1.0001)
    expect(m.peakThrust!).toBeGreaterThan(m.avgThrust!)
    expect(m.ispApprox!).toBeGreaterThan(100)
    expect(m.ispApprox!).toBeLessThan(400)
  })
  it('stabilite: pist NaN dışarıda, min ≤ raf çıkışı değeri', () => {
    expect(m.stabMinAll!.v).not.toBeNaN()
    expect(m.stabMinBurn!.v).toBeLessThanOrEqual(m.stabRail!)
    expect(m.stabCheck!.rows).toBeGreaterThan(1000)
    expect(m.stabCheck!.maxDiff).toBeLessThan(0.05)
  })
  it('hücum açısı düşük hızlı satırları dışlar', () => {
    const raw = Math.max(...Array.from(sample.cols.aoa!).filter((v) => !Number.isNaN(v)))
    expect(raw).toBeGreaterThanOrEqual(73)
    expect(m.maxAoa!.v).toBeLessThan(raw)
  })
  it('dinamik basınç ρ g/cm³ → kg/m³ dönüşümü', () => {
    const i = sample.cols.time!.findIndex((x) => x === m.maxQ!.t)
    const rho = sample.cols.rho![i]! * 1000
    expect(m.maxQ!.q).toBeCloseTo(0.5 * rho * sample.cols.vTotal![i]! ** 2, 6)
    expect(m.maxQ!.q).toBeGreaterThan(1000) // Pa mertebesi
  })
  it('iniş hızı ve yanal sürüklenme', () => {
    expect(m.landingSpeed!).toBeGreaterThan(1)
    expect(m.landingSpeed!).toBeLessThan(15)
    expect(m.driftEnd!.dist).toBeGreaterThan(0)
  })
})

describe('yedek (olaysız) tespit', () => {
  const t = ['# Time (s),Altitude (m),Thrust (N),Total velocity (m/s),Vertical velocity (m/s)']
  const rows = [[0, 0, 0], [0.1, 1, 100], [0.5, 20, 100], [1, 60, 100], [1.5, 90, 0], [2, 100, 0], [3, 80, 0], [4, 0, 0], [5, 0, 0]]
  rows.forEach(([a, b, c]) => t.push(`${a},${b},${c},${(b as number) / 2},${-(b as number) / 4}`))
  const d = parseFlightText(t.join('\n'))
  const mm = computeMetrics(d)
  it('zirve, yanma sonu, yere çarpma', () => {
    expect(mm.apogee).toEqual({ alt: 100, t: 2 })
    expect(mm.burnout).toBe(1.5)
    expect(mm.burnoutFromEvent).toBe(false)
    expect(mm.flightTime).toBe(4) // irtifanın apogee sonrası ilk ≤ 0 anı; başlangıçtaki 0 sayılmaz
    expect(mm.fallbacks.length).toBe(3)
    expect(mm.totalImpulse!).toBeCloseTo(0.5 * 100 * 0.1 + 100 * 0.4 + 100 * 0.5 + 0.5 * 100 * 0.5, 6)
    expect(mm.railExitSpeed).toBeNull()
    expect(mm.stabMinAll).toBeNull()
  })
})

describe('eşikler', () => {
  it('yeşil/sarı/kırmızı', () => {
    expect(statusMin(1.6, 1.5, 1)).toBe('ok')
    expect(statusMin(1.2, 1.5, 1)).toBe('warn')
    expect(statusMin(0.9, 1.5, 1)).toBe('crit')
    expect(statusMin(5, null, null)).toBe('none')
    expect(statusMin(null, 1.5, 1)).toBe('none')
    expect(statusMax(9, null)).toBe('none')
    expect(statusMax(9, 8)).toBe('crit')
  })
  it('örnek dosyada rapor üretir', () => {
    const r = evaluateThresholds(m, DEFAULT_THRESHOLDS)
    expect(r.landing).toBe('none')
    expect(['ok', 'warn', 'crit']).toContain(r.stabRail)
  })
})

import { buildKpis, fmtKpi, kpiCsv } from '../app/utils/flightKpi'
describe('KPI üretimi', () => {
  it('birim anahtarları değeri dönüştürür', () => {
    const a = buildKpis(m, DEFAULT_THRESHOLDS, { speed: 'ms', acc: 'ms2' })
    const b = buildKpis(m, DEFAULT_THRESHOLDS, { speed: 'kmh', acc: 'g' })
    expect(b.find((k) => k.id === 'maxVel')!.value).toBeCloseTo(a.find((k) => k.id === 'maxVel')!.value! * 3.6, 6)
    expect(b.find((k) => k.id === 'maxAcc')!.unit).toBe('g')
    expect(b.find((k) => k.id === 'maxAcc')!.value).toBeCloseTo(m.maxAccelG!.v, 6)
  })
  it('raf çıkışı eşiği durum renklendirir (örnekte 38 m/s ≥ 20; stabilite 1,11 < 1,5)', () => {
    const k = buildKpis(m, DEFAULT_THRESHOLDS, { speed: 'ms', acc: 'ms2' })
    expect(k.find((x) => x.id === 'rail')!.status).toBe('ok')
    expect(k.find((x) => x.id === 'stabRail')!.status).toBe('warn')
    expect(k.find((x) => x.id === 'landing')!.status).toBe('none')
  })
  it('CSV dışa aktarım ve sayı biçimi', () => {
    const k = buildKpis(m, DEFAULT_THRESHOLDS, { speed: 'ms', acc: 'ms2' })
    const csv = kpiCsv([{ name: 'A', kpis: k }])
    expect(csv.split('\r\n')[0]).toBe('Grup,Gösterge,Birim,A')
    expect(csv).toContain('Zirve irtifası (AGL)')
    expect(fmtKpi({ value: 1234.5, digits: 1 })).toBe('1.234,5')
  })
})
