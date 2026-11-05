// RF link bütçesi: saf hesap fonksiyonları (Vue/DOM bağımlılığı yok, birim testlenebilir).
// Birimler: frekans MHz, mesafe metre (girişte km), güç dBm, kazanç dBi, kayıp dB.

import { parseDelimited } from './export'
import { fmt, parseNumber } from './format'

export const C_LIGHT = 299792458
export const MAX_RANGE_M = 2_000_000 // menzil aramasının üst sınırı (2000 km)

// ------------------------------------------------------------------ tipler
export type Level = 'danger' | 'warning' | 'info'
export interface LbWarning {
  level: Level
  text: string
}

export interface PatternPoint {
  angle: number
  gain: number
}

export type SensBasis = 'datasheet' | 'theory' | 'both'
export type GeoMode = 'horizontal' | 'slant'
export type PatternMode = 'manual' | 'dipole' | 'csv'
export type PropModel = 'fspl' | 'tworay'
export type FsplForm = 'm' | 'km'

export interface LineInputs {
  name: string
  freqMHz: number
  ptxDbm: number
  gtxDbi: number
  ltxDb: number
  grxDbi: number
  lrxDb: number
  txModel: string
  rxModel: string
  sensDsDbm: number | null
  sensNote: string
  sensBasis: SensBasis
  // LoRa
  sf: number
  bwKHz: number
  /** 1..4 → 4/5..4/8 */
  cr: number
  nfDb: number
  preamble: number
  payload: number
  explicitHeader: boolean
  crc: boolean
  ldro: 'auto' | 'on' | 'off'
  // geometri
  geoMode: GeoMode
  horizM: number
  altM: number | null
  gsHeightM: number
  slantM: number
  /** eğik mesafe modunda desen için yükselme açısı [°] */
  elevDeg: number
  // kayıplar
  polDb: number
  patternMode: PatternMode
  patternManualDb: number
  patternCapDb: number
  pattern: PatternPoint[]
  bodyDb: number
  rxOmni: boolean
  yagiBeamDeg: number | null
  yagiErrDeg: number
  multipathDb: number
  atmosDb: number
  extraDb: number
  singleLprop: boolean
  lpropSingleDb: number
  // model
  propModel: PropModel
  fsplForm: FsplForm
  minMarginDb: number
  // veri / mevzuat
  packetBytes: number | null
  packetRate: number | null
  dutyLimitPct: number | null
  eirpLimitDbm: number | null
}

export interface Geometry {
  slantM: number
  elDeg: number
  horizM: number
  htM: number
  hrM: number
}

// ------------------------------------------------------------------ yayılım
export const lambdaM = (fMHz: number) => C_LIGHT / (fMHz * 1e6)

/** Serbest uzay yol kaybı. 'm': 20log f + 20log d(m) − 27.55;  'km': 32.44 + 20log d(km) + 20log f */
export function fsplDb(fMHz: number, dM: number, form: FsplForm = 'm'): number {
  if (form === 'km') return 32.44 + 20 * Math.log10(dM / 1000) + 20 * Math.log10(fMHz)
  return 20 * Math.log10(fMHz) + 20 * Math.log10(dM) - 27.55
}

export const twoRayBreakM = (fMHz: number, ht: number, hr: number) => (4 * ht * hr) / lambdaM(fMHz)

/** İki ışın: d < d_b serbest uzay, aksi halde 40log d − 20log ht − 20log hr. */
export function twoRayDb(fMHz: number, dM: number, ht: number, hr: number, form: FsplForm = 'm'): number {
  if (dM < twoRayBreakM(fMHz, ht, hr)) return fsplDb(fMHz, dM, form)
  return 40 * Math.log10(dM) - 20 * Math.log10(ht) - 20 * Math.log10(hr)
}

export function geomFromHoriz(horizM: number, altM: number, gsM: number): Geometry {
  const dh = altM - gsM
  return {
    slantM: Math.hypot(horizM, dh),
    elDeg: (Math.atan2(dh, horizM) * 180) / Math.PI,
    horizM,
    htM: altM,
    hrM: gsM,
  }
}

export function geomFromSlant(slantM: number, elDeg: number, altM: number | null, gsM: number): Geometry {
  const el = (elDeg * Math.PI) / 180
  return {
    slantM,
    elDeg,
    horizM: slantM * Math.cos(el),
    htM: altM ?? gsM + slantM * Math.sin(el),
    hrM: gsM,
  }
}

/** Radyo ufku [km]: 4.12 (√h1 + √h2), h metre. */
export const radioHorizonKm = (h1M: number, h2M: number) => 4.12 * (Math.sqrt(h1M) + Math.sqrt(h2M))

// ------------------------------------------------------------------ anten deseni
/** İdeal yarım dalga dipol (dikey monte): f = cos(π/2·sin el)/cos el. Kayıp cap ile sınırlanır. */
export function dipolePatternLossDb(elDeg: number, capDb = 30): number {
  if (elDeg >= 90 - 1e-6) return capDb
  const el = (elDeg * Math.PI) / 180
  const f = Math.cos((Math.PI / 2) * Math.sin(el)) / Math.cos(el)
  if (!(f > 0)) return capDb
  return Math.min(capDb, Math.max(0, -20 * Math.log10(f)))
}

/** CSV: açı [°], bağıl kazanç [dB]. Başlık satırı atlanır; ondalık virgül için ; veya sekme ayracı kullanın. */
export function parsePatternCsv(text: string): PatternPoint[] {
  const out: PatternPoint[] = []
  for (const row of parseDelimited(text)) {
    const a = parseNumber(row[0] ?? '')
    const g = parseNumber(row[1] ?? '')
    if (a !== null && g !== null) out.push({ angle: a, gain: g })
  }
  return out.sort((x, y) => x.angle - y.angle)
}

/** Yükselme açısına göre doğrusal enterpolasyon; kayıp = tepe kazanç − okunan kazanç. */
export function csvPatternLossDb(table: PatternPoint[], elDeg: number): number {
  if (table.length === 0) return 0
  const peak = Math.max(...table.map((p) => p.gain))
  let g: number
  if (elDeg <= table[0]!.angle) g = table[0]!.gain
  else if (elDeg >= table[table.length - 1]!.angle) g = table[table.length - 1]!.gain
  else {
    let k = 1
    while (table[k]!.angle < elDeg) k++
    const a = table[k - 1]!
    const b = table[k]!
    g = b.angle === a.angle ? b.gain : a.gain + ((b.gain - a.gain) * (elDeg - a.angle)) / (b.angle - a.angle)
  }
  return peak - g
}

/** Yaklaşık Yagi hizalama kaybı: 12·(hata/hüzme)². */
export const yagiLossDb = (beamDeg: number, errDeg: number) => 12 * (errDeg / beamDeg) ** 2

// ------------------------------------------------------------------ LoRa
export const SNR_REQ: Record<number, number> = { 7: -7.5, 8: -10, 9: -12.5, 10: -15, 11: -17.5, 12: -20 }
export const BW_OPTIONS = [7.8, 10.4, 15.6, 20.8, 31.25, 41.7, 62.5, 125, 250, 500]
export const SF_LIST = [7, 8, 9, 10, 11, 12]

export const loraSensitivityDbm = (sf: number, bwKHz: number, nfDb: number) =>
  -174 + 10 * Math.log10(bwKHz * 1000) + nfDb + SNR_REQ[sf]!

export const loraSymbolTimeS = (sf: number, bwKHz: number) => 2 ** sf / (bwKHz * 1000)

export interface AirtimeParams {
  sf: number
  bwKHz: number
  cr: number
  preamble: number
  payload: number
  explicitHeader: boolean
  crc: boolean
  ldro: 'auto' | 'on' | 'off'
}

export interface Airtime {
  tsymS: number
  tPreambleS: number
  payloadSymbols: number
  totalS: number
  ldroOn: boolean
}

export function loraAirtime(p: AirtimeParams): Airtime {
  const tsym = loraSymbolTimeS(p.sf, p.bwKHz)
  const de = p.ldro === 'on' ? 1 : p.ldro === 'off' ? 0 : tsym > 0.016 ? 1 : 0
  const ih = p.explicitHeader ? 0 : 1
  const num = 8 * p.payload - 4 * p.sf + 28 + 16 * (p.crc ? 1 : 0) - 20 * ih
  const sym = 8 + Math.max(Math.ceil(num / (4 * (p.sf - 2 * de))) * (p.cr + 4), 0)
  const tPre = (p.preamble + 4.25) * tsym
  return { tsymS: tsym, tPreambleS: tPre, payloadSymbols: sym, totalS: tPre + sym * tsym, ldroOn: de === 1 }
}

/** Rb = SF · (BW / 2^SF) · 4/(4+CR) [bit/s] */
export const loraBitRate = (sf: number, bwKHz: number, cr: number) => sf * ((bwKHz * 1000) / 2 ** sf) * (4 / (4 + cr))

// ------------------------------------------------------------------ bütçe çekirdeği
export interface LossItem {
  key: string
  label: string
  value: number
}

function patternLossAt(i: LineInputs, elDeg: number): number {
  if (i.patternMode === 'dipole') return dipolePatternLossDb(elDeg, i.patternCapDb)
  if (i.patternMode === 'csv') return csvPatternLossDb(i.pattern, elDeg)
  return i.patternManualDb
}

export function propItems(i: LineInputs, elDeg: number): LossItem[] {
  if (i.singleLprop) return [{ key: 'single', label: 'L_prop (tek kalem)', value: i.lpropSingleDb }]
  const yagi = !i.rxOmni && i.yagiBeamDeg ? yagiLossDb(i.yagiBeamDeg, i.yagiErrDeg) : 0
  return [
    { key: 'pol', label: 'Polarizasyon uyumsuzluğu', value: i.polDb },
    { key: 'pattern', label: 'Anten deseni kaybı', value: patternLossAt(i, elDeg) },
    { key: 'body', label: 'Gövde/fairing gölgelemesi', value: i.bodyDb },
    { key: 'yagi', label: 'Yagi hizalama kaybı', value: yagi },
    { key: 'multipath', label: 'Multipath/fade payı', value: i.multipathDb },
    { key: 'atmos', label: 'Atmosfer/yağmur', value: i.atmosDb },
    { key: 'extra', label: 'Ek kayıp', value: i.extraDb },
  ]
}

export function pathLossDb(i: LineInputs, g: Geometry): number {
  if (i.propModel === 'tworay') return twoRayDb(i.freqMHz, g.slantM, g.htM, g.hrM, i.fsplForm)
  return fsplDb(i.freqMHz, g.slantM, i.fsplForm)
}

export function receivedPowerDbm(i: LineInputs, g: Geometry): number {
  const lprop = propItems(i, g.elDeg).reduce((s, x) => s + x.value, 0)
  return i.ptxDbm + i.gtxDbi - i.ltxDb - pathLossDb(i, g) - lprop + i.grxDbi - i.lrxDb
}

export interface Sensitivity {
  theory: number
  datasheet: number | null
  used: number
  usedLabel: string
  /** teorik − datasheet; > 3 ise datasheet iyimser */
  optimismDb: number | null
}

export function sensitivityOf(i: LineInputs): Sensitivity {
  const theory = loraSensitivityDbm(i.sf, i.bwKHz, i.nfDb)
  const ds = i.sensDsDbm
  let used = theory
  let usedLabel = 'teorik'
  if (ds !== null && i.sensBasis === 'datasheet') {
    used = ds
    usedLabel = 'datasheet'
  } else if (ds !== null && i.sensBasis === 'both') {
    used = Math.max(theory, ds)
    usedLabel = used === ds ? 'datasheet (kötümser)' : 'teorik (kötümser)'
  }
  return { theory, datasheet: ds, used, usedLabel, optimismDb: ds === null ? null : theory - ds }
}

export function geometryOf(i: LineInputs, distM?: number): Geometry {
  if (i.geoMode === 'horizontal') return geomFromHoriz(distM ?? i.horizM, i.altM ?? 0, i.gsHeightM)
  return geomFromSlant(distM ?? i.slantM, i.elevDeg, i.altM, i.gsHeightM)
}

export interface MaxRange {
  meters: number
  /** true → üst sınıra (2000 km) kadar hedef marj sağlanıyor */
  unbounded: boolean
}

/** Marjın hedef değere indiği en uzak mesafe: log ızgara taraması + ikiye bölme. */
export function maxRange(i: LineInputs, targetDb: number, sensDbm: number): MaxRange {
  const margin = (d: number) => receivedPowerDbm(i, geometryOf(i, d)) - sensDbm
  const N = 400
  const lo0 = 1
  const ratio = (MAX_RANGE_M / lo0) ** (1 / N)
  let last = -1
  for (let k = 0; k <= N; k++) {
    const d = lo0 * ratio ** k
    if (margin(d) >= targetDb) last = k
  }
  if (last < 0) return { meters: 0, unbounded: false }
  if (last === N) return { meters: MAX_RANGE_M, unbounded: true }
  let a = lo0 * ratio ** last
  let b = lo0 * ratio ** (last + 1)
  for (let it = 0; it < 80; it++) {
    const m = (a + b) / 2
    if (margin(m) >= targetDb) a = m
    else b = m
  }
  return { meters: (a + b) / 2, unbounded: false }
}

// ------------------------------------------------------------------ bütçe tablosu
export interface BudgetRow {
  key: string
  label: string
  kind: 'gain' | 'loss' | 'result' | 'sens' | 'margin'
  unit: 'dBm' | 'dBi' | 'dB'
  /** gösterilen büyüklük (kayıplar pozitif) */
  value: number
  /** marja katkısı [dB] (+ veya −); sonuç/hassasiyet için sens: −S */
  contribution: number
}

export interface LineResult {
  inputs: LineInputs
  lambda: number
  geometry: Geometry
  pathLossDb: number
  pathLossAltDb: number
  twoRayBreakM: number | null
  items: LossItem[]
  lpropTotal: number
  eirpDbm: number
  erpDbm: number
  prxDbm: number
  sens: Sensitivity
  marginUsed: number
  marginTheory: number
  marginDatasheet: number | null
  status: 'none' | 'low' | 'ok'
  rangeZero: MaxRange
  rangeRequired: MaxRange
  horizonKm: number | null
  limiting: 'güç bütçesi' | 'ufuk' | null
  airtime: Airtime
  bitRateBps: number
  rows: BudgetRow[]
  warnings: LbWarning[]
}

export function buildRows(i: LineInputs, g: Geometry, prx: number, sens: Sensitivity, items: LossItem[], fs: number): BudgetRow[] {
  const rows: BudgetRow[] = [
    { key: 'ptx', label: 'Verici çıkış gücü (P_tx)', kind: 'gain', unit: 'dBm', value: i.ptxDbm, contribution: i.ptxDbm },
    { key: 'gtx', label: 'Verici anten kazancı (G_tx)', kind: 'gain', unit: 'dBi', value: i.gtxDbi, contribution: i.gtxDbi },
    { key: 'ltx', label: 'Verici bileşen kaybı (L_tx)', kind: 'loss', unit: 'dB', value: i.ltxDb, contribution: -i.ltxDb },
    { key: 'fs', label: i.propModel === 'tworay' ? 'Yol kaybı, iki ışın (L_fs)' : 'Serbest uzay yol kaybı (L_fs)', kind: 'loss', unit: 'dB', value: fs, contribution: -fs },
    ...items.map((x) => ({ key: x.key, label: x.label, kind: 'loss' as const, unit: 'dB' as const, value: x.value, contribution: -x.value })),
    { key: 'grx', label: 'Alıcı anten kazancı (G_rx)', kind: 'gain', unit: 'dBi', value: i.grxDbi, contribution: i.grxDbi },
    { key: 'lrx', label: 'Alıcı bileşen kaybı (L_rx)', kind: 'loss', unit: 'dB', value: i.lrxDb, contribution: -i.lrxDb },
  ]
  rows.push({ key: 'prx', label: 'Alınan güç (P_rx)', kind: 'result', unit: 'dBm', value: prx, contribution: 0 })
  rows.push({ key: 'sens', label: `Alıcı hassasiyeti (${sens.usedLabel})`, kind: 'sens', unit: 'dBm', value: sens.used, contribution: -sens.used })
  rows.push({ key: 'margin', label: 'Link marjı', kind: 'margin', unit: 'dB', value: prx - sens.used, contribution: 0 })
  void g
  return rows
}

export function computeLine(i: LineInputs): LineResult {
  const g = geometryOf(i)
  const fs = pathLossDb(i, g)
  const alt: FsplForm = i.fsplForm === 'm' ? 'km' : 'm'
  const fsAlt = i.propModel === 'tworay' ? twoRayDb(i.freqMHz, g.slantM, g.htM, g.hrM, alt) : fsplDb(i.freqMHz, g.slantM, alt)
  const items = propItems(i, g.elDeg)
  const lprop = items.reduce((s, x) => s + x.value, 0)
  const eirp = i.ptxDbm + i.gtxDbi - i.ltxDb
  const prx = eirp - fs - lprop + i.grxDbi - i.lrxDb
  const sens = sensitivityOf(i)
  const marginUsed = prx - sens.used
  const marginTheory = prx - sens.theory
  const marginDs = sens.datasheet === null ? null : prx - sens.datasheet
  const status = marginUsed < 0 ? 'none' : marginUsed < i.minMarginDb ? 'low' : 'ok'

  const rangeZero = maxRange(i, 0, sens.used)
  const rangeRequired = maxRange(i, i.minMarginDb, sens.used)
  const horizonKm = i.geoMode === 'horizontal' && i.altM !== null ? radioHorizonKm(i.altM, i.gsHeightM) : null
  const reqKm = rangeRequired.meters / 1000
  const limiting = horizonKm === null ? null : horizonKm < reqKm ? 'ufuk' : 'güç bütçesi'

  const airtime = loraAirtime(i)
  const rows = buildRows(i, g, prx, sens, items, fs)

  const w: LbWarning[] = []
  const dec = (x: number) => fmt(x, 1)
  if (marginUsed < 0) w.push({ level: 'danger', text: `Link marjı negatif (${dec(marginUsed)} dB): bu konfigürasyonda link beklenmiyor.` })
  else if (marginUsed < i.minMarginDb) w.push({ level: 'warning', text: `Link marjı (${dec(marginUsed)} dB) istenen fade marjının (${dec(i.minMarginDb)} dB) altında; yetersiz/sınırda.` })
  if (marginUsed > 40) w.push({ level: 'info', text: 'Marj çok yüksek (> 40 dB): tasarım aşırı payla yapılmış olabilir; gerekçesini raporda belirtin.' })
  if (sens.optimismDb !== null && sens.optimismDb > 3) {
    w.push({ level: 'warning', text: `Datasheet hassasiyeti seçilen SF/BW'nin teorik değerinden ${dec(sens.optimismDb)} dB iyimser; gerçek hava hızı ayarını kontrol edin.` })
  }
  if (i.singleLprop) w.push({ level: 'info', text: 'Tek kalem L_prop modu kullanılıyor; kayıpları kalemlere bölmek raporda daha savunulabilir.' })
  if (i.patternMode === 'dipole') {
    const pl = dipolePatternLossDb(g.elDeg, i.patternCapDb)
    if (pl >= 6) w.push({ level: 'warning', text: `Anten deseni çukuru: yükselme açısı ${dec(g.elDeg)}° iken ideal dipol kaybı ${dec(pl)} dB. Yer istasyonunun roketi yüksek açıyla görmesi en kötü durumdur; ideal model yerine gerçek desen (CSV) kullanın.` })
    else w.push({ level: 'info', text: 'Anten deseni ideal yarım dalga dipol yaklaşımıyla hesaplandı; gerçek desen biliniyorsa CSV modunu kullanın.' })
  }
  if (!i.singleLprop && i.polDb >= 10) w.push({ level: 'warning', text: 'Polarizasyon kaybı çok yüksek; çapraz lineer polarizasyon olabilir, anten yönelimlerini kontrol edin.' })
  if (!i.singleLprop && !i.rxOmni && i.yagiBeamDeg) w.push({ level: 'info', text: 'Yagi hizalama kaybı yaklaşık bir formülle (12·(hata/hüzme)²) hesaplanır; gerçek anten deseniyle doğrulayın.' })
  if (limiting === 'ufuk') w.push({ level: 'warning', text: `Radyo ufku (${fmt(horizonKm, 1)} km) güç bütçesinden daha kısıtlayıcı; menzili ufuk sınırlıyor.` })
  if (horizonKm !== null && g.horizM / 1000 > horizonKm) w.push({ level: 'danger', text: `Girilen yatay mesafe (${fmt(g.horizM / 1000, 1)} km) radyo ufkunun (${fmt(horizonKm, 1)} km) ötesinde.` })
  if (i.propModel === 'tworay') w.push({ level: 'warning', text: 'İki ışın modeli yere yakın, düz arazi için geçerlidir; roket yükseldikçe serbest uzay modeli daha gerçekçidir.' })
  if (i.eirpLimitDbm !== null && eirp > i.eirpLimitDbm) w.push({ level: 'danger', text: `EIRP (${dec(eirp)} dBm) girdiğiniz limiti (${dec(i.eirpLimitDbm)} dBm) aşıyor.` })
  w.push({ level: 'info', text: 'Frekans için bölgesel güç ve duty cycle mevzuatını ve gerekli izinleri ayrıca kontrol edin; bu araç somut bir limit değeri öne sürmez.' })

  return {
    inputs: i, lambda: lambdaM(i.freqMHz), geometry: g, pathLossDb: fs, pathLossAltDb: fsAlt,
    twoRayBreakM: i.propModel === 'tworay' ? twoRayBreakM(i.freqMHz, g.htM, g.hrM) : null,
    items, lpropTotal: lprop, eirpDbm: eirp, erpDbm: eirp - 2.15, prxDbm: prx, sens,
    marginUsed, marginTheory, marginDatasheet: marginDs, status, rangeZero, rangeRequired,
    horizonKm, limiting, airtime, bitRateBps: loraBitRate(i.sf, i.bwKHz, i.cr), rows, warnings: w,
  }
}

// ------------------------------------------------------------------ veri bütçesi
export interface DataBudget {
  requiredBps: number
  availableBps: number
  airtimeMs: number
  occupancyPct: number
  maxPacketRate: number
  dutyOk: boolean | null
  capacityOk: boolean
}

export function dataBudget(i: LineInputs): DataBudget | null {
  if (i.packetBytes === null || i.packetRate === null) return null
  const at = loraAirtime({ ...i, payload: i.packetBytes })
  const occ = at.totalS * i.packetRate * 100
  const available = loraBitRate(i.sf, i.bwKHz, i.cr)
  const maxRate = 1 / at.totalS
  const dutyOk = i.dutyLimitPct === null ? null : occ <= i.dutyLimitPct
  return {
    requiredBps: i.packetBytes * 8 * i.packetRate,
    availableBps: available,
    airtimeMs: at.totalS * 1000,
    occupancyPct: occ,
    maxPacketRate: i.dutyLimitPct === null ? maxRate : Math.min(maxRate, i.dutyLimitPct / 100 / at.totalS),
    dutyOk,
    capacityOk: occ < 100 && dutyOk !== false,
  }
}

// ------------------------------------------------------------------ SF karşılaştırması
export interface SfRow {
  sf: number
  sensDbm: number
  marginDb: number
  rangeKm: number
  rangeUnbounded: boolean
  airtimeMs: number
  bitRateBps: number
  active: boolean
}

export function sfTable(i: LineInputs): SfRow[] {
  const prx = receivedPowerDbm(i, geometryOf(i))
  return SF_LIST.map((sf) => {
    const s = loraSensitivityDbm(sf, i.bwKHz, i.nfDb)
    const r = maxRange(i, 0, s)
    return {
      sf, sensDbm: s, marginDb: prx - s, rangeKm: r.meters / 1000, rangeUnbounded: r.unbounded,
      airtimeMs: loraAirtime({ ...i, sf }).totalS * 1000, bitRateBps: loraBitRate(sf, i.bwKHz, i.cr), active: sf === i.sf,
    }
  })
}

// ------------------------------------------------------------------ eğriler
export interface Curve {
  x: number[]
  y: number[]
}

export function marginVsDistance(i: LineInputs, sensDbm: number, xMaxM: number, n = 160): Curve {
  const x: number[] = []
  const y: number[] = []
  for (let k = 1; k <= n; k++) {
    const d = (xMaxM * k) / n
    x.push(d / 1000)
    y.push(receivedPowerDbm(i, geometryOf(i, d)) - sensDbm)
  }
  return { x, y }
}

/** Sabit yatay mesafede irtifaya göre marj (yalnızca yatay mesafe modu). */
export function marginVsAltitude(i: LineInputs, sensDbm: number, altMaxM: number, n = 160): Curve {
  const x: number[] = []
  const y: number[] = []
  const horiz = geometryOf(i).horizM
  for (let k = 0; k <= n; k++) {
    const alt = i.gsHeightM + ((altMaxM - i.gsHeightM) * k) / n
    x.push(alt)
    y.push(receivedPowerDbm(i, geomFromHoriz(horiz, alt, i.gsHeightM)) - sensDbm)
  }
  return { x, y }
}

// ------------------------------------------------------------------ duyarlılık
export interface SensRowLb {
  label: string
  minus: string
  plus: string
  dMinus: number
  dPlus: number
}

export function sensitivityTable(i: LineInputs): SensRowLb[] {
  const sens = sensitivityOf(i)
  const base = receivedPowerDbm(i, geometryOf(i)) - sens.used
  const m = (p: Partial<LineInputs>) => {
    const j = { ...i, ...p }
    return receivedPowerDbm(j, geometryOf(j)) - sensitivityOf(j).used
  }
  const rows: SensRowLb[] = []
  const dB = (label: string, key: keyof LineInputs) => {
    const v = i[key] as number
    rows.push({ label, minus: '−3 dB', plus: '+3 dB', dMinus: m({ [key]: v - 3 }) - base, dPlus: m({ [key]: v + 3 }) - base })
  }
  dB('P_tx', 'ptxDbm')
  dB('G_tx', 'gtxDbi')
  dB('G_rx', 'grxDbi')
  if (i.singleLprop) dB('L_prop (tek kalem)', 'lpropSingleDb')
  else {
    dB('Polarizasyon kaybı', 'polDb')
    if (i.patternMode === 'manual') dB('Anten deseni kaybı', 'patternManualDb')
    dB('Gövde gölgelemesi', 'bodyDb')
    dB('Multipath/fade payı', 'multipathDb')
    dB('Atmosfer/yağmur', 'atmosDb')
    dB('Ek kayıp', 'extraDb')
  }
  const dist = i.geoMode === 'horizontal' ? 'horizM' : 'slantM'
  rows.push({ label: 'Mesafe', minus: '−%10', plus: '+%10', dMinus: m({ [dist]: i[dist] * 0.9 }) - base, dPlus: m({ [dist]: i[dist] * 1.1 }) - base })
  const sfOf = (sf: number) => (sf < 7 || sf > 12 ? null : m({ sf }) - base)
  rows.push({ label: i.sensBasis === 'datasheet' && i.sensDsDbm !== null ? 'SF (datasheet esas, etkisiz)' : 'SF', minus: '−1', plus: '+1', dMinus: sfOf(i.sf - 1) ?? NaN, dPlus: sfOf(i.sf + 1) ?? NaN })
  return rows
}

// ------------------------------------------------------------------ senaryo karşılaştırması
export interface ScenarioRow {
  key: string
  label: string
  unit: string
  a: number | null
  b: number | null
  /** marja etkisi [dB] */
  effect: number
}

/** Bütçe kalemleri üzerinden toplanabilir (additive) fark: Σ etki = marj_B − marj_A. */
export function compareScenarios(a: LineResult, b: LineResult): { rows: ScenarioRow[]; marginA: number; marginB: number; total: number; sumEffects: number } {
  const keys: string[] = []
  const labels: Record<string, string> = {}
  for (const r of [...a.rows, ...b.rows]) {
    if (r.kind === 'result' || r.kind === 'margin') continue
    if (!keys.includes(r.key)) keys.push(r.key)
    labels[r.key] = r.label
  }
  const find = (res: LineResult, k: string) => res.rows.find((r) => r.key === k)
  const rows: ScenarioRow[] = keys.map((k) => {
    const ra = find(a, k)
    const rb = find(b, k)
    return {
      key: k, label: (rb ?? ra)!.label, unit: (rb ?? ra)!.unit,
      a: ra ? ra.value : null, b: rb ? rb.value : null,
      effect: (rb?.contribution ?? 0) - (ra?.contribution ?? 0),
    }
  })
  const sumEffects = rows.reduce((s, r) => s + r.effect, 0)
  return { rows, marginA: a.marginUsed, marginB: b.marginUsed, total: b.marginUsed - a.marginUsed, sumEffects }
}

// ------------------------------------------------------------------ tam analiz (UI için)
export interface LineAnalysis {
  result: LineResult
  distCurve: Curve
  altCurve: Curve | null
  sfRows: SfRow[]
  sensRows: SensRowLb[]
  data: DataBudget | null
}

export function analyzeLine(i: LineInputs): LineAnalysis {
  const result = computeLine(i)
  const sens = result.sens.used
  const here = i.geoMode === 'horizontal' ? result.geometry.horizM : result.geometry.slantM
  const xMax = Math.min(MAX_RANGE_M, Math.max(1000, 1.4 * result.rangeZero.meters, 1.5 * here))
  const altMax = Math.max(3 * (i.altM ?? 0), i.gsHeightM + 2000)
  return {
    result,
    distCurve: marginVsDistance(i, sens, xMax),
    altCurve: i.geoMode === 'horizontal' ? marginVsAltitude(i, sens, altMax) : null,
    sfRows: sfTable(i),
    sensRows: sensitivityTable(i),
    data: dataBudget(i),
  }
}
