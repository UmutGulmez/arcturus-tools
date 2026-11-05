// Grafik eksenleri için "güzel" ölçek hesabı.

export interface NiceScale {
  min: number
  max: number
  ticks: number[]
}

function niceNumber(range: number, round: boolean): number {
  const exp = Math.floor(Math.log10(range))
  const f = range / 10 ** exp
  let nf: number
  if (round) nf = f < 1.5 ? 1 : f < 3 ? 2 : f < 7 ? 5 : 10
  else nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10
  return nf * 10 ** exp
}

export function niceScale(min: number, max: number, count = 5, includeZero = true): NiceScale {
  if (includeZero) {
    min = Math.min(min, 0)
    max = Math.max(max, 0)
  }
  if (!Number.isFinite(min) || !Number.isFinite(max)) return { min: 0, max: 1, ticks: [0, 1] }
  if (max - min < 1e-12) {
    max = min + 1
  }
  const range = niceNumber(max - min, false)
  const step = niceNumber(range / (count - 1), true)
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step) * step
  const ticks: number[] = []
  for (let v = lo; v <= hi + step * 1e-6; v += step) ticks.push(Number(v.toPrecision(12)))
  return { min: lo, max: hi, ticks }
}
