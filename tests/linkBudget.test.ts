// Çalıştırmak için: npx vitest run tests/linkBudget.test.ts
import { describe, expect, it } from 'vitest'
import {
  compareScenarios, computeLine, csvPatternLossDb, dataBudget, dipolePatternLossDb, fsplDb, geomFromHoriz,
  geomFromSlant, geometryOf, loraAirtime, loraSensitivityDbm, maxRange, parsePatternCsv, receivedPowerDbm, sfTable,
  loraAirtime as airtime,
} from '../app/utils/linkBudget'
import type { LineInputs } from '../app/utils/linkBudget'

const base = (o: Partial<LineInputs> = {}): LineInputs => ({
  name: 'T', freqMHz: 433, ptxDbm: 30, gtxDbi: 3, ltxDb: 1, grxDbi: 12, lrxDb: 2, txModel: '', rxModel: '',
  sensDsDbm: -147, sensNote: '', sensBasis: 'datasheet', sf: 12, bwKHz: 7.8, cr: 1, nfDb: 6, preamble: 8, payload: 20,
  explicitHeader: true, crc: true, ldro: 'auto', geoMode: 'slant', horizM: 0, altM: null, gsHeightM: 0, slantM: 10000,
  elevDeg: 0, polDb: 0, patternMode: 'manual', patternManualDb: 0, patternCapDb: 30, pattern: [], bodyDb: 0, rxOmni: true,
  yagiBeamDeg: null, yagiErrDeg: 0, multipathDb: 0, atmosDb: 0, extraDb: 0, singleLprop: true, lpropSingleDb: 20,
  propModel: 'fspl', fsplForm: 'm', minMarginDb: 10, packetBytes: null, packetRate: null, dutyLimitPct: null, eirpLimitDbm: null, ...o,
})
const near = (a: number, b: number, tol = 0.05) => expect(Math.abs(a - b)).toBeLessThanOrEqual(tol)

describe('referans hatlar (tek kalem L_prop)', () => {
  it('Hat A: L_fs 105.18, P_rx −83.18, marj 63.82', () => {
    const r = computeLine(base())
    near(r.pathLossDb, 105.18); near(r.prxDbm, -83.18); near(r.marginUsed, 63.82)
  })
  it('Hat B: L_fs 111.22, P_rx −93.07, marj 56.93', () => {
    const r = computeLine(base({ freqMHz: 868, gtxDbi: 2.15, grxDbi: 9, sensDsDbm: -150 }))
    near(r.pathLossDb, 111.22); near(r.prxDbm, -93.07); near(r.marginUsed, 56.93)
  })
})

describe('serbest uzay', () => {
  it('2400 MHz, 1 km → 100.04 dB; iki biçim 0.01 dB içinde', () => {
    near(fsplDb(2400, 1000, 'km'), 100.04); near(fsplDb(2400, 1000, 'm'), 100.04)
    for (const [f, d] of [[433, 10000], [868, 10000], [2400, 1000], [915, 123456]] as const)
      expect(Math.abs(fsplDb(f, d, 'm') - fsplDb(f, d, 'km'))).toBeLessThanOrEqual(0.0101)
  })
  it('mesafe iki katına → +6.02 dB', () => {
    expect(fsplDb(868, 2000) - fsplDb(868, 1000)).toBeCloseTo(6.0206, 3)
  })
})

describe('LoRa', () => {
  it('teorik hassasiyet', () => {
    near(loraSensitivityDbm(7, 125, 6), -124.5); near(loraSensitivityDbm(12, 125, 6), -137.0)
  })
  it('SF arttıkça hassasiyet iyileşir, airtime artar', () => {
    let s = 0; let t = 0
    for (let sf = 7; sf <= 12; sf++) {
      const sens = loraSensitivityDbm(sf, 125, 6)
      const at = airtime({ sf, bwKHz: 125, cr: 1, preamble: 8, payload: 20, explicitHeader: true, crc: true, ldro: 'auto' }).totalS
      if (sf > 7) { expect(sens).toBeLessThan(s); expect(at).toBeGreaterThan(t) }
      s = sens; t = at
    }
  })
  it('airtime SF7/125k/CR4-5/pre 8/explicit/CRC/20 B ≈ 56.6 ms', () => {
    const a = loraAirtime({ sf: 7, bwKHz: 125, cr: 1, preamble: 8, payload: 20, explicitHeader: true, crc: true, ldro: 'auto' })
    expect(Math.abs(a.totalS * 1000 - 56.6)).toBeLessThan(0.2)
  })
  it('Tsym > 16 ms ise LDRO otomatik açık', () => {
    expect(loraAirtime({ sf: 12, bwKHz: 125, cr: 1, preamble: 8, payload: 20, explicitHeader: true, crc: true, ldro: 'auto' }).ldroOn).toBe(true)
    expect(loraAirtime({ sf: 7, bwKHz: 125, cr: 1, preamble: 8, payload: 20, explicitHeader: true, crc: true, ldro: 'auto' }).ldroOn).toBe(false)
  })
})

describe('anten deseni', () => {
  it('dipol: 0° → 0 dB, 60° → ~7.6 dB, →90° sınır', () => {
    expect(dipolePatternLossDb(0)).toBeCloseTo(0, 6)
    near(dipolePatternLossDb(60), 7.6, 0.1)
    expect(dipolePatternLossDb(90)).toBe(30)
    expect(dipolePatternLossDb(89.9999999)).toBe(30)
    expect(dipolePatternLossDb(90, 25)).toBe(25)
  })
  it('CSV enterpolasyonu', () => {
    const t = parsePatternCsv('aci;kazanc\n0;0\n30;-2,5\n60;-10')
    expect(t).toHaveLength(3)
    expect(csvPatternLossDb(t, 15)).toBeCloseTo(1.25, 6)
    expect(csvPatternLossDb(t, 45)).toBeCloseTo(6.25, 6)
    expect(csvPatternLossDb(t, 80)).toBeCloseTo(10, 6)
  })
})

describe('geometri ve menzil', () => {
  it('eğik mesafe Pisagor', () => {
    const g = geomFromHoriz(3000, 4000, 0)
    expect(g.slantM).toBeCloseTo(5000, 9)
    expect(geomFromSlant(5000, g.elDeg, 4000, 0).horizM).toBeCloseTo(3000, 6)
  })
  it('menzil gidiş-dönüş: geri yerine konunca marj = hedef', () => {
    for (const target of [0, 10]) {
      const i = base({ singleLprop: false, patternMode: 'manual', patternManualDb: 0, sensBasis: 'theory', sf: 12, bwKHz: 125, freqMHz: 868, ptxDbm: 0, gtxDbi: 0, grxDbi: 0, ltxDb: 0, lrxDb: 0 })
      const sens = loraSensitivityDbm(12, 125, 6)
      const r = maxRange(i, target, sens)
      expect(r.unbounded).toBe(false)
      expect(receivedPowerDbm(i, geometryOf(i, r.meters)) - sens).toBeCloseTo(target, 6)
    }
  })
  it('yatay modda (dipol) menzil gidiş-dönüş', () => {
    const i = base({ geoMode: 'horizontal', horizM: 5000, altM: 3000, gsHeightM: 2, singleLprop: false, patternMode: 'dipole', sensBasis: 'theory', sf: 10, bwKHz: 125 })
    const sens = loraSensitivityDbm(10, 125, 6)
    const r = maxRange(i, 10, sens)
    if (r.meters > 0 && !r.unbounded) expect(receivedPowerDbm(i, geometryOf(i, r.meters)) - sens).toBeCloseTo(10, 5)
  })
})

describe('bütçe tablosu ve senaryolar', () => {
  it('L_prop kalem toplamı tabloyla aynı', () => {
    const r = computeLine(base({ singleLprop: false, polDb: 3, bodyDb: 2, multipathDb: 6, atmosDb: 1, extraDb: 0.5, patternMode: 'dipole', geoMode: 'horizontal', horizM: 5000, altM: 2000 }))
    const tableSum = r.rows.filter((x) => x.kind === 'loss' && !['ltx', 'fs', 'lrx'].includes(x.key)).reduce((s, x) => s + x.value, 0)
    expect(tableSum).toBeCloseTo(r.lpropTotal, 9)
  })
  it('senaryo farklarının toplamı marj farkına eşit', () => {
    const A = computeLine(base({ grxDbi: 12, sensDsDbm: -137 }))
    const B = computeLine(base({ grxDbi: 9, sensDsDbm: -150, freqMHz: 868, singleLprop: false, polDb: 3 }))
    const c = compareScenarios(A, B)
    expect(c.sumEffects).toBeCloseTo(c.total, 9)
    expect(c.rows.find((r) => r.key === 'grx')!.effect).toBeCloseTo(-3, 9)
    expect(c.rows.find((r) => r.key === 'sens')!.effect).toBeCloseTo(13, 9)
  })
})

describe('veri bütçesi ve SF tablosu', () => {
  it('doluluk = airtime × paket/s', () => {
    const i = base({ sf: 7, bwKHz: 125, packetBytes: 20, packetRate: 2, dutyLimitPct: 1 })
    const d = dataBudget(i)!
    expect(d.occupancyPct).toBeCloseTo(d.airtimeMs * 2 / 10, 6)
    expect(d.dutyOk).toBe(false)
  })
  it('SF tablosu: SF arttıkça menzil artar', () => {
    const t = sfTable(base({ singleLprop: false, sf: 7, bwKHz: 125, freqMHz: 868, ptxDbm: 0, gtxDbi: 0, grxDbi: 0, ltxDb: 0, lrxDb: 0, rxOmni: true }))
    for (let k = 1; k < t.length; k++) expect(t[k]!.rangeKm).toBeGreaterThan(t[k - 1]!.rangeKm)
    expect(t.filter((r) => r.active)).toHaveLength(1)
  })
})
