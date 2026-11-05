// Çalıştırmak için (vitest projede kurulu değil):
//   npx vitest run tests/parachute.test.ts
import { describe, expect, it } from 'vitest'
import {
  computeStatic, isaAtmosphere, monteCarlo, requiredDiameter, sensitivity, simulateDescent,
} from '../app/utils/parachute'
import type { StaticInputs } from '../app/utils/parachute'
import { parseNumber } from '../app/utils/format'
import { defaultForm, parseForm } from '../app/utils/parachuteFields'

const base = (over: Partial<StaticInputs> = {}): StaticInputs => ({
  m: 4.05, mChute: 0, d: 0.8, cd: 0.8, h: 0, dT: 0, g: 9.807, proj: 1, holeD: 0, rhoFixed: 1.225, ...over,
})

describe('referans durumlar (ρ=1.225, Cd=0.8, g=9.807, izdüşüm=1)', () => {
  it.each([
    [14.4, 1.0, 19.16],
    [4.05, 0.8, 12.7],
    [14.1, 2.4, 7.9],
  ])('m=%f kg, d=%f m → v≈%f m/s', (m, d, expected) => {
    expect(Math.abs(computeStatic(base({ m, d })).v - expected)).toBeLessThan(0.02)
  })
})

describe('atmosfer', () => {
  it('h=0, dT=0 için ISA ρ ≈ 1.225', () => {
    expect(isaAtmosphere(0, 0).rho).toBeCloseTo(1.225, 3)
  })
  it('rakım arttıkça terminal hız artar', () => {
    const v = [0, 1000, 3000, 5000].map((h) => computeStatic(base({ rhoFixed: null, h })).v)
    for (let k = 1; k < v.length; k++) expect(v[k]!).toBeGreaterThan(v[k - 1]!)
  })
})

describe('ters boyutlandırma', () => {
  it('v → d_gerek gidiş-dönüşte d’yi geri verir', () => {
    const i = base({ m: 9.3, d: 1.7, cd: 0.9, proj: 0.8, rhoFixed: null, h: 1200 })
    const r = computeStatic(i)
    const d = requiredDiameter(r.totalMass, i.g, r.rho, i.cd, r.v, i.proj)
    expect(d).toBeCloseTo(i.d, 9)
  })
})

describe('dinamik simülasyon', () => {
  it('sabit ρ ile son hız terminal hıza yakınsar', () => {
    const i = base()
    const sim = simulateDescent({ inputs: i, v0: 0, h0: 500 })
    expect(Math.abs(sim.impactSpeed - computeStatic(i).v)).toBeLessThan(0.01)
    expect(sim.t95).not.toBeNull()
    expect(sim.totalTime).toBeGreaterThan(500 / sim.terminalSpeed)
  })
  it('ISA ρ(h) ile de yere çarpma hızı terminal hıza yakın', () => {
    const i = base({ rhoFixed: null })
    const sim = simulateDescent({ inputs: i, v0: 0, h0: 1000 })
    expect(Math.abs(sim.impactSpeed / computeStatic(i).v - 1)).toBeLessThan(0.01)
  })
  it('v0 > terminal ise yavaşlama bilgisi verir', () => {
    const sim = simulateDescent({ inputs: base(), v0: 60, h0: 800 })
    expect(sim.decel).not.toBeNull()
    expect(sim.decel!.distance).toBeGreaterThan(0)
  })
})

describe('duyarlılık', () => {
  it('v ∝ 1/d: +%10 çap → ≈ -%9.09 hız', () => {
    const row = sensitivity(base()).rows.find((r) => r.key === 'd')!
    expect(row.dPlusPct).toBeCloseTo((1 / 1.1 - 1) * 100, 6)
  })
})

describe('Monte Carlo', () => {
  const cfg = { n: 5000, seed: 7, sigmaM: 0.02, sigmaCd: 0.1, sigmaRho: 0.03, sigmaProj: 0.05, vLimit: 13 }
  it('aynı seed aynı sonucu verir', () => {
    expect(monteCarlo(base(), cfg)).toEqual(monteCarlo(base(), cfg))
  })
  it('farklı seed farklı sonuç verir', () => {
    expect(monteCarlo(base(), { ...cfg, seed: 8 }).mean).not.toBe(monteCarlo(base(), cfg).mean)
  })
  it('ortalama nominal değere yakın, histogram toplamı N', () => {
    const r = monteCarlo(base(), cfg)
    expect(Math.abs(r.mean / r.nominal - 1)).toBeLessThan(0.03)
    expect(r.hist.counts.reduce((a, b) => a + b, 0)).toBe(cfg.n)
    expect(r.p5).toBeLessThan(r.p95)
  })
})

describe('giriş ayrıştırma', () => {
  it('virgül ve nokta kabul edilir', () => {
    expect(parseNumber('0,8')).toBe(0.8)
    expect(parseNumber('0.8')).toBe(0.8)
    expect(parseNumber('abc')).toBeNull()
  })
  it('geçersiz değerler hata üretir', () => {
    const form = { ...defaultForm(), m: '-1', d: '', cd: 'x' }
    const { errors } = parseForm(form)
    expect(errors.m).toBeTruthy()
    expect(errors.d).toBeTruthy()
    expect(errors.cd).toBeTruthy()
  })
})
