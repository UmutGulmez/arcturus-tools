import type { McConfig, McResult, SimParams, SimResult, StaticInputs } from '~/utils/parachute'
import { runTask } from '~/utils/parachuteTasks'
import type { TaskMessage } from '~/utils/parachuteTasks'

export type RunStatus = 'idle' | 'running' | 'done' | 'error'

export interface RunState<T> {
  status: RunStatus
  result: T | null
  error: string | null
  /** Sonucun üretildiği girdilerin anahtarı (bayatlık kontrolü için) */
  key: string
}

/**
 * Simülasyon ve Monte Carlo'yu Web Worker'da çalıştırır.
 * Worker kurulamazsa ya da hata verirse ana iş parçacığında (bir sonraki turda) çalıştırır.
 */
export function useParachuteWorker() {
  let worker: Worker | null = null
  let broken = false
  let seq = 0
  const waiting = new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()

  function getWorker(): Worker | null {
    if (broken || import.meta.server || typeof Worker === 'undefined') return null
    if (worker) return worker
    try {
      worker = new Worker(new URL('../workers/parachute.worker.ts', import.meta.url), { type: 'module' })
      worker.onmessage = (e: MessageEvent<{ id: number; result?: unknown; error?: string }>) => {
        const w = waiting.get(e.data.id)
        if (!w) return
        waiting.delete(e.data.id)
        if (e.data.error) w.reject(new Error(e.data.error))
        else w.resolve(e.data.result)
      }
      worker.onerror = () => {
        broken = true
        worker?.terminate()
        worker = null
        for (const w of waiting.values()) w.reject(new Error('worker'))
        waiting.clear()
      }
    } catch {
      broken = true
      worker = null
    }
    return worker
  }

  async function inline<T>(msg: TaskMessage): Promise<T> {
    await new Promise((r) => setTimeout(r, 0))
    return runTask(msg) as T
  }

  async function call<T>(msg: TaskMessage): Promise<T> {
    const w = getWorker()
    if (!w) return inline<T>(msg)
    const id = ++seq
    try {
      return await new Promise<T>((resolve, reject) => {
        waiting.set(id, { resolve: resolve as (v: unknown) => void, reject })
        w.postMessage({ id, msg })
      })
    } catch (e) {
      // Worker çöktüyse yedek yol; hesabın kendisi hata verdiyse hatayı ilet.
      if (broken) return inline<T>(msg)
      throw e
    }
  }

  const sim = reactive<RunState<SimResult>>({ status: 'idle', result: null, error: null, key: '' })
  const mc = reactive<RunState<McResult>>({ status: 'idle', result: null, error: null, key: '' })

  async function run<T>(state: RunState<T>, key: string, msg: TaskMessage) {
    state.status = 'running'
    state.error = null
    try {
      state.result = await call<T>(msg)
      state.key = key
      state.status = 'done'
    } catch (e) {
      state.error = e instanceof Error ? e.message : String(e)
      state.status = 'error'
    }
  }

  const runSim = (params: SimParams, key: string) => run(sim, key, { type: 'sim', payload: params })
  const runMc = (payload: { inputs: StaticInputs; cfg: McConfig }, key: string) =>
    run(mc, key, { type: 'mc', payload })

  onBeforeUnmount(() => {
    worker?.terminate()
    worker = null
  })

  return { sim, mc, runSim, runMc }
}
