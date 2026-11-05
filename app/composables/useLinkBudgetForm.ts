import { analyzeLine } from '~/utils/linkBudget'
import type { LineAnalysis } from '~/utils/linkBudget'
import { FORM_KEYS, defaultLineForm, referenceForms, resolveLine } from '~/utils/linkBudgetFields'
import type { LineForm } from '~/utils/linkBudgetFields'

export type ScenarioId = 'a' | 'b'

export interface LineState {
  a: LineForm
  /** İkinci konfigürasyon (ör. KTR); yoksa null */
  b: LineForm | null
  active: ScenarioId
  labelA: string
  labelB: string
  touched: Record<ScenarioId, Record<string, boolean>>
  /** Senaryo karşılaştırması gerekçeleri (satır anahtarı → metin) */
  justif: Record<string, string>
}

export interface LineView {
  a: { errors: Record<string, string>; analysis: LineAnalysis | null }
  b: { errors: Record<string, string>; analysis: LineAnalysis | null } | null
}

const newLine = (): LineState => ({
  a: defaultLineForm(), b: null, active: 'a', labelA: 'ÖTR', labelB: 'KTR',
  touched: { a: {}, b: {} }, justif: {},
})

/**
 * Hat listesi (2 hat) + her hat için en fazla 2 senaryo. Girdi değiştikçe hesap debounce ile yenilenir;
 * form değerleri URL query parametrelerine yazılır ve sayfa açılırken oradan okunur.
 */
export function useLinkBudgetForm() {
  const route = useRoute()
  const router = useRouter()

  const lines = reactive<LineState[]>([newLine(), newLine()])
  const decimals = ref<1 | 2>(1)

  // ---- URL'den oku:  l1a_freq=433  l1b=1  l1la=ÖTR  l1lb=KTR  dec=2
  const q = route.query
  lines.forEach((line, n) => {
    const p = `l${n + 1}`
    for (const s of ['a', 'b'] as const) {
      const has = FORM_KEYS.some((k) => typeof q[`${p}${s}_${k}`] === 'string')
      if (s === 'b' && !has && q[`${p}b`] !== '1') continue
      const form = s === 'a' ? line.a : (line.b = defaultLineForm())
      for (const k of FORM_KEYS) {
        const v = q[`${p}${s}_${k}`]
        if (typeof v === 'string') form[k] = v
      }
    }
    if (typeof q[`${p}la`] === 'string') line.labelA = q[`${p}la`] as string
    if (typeof q[`${p}lb`] === 'string') line.labelB = q[`${p}lb`] as string
  })
  if (q.dec === '2') decimals.value = 2

  // ---- hesap (debounce'lu)
  const view = (form: LineForm) => {
    const r = resolveLine(form)
    return { errors: r.errors, analysis: r.inputs ? analyzeLine(r.inputs) : null }
  }
  const compute = (): LineView[] => lines.map((l) => ({ a: view(l.a), b: l.b ? view(l.b) : null }))
  const views = shallowRef<LineView[]>(compute())
  const pending = ref(false)
  const stateKey = computed(() => JSON.stringify(lines.map((l) => [l.a, l.b])))
  let calcTimer: ReturnType<typeof setTimeout> | undefined
  let urlTimer: ReturnType<typeof setTimeout> | undefined
  let prev = JSON.parse(stateKey.value) as [LineForm, LineForm | null][]

  watch(stateKey, (now) => {
    // değişen alanları "dokunulmuş" işaretle (zorunlu alan hatası ancak o zaman görünür)
    const cur = JSON.parse(now) as [LineForm, LineForm | null][]
    cur.forEach((pair, n) => {
      ;(['a', 'b'] as const).forEach((s, si) => {
        const f = pair[si]
        const o = prev[n]?.[si]
        if (!f) return
        for (const k of FORM_KEYS) if (!o || o[k] !== f[k]) lines[n]!.touched[s][k] = true
      })
    })
    prev = cur
    pending.value = true
    clearTimeout(calcTimer)
    calcTimer = setTimeout(() => {
      views.value = compute()
      pending.value = false
    }, 250)
    clearTimeout(urlTimer)
    urlTimer = setTimeout(() => router.replace({ query: buildQuery() }), 500)
  })
  watch(decimals, () => router.replace({ query: buildQuery() }))
  onBeforeUnmount(() => {
    clearTimeout(calcTimer)
    clearTimeout(urlTimer)
  })

  /** Hata mesajı: zorunlu alan hatası yalnızca dokunulmuş/dolu alanlarda görünür. */
  function visibleErrors(n: number, s: ScenarioId): Record<string, string> {
    const line = lines[n]!
    const form = s === 'a' ? line.a : line.b
    if (!form) return {}
    const out: Record<string, string> = {}
    for (const [k, e] of Object.entries(resolveLine(form).errors)) {
      if (line.touched[s][k] || (form[k] ?? '').trim() !== '') out[k] = e
    }
    return out
  }

  // ---- URL
  function buildQuery(): Record<string, string> {
    const out: Record<string, string> = {}
    const def = defaultLineForm()
    lines.forEach((line, n) => {
      const p = `l${n + 1}`
      for (const s of ['a', 'b'] as const) {
        const form = s === 'a' ? line.a : line.b
        if (!form) continue
        if (s === 'b') out[`${p}b`] = '1'
        for (const k of FORM_KEYS) {
          if (k === 'patCsv') continue // uzun veri URL'ye yazılmaz
          if (form[k] !== def[k]) out[`${p}${s}_${k}`] = form[k]!.trim().replace(',', '.')
        }
      }
      if (line.b) {
        if (line.labelA !== 'ÖTR') out[`${p}la`] = line.labelA
        if (line.labelB !== 'KTR') out[`${p}lb`] = line.labelB
      }
    })
    if (decimals.value === 2) out.dec = '2'
    return out
  }
  function shareUrl(): string {
    const href = router.resolve({ path: route.path, query: buildQuery() }).href
    return new URL(href, window.location.origin).toString()
  }

  // ---- eylemler
  function loadReference() {
    const [a, b] = referenceForms()
    lines[0]!.a = a
    lines[1]!.a = b
    for (const l of lines) { l.b = null; l.active = 'a' }
  }
  function resetLine(n: number) {
    const l = lines[n]!
    l.a = defaultLineForm()
    l.b = null
    l.active = 'a'
    l.touched = { a: {}, b: {} }
    l.justif = {}
    nextTick(() => (l.touched = { a: {}, b: {} }))
  }
  function addScenarioB(n: number) {
    const l = lines[n]!
    l.b = { ...l.a }
    l.active = 'b'
  }
  function removeScenarioB(n: number) {
    const l = lines[n]!
    l.b = null
    l.active = 'a'
  }
  const formOf = (n: number): LineForm => {
    const l = lines[n]!
    return l.active === 'b' && l.b ? l.b : l.a
  }

  return { lines, decimals, views, pending, visibleErrors, shareUrl, loadReference, resetLine, addScenarioB, removeScenarioB, formOf }
}
