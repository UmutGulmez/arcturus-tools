<script setup lang="ts">
import { GROUP_ORDER } from '~/utils/columns'
import { downloadText, toCsv, type Cell } from '~/utils/export'
import { parseNumber } from '~/utils/format'

const { s } = useChartCtx()
const f = computed(() => s.active.value!)
const d = computed(() => f.value.data)
const cols = computed(() => d.value.columns)

const from = ref('')
const to = ref('')
const sortKey = ref('')
const sortDir = ref<1 | -1>(1)
const colQuery = ref('')

const DEFAULTS = ['time', 'alt', 'vTotal', 'mach', 'aTotal', 'stab', 'thrust', 'mass', 'aoa']
const sel = ref<string[]>([])
watch(() => f.value.id, () => {
  const ok = DEFAULTS.filter((k) => d.value.cols[k])
  sel.value = ok.length ? ok : cols.value.slice(0, 8).map((c) => c.key)
  sortKey.value = ''
  from.value = ''
  to.value = ''
}, { immediate: true })


const visibleCols = computed(() => cols.value.filter((c) => sel.value.includes(c.key)))
const grouped = computed(() => GROUP_ORDER.map((g) => ({ g, items: cols.value.filter((c) => c.group === g && c.label.toLowerCase().includes(colQuery.value.toLowerCase())) })).filter((x) => x.items.length))

const range = computed(() => {
  const t = d.value.cols.time!
  const a = parseNumber(from.value), b = parseNumber(to.value)
  const idx: number[] = []
  for (let i = 0; i < d.value.rows; i++) {
    if (a !== null && t[i]! < a) continue
    if (b !== null && t[i]! > b) break
    idx.push(i)
  }
  return idx
})
const rows = computed(() => {
  const idx = range.value
  if (!sortKey.value) return idx
  const c = d.value.cols[sortKey.value]
  if (!c) return idx
  const dir = sortDir.value
  return [...idx].sort((p, q) => {
    const a = c[p]!, b = c[q]!
    const na = Number.isNaN(a), nb = Number.isNaN(b)
    if (na || nb) return na === nb ? 0 : na ? 1 : -1
    return (a - b) * dir
  })
})

const ROW_H = 30
const VIEW_H = 520
const top = ref(0)
const start = computed(() => Math.max(0, Math.floor(top.value / ROW_H) - 8))
const end = computed(() => Math.min(rows.value.length, Math.ceil((top.value + VIEW_H) / ROW_H) + 8))
const slice = computed(() => rows.value.slice(start.value, end.value))
const onScroll = (e: Event) => (top.value = (e.target as HTMLElement).scrollTop)

const cellText = (key: string, i: number) => {
  const v = d.value.cols[key]![i]!
  return Number.isNaN(v) ? '—' : String(+v.toPrecision(7))
}
const sortBy = (k: string) => {
  if (sortKey.value === k) { if (sortDir.value === 1) sortDir.value = -1; else sortKey.value = '' } else { sortKey.value = k; sortDir.value = 1 }
}
const toggleCol = (k: string, on: boolean) => { sel.value = on ? [...sel.value, k] : sel.value.filter((x) => x !== k) }

function exportCsv() {
  const head: Cell[] = visibleCols.value.map((c) => (c.unit ? `${c.label} (${c.unit})` : c.label))
  const body: Cell[][] = rows.value.map((i) => visibleCols.value.map((c) => { const v = d.value.cols[c.key]![i]!; return Number.isNaN(v) ? null : v }))
  downloadText('ucus-verisi.csv', toCsv([head, ...body]), 'text/csv')
}
</script>

<template>
  <div class="space-y-3">
    <div class="panel flex flex-wrap items-end gap-3 !p-4">
      <details class="relative">
        <summary class="btn cursor-pointer select-none"><Icon name="lucide:columns-3" size="16" />Sütunlar ({{ sel.length }}/{{ cols.length }})</summary>
        <div class="absolute left-0 z-30 mt-2 w-[min(22rem,80vw)] rounded-2xl border border-space-600 bg-space-800 p-3 shadow-2xl">
          <input v-model="colQuery" class="input mb-2" type="search" placeholder="Sütun ara" aria-label="Sütun ara" />
          <div class="mb-2 flex gap-2 text-xs">
            <button type="button" class="btn !px-2 !py-1" @click="sel = cols.map((c) => c.key)">Tümü</button>
            <button type="button" class="btn !px-2 !py-1" @click="sel = ['time']">Yalnız zaman</button>
          </div>
          <div class="max-h-72 overflow-y-auto pr-1">
            <div v-for="g in grouped" :key="g.g" class="mb-2">
              <p class="text-[11px] uppercase tracking-widest text-zinc-500">{{ g.g }}</p>
              <label v-for="c in g.items" :key="c.key" class="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-sm hover:bg-space-700">
                <input type="checkbox" class="accent-indigo-500" :checked="sel.includes(c.key)" @change="toggleCol(c.key, ($event.target as HTMLInputElement).checked)" />{{ c.label }}
              </label>
            </div>
          </div>
        </div>
      </details>
      <div>
        <label class="mb-1 block text-xs text-zinc-400" for="t-from">Başlangıç (s)</label>
        <input id="t-from" v-model="from" class="input !w-28" inputmode="decimal" placeholder="en baş" />
      </div>
      <div>
        <label class="mb-1 block text-xs text-zinc-400" for="t-to">Bitiş (s)</label>
        <input id="t-to" v-model="to" class="input !w-28" inputmode="decimal" placeholder="en son" />
      </div>
      <p class="pb-2 text-xs text-zinc-500">{{ rows.length.toLocaleString('tr-TR') }} / {{ d.rows.toLocaleString('tr-TR') }} satır</p>
      <button type="button" class="btn ml-auto" :disabled="!visibleCols.length || !rows.length" @click="exportCsv"><Icon name="lucide:download" size="16" />Seçili sütun ve aralığı CSV indir</button>
    </div>

    <div class="panel !p-0">
      <div class="overflow-auto" :style="{ height: `${VIEW_H}px` }" tabindex="0" role="region" aria-label="Veri tablosu" @scroll.passive="onScroll">
        <table class="data-table min-w-full whitespace-nowrap">
          <thead class="sticky top-0 z-10 bg-space-800">
            <tr>
              <th v-for="c in visibleCols" :key="c.key" class="cursor-pointer select-none" :aria-sort="sortKey === c.key ? (sortDir === 1 ? 'ascending' : 'descending') : 'none'" @click="sortBy(c.key)">
                {{ c.label }}<span v-if="c.unit" class="ml-1 normal-case text-zinc-500">({{ c.unit }})</span>
                <Icon v-if="sortKey === c.key" :name="sortDir === 1 ? 'lucide:arrow-up' : 'lucide:arrow-down'" size="12" class="ml-1 inline" />
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="start" :style="{ height: `${start * ROW_H}px` }" aria-hidden="true"><td :colspan="visibleCols.length || 1" class="!border-0 !p-0" /></tr>
            <tr v-for="i in slice" :key="i" class="cursor-pointer" :style="{ height: `${ROW_H}px` }" @click="s.setCursor(d.cols.time![i]!, { pin: true })">
              <td v-for="c in visibleCols" :key="c.key" class="num !py-0 leading-[29px]">{{ cellText(c.key, i) }}</td>
            </tr>
            <tr v-if="end < rows.length" :style="{ height: `${(rows.length - end) * ROW_H}px` }" aria-hidden="true"><td :colspan="visibleCols.length || 1" class="!border-0 !p-0" /></tr>
          </tbody>
        </table>
        <p v-if="!rows.length" class="p-6 text-center text-sm text-zinc-500">Seçilen zaman aralığında satır yok.</p>
      </div>
    </div>
    <p class="text-xs text-zinc-500">Değerler dosyadaki birimlerdedir; eksik değerler (NaN) "—" ile gösterilir ve dışa aktarımda boş bırakılır. Satıra tıklamak zaman imlecini o ana taşır.</p>
  </div>
</template>
