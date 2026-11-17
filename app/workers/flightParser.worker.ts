import { parseFlightBuffer } from '~/utils/flightParser'

self.onmessage = (e: MessageEvent<{ id: number; buf: ArrayBuffer }>) => {
  const { id, buf } = e.data
  try {
    const data = parseFlightBuffer(buf)
    const transfer = Object.values(data.cols).map((c) => c.buffer as ArrayBuffer)
    ;(self as unknown as Worker).postMessage({ id, data }, transfer)
  } catch (err) {
    ;(self as unknown as Worker).postMessage({ id, error: err instanceof Error ? err.message : String(err) })
  }
}
