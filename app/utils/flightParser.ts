import { deriveKey, lookupColumn, splitHeader, type ColumnGroup } from './columns'

export interface FlightColumn {
  key: string
  label: string
  group: ColumnGroup
  /** Dosyadaki birim (yoksa sözlükteki) */
  unit: string
  known: boolean
  /** Dosyadaki ham başlık */
  raw: string
}

export interface FlightEvent {
  type: string
  t: number
  note?: string
}

export interface FlightData {
  name: string
  declaredPoints: number | null
  declaredVars: number | null
  /** OpenRocket simülasyon uyarıları */
  warnings: string[]
  /** Ayrıştırma sırasında oluşan uyarılar (atlanan satır, kodlama düzeltmesi vb.) */
  notes: string[]
  events: FlightEvent[]
  columns: FlightColumn[]
  /** Eksik değerler NaN olarak tutulur (null karşılığı); 0'a ÇEVRİLMEZ. Erişim için cell() kullanın. */
  cols: Record<string, Float64Array>
  rows: number
  encodingFixed: boolean
}

export class FlightParseError extends Error {}

/* ---------- Kodlama onarımı ---------- */

const MOJIBAKE_MARKERS = ['¬∞', '¬≤', '¬∑', '‚Äã', '√º', '≈ü', '√ß', '√∂', 'ƒ±', 'Ä±', 'Ã¼']

export const looksMojibake = (s: string) => MOJIBAKE_MARKERS.some((m) => s.includes(m))

let macReverse: Map<string, number> | null = null
function macRomanReverse(): Map<string, number> | null {
  if (macReverse) return macReverse
  try {
    const dec = new TextDecoder('macintosh')
    const bytes = new Uint8Array(128)
    for (let i = 0; i < 128; i++) bytes[i] = 128 + i
    const chars = Array.from(dec.decode(bytes))
    if (chars.length !== 128) return null
    macReverse = new Map(chars.map((c, i) => [c, 128 + i]))
    return macReverse
  } catch {
    return null
  }
}

/** Yedek: bilinen bozuk dizileri doğrudan değiştirir */
const FALLBACK_TABLE: [string, string][] = [
  ['‚Äã', '​'], ['¬∞', '°'], ['¬≤', '²'], ['¬∑', '·'], ['¬≥', '³'],
  ['√º', 'ü'], ['√ß', 'ç'], ['√∂', 'ö'], ['√ú', 'Ü'], ['√á', 'Ç'], ['√ñ', 'Ö'],
  ['≈ü', 'ş'], ['≈û', 'Ş'], ['ƒ±', 'ı'], ['ƒü', 'ğ'], ['ƒ∞', 'İ'], ['¬µ', 'µ'],
]

/** UTF-8 baytlarının Mac Roman gibi okunmasıyla bozulan metni geri çevirir. */
export function fixMojibake(text: string): { text: string; fixed: boolean } {
  if (!looksMojibake(text)) return { text, fixed: false }
  const rev = macRomanReverse()
  if (rev) {
    try {
      const out: number[] = []
      let ok = true
      for (const ch of text) {
        const cp = ch.codePointAt(0)!
        if (cp < 128) out.push(cp)
        else {
          const b = rev.get(ch)
          if (b === undefined) { ok = false; break }
          out.push(b)
        }
      }
      if (ok) {
        const fixed = new TextDecoder('utf-8', { fatal: true }).decode(new Uint8Array(out))
        return { text: fixed, fixed: true }
      }
    } catch { /* yedeğe geç */ }
  }
  let t = text
  for (const [a, b] of FALLBACK_TABLE) t = t.split(a).join(b)
  return { text: t, fixed: t !== text }
}

/** Bayt dizisini çözer: önce UTF-8, bozulma varsa onarım. */
export function decodeFlightBytes(buf: ArrayBuffer): { text: string; fixed: boolean } {
  let text: string
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    text = new TextDecoder('utf-8').decode(buf)
  }
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  return fixMojibake(text)
}

/* ---------- Ayrıştırıcı ---------- */

const EVENT_RE = /^#\s*Event\s+(\S+)\s+occurred at t=\s*([-+0-9.eE]+)\s*seconds?(?::\s*(.*))?$/
const POINTS_RE = /^#\s*(\d+)\s+data points written for\s+(\d+)\s+variables/i

function parseNum(s: string): number {
  if (s === 'NaN' || s === '' || s === 'nan') return NaN
  const v = Number(s)
  return Number.isFinite(v) ? v : NaN
}

/** Metni (zaten çözülmüş) satır satır ayrıştırır. */
export function parseFlightText(input: string, opts: { encodingFixed?: boolean } = {}): FlightData {
  let text = input
  let encodingFixed = !!opts.encodingFixed
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1)
  if (!encodingFixed) {
    const r = fixMojibake(text)
    text = r.text
    encodingFixed = r.fixed
  }

  const notes: string[] = []
  const warnings: string[] = []
  const events: FlightEvent[] = []
  let name = ''
  let declaredPoints: number | null = null
  let declaredVars: number | null = null
  let headerRaw: string[] | null = null
  let inWarnings = false
  let sawComment = false

  // Ön sayım: bellek için kabaca satır sayısı
  let approx = 0
  for (let i = text.indexOf('\n'); i !== -1; i = text.indexOf('\n', i + 1)) approx++
  approx += 1

  let buffers: Float64Array[] = []
  let rows = 0
  let skipped = 0
  let width = 0

  const grow = (cap: number) => {
    buffers = buffers.map((b) => {
      const n = new Float64Array(cap)
      n.set(b.subarray(0, rows))
      return n
    })
  }
  let cap = 0

  let pos = 0
  const len = text.length
  let lineNo = 0
  while (pos <= len) {
    let end = text.indexOf('\n', pos)
    if (end === -1) end = len
    let line = text.slice(pos, end)
    pos = end + 1
    lineNo++
    if (line.endsWith('\r')) line = line.slice(0, -1)
    if (!line.trim()) { if (end >= len) break; continue }

    if (line.charCodeAt(0) === 35 /* # */) {
      sawComment = true
      const ev = EVENT_RE.exec(line)
      if (ev) {
        const t = Number(ev[2])
        if (Number.isFinite(t)) events.push({ type: ev[1]!, t, note: ev[3]?.trim() || undefined })
        inWarnings = false
      } else if (/^#\s*Simulation warnings:?/i.test(line)) {
        inWarnings = true
      } else if (!headerRaw && /^#\s*Time\s*\(/i.test(line)) {
        headerRaw = line.replace(/^#\s?/, '').split(',')
        inWarnings = false
      } else if (!headerRaw && !inWarnings && line.split(',').length >= 5 && !POINTS_RE.test(line)) {
        // "Time" ile başlamayan ama virgüllü başlık satırı (yedek)
        headerRaw = line.replace(/^#\s?/, '').split(',')
        inWarnings = false
      } else {
        const pm = POINTS_RE.exec(line)
        if (pm) {
          declaredPoints = Number(pm[1]); declaredVars = Number(pm[2])
        } else if (inWarnings) {
          const w = line.replace(/^#\s*/, '').trim()
          if (w) warnings.push(w)
        } else if (!name && lineNo <= 3) {
          name = line.replace(/^#\s*/, '').trim()
        }
      }
      continue
    }

    if (!headerRaw) {
      throw new FlightParseError('Sütun başlık satırı bulunamadı. Dosya OpenRocket "Export to CSV" çıktısı olmalı ve "# Time (s),..." satırını içermelidir.')
    }
    if (!width) {
      width = headerRaw.length
      cap = Math.max(1024, Math.min(approx, 2_000_000))
      buffers = Array.from({ length: width }, () => new Float64Array(cap))
    }
    // Hızlı bölme
    let col = 0
    let p = 0
    let bad = false
    if (rows >= cap) { cap *= 2; grow(cap) }
    const row = rows
    for (;;) {
      let c = line.indexOf(',', p)
      if (c === -1) c = line.length
      if (col >= width) { bad = true; break }
      buffers[col]![row] = parseNum(line.slice(p, c).trim())
      col++
      if (c >= line.length) break
      p = c + 1
    }
    if (bad || col !== width) {
      skipped++
      if (skipped === 1) notes.push(`Satır ${lineNo}: sütun sayısı başlıkla uyuşmuyor, bu satır atlandı.`)
      continue
    }
    rows++
  }

  if (!headerRaw) {
    throw new FlightParseError(sawComment
      ? 'Sütun başlık satırı bulunamadı. Dosya OpenRocket "Export to CSV" çıktısı olmalı ve "# Time (s),..." satırını içermelidir.'
      : 'Dosya boş ya da OpenRocket CSV biçiminde değil.')
  }
  if (rows === 0) throw new FlightParseError('Dosyada veri satırı bulunamadı.')
  if (skipped > 1) notes.push(`Toplam ${skipped} bozuk satır atlandı.`)
  if (encodingFixed) notes.push('Dosya kodlaması bozuktu (UTF-8 baytları Mac Roman gibi okunmuş); otomatik düzeltildi.')
  if (declaredPoints !== null && declaredPoints !== rows) {
    notes.push(`Başlıkta ${declaredPoints} veri noktası yazıyor, dosyada ${rows} satır okundu.`)
  }

  // Sütun meta + anahtar üretimi
  const columns: FlightColumn[] = []
  const cols: Record<string, Float64Array> = {}
  const used = new Set<string>()
  headerRaw.forEach((rawH, i) => {
    const { name: nm, unit } = splitHeader(rawH)
    const def = lookupColumn(nm)
    let key = def?.key ?? deriveKey(nm)
    if (used.has(key)) {
      let n = 2
      while (used.has(`${key}${n}`)) n++
      key = `${key}${n}`
    }
    used.add(key)
    columns.push({
      key,
      label: def?.label ?? (nm || `Sütun ${i + 1}`),
      group: def?.group ?? 'Diğer',
      unit: unit || def?.unit || '',
      known: !!def,
      raw: rawH.trim(),
    })
    cols[key] = buffers[i]!.slice(0, rows)
  })
  if (!cols.time) {
    throw new FlightParseError('Zaman sütunu ("Time (s)") bulunamadı; bu araç zaman serisi gerektirir.')
  }

  return { name: name || 'Adsız simülasyon', declaredPoints, declaredVars, warnings, notes, events, columns, cols, rows, encodingFixed }
}

export function parseFlightBuffer(buf: ArrayBuffer): FlightData {
  const { text, fixed } = decodeFlightBytes(buf)
  return parseFlightText(text, { encodingFixed: fixed })
}

/** NaN → null erişimi */
export function cell(d: FlightData, key: string, i: number): number | null {
  const c = d.cols[key]
  if (!c) return null
  const v = c[i]
  return v === undefined || Number.isNaN(v) ? null : v
}

export const hasCol = (d: FlightData, ...keys: string[]) => keys.every((k) => !!d.cols[k])

/** Eksik sütunları Türkçe etiketle döndürür */
export function missingCols(d: FlightData, keys: string[], labels: Record<string, string>): string[] {
  return keys.filter((k) => !d.cols[k]).map((k) => labels[k] ?? k)
}
