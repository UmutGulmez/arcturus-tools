// Çalıştırmak için: npx vitest run tests/pcb.test.ts
import { describe, expect, it } from 'vitest'
import { maxCurrent, traceResistance, traceWarnings, widthForCurrent, widthCurrentCurve } from '../app/utils/pcbTrace'
import { barrelAreaMm2, viaCountForPower, viaCurrent, viaInductanceNh, viaThermal } from '../app/utils/pcbVia'
import {
  microstrip, microstripDiff, stripline, widthForZ0Microstrip, widthForZ0Stripline, widthForZdiffMicrostrip,
} from '../app/utils/pcbImpedance'
import {
  E24, E96, bestDividers, crystalLoadCap, dividerVout, junctionTemp, lcCapacitor, lcImpedance, lcInductor, lcResonance,
  rcCapacitor, rcCutoff, rcResistor, seriesValues, shunt,
} from '../app/utils/pcbCircuit'
import { checkNum, milToMm, mmToMil, sig, umToOz, ozToUm } from '../app/utils/pcbUnits'

const rel = (a: number, b: number) => Math.abs(a - b) / Math.abs(b)

describe('birimler', () => {
  it('1 oz = 35 µm = 1,378 mil; mil↔mm', () => {
    expect(ozToUm(1)).toBe(35)
    expect(umToOz(70)).toBe(2)
    expect(35 / 1000 / 0.0254).toBeCloseTo(1.378, 3)
    expect(mmToMil(milToMm(12.5))).toBeCloseTo(12.5, 10)
    expect(milToMm(1000)).toBeCloseTo(25.4, 10)
  })
  it('sig ve checkNum', () => {
    expect(sig(0.30012, 3)).toBe('0,300')
    expect(sig(1234.5, 3)).toBe('1.230')
    expect(checkNum('', 'X').err).toMatch(/değer girin/)
    expect(checkNum('-1', 'X', { min: 0, minExclusive: true }).err).toMatch(/büyük/)
    expect(checkNum('0', 'X', { min: 0, minExclusive: true }).err).not.toBeNull()
    expect(checkNum('1,5', 'X', { min: 0 }).v).toBe(1.5)
    expect(checkNum('abc', 'X').err).toMatch(/sayı/)
  })
})

describe('iz genişliği (IPC-2221)', () => {
  const base = { deltaT: 10, copperUm: 35, layer: 'external' as const }
  it('1 oz, ΔT 10, 1 A dış → ≈ 11,8 mil / 0,30 mm (±3%)', () => {
    const r = widthForCurrent({ ...base, currentA: 1 })
    expect(rel(r.widthMil, 11.8)).toBeLessThan(0.03)
    expect(rel(r.widthMm, 0.30)).toBeLessThan(0.03)
  })
  it('3 A → ≈ 53,8 mil / 1,37 mm (±3%)', () => {
    const r = widthForCurrent({ ...base, currentA: 3 })
    expect(rel(r.widthMil, 53.8)).toBeLessThan(0.03)
    expect(rel(r.widthMm, 1.37)).toBeLessThan(0.03)
  })
  it('gidiş-dönüş: genişlik → akım → genişlik', () => {
    for (const layer of ['external', 'internal'] as const)
      for (const [i, dT, cu] of [[0.5, 10, 17.5], [2, 20, 35], [7, 45, 70], [20, 100, 105]] as const) {
        const w = widthForCurrent({ currentA: i, deltaT: dT, copperUm: cu, layer }).widthMm
        const back = maxCurrent({ widthMm: w, deltaT: dT, copperUm: cu, layer }).currentA
        expect(rel(back, i)).toBeLessThan(1e-9)
        expect(rel(widthForCurrent({ currentA: back, deltaT: dT, copperUm: cu, layer }).widthMm, w)).toBeLessThan(1e-9)
      }
  })
  it('iç katman aynı akım için dış katmandan daha geniş (k 0,024 < 0,048)', () => {
    const a = widthForCurrent({ ...base, currentA: 2 }).widthMm
    const b = widthForCurrent({ ...base, layer: 'internal', currentA: 2 }).widthMm
    expect(b).toBeGreaterThan(a)
  })
  it('uyarılar: aralık dışı', () => {
    expect(traceWarnings({ deltaT: 5, copperUm: 35, currentA: 1, widthMm: 1 }).length).toBe(1)
    expect(traceWarnings({ deltaT: 20, copperUm: 35, currentA: 1, widthMm: 1 }).length).toBe(0)
    expect(traceWarnings({ deltaT: 20, copperUm: 200, currentA: 40, widthMm: 12 }).length).toBe(3)
  })
  it('eğri: monoton artan, sınırlar', () => {
    const c = widthCurrentCurve(35, 10, 5)
    expect(c.length).toBe(60)
    for (let k = 1; k < c.length; k++) expect(c[k]!.external).toBeGreaterThan(c[k - 1]!.external)
    expect(c[0]!.external).toBeGreaterThan(c[0]!.internal)
  })
})

describe('iz direnci', () => {
  it('1 oz, 0,3 mm, 100 mm, 20 °C → ≈ 0,164 Ω (±2%)', () => {
    const r = traceResistance({ lengthMm: 100, widthMm: 0.3, copperUm: 35, tempC: 20, currentA: 1 })
    expect(rel(r.r20, 0.164)).toBeLessThan(0.02)
    expect(r.vDrop).toBeCloseTo(r.rT, 12)
    expect(r.powerW).toBeCloseTo(r.rT, 12)
  })
  it('sıcaklık katsayısı: 100 °C → ×1,3144', () => {
    const r = traceResistance({ lengthMm: 100, widthMm: 0.3, copperUm: 35, tempC: 100, currentA: 2 })
    expect(r.rT / r.r20).toBeCloseTo(1 + 0.00393 * 80, 10)
    expect(r.powerW).toBeCloseTo(4 * r.rT, 10)
  })
})

describe('via', () => {
  it('ısıl direnç: 0,3 mm, 25 µm, 1,6 mm → ≈ 190 K/W (±3%)', () => {
    const r = viaThermal({ holeMm: 0.3, platingUm: 25, lengthMm: 1.6, n: 1 })
    expect(rel(r.single, 190)).toBeLessThan(0.03)
  })
  it('paralel: R/N', () => {
    const r = viaThermal({ holeMm: 0.3, platingUm: 25, lengthMm: 1.6, n: 5 })
    expect(r.parallel).toBeCloseTo(r.single / 5, 10)
  })
  it('kesit alanı π(D−t)t', () => {
    expect(barrelAreaMm2(0.3, 25)).toBeCloseTo(Math.PI * 0.275 * 0.025, 10)
  })
  it('via akımı: aynı alanlı izle tutarlı; dış > iç', () => {
    const e = viaCurrent({ holeMm: 0.3, platingUm: 25, deltaT: 10, layer: 'external' })
    const i = viaCurrent({ holeMm: 0.3, platingUm: 25, deltaT: 10, layer: 'internal' })
    expect(e.currentA).toBeGreaterThan(i.currentA)
    expect(e.currentA).toBeGreaterThan(0.5)
    expect(e.currentA).toBeLessThan(5)
    // geri: bu akım için gereken alan, namlu alanıdır
    expect(e.areaMil2).toBeCloseTo(e.areaMm2 / 0.0254 ** 2, 8)
  })
  it('via sayısı: N·ΔT ≥ P·R_tek ve N−1 yetmez', () => {
    const p = { powerW: 2, deltaTK: 10, holeMm: 0.3, platingUm: 25, lengthMm: 1.6 }
    const { single, count } = viaCountForPower(p)
    expect(count * p.deltaTK).toBeGreaterThanOrEqual(p.powerW * single - 1e-9)
    expect((count - 1) * p.deltaTK).toBeLessThan(p.powerW * single)
  })
  it('Johnson endüktansı: h=1,6 mm, d=0,3 mm ≈ 1,30 nH (elle: 5,08·0,063·(ln 21,33 + 1))', () => {
    expect(viaInductanceNh(1.6, 0.3)).toBeCloseTo(1.30, 2)
  })
})

describe('empedans', () => {
  const fr4 = { hMm: 1.6, tMm: 0.035, er: 4.4 }
  it('mikroşerit 50 Ω hedef → ≈ 3,0 mm (±5%) ve geri tutarlı', () => {
    const w = widthForZ0Microstrip(50, fr4.hMm, fr4.tMm, fr4.er)!
    expect(rel(w, 3.0)).toBeLessThan(0.05)
    expect(microstrip({ wMm: w, ...fr4 }).z0).toBeCloseTo(50, 6)
  })
  it('çapraz doğrulama: IPC-2141 mikroşerit formülü ile ±3% (0,3 < w/h < 2)', () => {
    for (const w of [0.6, 1.0, 1.6, 2.4, 3.0]) {
      const ipc = (87 / Math.sqrt(4.4 + 1.41)) * Math.log((5.98 * 1.6) / (0.8 * w + 0.035))
      expect(rel(microstrip({ wMm: w, ...fr4 }).z0, ipc)).toBeLessThan(0.03)
    }
  })
  it('t → 0 sınırı, bilinen değer: εr=4,4, W/h=2 → eeff≈3,3; efektif εr 1…εr arası', () => {
    const r = microstrip({ wMm: 3.2, hMm: 1.6, tMm: 0, er: 4.4 })
    expect(r.eeff).toBeGreaterThan(3.2)
    expect(r.eeff).toBeLessThan(3.5)
    expect(r.z0).toBeGreaterThan(44)
    expect(r.z0).toBeLessThan(50)
  })
  it('gecikme = √eeff/c ≈ 6,1 ps/mm (FR-4 mikroşerit)', () => {
    const r = microstrip({ wMm: 3.0, ...fr4 })
    expect(r.delayPsPerMm).toBeCloseTo(Math.sqrt(r.eeff) / 0.299792458, 8)
    expect(r.delayPsPerMm).toBeGreaterThan(5.5)
    expect(r.delayPsPerMm).toBeLessThan(6.8)
  })
  it('kalın bakır Z0\'ı düşürür; Z0 genişlikle azalır', () => {
    const a = microstrip({ wMm: 1, hMm: 0.2, tMm: 0.0175, er: 4.4 }).z0
    const b = microstrip({ wMm: 1, hMm: 0.2, tMm: 0.07, er: 4.4 }).z0
    expect(b).toBeLessThan(a)
    expect(microstrip({ wMm: 2, ...fr4 }).z0).toBeLessThan(microstrip({ wMm: 1, ...fr4 }).z0)
  })
  it('diferansiyel: s→∞ ⇒ 2·Z0; s küçülünce Zdiff azalır; hedef Zdiff gidiş-dönüş', () => {
    const z0 = microstrip({ wMm: 0.3, hMm: 0.2, tMm: 0.035, er: 4.4 }).z0
    expect(microstripDiff({ wMm: 0.3, hMm: 0.2, tMm: 0.035, er: 4.4, sMm: 1000 })).toBeCloseTo(2 * z0, 6)
    const near = microstripDiff({ wMm: 0.3, hMm: 0.2, tMm: 0.035, er: 4.4, sMm: 0.1 })
    const far = microstripDiff({ wMm: 0.3, hMm: 0.2, tMm: 0.035, er: 4.4, sMm: 0.5 })
    expect(near).toBeLessThan(far)
    const w = widthForZdiffMicrostrip(100, 0.15, 0.2, 0.035, 4.4)!
    expect(microstripDiff({ wMm: w, hMm: 0.2, tMm: 0.035, er: 4.4, sMm: 0.15 })).toBeCloseTo(100, 5)
  })
  it('stripline: IPC-2141 hesabı ve gidiş-dönüş', () => {
    const r = stripline({ wMm: 0.2, bMm: 0.4, tMm: 0.035, er: 4.4 })
    expect(r.z0).toBeCloseTo((60 / Math.sqrt(4.4)) * Math.log((4 * 0.4) / (0.67 * Math.PI * (0.16 + 0.035))), 10)
    expect(r.delayPsPerMm).toBeCloseTo(Math.sqrt(4.4) / 0.299792458, 8)
    const w = widthForZ0Stripline(50, 0.8, 0.035, 4.4)!
    expect(stripline({ wMm: w, bMm: 0.8, tMm: 0.035, er: 4.4 }).z0).toBeCloseTo(50, 6)
  })
  it('ulaşılamayan hedef null döner', () => {
    expect(widthForZ0Microstrip(1, 1.6, 0.035, 4.4)).toBeNull()
    expect(widthForZ0Microstrip(500, 1.6, 0.035, 4.4)).toBeNull()
  })
})

describe('ısıl', () => {
  it('Tj = Ta + P·RθJA, marj, P_max', () => {
    const r = junctionTemp({ powerW: 1.5, taC: 40, rthJA: 35, tjMaxC: 125 })
    expect(r.tj).toBeCloseTo(92.5, 10)
    expect(r.margin).toBeCloseTo(32.5, 10)
    expect(r.pMax).toBeCloseTo(85 / 35, 10)
    expect(r.ok).toBe(true)
    expect(junctionTemp({ powerW: 3, taC: 40, rthJA: 35, tjMaxC: 125 }).ok).toBe(false)
  })
})

describe('devre yardımcıları', () => {
  it('E24: 24, E96: 96 değer, artan ve 10^(i/n) ile ±%5 uyumlu (E24 elle yuvarlanmıştır)', () => {
    expect(E24.length).toBe(24)
    expect(E96.length).toBe(96)
    for (const [s, n] of [[E24, 24], [E96, 96]] as const)
      s.forEach((v, i) => {
        if (i) expect(v).toBeGreaterThan(s[i - 1]!)
        expect(rel(v, 10 ** (i / n))).toBeLessThan(0.05)
      })
    for (let i = 0; i < 96; i++) expect(rel(E96[i]!, 10 ** (i / 96))).toBeLessThan(0.006)
  })
  it('seriesValues dekad sınırları', () => {
    const v = seriesValues('E24', 1000, 10000)
    expect(v[0]).toBe(1000)
    expect(v.at(-1)).toBe(10000)
    expect(v.length).toBe(25)
  })
  it('bölücü: 3,3 V, Vref 0,8 V, E96 → hata %1 altı, tekrarsız ve sıralı', () => {
    const r = bestDividers({ vout: 3.3, vref: 0.8, series: 'E96', rMin: 1000, rMax: 1e6 })
    expect(r.length).toBe(5)
    expect(new Set(r.map((x) => (x.r1 / x.r2).toPrecision(9))).size).toBe(5)
    expect(Math.abs(r[0]!.errPct)).toBeLessThan(1)
    expect(r[0]!.vout).toBeCloseTo(dividerVout(0.8, r[0]!.r1, r[0]!.r2), 12)
    for (let i = 1; i < r.length; i++) expect(Math.abs(r[i]!.errPct)).toBeGreaterThanOrEqual(Math.abs(r[i - 1]!.errPct) - 1e-12)
  })
  it('E24 hatası E96\'dan büyük veya eşit', () => {
    const a = bestDividers({ vout: 5, vref: 1.23, series: 'E24', rMin: 1000, rMax: 1e5 })[0]!
    const b = bestDividers({ vout: 5, vref: 1.23, series: 'E96', rMin: 1000, rMax: 1e5 })[0]!
    expect(Math.abs(a.errPct)).toBeGreaterThanOrEqual(Math.abs(b.errPct))
  })
  it('kristal: CL=12 pF, Cstray=3 pF → 18 pF', () => {
    expect(crystalLoadCap(12e-12, 3e-12)).toBeCloseTo(18e-12, 20)
  })
  it('RC: 1 kΩ, 100 nF → 1591,5 Hz ve üç yön tutarlı', () => {
    const fc = rcCutoff(1000, 100e-9)
    expect(fc).toBeCloseTo(1591.549, 2)
    expect(rcResistor(fc, 100e-9)).toBeCloseTo(1000, 6)
    expect(rcCapacitor(fc, 1000)).toBeCloseTo(100e-9, 15)
  })
  it('LC: 10 µH, 10 µF → 15,9155 kHz; tersler; Z0 = 1 Ω', () => {
    const f = lcResonance(10e-6, 10e-6)
    expect(f).toBeCloseTo(15915.49, 1)
    expect(lcInductor(f, 10e-6)).toBeCloseTo(10e-6, 12)
    expect(lcCapacitor(f, 10e-6)).toBeCloseTo(10e-6, 12)
    expect(lcImpedance(10e-6, 10e-6)).toBeCloseTo(1, 12)
  })
  it('shunt: 10 A, 5 mΩ → 50 mV, 0,5 W; ADC çözünürlüğü', () => {
    const s = shunt({ currentA: 10, rShunt: 0.005, gain: 20, adcBits: 12, adcVref: 3.3 })
    expect(s.vShunt).toBeCloseTo(0.05, 12)
    expect(s.powerW).toBeCloseTo(0.5, 12)
    expect(s.vAdc).toBeCloseTo(1.0, 12)
    expect(s.lsbA).toBeCloseTo(3.3 / 4096 / (20 * 0.005), 12)
    expect(s.fullScaleA).toBeCloseTo(33, 10)
    expect(s.saturated).toBe(false)
    expect(shunt({ currentA: 40, rShunt: 0.005, gain: 20, adcBits: 12, adcVref: 3.3 }).saturated).toBe(true)
  })
})
