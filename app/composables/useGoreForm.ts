import { parseNumber } from '~/utils/format'
import {
  buildGore, goreStats, goreWarnings, stations, MIN_N,
  type Gore, type GoreInput, type JoinStyle, type Shape, type Warning,
} from '~/utils/gore'
import { cordList, nestGores } from '~/utils/goreNest'

export interface GoreFormState {
  d: string
  shape: Shape
  cap: string
  n: string
  vent: string
  seamMode: 'uniform' | 'sides'
  seam: string
  seamR: string
  seamT: string
  seamL: string
  seamB: string
  hem: string
  join: JoinStyle
  roll: string
  price: string
  cordFactor: string
  cordAllow: string
}

const defaults = (): GoreFormState => ({
  d: '', shape: 'hemisphere', cap: '90', n: '8', vent: '', seamMode: 'uniform', seam: '', seamR: '', seamT: '', seamL: '', seamB: '',
  hem: '', join: 'miter', roll: '', price: '', cordFactor: '1', cordAllow: '',
})

// URL'de kısa anahtarlar
const QUERY_KEYS: Record<keyof GoreFormState, string> = {
  d: 'd', shape: 'sh', cap: 'cap', n: 'n', vent: 'v', seamMode: 'sm', seam: 's', seamR: 'sr', seamT: 'st', seamL: 'sl', seamB: 'sb',
  hem: 'hem', join: 'j', roll: 'roll', price: 'fiyat', cordFactor: 'cf', cordAllow: 'ca',
}

export type GoreErrors = Partial<Record<keyof GoreFormState, string>>

export const PRESET: Partial<GoreFormState> = {
  d: '1', shape: 'hemisphere', n: '8', vent: '10', seamMode: 'uniform', seam: '1', hem: '2', roll: '150', cordFactor: '1', cordAllow: '10',
}

export function useGoreForm() {
  const route = useRoute()
  const router = useRouter()
  const form = reactive<GoreFormState>(defaults())

  for (const k of Object.keys(QUERY_KEYS) as (keyof GoreFormState)[]) {
    const q = route.query[QUERY_KEYS[k]]
    if (typeof q === 'string') (form as Record<string, string>)[k] = q
  }
  if (!['hemisphere', 'cap', 'flat'].includes(form.shape)) form.shape = 'hemisphere'
  if (!['uniform', 'sides'].includes(form.seamMode)) form.seamMode = 'uniform'
  if (!['miter', 'bevel'].includes(form.join)) form.join = 'miter'

  const touched = reactive<Partial<Record<keyof GoreFormState, boolean>>>({})
  const num = (k: keyof GoreFormState) => parseNumber(String(form[k]))

  const parsed = computed(() => {
    const e: GoreErrors = {}
    const bad = (k: keyof GoreFormState, m: string) => (e[k] = m)
    // zorunlu: çap
    const d = num('d')
    if (String(form.d).trim() === '') bad('d', 'Bu alan zorunlu.')
    else if (d === null) bad('d', 'Sayı girin (örn. 1,2).')
    else if (d <= 0 || d > 100) bad('d', '0 ile 100 m arasında olmalı.')

    const optional = (k: keyof GoreFormState, min: number, max: number, label: string) => {
      const raw = String(form[k]).trim()
      if (raw === '') return 0
      const v = parseNumber(raw)
      if (v === null) { bad(k, 'Sayı girin.'); return 0 }
      if (v < min || v > max) bad(k, `${label} ${min} ile ${max} arasında olmalı.`)
      return v
    }
    let n = parseNumber(String(form.n))
    if (n === null) bad('n', 'Tam sayı girin.')
    else if (!Number.isInteger(n)) bad('n', 'Tam sayı olmalı.')
    else if (n < MIN_N || n > 64) bad('n', `${MIN_N} ile 64 arasında olmalı.`)
    if (n === null) n = 0

    let cap = 90
    if (form.shape === 'cap') {
      const c = parseNumber(String(form.cap))
      if (c === null) bad('cap', 'Sayı girin.')
      else if (c < 30 || c > 150) bad('cap', '30° ile 150° arasında olmalı.')
      else cap = c
    }
    const vent = optional('vent', 0, 1000, 'Tepe deliği')
    const seamVals =
      form.seamMode === 'uniform'
        ? (() => { const v = optional('seam', 0, 20, 'Dikiş payı'); return { right: v, top: v, left: v, bottom: v } })()
        : { right: optional('seamR', 0, 20, 'Sağ pay'), top: optional('seamT', 0, 20, 'Üst pay'), left: optional('seamL', 0, 20, 'Sol pay'), bottom: optional('seamB', 0, 20, 'Alt pay') }
    const hem = optional('hem', 0, 30, 'Etek katlama payı')
    const roll = String(form.roll).trim() === '' ? null : optional('roll', 1, 1000, 'Rulo eni')
    if (roll !== null && roll <= 0) bad('roll', 'Rulo eni pozitif olmalı.')
    const price = String(form.price).trim() === '' ? null : optional('price', 0, 1e7, 'Birim fiyat')
    let cf = parseNumber(String(form.cordFactor))
    if (cf === null || cf <= 0 || cf > 20) { bad('cordFactor', '0’dan büyük (en çok 20) bir çarpan girin.'); cf = 1 }
    const ca = optional('cordAllow', 0, 500, 'Bağlantı payı')

    const input: GoreInput | null =
      Object.keys(e).length || d === null
        ? null
        : { d0: d, shape: form.shape, capAngleDeg: cap, n, ventCm: vent, seam: seamVals, hemCm: hem, join: form.join }
    return { errors: e, input, roll, price, cf, ca }
  })

  const errors = computed(() => {
    // Zorunlu alan hatası, kullanıcı alana dokunana kadar gösterilmez
    const out: GoreErrors = {}
    for (const [k, v] of Object.entries(parsed.value.errors) as [keyof GoreFormState, string][]) {
      if (v === 'Bu alan zorunlu.' && !touched[k] && !route.query[QUERY_KEYS[k]]) continue
      out[k] = v
    }
    return out
  })

  watch(
    () => (Object.keys(QUERY_KEYS) as (keyof GoreFormState)[]).map((k) => form[k]),
    (now, before) => {
      const keys = Object.keys(QUERY_KEYS) as (keyof GoreFormState)[]
      keys.forEach((k, i) => now[i] !== before[i] && (touched[k] = true))
    },
  )

  const built = computed<{ gore: Gore | null; error: string | null }>(() => {
    const inp = parsed.value.input
    if (!inp) return { gore: null, error: null }
    try {
      return { gore: buildGore(inp), error: null }
    } catch (err) {
      return { gore: null, error: (err as Error).message }
    }
  })
  const gore = computed(() => built.value.gore)
  const stats = computed(() => (gore.value ? goreStats(gore.value) : null))
  const table = computed(() => (gore.value ? stations(gore.value, 5) : []))
  const nest = computed(() => {
    const g = gore.value
    const roll = parsed.value.roll
    if (!g || roll === null || !parsed.value.input) return null
    return nestGores(g, Math.round(parsed.value.input.n), { rollWidthCm: roll, pricePerM: parsed.value.price })
  })
  const cords = computed(() => {
    const inp = parsed.value.input
    if (!inp) return null
    return cordList(inp.d0, Math.round(inp.n), { factor: parsed.value.cf, allowanceCm: parsed.value.ca })
  })
  const warnings = computed<Warning[]>(() => {
    const inp = parsed.value.input
    const out: Warning[] = []
    if (built.value.error) out.push({ level: 'error', text: built.value.error })
    if (!inp) return out
    out.push(...goreWarnings(inp, gore.value, parsed.value.roll))
    const s = inp.seam
    if (s.right + s.top + s.left + s.bottom === 0) out.push({ level: 'warning', text: 'Dikiş payı 0: çıkan kalıp yalnızca dikiş çizgisidir. Kumaşı bu çizgiden kesersen dikişte kumaş kalmaz.' })
    return out
  })

  // URL eşitleme (debounce)
  let timer: ReturnType<typeof setTimeout> | undefined
  const buildQuery = () => {
    const q: Record<string, string> = {}
    const base = defaults()
    for (const k of Object.keys(QUERY_KEYS) as (keyof GoreFormState)[]) {
      if (String(form[k]) !== String(base[k])) q[QUERY_KEYS[k]] = String(form[k])
    }
    return q
  }
  watch(
    () => JSON.stringify(form),
    () => {
      clearTimeout(timer)
      timer = setTimeout(() => router.replace({ query: buildQuery() }), 400)
    },
  )
  onBeforeUnmount(() => clearTimeout(timer))

  const shareUrl = () => (import.meta.client ? location.origin : '') + router.resolve({ path: route.path, query: buildQuery() }).href
  const reset = () => Object.assign(form, defaults())
  const applyPreset = () => Object.assign(form, defaults(), PRESET)

  return { form, errors, parsed, gore, stats, table, nest, cords, warnings, buildError: computed(() => built.value.error), shareUrl, reset, applyPreset }
}
