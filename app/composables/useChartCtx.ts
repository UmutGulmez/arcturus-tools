import { useFlight } from '~/composables/useFlightStore'
import { themeOf, type ChartCtx } from '~/utils/flightChart'
import { COLUMN_BY_KEY } from '~/utils/columns'

export function useChartCtx() {
  const s = useFlight()
  const ctx = computed<ChartCtx | null>(() => {
    const f = s.active.value
    return f ? { file: f, units: s.units, th: s.thresholds, theme: themeOf(s.report.value) } : null
  })
  const has = (...keys: string[]) => !!ctx.value && keys.every((k) => !!ctx.value!.file.data.cols[k])
  const missing = (...keys: string[]) =>
    ctx.value ? keys.filter((k) => !ctx.value!.file.data.cols[k]).map((k) => COLUMN_BY_KEY.get(k)?.label ?? k) : keys
  return { s, ctx, has, missing }
}
