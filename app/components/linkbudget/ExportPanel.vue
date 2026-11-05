<script setup lang="ts">
import { copyText, downloadText, toCsv } from '~/utils/export'
import type { LineResult } from '~/utils/linkBudget'
import { exportJson, ktrLatex, ktrRows, ktrSteps, reportParagraph, summaryCsvRows } from '~/utils/linkBudgetReport'

const props = defineProps<{ r: LineResult; all: { label: string; r: LineResult }[]; dec: number }>()

const rows = computed(() => ktrRows(props.r, props.dec))
const steps = computed(() => ktrSteps(props.r, props.dec).join('\n'))
const latex = computed(() => ktrLatex(props.r, props.dec))
const para = computed(() => reportParagraph(props.r, props.dec))
const tableTsv = computed(() => ['Parametre\tDeğer', ...rows.value.map(([k, v]) => `${k}\t${v}`)].join('\n'))

const copied = ref('')
async function copy(key: string, text: string) {
  if (await copyText(text)) {
    copied.value = key
    setTimeout(() => (copied.value = ''), 1800)
  }
}
const dlJson = () => downloadText('link-butcesi.json', JSON.stringify(exportJson(props.all), null, 2), 'application/json')
const dlCsv = () => downloadText('link-butcesi.csv', toCsv(summaryCsvRows(props.all, props.dec)), 'text/csv')
</script>

<template>
  <section aria-labelledby="lb-rapor" class="space-y-4">
    <div class="panel">
      <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
        <ParachuteSectionHeader heading-id="lb-rapor" icon="lucide:file-text" title="KTR/ÖTR rapor çıktısı" subtitle="Parametre tablosu, hesap adımları, LaTeX ve taslak paragraf." />
        <div class="flex flex-wrap gap-2">
          <button type="button" class="btn" @click="dlJson"><Icon name="lucide:file-json" size="16" /> JSON</button>
          <button type="button" class="btn" @click="dlCsv"><Icon name="lucide:file-spreadsheet" size="16" /> CSV</button>
        </div>
      </div>

      <div class="relative overflow-x-auto">
        <table class="data-table max-w-lg">
          <caption class="sr-only">KTR parametre tablosu</caption>
          <thead><tr><th scope="col">Parametre</th><th scope="col" class="num">Değer</th></tr></thead>
          <tbody><tr v-for="[k, v] in rows" :key="k"><td>{{ k }}</td><td class="num">{{ v }}</td></tr></tbody>
        </table>
      </div>
      <button type="button" class="btn mt-3" @click="copy('table', tableTsv)"><Icon :name="copied === 'table' ? 'lucide:check' : 'lucide:copy'" size="16" /> {{ copied === 'table' ? 'Kopyalandı' : 'Tabloyu kopyala' }}</button>
    </div>

    <div class="panel">
      <div class="mb-2 flex flex-wrap items-center justify-between gap-2">
        <p class="text-sm font-medium text-zinc-200">Hesap adımları</p>
        <div class="flex gap-2">
          <button type="button" class="btn !py-1.5 text-xs" @click="copy('steps', steps)"><Icon :name="copied === 'steps' ? 'lucide:check' : 'lucide:copy'" size="14" /> Düz metin</button>
          <button type="button" class="btn !py-1.5 text-xs" @click="copy('latex', latex)"><Icon :name="copied === 'latex' ? 'lucide:check' : 'lucide:copy'" size="14" /> LaTeX</button>
        </div>
      </div>
      <pre class="overflow-x-auto whitespace-pre-wrap rounded-lg bg-space-900 p-3 font-mono text-xs leading-relaxed text-zinc-300">{{ steps }}</pre>
      <details class="mt-3"><summary class="cursor-pointer text-xs text-zinc-400 hover:text-zinc-200">LaTeX önizleme</summary>
        <pre class="mt-2 overflow-x-auto rounded-lg bg-space-900 p-3 font-mono text-xs text-zinc-300">{{ latex }}</pre></details>
    </div>

    <div class="panel">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-sm font-medium text-zinc-200">Rapor taslak paragrafı</p>
        <button type="button" class="btn !py-1.5 text-xs" @click="copy('para', para)"><Icon :name="copied === 'para' ? 'lucide:check' : 'lucide:copy'" size="14" /> {{ copied === 'para' ? 'Kopyalandı' : 'Kopyala' }}</button>
      </div>
      <p class="rounded-lg bg-space-900 p-3 text-sm leading-relaxed text-zinc-300">{{ para }}</p>
      <p class="mt-2 text-xs text-zinc-500">Taslaktır; kendi sistem bilginize göre gözden geçirip düzenleyin.</p>
    </div>
  </section>
</template>
