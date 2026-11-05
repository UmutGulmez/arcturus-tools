// Form alanı tanımları, doğrulama ve hazır örnekler (Vue'dan bağımsız).
import { fmt, parseNumber } from './format'
import type { StaticInputs, Targets, McConfig } from './parachute'

export type FieldKey =
  | 'm' | 'd' | 'cd' | 'h' | 'dT' | 'g' | 'proj' | 'hole' | 'mp'
  | 'vTarget' | 'vLimit' | 'eLimit' | 'rhoFixed'
  | 'v0' | 'h0'
  | 'n' | 'seed' | 'sm' | 'scd' | 'srho' | 'sproj'

export type FieldGroup = 'static' | 'sim' | 'mc'

export interface FieldSpec {
  key: string
  group?: FieldGroup
  label: string
  unit: string
  help: string
  defaultValue: string
  required?: boolean
  min?: number
  max?: number
  /** true → değer min'e eşit olamaz (ör. > 0) */
  minExclusive?: boolean
  integer?: boolean
}

const f = (s: FieldSpec) => s

export const FIELDS: Record<FieldKey, FieldSpec> = {
  m: f({ key: 'm', group: 'static', label: 'Sistem kütlesi (m)', unit: 'kg', required: true, min: 0, minExclusive: true, max: 10000, defaultValue: '', help: 'Paraşütün altında inen toplam kütle.' }),
  d: f({ key: 'd', group: 'static', label: 'Paraşüt nominal ÇAPI (d)', unit: 'm', required: true, min: 0, minExclusive: true, max: 100, defaultValue: '', help: 'Çap girin, yarıçap değil. Düz serilmiş (nominal) kanopi çapı.' }),
  cd: f({ key: 'cd', group: 'static', label: 'Sürüklenme katsayısı (Cd)', unit: '', min: 0, minExclusive: true, max: 5, defaultValue: '0,8', help: 'Nominal alana göre. Tipik aralık 0,5–1,5.' }),
  h: f({ key: 'h', group: 'static', label: 'Saha rakımı (h)', unit: 'm', min: 0, max: 11000, defaultValue: '0', help: 'Deniz seviyesinden yükseklik, 0–11000 m.' }),
  dT: f({ key: 'dT', group: 'static', label: 'Sıcaklık sapması (ΔT)', unit: 'K', min: -80, max: 80, defaultValue: '0', help: 'ISA standart gününe göre sapma (sıcak gün için +).' }),
  g: f({ key: 'g', group: 'static', label: 'Yerçekimi (g)', unit: 'm/s²', min: 0, minExclusive: true, max: 20, defaultValue: '9,807', help: 'Varsayılan 9,807 m/s².' }),
  proj: f({ key: 'proj', group: 'static', label: 'İzdüşüm oranı', unit: '', min: 0, minExclusive: true, max: 1.5, defaultValue: '1', help: 'Şişmiş paraşüt izdüşüm çapı / nominal çap. Önerilen 0,65–1,0.' }),
  hole: f({ key: 'hole', group: 'static', label: 'Tepe deliği çapı', unit: 'm', min: 0, defaultValue: '0', help: 'Alandan düşülmez; yalnızca bilgi/uyarı. Cd bu geometriye ait olmalı.' }),
  mp: f({ key: 'mp', group: 'static', label: 'Paraşüt kütlesi', unit: 'kg', min: 0, defaultValue: '0', help: 'İsteğe bağlı; toplam kütleye eklenir.' }),
  vTarget: f({ key: 'vTarget', group: 'static', label: 'Hedef iniş hızı', unit: 'm/s', min: 0, minExclusive: true, max: 200, defaultValue: '', help: 'Girilirse gereken çap hesaplanır.' }),
  vLimit: f({ key: 'vLimit', group: 'static', label: 'Hız limiti', unit: 'm/s', min: 0, minExclusive: true, max: 500, defaultValue: '', help: 'Geçti/kaldı kontrolü için (isteğe bağlı).' }),
  eLimit: f({ key: 'eLimit', group: 'static', label: 'Kinetik enerji limiti', unit: 'J', min: 0, minExclusive: true, max: 1e6, defaultValue: '', help: 'Geçti/kaldı kontrolü için (isteğe bağlı).' }),
  rhoFixed: f({ key: 'rhoFixed', group: 'static', label: 'Sabit hava yoğunluğu', unit: 'kg/m³', min: 0, minExclusive: true, max: 3, defaultValue: '', help: 'Girilirse ISA yerine kullanılır (karşılaştırma için).' }),

  v0: f({ key: 'v0', group: 'sim', label: 'Başlangıç hızı (v₀)', unit: 'm/s', min: 0, max: 500, defaultValue: '0', help: 'Aşağı yön pozitif. Paraşüt anında tam açık varsayılır.' }),
  h0: f({ key: 'h0', group: 'sim', label: 'Başlangıç irtifası (h₀)', unit: 'm', min: 0, minExclusive: true, max: 30000, defaultValue: '300', help: 'Yerden yükseklik. Saha rakımına eklenerek ρ(h) hesaplanır.' }),

  n: f({ key: 'n', group: 'mc', label: 'Örnek sayısı (N)', unit: '', integer: true, min: 100, max: 1000000, defaultValue: '10000', help: '100 – 1.000.000.' }),
  seed: f({ key: 'seed', group: 'mc', label: 'Seed', unit: '', integer: true, min: 0, max: 4294967295, defaultValue: '42', help: 'Aynı seed aynı sonucu verir.' }),
  sm: f({ key: 'sm', group: 'mc', label: 'Kütle belirsizliği (1σ)', unit: '%', min: 0, max: 100, defaultValue: '2', help: 'Göreli standart sapma.' }),
  scd: f({ key: 'scd', group: 'mc', label: 'Cd belirsizliği (1σ)', unit: '%', min: 0, max: 100, defaultValue: '10', help: 'Göreli standart sapma.' }),
  srho: f({ key: 'srho', group: 'mc', label: 'ρ belirsizliği (1σ)', unit: '%', min: 0, max: 100, defaultValue: '3', help: 'Göreli standart sapma.' }),
  sproj: f({ key: 'sproj', group: 'mc', label: 'İzdüşüm belirsizliği (1σ)', unit: '%', min: 0, max: 100, defaultValue: '5', help: 'Göreli standart sapma.' }),
}

export const FIELD_KEYS = Object.keys(FIELDS) as FieldKey[]

export type FormState = Record<FieldKey, string>
export type FieldValues = Record<FieldKey, number | null>
export type FieldErrors = Partial<Record<FieldKey, string>>

export function defaultForm(): FormState {
  const out = {} as FormState
  for (const k of FIELD_KEYS) out[k] = FIELDS[k].defaultValue
  return out
}

export function validateField(spec: FieldSpec, raw: string): { value: number | null; error: string | null } {
  if (raw.trim() === '') {
    if (spec.required) return { value: null, error: 'Bu alan zorunlu.' }
    return { value: parseNumber(spec.defaultValue), error: null }
  }
  const value = parseNumber(raw)
  if (value === null) return { value: null, error: 'Sayısal bir değer girin (ör. 0,8).' }
  if (spec.integer && !Number.isInteger(value)) return { value: null, error: 'Tam sayı olmalı.' }
  if (spec.min !== undefined) {
    if (spec.minExclusive ? value <= spec.min : value < spec.min) {
      return {
        value: null,
        error: spec.minExclusive
          ? `Değer ${fmt(spec.min, 0)}’dan büyük olmalı.`
          : spec.min === 0 ? 'Değer negatif olamaz.' : `En az ${fmt(spec.min, 0)} olmalı.`,
      }
    }
  }
  if (spec.max !== undefined && value > spec.max) {
    return { value: null, error: `En fazla ${fmt(spec.max, spec.max < 100 ? 1 : 0)} olabilir.` }
  }
  return { value, error: null }
}

export function parseForm(form: FormState): { values: FieldValues; errors: FieldErrors } {
  const values = {} as FieldValues
  const errors: FieldErrors = {}
  for (const k of FIELD_KEYS) {
    const r = validateField(FIELDS[k], form[k])
    values[k] = r.value
    if (r.error) errors[k] = r.error
  }
  if (!errors.hole && !errors.d && values.hole !== null && values.d !== null && values.hole >= values.d) {
    errors.hole = 'Tepe deliği çapı nominal çaptan küçük olmalı.'
  }
  return { values, errors }
}

export const errorsOfGroup = (errors: FieldErrors, group: FieldGroup): FieldErrors => {
  const out: FieldErrors = {}
  for (const k of FIELD_KEYS) if (FIELDS[k].group === group && errors[k]) out[k] = errors[k]
  return out
}

export function toStaticInputs(v: FieldValues): StaticInputs {
  return {
    m: v.m!, mChute: v.mp ?? 0, d: v.d!, cd: v.cd!, h: v.h!, dT: v.dT!, g: v.g!,
    proj: v.proj!, holeD: v.hole ?? 0, rhoFixed: v.rhoFixed,
  }
}

export const toTargets = (v: FieldValues): Targets => ({ vTarget: v.vTarget, vLimit: v.vLimit, eLimit: v.eLimit })

export function toMcConfig(v: FieldValues): McConfig {
  return {
    n: v.n!, seed: v.seed!, sigmaM: v.sm! / 100, sigmaCd: v.scd! / 100,
    sigmaRho: v.srho! / 100, sigmaProj: v.sproj! / 100, vLimit: v.vLimit,
  }
}

export interface Preset {
  id: string
  label: string
  m: string
  d: string
}

export const PRESETS: Preset[] = [
  { id: 'ref1', label: '14,40 kg · Ø1,0 m', m: '14,4', d: '1' },
  { id: 'ref2', label: '4,05 kg · Ø0,8 m', m: '4,05', d: '0,8' },
  { id: 'ref3', label: '14,10 kg · Ø2,4 m', m: '14,1', d: '2,4' },
]
