// CSV / JSON dışa aktarma ve CSV içe aktarma yardımcıları.
import type { Analysis, McResult, SimResult } from './parachute'

export type Cell = string | number | null

export function toCsv(rows: Cell[][]): string {
  const esc = (c: Cell) => {
    if (c === null) return ''
    const s = String(c)
    return /[",;\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }
  return rows.map((r) => r.map(esc).join(',')).join('\r\n')
}

/** Dosyayı indirir. CSV'ye UTF-8 BOM eklenir (Excel'de Türkçe karakterler için). */
export function downloadText(filename: string, text: string, mime: string): void {
  const bom = mime.includes('csv') ? '﻿' : ''
  const url = URL.createObjectURL(new Blob([bom + text], { type: `${mime};charset=utf-8` }))
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function summaryRows(a: Analysis, mc?: McResult | null, sim?: SimResult | null): Cell[][] {
  const { inputs: i, result: r } = a
  const rows: Cell[][] = [
    ['Parametre', 'Değer', 'Birim'],
    ['Sistem kütlesi', i.m, 'kg'],
    ['Paraşüt kütlesi', i.mChute, 'kg'],
    ['Nominal çap', i.d, 'm'],
    ['Cd', i.cd, ''],
    ['Saha rakımı', i.h, 'm'],
    ['Sıcaklık sapması', i.dT, 'K'],
    ['g', i.g, 'm/s²'],
    ['İzdüşüm oranı', i.proj, ''],
    ['Tepe deliği çapı', i.holeD, 'm'],
    ['Hava yoğunluğu', r.rho, 'kg/m³'],
    ['Basınç (ISA)', r.atm.p, 'Pa'],
    ['Sıcaklık', r.atm.T, 'K'],
    ['Etkin alan', r.area, 'm²'],
    ['CdA', r.cdA, 'm²'],
    ['Terminal hız', r.v, 'm/s'],
    ['Terminal hız', r.vKmh, 'km/h'],
    ['Kinetik enerji', r.energy, 'J'],
    ['Eşdeğer düşme yüksekliği', r.dropHeight, 'm'],
  ]
  if (a.limits.speed) rows.push(['Hız limiti marjı', a.limits.speed.marginPct, '%'], ['Hız limiti', a.limits.speed.pass ? 'GEÇTİ' : 'KALDI', ''])
  if (a.limits.energy) rows.push(['Enerji limiti marjı', a.limits.energy.marginPct, '%'], ['Enerji limiti', a.limits.energy.pass ? 'GEÇTİ' : 'KALDI', ''])
  if (a.inverse) rows.push(['Hedef hız', a.inverse.vTarget, 'm/s'], ['Gereken nominal çap', a.inverse.dRequired, 'm'], ['Çap farkı', a.inverse.diff, 'm'])
  if (mc) {
    rows.push(
      ['MC ortalama', mc.mean, 'm/s'], ['MC standart sapma', mc.std, 'm/s'], ['MC min', mc.min, 'm/s'],
      ['MC max', mc.max, 'm/s'], ['MC %5', mc.p5, 'm/s'], ['MC %95', mc.p95, 'm/s'],
    )
    if (mc.exceedProb !== null) rows.push(['MC limiti aşma olasılığı', mc.exceedProb * 100, '%'])
  }
  if (sim) {
    rows.push(['İniş süresi', sim.totalTime, 's'], ['Yere çarpma hızı', sim.impactSpeed, 'm/s'])
    if (sim.t95 !== null) rows.push(['Terminal hızın %95\'ine ulaşma süresi', sim.t95, 's'])
  }
  return rows
}

export function simSeriesRows(sim: SimResult): Cell[][] {
  const rows: Cell[][] = [['t (s)', 'irtifa (m)', 'hız (m/s)', 'ivme (m/s²)', 'sürükleme (N)']]
  for (let k = 0; k < sim.t.length; k++) rows.push([sim.t[k]!, sim.h[k]!, sim.v[k]!, sim.a[k]!, sim.drag[k]!])
  return rows
}

/** Noktalı virgül / sekme / virgül ayracını otomatik algılayan basit ayrıştırıcı. */
export function parseDelimited(text: string): string[][] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim() !== '')
  if (lines.length === 0) return []
  // Ondalık virgülle çakışmaması için önce ; ve sekme aranır.
  const delim = lines.some((l) => l.includes('\t')) ? '\t' : lines.some((l) => l.includes(';')) ? ';' : ','
  return lines.map((line) => {
    const cells: string[] = []
    let cur = ''
    let quoted = false
    for (let k = 0; k < line.length; k++) {
      const ch = line[k]!
      if (quoted) {
        if (ch === '"' && line[k + 1] === '"') { cur += '"'; k++ }
        else if (ch === '"') quoted = false
        else cur += ch
      } else if (ch === '"') quoted = true
      else if (ch === delim) { cells.push(cur.trim()); cur = '' }
      else cur += ch
    }
    cells.push(cur.trim())
    return cells
  })
}

/** Panoya kopyalar (yalnızca istemci). Başarısızsa false döner. */
export async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text)
    return true
  } catch {
    return false
  }
}
