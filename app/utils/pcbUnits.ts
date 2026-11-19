// PCB hesaplayıcı: ortak birimler, girdi doğrulama ve rapor satırı (Vue'dan bağımsız).
import { fmt, parseNumber } from './format'

export const MIL_MM = 0.0254 // 1 mil = 0,0254 mm
export const OZ_UM = 35 // 1 oz/ft² ≈ 35 µm (≈ 1,378 mil)
export const mmToMil = (mm: number) => mm / MIL_MM
export const milToMm = (mil: number) => mil * MIL_MM
export const ozToUm = (oz: number) => oz * OZ_UM
export const umToOz = (um: number) => um / OZ_UM
export const umToMil = (um: number) => um / 1000 / MIL_MM

export interface PcbWarning { level: 'warning' | 'error'; text: string }

/** Anlamlı basamakla Türkçe biçim (gereksiz hassasiyet göstermez). */
export function sig(x: number | null | undefined, digits = 3): string {
  if (x === null || x === undefined || !Number.isFinite(x)) return '—'
  if (x === 0) return '0'
  const mag = Math.floor(Math.log10(Math.abs(x)))
  const dec = Math.min(8, Math.max(0, digits - 1 - mag))
  return fmt(Number(x.toPrecision(digits)), dec)
}

export interface NumRule { min?: number; max?: number; minExclusive?: boolean; int?: boolean }

/** Metin girdiyi sayıya çevirir; geçersizse açık Türkçe hata mesajı döner. */
export function checkNum(raw: string, label: string, r: NumRule = {}): { v: number | null; err: string | null } {
  if (String(raw).trim() === '') return { v: null, err: `${label}: değer girin.` }
  const v = parseNumber(String(raw))
  if (v === null) return { v: null, err: `${label}: sayı girin (örn. 1,5).` }
  if (r.int && !Number.isInteger(v)) return { v: null, err: `${label}: tam sayı olmalı.` }
  if (r.min !== undefined && (r.minExclusive ? v <= r.min : v < r.min)) {
    return { v: null, err: `${label}: ${r.minExclusive ? `${sig(r.min)}’dan büyük` : `en az ${sig(r.min)}`} olmalı.` }
  }
  if (r.max !== undefined && v > r.max) return { v: null, err: `${label}: en çok ${sig(r.max)} olabilir.` }
  return { v, err: null }
}

/** "Rapora kopyala" için tek satır: formül | girdiler | sonuçlar. */
export function reportLine(title: string, formula: string, inputs: string[], results: string[]): string {
  return `${title} | Formül: ${formula} | Girdi: ${inputs.join('; ')} | Sonuç: ${results.join('; ')}`
}
