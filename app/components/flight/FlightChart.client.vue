<script setup lang="ts">
import { use, connect } from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { LineChart, ScatterChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent } from 'echarts/components'
import VChart from 'vue-echarts'
import { useFlight } from '~/composables/useFlightStore'

use([CanvasRenderer, LineChart, ScatterChart, BarChart, GridComponent, TooltipComponent, LegendComponent, DataZoomComponent, MarkLineComponent, MarkAreaComponent, MarkPointComponent, GraphicComponent])

const props = withDefaults(defineProps<{
  option: Record<string, any>
  title: string
  height?: number
  /** x ekseni zaman ise imleç senkronu ve tıklama etkin */
  timeX?: boolean
  group?: string
  /** zaman dışı grafiklerde imleç serisi üretici */
  cursorFn?: (t: number) => Record<string, any> | null
  note?: string
}>(), { height: 300, timeX: true, group: 'flight-t' })

const store = useFlight()
const chartRef = ref<InstanceType<typeof VChart> | null>(null)

if (props.group) connect(props.group)

function applyCursor() {
  const chart = chartRef.value
  const t = store.cursor.value
  if (!chart) return
  if (props.timeX) {
    chart.setOption({ series: [{ id: '__cursor', markLine: { data: t === null ? [] : [{ xAxis: t }] } }] }, { lazyUpdate: true })
  } else if (props.cursorFn) {
    const s = t === null ? { id: '__cursor', data: [] } : props.cursorFn(t)
    if (s) chart.setOption({ series: [s] }, { lazyUpdate: true })
  }
}
let queued = false
function schedule() {
  if (queued) return
  queued = true
  requestAnimationFrame(() => { queued = false; applyCursor() })
}
watch(store.cursor, schedule)
watch(() => props.option, () => nextTick(schedule), { flush: 'post' })
onMounted(() => setTimeout(schedule, 50))

function onPointer(e: any) {
  if (!props.timeX) return
  const v = e?.axesInfo?.find((a: any) => a.axisDim === 'x')?.value
  if (typeof v === 'number') store.setCursor(v, { hover: true })
}
function onClick(p: any) {
  if (!props.timeX) return
  const chart = chartRef.value
  const px = p?.event?.offsetX
  if (px === undefined || !chart) return
  const v = chart.convertFromPixel?.({ xAxisIndex: 0 }, px)
  if (typeof v === 'number') store.setCursor(v, { pin: true })
}

function savePng() {
  const url = chartRef.value?.getDataURL({ pixelRatio: 2, backgroundColor: store.report.value ? '#ffffff' : '#16161a' })
  if (!url) return
  const a = document.createElement('a')
  a.href = url
  a.download = `${props.title.toLowerCase().replace(/[^a-z0-9çğıöşü]+/gi, '-')}.png`
  a.click()
}
</script>

<template>
  <figure class="chart-fig min-w-0">
    <figcaption class="mb-1 flex items-center justify-between gap-2">
      <span class="text-sm font-medium" :class="store.report.value ? 'text-zinc-800' : 'text-zinc-200'">{{ title }}</span>
      <button type="button" class="no-print rounded-lg p-1.5 text-zinc-400 hover:bg-space-700 hover:text-white" :aria-label="`${title} grafiğini PNG indir`" :title="'PNG indir'" @click="savePng">
        <Icon name="lucide:image-down" size="16" />
      </button>
    </figcaption>
    <VChart ref="chartRef" class="w-full" :style="{ height: `${height}px` }" :option="option" :update-options="{ notMerge: true }" :group="group" autoresize @updateAxisPointer="onPointer" @zr:click="onClick" />
    <p v-if="note" class="mt-1 text-xs text-zinc-500">{{ note }}</p>
  </figure>
</template>
