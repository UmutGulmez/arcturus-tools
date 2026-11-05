// Simülasyon ve Monte Carlo hesaplarını arayüzü kilitlemeden çalıştırır.
import { runTask } from '../utils/parachuteTasks'
import type { TaskMessage } from '../utils/parachuteTasks'

self.onmessage = (e: MessageEvent<{ id: number; msg: TaskMessage }>) => {
  const { id, msg } = e.data
  try {
    self.postMessage({ id, result: runTask(msg) })
  } catch (err) {
    self.postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
