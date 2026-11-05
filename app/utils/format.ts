// Sayı ayrıştırma ve biçimlendirme yardımcıları (Vue'dan bağımsız).

/** "0,8" ve "0.8" biçimlerini kabul eder; geçersizse null döner. */
export function parseNumber(raw: string): number | null {
  const s = raw.trim().replace(',', '.')
  if (s === '') return null
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/i.test(s)) return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}

const formatters = new Map<number, Intl.NumberFormat>()

/** Türkçe biçimli sayı (ondalık virgül, binlik nokta). */
export function fmt(value: number | null | undefined, digits = 2): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return '—'
  let f = formatters.get(digits)
  if (!f) {
    f = new Intl.NumberFormat('tr-TR', { minimumFractionDigits: digits, maximumFractionDigits: digits })
    formatters.set(digits, f)
  }
  return f.format(value)
}
