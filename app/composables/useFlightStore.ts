import type { InjectionKey } from 'vue'
import { parseFlightBuffer, type FlightData } from '~/utils/flightParser'
import { computeMetrics, DEFAULT_THRESHOLDS, valueAt, type FlightMetrics, type Thresholds } from '~/utils/flightMetrics'
import { DEFAULT_UNITS, FILE_COLORS, dispUnit, type ChartFile, type UnitPrefs } from '~/utils/flightChart'

export interface LoadedFile extends ChartFile {
  fileName: string
  size: number
}

export interface BuilderConfig {
  x: string
  y: { key: string; axis: 0 | 1 }[]
}

export interface LoadIssue { name: string; message: string }

const LS = { th: 'arc-flight-thresholds', units: 'arc-flight-units', builder: 'arc-flight-builder' }

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? ({ ...fallback, ...JSON.parse(raw) } as T) : fallback
  } catch {
    return fallback
  }
}
function lsSet(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)) } catch { /* depolama yoksa devam */ }
}

export function createFlightStore() {
  const files = shallowRef<LoadedFile[]>([])
  const activeId = ref('')
  const issues = ref<LoadIssue[]>([])
  const loading = ref(false)
  const thresholds = reactive<Thresholds>({ ...DEFAULT_THRESHOLDS })
  const units = reactive<UnitPrefs>({ ...DEFAULT_UNITS })
  const builder = ref<BuilderConfig | null>(null)
  const report = ref(false)

  // Zaman imleci
  const cursor = ref<number | null>(null)
  const pinned = ref(false)
  const playing = ref(false)
  const speed = ref(1)

  onMounted(() => {
    Object.assign(thresholds, lsGet(LS.th, DEFAULT_THRESHOLDS))
    Object.assign(units, lsGet(LS.units, DEFAULT_UNITS))
    try {
      const b = localStorage.getItem(LS.builder)
      if (b) builder.value = JSON.parse(b)
    } catch { /* yok say */ }
  })
  watch(thresholds, () => lsSet(LS.th, { ...thresholds }), { deep: true })
  watch(units, () => lsSet(LS.units, { ...units }), { deep: true })
  const saveBuilder = (b: BuilderConfig) => { builder.value = b; lsSet(LS.builder, b) }

  const active = computed(() => files.value.find((f) => f.id === activeId.value) ?? files.value[0] ?? null)
  const tRange = computed<[number, number]>(() => {
    const t = active.value?.data.cols.time
    return t ? [t[0]!, t[t.length - 1]!] : [0, 0]
  })

  /* ----- Yükleme (Web Worker; olmazsa ana iş parçacığı) ----- */
  let worker: Worker | null = null
  let broken = false
  let seq = 0
  const waiting = new Map<number, { resolve: (d: FlightData) => void; reject: (e: Error) => void }>()

  function getWorker(): Worker | null {
    if (broken || import.meta.server || typeof Worker === 'undefined') return null
    if (worker) return worker
    try {
      worker = new Worker(new URL('../workers/flightParser.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<{ id: number; data?: FlightData; error?: string }>) => {
        const w = waiting.get(e.data.id)
        if (!w) return
        waiting.delete(e.data.id)
        if (e.data.error) w.reject(new Error(e.data.error))
        else w.resolve(e.data.data!)
      }
      worker.onerror = () => {
        broken = true
        worker?.terminate()
        worker = null
        for (const w of waiting.values()) w.reject(new Error('__worker__'))
        waiting.clear()
      }
    } catch {
      broken = true
      worker = null
    }
    return worker
  }

  async function parse(buf: ArrayBuffer): Promise<FlightData> {
    const w = getWorker()
    if (w) {
      try {
        const id = ++seq
        const copy = buf.slice(0) // başarısız olursa yedek için kopya
        return await new Promise<FlightData>((resolve, reject) => {
          waiting.set(id, { resolve, reject })
          w.postMessage({ id, buf: copy }, [copy])
        })
      } catch (e) {
        if (!(e instanceof Error && e.message === '__worker__')) throw e
      }
    }
    await new Promise((r) => setTimeout(r, 0))
    return parseFlightBuffer(buf)
  }

  async function addBuffer(fileName: string, buf: ArrayBuffer) {
    try {
      const data = await parse(buf)
      const id = `f${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`
      const used = new Set(files.value.map((f) => f.color))
      const color = FILE_COLORS.find((c) => !used.has(c)) ?? FILE_COLORS[files.value.length % FILE_COLORS.length]!
      const metrics = computeMetrics(data)
      const f: LoadedFile = { id, fileName, name: data.name, color, data, metrics, size: buf.byteLength }
      files.value = [...files.value, f]
      if (!activeId.value) activeId.value = id
      if (cursor.value === null) cursor.value = null
    } catch (e) {
      issues.value = [...issues.value, { name: fileName, message: e instanceof Error ? e.message : 'Dosya okunamadı.' }]
    }
  }

  async function addFiles(list: File[]) {
    loading.value = true
    issues.value = []
    try {
      for (const f of list) {
        if (f.size > 400 * 1024 * 1024) {
          issues.value = [...issues.value, { name: f.name, message: 'Dosya çok büyük (400 MB üstü).' }]
          continue
        }
        await addBuffer(f.name, await f.arrayBuffer())
      }
    } finally {
      loading.value = false
    }
  }

  async function loadSample() {
    loading.value = true
    issues.value = []
    try {
      const res = await fetch('/ornek-ucus.csv')
      if (!res.ok) throw new Error('Örnek dosya indirilemedi.')
      await addBuffer('ornek-ucus.csv', await res.arrayBuffer())
    } catch (e) {
      issues.value = [{ name: 'ornek-ucus.csv', message: e instanceof Error ? e.message : 'Örnek veri yüklenemedi.' }]
    } finally {
      loading.value = false
    }
  }

  function remove(id: string) {
    files.value = files.value.filter((f) => f.id !== id)
    if (activeId.value === id) activeId.value = files.value[0]?.id ?? ''
    if (!files.value.length) { cursor.value = null; pinned.value = false; playing.value = false }
  }
  const clearAll = () => { files.value = []; activeId.value = ''; cursor.value = null; pinned.value = false; playing.value = false; issues.value = [] }

  /* ----- İmleç ----- */
  function setCursor(t: number | null, o: { pin?: boolean; hover?: boolean } = {}) {
    if (o.hover && pinned.value) return
    if (o.pin !== undefined) pinned.value = o.pin
    cursor.value = t
  }

  let raf = 0
  let last = 0
  function tick(now: number) {
    if (!playing.value) return
    const [a, b] = tRange.value
    const dt = (now - last) / 1000
    last = now
    let c = (cursor.value ?? a) + dt * speed.value
    if (c >= b) { c = b; playing.value = false }
    cursor.value = c
    if (playing.value) raf = requestAnimationFrame(tick)
  }
  watch(playing, (p) => {
    cancelAnimationFrame(raf)
    if (p) {
      const [a, b] = tRange.value
      if (cursor.value === null || cursor.value >= b) cursor.value = a
      pinned.value = true
      last = performance.now()
      raf = requestAnimationFrame(tick)
    }
  })
  onBeforeUnmount(() => { cancelAnimationFrame(raf); worker?.terminate() })

  /* ----- İmleçteki anlık değerler ----- */
  const readout = computed(() => {
    const f = active.value
    if (!f || cursor.value === null) return null
    const t = f.data.cols.time!
    const rows: { key: string; label: string; value: number | null; unit: string }[] = []
    const want: [string, string][] = [
      ['alt', 'İrtifa'], ['vTotal', 'Hız'], ['mach', 'Mach'], ['aTotal', 'İvme'], ['cg', 'CG'], ['cp', 'CP'],
      ['stab', 'Stabilite'], ['thrust', 'İtki'], ['mass', 'Kütle'], ['aoa', 'Hücum açısı'],
    ]
    for (const [key, label] of want) {
      const c = f.data.cols[key]
      if (!c) continue
      const col = f.data.columns.find((x) => x.key === key)
      const u = dispUnit(key, col?.unit ?? '', units)
      const v = valueAt(t, c, cursor.value)
      rows.push({ key, label, value: v === null ? null : v * u.scale, unit: u.unit })
    }
    return rows
  })

  return {
    files, activeId, active, issues, loading, thresholds, units, builder, saveBuilder, report,
    cursor, pinned, playing, speed, tRange, readout,
    addFiles, loadSample, remove, clearAll, setCursor,
  }
}

export type FlightStore = ReturnType<typeof createFlightStore>
export const FLIGHT_KEY: InjectionKey<FlightStore> = Symbol('flight')

export function useFlight(): FlightStore {
  const s = inject(FLIGHT_KEY)
  if (!s) throw new Error('useFlight yalnızca uçuş analizi sayfası içinde kullanılabilir.')
  return s
}
