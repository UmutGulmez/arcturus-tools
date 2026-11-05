import type { Analysis, SimParams } from '~/utils/parachute'
import { analyze } from '~/utils/parachute'
import type { FieldErrors, FieldKey, FormState } from '~/utils/parachuteFields'
import {
  FIELDS, FIELD_KEYS, PRESETS, defaultForm, errorsOfGroup, parseForm, toMcConfig, toStaticInputs, toTargets,
} from '~/utils/parachuteFields'
import type { Preset } from '~/utils/parachuteFields'

/**
 * Form durumu, doğrulama, debounce'lu anlık hesap ve URL (query) eşitlemesi.
 * Form alanları metin olarak tutulur ("0,8" yazılabilsin diye); ayrıştırma `parseForm` ile yapılır.
 */
export function useParachuteForm() {
  const route = useRoute()
  const router = useRouter()

  const form = reactive<FormState>(defaultForm())
  for (const key of FIELD_KEYS) {
    const q = route.query[key]
    if (typeof q === 'string') form[key] = q
  }

  const parsed = computed(() => parseForm(form))

  // Zorunlu alan hatası ("Bu alan zorunlu."), kullanıcı o alanı düzenleyene kadar gösterilmez;
  // böylece sayfa boş ve sakin açılır. Hesap yine de boş zorunlu alan varken çalışmaz.
  const touched = reactive<Partial<Record<FieldKey, boolean>>>({})
  watch(
    () => FIELD_KEYS.map((k) => form[k]),
    (now, before) => FIELD_KEYS.forEach((k, i) => now[i] !== before[i] && (touched[k] = true)),
  )
  const visibleErrors = computed(() => {
    const out: FieldErrors = {}
    for (const k of FIELD_KEYS) {
      const e = parsed.value.errors[k]
      if (e && (touched[k] || form[k].trim() !== '')) out[k] = e
    }
    return out
  })
  const staticErrors = computed(() => errorsOfGroup(parsed.value.errors, 'static'))
  const visibleStaticErrors = computed(() => errorsOfGroup(visibleErrors.value, 'static'))
  const simErrors = computed(() => errorsOfGroup(parsed.value.errors, 'sim'))
  const mcErrors = computed(() => errorsOfGroup(parsed.value.errors, 'mc'))
  const allErrors = visibleErrors
  const hasStaticErrors = computed(() => Object.keys(staticErrors.value).length > 0)

  const inputs = computed(() => (hasStaticErrors.value ? null : toStaticInputs(parsed.value.values)))
  const targets = computed(() => toTargets(parsed.value.values))

  // ---- anlık hesap (debounce)
  const calcKey = computed(() => JSON.stringify([inputs.value, targets.value]))
  const compute = (): Analysis | null => (inputs.value ? analyze(inputs.value, targets.value) : null)
  const analysis = shallowRef<Analysis | null>(compute())
  const pending = ref(false)
  let calcTimer: ReturnType<typeof setTimeout> | undefined
  watch(calcKey, () => {
    clearTimeout(calcTimer)
    if (!inputs.value) {
      analysis.value = null
      pending.value = false
      return
    }
    pending.value = true
    calcTimer = setTimeout(() => {
      analysis.value = compute()
      pending.value = false
    }, 250)
  })

  // ---- simülasyon / Monte Carlo parametreleri
  const simParams = computed<SimParams | null>(() => {
    const v = parsed.value.values
    if (!inputs.value || Object.keys(simErrors.value).length) return null
    return { inputs: inputs.value, v0: v.v0!, h0: v.h0! }
  })
  const mcParams = computed(() => {
    if (!inputs.value || Object.keys(mcErrors.value).length) return null
    return { inputs: inputs.value, cfg: toMcConfig(parsed.value.values) }
  })
  const simKey = computed(() => JSON.stringify(simParams.value))
  const mcKey = computed(() => JSON.stringify(mcParams.value))

  // ---- karşılaştırma sekmesi için ortak ortam parametreleri (geçersizse varsayılan)
  const env = computed(() => {
    const v = parsed.value.errors
    const val = parsed.value.values
    return {
      g: v.g ? 9.807 : val.g!,
      dT: v.dT ? 0 : val.dT!,
      proj: v.proj ? 1 : val.proj!,
    }
  })

  // ---- URL eşitleme (yalnızca varsayılandan farklı alanlar)
  function buildQuery(): Record<string, string> {
    const q: Record<string, string> = {}
    for (const k of FIELD_KEYS) {
      if (form[k] !== FIELDS[k].defaultValue) q[k] = form[k].trim().replace(',', '.')
    }
    return q
  }
  let urlTimer: ReturnType<typeof setTimeout> | undefined
  watch(form, () => {
    clearTimeout(urlTimer)
    urlTimer = setTimeout(() => router.replace({ query: buildQuery() }), 400)
  })
  onBeforeUnmount(() => {
    clearTimeout(calcTimer)
    clearTimeout(urlTimer)
  })

  function shareUrl(): string {
    const href = router.resolve({ path: route.path, query: buildQuery() }).href
    return new URL(href, window.location.origin).toString()
  }

  // ---- eylemler
  function reset() {
    Object.assign(form, defaultForm())
    // izleyici (watch) değişen alanları "dokunulmuş" yapar; o çalıştıktan sonra temizle
    nextTick(() => {
      for (const k of FIELD_KEYS) delete touched[k]
    })
  }
  function applyPreset(p: Preset) {
    reset()
    form.m = p.m
    form.d = p.d
  }
  function setField(key: FieldKey, value: string) {
    form[key] = value
  }

  return {
    form, parsed, allErrors, staticErrors, visibleStaticErrors, simErrors, mcErrors, hasStaticErrors,
    inputs, targets, analysis, pending, simParams, mcParams, simKey, mcKey, env,
    presets: PRESETS, applyPreset, reset, setField, shareUrl,
  }
}
