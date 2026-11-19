<script setup lang="ts">
import { GROUP_ORDER } from '~/utils/columns'
import { FILE_COLORS, dispUnit, xyChart } from '~/utils/flightChart'
import { valueAt } from '~/utils/flightMetrics'
import type { BuilderConfig } from '~/composables/useFlightStore'

const { ctx, s } = useChartCtx()
const c = computed(() => ctx.value!)
const cols = computed(() => c.value.file.data.columns)
const grouped = computed(() => GROUP_ORDER.map((g) => ({ g, items: cols.value.filter((x) => x.group === g) })).filter((x) => x.items.length))

const x = ref('time')
const ys = ref<{ key: string; axis: 0 | 1 }[]>([{ key: 'alt', axis: 0 }])
const saved = ref(false)

function init() {
  const b = s.builder.value
  const has = (k: string) => !!c.value.file.data.cols[k]
  if (b && has(b.x) && b.y.some((y) => has(y.key))) {
    x.value = b.x
    ys.value = b.y.filter((y) => has(y.key))
  } else {
    x.value = 'time'
    ys.value = [{ key: has('alt') ? 'alt' : (cols.value.find((k) => k.key !== 'time')?.key ?? 'time'), axis: 0 }]
  }
}
watch(() => c.value.file.id, init, { immediate: true })

const toggle = (key: string) => {
  const i = ys.value.findIndex((y) => y.key === key)
  if (i >= 0) ys.value.splice(i, 1)
  else if (ys.value.length < 8) ys.value.push({ key, axis: 0 })
}
const isOn = (key: string) => ys.value.some((y) => y.key === key)
const colorOf = (i: number) => FILE_COLORS[i % FILE_COLORS.length]!
const label = (k: string) => cols.value.find((x) => x.key === k)?.label ?? k
const unitOf = (k: string) => {
  const col = cols.value.find((x) => x.key === k)
  const u = dispUnit(k, col?.unit ?? '', s.units)
  return u
}
const nm = (k: string) => `${label(k)}${unitOf(k).unit ? ` (${unitOf(k).unit})` : ''}`

const option = computed(() => {
  if (!ys.value.length) return null
  const a0 = ys.value.filter((y) => y.axis === 0), a1 = ys.value.filter((y) => y.axis === 1)
  const xu = unitOf(x.value)
  return xyChart(c.value, {
    xKey: x.value, xName: nm(x.value), xScale: xu.scale,
    ys: ys.value.map((y, i) => ({ key: y.key, label: label(y.key), color: colorOf(i), axis: y.axis, scale: unitOf(y.key).scale })),
    yNames: [a0.map((y) => nm(y.key)).join(' / '), a1.map((y) => nm(y.key)).join(' / ')],
  })
})
const timeX = computed(() => x.value === 'time')
const cursor = (t: number) => {
  const d = c.value.file.data
  const y0 = ys.value[0]
  if (!y0) return null
  const a = valueAt(d.cols.time!, d.cols[x.value], t), b = valueAt(d.cols.time!, d.cols[y0.key], t)
  return { id: '__cursor', data: a === null || b === null ? [] : [[a * unitOf(x.value).scale, b * unitOf(y0.key).scale]] }
}
function save() {
  s.saveBuilder({ x: x.value, y: ys.value.map((y) => ({ ...y })) } as BuilderConfig)
  saved.value = true
  setTimeout(() => (saved.value = false), 1800)
}
</script>

<template>
  <div class="grid gap-4 xl:grid-cols-[22rem_minmax(0,1fr)]">
    <div class="panel space-y-4 !p-4">
      <div>
        <label class="mb-1 block text-xs text-zinc-400" for="bld-x">X ekseni</label>
        <select id="bld-x" v-model="x" class="input">
          <optgroup v-for="g in grouped" :key="g.g" :label="g.g">
            <option v-for="k in g.items" :key="k.key" :value="k.key">{{ k.label }}{{ k.unit ? ` (${k.unit})` : '' }}</option>
          </optgroup>
        </select>
      </div>
      <fieldset>
        <legend class="mb-1 text-xs text-zinc-400">Y ekseni (en fazla 8 sütun)</legend>
        <div class="max-h-[22rem] space-y-3 overflow-y-auto pr-1">
          <div v-for="g in grouped" :key="g.g">
            <p class="mb-1 text-[11px] uppercase tracking-widest text-zinc-500">{{ g.g }}</p>
            <label v-for="k in g.items" :key="k.key" class="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1 text-sm hover:bg-space-700">
              <input type="checkbox" :checked="isOn(k.key)" class="accent-indigo-500" @change="toggle(k.key)" />
              <span class="min-w-0 flex-1 truncate">{{ k.label }}</span>
              <span v-if="!k.known" class="text-[10px] text-amber-300">bilinmeyen</span>
            </label>
          </div>
        </div>
      </fieldset>
      <div v-if="ys.length">
        <p class="mb-1 text-xs text-zinc-400">Seçili seriler</p>
        <ul class="space-y-1">
          <li v-for="(y, i) in ys" :key="y.key" class="flex items-center gap-2 text-sm">
            <span class="h-2.5 w-2.5 shrink-0 rounded-full" :style="{ background: colorOf(i) }" />
            <span class="min-w-0 flex-1 truncate">{{ label(y.key) }}</span>
            <select v-model.number="y.axis" class="input !w-auto !px-2 !py-1 text-xs" :aria-label="`${label(y.key)} için eksen`">
              <option :value="0">Sol eksen</option>
              <option :value="1">İkinci eksen</option>
            </select>
          </li>
        </ul>
      </div>
      <button class="btn w-full" type="button" @click="save"><Icon :name="saved ? 'lucide:check' : 'lucide:save'" size="16" />{{ saved ? 'Kaydedildi' : 'Ayarı kaydet' }}</button>
    </div>
    <div class="panel min-w-0 !p-4">
      <FlightChart v-if="option" title="Grafik oluşturucu" :option="option" :height="460" :time-x="timeX" :group="timeX ? 'flight-t' : ''" :cursor-fn="timeX ? undefined : cursor" />
      <p v-else class="grid min-h-[12rem] place-items-center text-sm text-zinc-400">Çizmek için soldan en az bir Y sütunu seçin.</p>
    </div>
  </div>
</template>
