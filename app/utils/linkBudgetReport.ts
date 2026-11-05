// KTR/ÖTR rapor çıktıları: tablo, hesap adımları (düz metin + LaTeX), taslak paragraf, CSV (Vue'dan bağımsız).
import { fmt } from './format'
import { C_LIGHT, loraAirtime } from './linkBudget'
import type { LineResult } from './linkBudget'
import type { Cell } from './export'

const sg = (x: number, d: number) => (x < 0 ? `−${fmt(-x, d)}` : fmt(x, d))
const paren = (x: number, d: number) => (x < 0 ? `(${sg(x, d)})` : sg(x, d))
const lt = (x: number, d: number) => fmt(x, d).replace(',', '{,}')
const ltn = (x: number, d: number) => (x < 0 ? `-${lt(-x, d)}` : lt(x, d))
const name = (r: LineResult) => r.inputs.name || 'RF hattı'

/** KTR tablosu: Parametre | Değer (sıra sabit). */
export function ktrRows(r: LineResult, d: number): [string, string][] {
  return [
    ['P_rx (Alınan Güç)', `${sg(r.prxDbm, d)} dBm`],
    ['P_tx (Verici Gücü)', `${sg(r.inputs.ptxDbm, d)} dBm`],
    ['G_tx (Verici Anten Kazancı)', `${sg(r.inputs.gtxDbi, d)} dBi`],
    ['G_rx (Alıcı Anten Kazancı)', `${sg(r.inputs.grxDbi, d)} dBi`],
    ['L_tx (Verici Kaybı)', `${sg(r.inputs.ltxDb, d)} dB`],
    ['L_fs (Yol Kaybı)', `${sg(r.pathLossDb, d)} dB`],
    ['L_prop (Diğer Yayılım Kayıpları)', `${sg(r.lpropTotal, d)} dB`],
    ['L_rx (Alıcı Kaybı)', `${sg(r.inputs.lrxDb, d)} dB`],
    ['Alıcı Hassasiyeti', `${sg(r.sens.used, d)} dBm`],
  ]
}

function flsFormula(r: LineResult, d: number): { text: string; latex: string } {
  const i = r.inputs
  const f = fmt(i.freqMHz, 0)
  const L = sg(r.pathLossDb, d)
  const g = r.geometry
  if (i.propModel === 'tworay' && r.twoRayBreakM !== null && g.slantM >= r.twoRayBreakM) {
    return {
      text: `L_fs = 40·log10(d) − 20·log10(h_t) − 20·log10(h_r) = 40·log10(${fmt(g.slantM, 0)}) − 20·log10(${fmt(g.htM, 1)}) − 20·log10(${fmt(g.hrM, 1)}) = ${L} dB (iki ışın modeli)`,
      latex: `L_{fs} = 40\\log_{10}(d) - 20\\log_{10}(h_t) - 20\\log_{10}(h_r) = ${ltn(r.pathLossDb, d)}\\ \\mathrm{dB}`,
    }
  }
  if (i.fsplForm === 'km') {
    const dk = fmt(g.slantM / 1000, 2)
    return {
      text: `L_fs = 32,44 + 20·log10(d[km]) + 20·log10(f[MHz]) = 32,44 + 20·log10(${dk}) + 20·log10(${f}) = ${L} dB`,
      latex: `L_{fs} = 32{,}44 + 20\\log_{10}(${dk.replace(',', '{,}')}) + 20\\log_{10}(${f}) = ${ltn(r.pathLossDb, d)}\\ \\mathrm{dB}`,
    }
  }
  const dm = String(Math.round(g.slantM))
  return {
    text: `L_fs = 20·log10(f[MHz]) + 20·log10(d[m]) − 27,55 = 20·log10(${f}) + 20·log10(${dm}) − 27,55 = ${L} dB`,
    latex: `L_{fs} = 20\\log_{10}(${f}) + 20\\log_{10}(${dm}) - 27{,}55 = ${ltn(r.pathLossDb, d)}\\ \\mathrm{dB}`,
  }
}

/** Sırayla: L_fs → P_rx toplamı → Link marjı. */
export function ktrSteps(r: LineResult, d: number): string[] {
  const i = r.inputs
  const s = r.sens
  return [
    flsFormula(r, d).text,
    `P_rx = P_tx + G_tx − L_tx − L_fs − L_prop + G_rx − L_rx = ${sg(i.ptxDbm, d)} + ${paren(i.gtxDbi, d)} − ${paren(i.ltxDb, d)} − ${paren(r.pathLossDb, d)} − ${paren(r.lpropTotal, d)} + ${paren(i.grxDbi, d)} − ${paren(i.lrxDb, d)} = ${sg(r.prxDbm, d)} dBm`,
    `Link Marjı = P_rx − Alıcı Hassasiyeti = ${sg(r.prxDbm, d)} − ${paren(s.used, d)} = ${sg(r.marginUsed, d)} dB`,
  ]
}

export function ktrLatex(r: LineResult, d: number): string {
  const i = r.inputs
  const rows = ktrRows(r, d).map(([k, v]) => {
    const [num, ...unit] = v.split(' ')
    return `${k.replace(/_/g, '\\_')} & $${num!.replace('−', '-').replace(',', '{,}')}\\ \\mathrm{${unit.join(' ')}}$ \\\\`
  })
  const m = r.marginUsed
  return [
    '\\begin{table}[h]', '\\centering', `\\caption{${name(r).replace(/_/g, '\\_')} link bütçesi parametreleri}`,
    '\\begin{tabular}{|l|r|}', '\\hline', '\\textbf{Parametre} & \\textbf{Değer} \\\\ \\hline', ...rows.map((x) => `${x} \\hline`),
    '\\end{tabular}', '\\end{table}', '',
    '\\begin{align*}',
    `${flsFormula(r, d).latex} \\\\`,
    `P_{rx} &= P_{tx} + G_{tx} - L_{tx} - L_{fs} - L_{prop} + G_{rx} - L_{rx} \\\\`,
    `&= ${ltn(i.ptxDbm, d)} + ${ltn(i.gtxDbi, d)} - ${ltn(i.ltxDb, d)} - ${ltn(r.pathLossDb, d)} - ${ltn(r.lpropTotal, d)} + ${ltn(i.grxDbi, d)} - ${ltn(i.lrxDb, d)} = ${ltn(r.prxDbm, d)}\\ \\mathrm{dBm} \\\\`,
    `\\text{Link Marjı} &= P_{rx} - S_{rx} = ${ltn(r.prxDbm, d)} - (${ltn(r.sens.used, d)}) = ${ltn(m, d)}\\ \\mathrm{dB}`,
    '\\end{align*}',
  ].join('\n')
}

/** Temkinli dille rapor taslağı paragrafı. */
export function reportParagraph(r: LineResult, d: number): string {
  const i = r.inputs
  const g = r.geometry
  const dist = `${fmt(g.slantM / 1000, 2)} km`
  const model = i.propModel === 'tworay' ? 'iki ışın yer yansıması' : 'serbest uzay (Friis)'
  const loss = i.singleLprop
    ? `${sg(r.lpropTotal, d)} dB değerindeki toplam yayılım kaybı payı`
    : `polarizasyon, anten deseni, gövde, hizalama, multipath, atmosfer ve ek kayıp kalemlerinden oluşan toplam ${sg(r.lpropTotal, d)} dB yayılım kaybı payı`
  const sensTxt = r.sens.datasheet !== null && i.sensBasis !== 'theory'
    ? `${sg(r.sens.used, d)} dBm alıcı hassasiyeti (${r.sens.usedLabel})`
    : `${sg(r.sens.used, d)} dBm teorik alıcı hassasiyeti (SF${i.sf}, ${String(i.bwKHz).replace('.', ',')} kHz)`
  const first = `${name(r)} hattında ${fmt(i.freqMHz, 0)} MHz frekansında, ${dist} eğik mesafe için ${model} modeli ile yapılan hesaplamada, ${loss} dikkate alınarak alınan gücün ${sg(r.prxDbm, d)} dBm olduğu değerlendirilmiştir.`
  const second = `${sensTxt} esas alındığında link marjı ${sg(r.marginUsed, d)} dB olarak hesaplanmıştır.`
  const third =
    r.status === 'ok'
      ? `Bu değer istenen ${fmt(i.minMarginDb, 0)} dB fade marjının üzerinde olup, hattın ilgili mesafede çalışması beklenmektedir.`
      : r.status === 'low'
        ? `Bu değer istenen ${fmt(i.minMarginDb, 0)} dB fade marjının altında kalmakta olup, hattın sınırda çalışabileceği değerlendirilmektedir; anten, güç veya hava hızı ayarlarında iyileştirme yapılması önerilmektedir.`
        : 'Bu değer negatif olup, mevcut konfigürasyonda linkin sağlanmasının beklenmediği değerlendirilmektedir.'
  const fourth = `Hesaplar sabit bir modele dayanmaktadır; gerçek ortamda yansıma, anten deseni ve alıcı gürültüsü gibi etkilerle sonuçların farklılaşabileceği, bu nedenle saha testleriyle doğrulanmasının uygun olacağı değerlendirilmiştir. Kullanılan frekans için bölgesel güç ve duty cycle mevzuatı ile gerekli izinlerin ayrıca kontrol edilmesi gerekmektedir.`
  return [first, second, third, fourth].join(' ')
}

export function summaryCsvRows(items: { label: string; r: LineResult }[], d: number): Cell[][] {
  const rows: Cell[][] = [['Hat', 'Parametre', 'Değer', 'Birim']]
  for (const { label, r } of items) {
    const i = r.inputs
    const add = (p: string, v: Cell, u: string) => rows.push([label, p, v, u])
    add('Frekans', i.freqMHz, 'MHz')
    add('Dalga boyu', Number((r.lambda).toFixed(4)), 'm')
    add('Eğik mesafe', Number((r.geometry.slantM / 1000).toFixed(3)), 'km')
    add('Yükselme açısı', Number(r.geometry.elDeg.toFixed(2)), '°')
    add('P_tx', i.ptxDbm, 'dBm'); add('G_tx', i.gtxDbi, 'dBi'); add('L_tx', i.ltxDb, 'dB')
    add('L_fs', Number(r.pathLossDb.toFixed(d + 1)), 'dB')
    for (const it of r.items) add(it.label, Number(it.value.toFixed(d + 1)), 'dB')
    add('L_prop toplam', Number(r.lpropTotal.toFixed(d + 1)), 'dB')
    add('G_rx', i.grxDbi, 'dBi'); add('L_rx', i.lrxDb, 'dB')
    add('EIRP', Number(r.eirpDbm.toFixed(d + 1)), 'dBm')
    add('P_rx', Number(r.prxDbm.toFixed(d + 1)), 'dBm')
    add('Hassasiyet (teorik)', Number(r.sens.theory.toFixed(d + 1)), 'dBm')
    if (r.sens.datasheet !== null) add('Hassasiyet (datasheet)', r.sens.datasheet, 'dBm')
    add('Link marjı', Number(r.marginUsed.toFixed(d + 1)), 'dB')
    add('Menzil (0 dB marj)', Number((r.rangeZero.meters / 1000).toFixed(2)), 'km')
    add(`Menzil (${i.minMarginDb} dB marj)`, Number((r.rangeRequired.meters / 1000).toFixed(2)), 'km')
    add('Airtime', Number((r.airtime.totalS * 1000).toFixed(2)), 'ms')
  }
  return rows
}

export function exportJson(items: { label: string; r: LineResult }[]) {
  return items.map(({ label, r }) => ({
    hat: label,
    girdiler: { ...r.inputs, pattern: undefined },
    sonuclar: {
      dalgaBoyuM: r.lambda, egikMesafeM: r.geometry.slantM, yukselmeAcisiDeg: r.geometry.elDeg, yolKaybiDb: r.pathLossDb,
      kayiplar: r.items, lpropToplamDb: r.lpropTotal, eirpDbm: r.eirpDbm, erpDbm: r.erpDbm, prxDbm: r.prxDbm,
      hassasiyet: r.sens, marjDb: r.marginUsed, marjTeorikDb: r.marginTheory, marjDatasheetDb: r.marginDatasheet,
      menzilSifirMarjKm: r.rangeZero.meters / 1000, menzilIstenenMarjKm: r.rangeRequired.meters / 1000, ufukKm: r.horizonKm,
      airtimeMs: r.airtime.totalS * 1000, bitHiziBps: r.bitRateBps, butce: r.rows,
    },
    uyarilar: r.warnings,
  }))
}

export const airtimeOf = loraAirtime
export const LIGHT = C_LIGHT
