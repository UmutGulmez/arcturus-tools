<script setup lang="ts">
import { downloadBytes, downloadText, toCsv } from '~/utils/export'
import { fmt } from '~/utils/format'
import { goreDxf, gorePdf, goreSvg, planTiles, stationsCsvRows } from '~/utils/goreExport'

useSeoMeta({
  title: 'Paraşüt Kalıp Oluşturucu · Arcturus Tools',
  description: 'Paraşüt dilim (gore) kesim kalıbı: canlı SVG önizleme, 1:1 A4 parçalı PDF, DXF, kumaş ve kordon hesabı.',
  ogTitle: 'Paraşüt Kalıp Oluşturucu · Arcturus Tools',
  ogDescription: 'Dilim kalıbını çiz, 1:1 yazdır veya DXF olarak kesiciye gönder.',
})

const p = useGoreForm()
const tab = ref('pattern')
const grid = ref(false)
const dims = ref(true)
const tabs = [
  { id: 'pattern', label: 'Kalıp', icon: 'lucide:scissors' },
  { id: 'table', label: 'Ölçüler', icon: 'lucide:ruler' },
  { id: 'fabric', label: 'Kumaş ve kordon', icon: 'lucide:layers' },
  { id: 'method', label: 'Yöntem', icon: 'lucide:sigma' },
]

const nInt = computed(() => Math.round(p.parsed.value.input?.n ?? 0))
const ready = computed(() => !!p.gore.value)

const base = computed(() => `parasut-kalip-D${p.form.d.replace(',', '.')}m-N${nInt.value}`)
const exporting = ref<string | null>(null)

function exportSvg() {
  const g = p.gore.value
  if (g) downloadText(`${base.value}.svg`, goreSvg(g, { grid: false, dims: false, theme: 'print', physical: true, scaleSquare: true }), 'image/svg+xml')
}
function exportDxf() {
  const g = p.gore.value
  if (g) downloadText(`${base.value}.dxf`, goreDxf(g), 'application/dxf')
}
function exportPdf() {
  const g = p.gore.value
  const inp = p.parsed.value.input
  if (!g || !inp) return
  exporting.value = 'pdf'
  // Kısa bir gecikme, düğmenin "hazırlanıyor" durumunu çizdirir
  setTimeout(() => {
    try {
      downloadBytes(`${base.value}.pdf`, gorePdf(g, { d0m: inp.d0, n: nInt.value }).bytes, 'application/pdf')
    } finally {
      exporting.value = null
    }
  }, 20)
}
function exportCsv() {
  if (p.gore.value) downloadText(`${base.value}-olculer.csv`, toCsv(stationsCsvRows(p.table.value)), 'text/csv')
}

const copied = ref(false)
async function copyLink() {
  try {
    await navigator.clipboard.writeText(p.shareUrl())
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    window.prompt('Bağlantıyı kopyalayın:', p.shareUrl())
  }
}

const speedLink = computed(() => {
  const d = p.parsed.value.input?.d0
  return d ? { path: '/tools/parasut-hiz', query: { d: String(d) } } : '/tools/parasut-hiz'
})
const pdfPages = computed(() => (p.gore.value ? planTiles(p.gore.value).pages + 1 : 0))
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-arc-400">
      <Icon name="lucide:arrow-left" size="14" /> Dashboard
    </NuxtLink>

    <header class="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon name="lucide:scissors" size="28" /></span>
        <div>
          <h1 class="text-2xl font-bold text-white">Paraşüt Kalıp Oluşturucu</h1>
          <p class="text-sm text-zinc-400">Dilim (gore) kesim kalıbı, 1:1 PDF ve DXF, kumaş ve kordon ihtiyacı. Her şey tarayıcında hesaplanır.</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn" @click="copyLink"><Icon :name="copied ? 'lucide:check' : 'lucide:link'" size="16" /> {{ copied ? 'Kopyalandı' : 'Bağlantıyı kopyala' }}</button>
        <button type="button" class="btn" :disabled="!ready" @click="exportSvg"><Icon name="lucide:file-code" size="16" /> SVG</button>
        <button type="button" class="btn btn-primary" :disabled="!ready || exporting === 'pdf'" @click="exportPdf"><Icon name="lucide:file-down" size="16" /> {{ exporting === 'pdf' ? 'Hazırlanıyor…' : 'PDF (1:1, A4)' }}</button>
        <button type="button" class="btn" :disabled="!ready" @click="exportDxf"><Icon name="lucide:drafting-compass" size="16" /> DXF</button>
        <button type="button" class="btn" :disabled="!ready" @click="exportCsv"><Icon name="lucide:file-spreadsheet" size="16" /> Ölçü CSV</button>
      </div>
    </header>

    <div class="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="lg:sticky lg:top-[1.5rem] lg:max-h-[calc(100vh-3rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
        <GoreForm :form="p.form" :errors="p.errors.value" @preset="p.applyPreset" @reset="p.reset" />
      </div>

      <div class="min-w-0 space-y-4">
        <div v-if="!ready && !p.buildError.value" class="panel grid place-items-center gap-3 py-14 text-center">
          <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon name="lucide:scissors" size="28" /></span>
          <div>
            <p class="font-medium text-white">Kalıp burada çizilecek</p>
            <p class="mt-1 max-w-md text-sm text-zinc-400">Soldan <b class="text-zinc-200">nominal çapı</b> ve dilim sayısını girin; girdi değiştikçe kalıp anında güncellenir. Ya da <button type="button" class="text-arc-400 underline underline-offset-2" @click="p.applyPreset">örnek değerleri doldurun</button>.</p>
          </div>
        </div>

        <template v-if="p.warnings.value.length">
          <ul class="space-y-2" aria-label="Uyarılar">
            <li
              v-for="(w, k) in p.warnings.value"
              :key="k"
              class="flex items-start gap-3 rounded-xl border px-4 py-3 text-sm"
              :class="w.level === 'error' ? 'border-rose-500/40 bg-rose-500/10 text-rose-100' : 'border-amber-500/30 bg-amber-500/5 text-amber-100'"
            >
              <Icon name="lucide:triangle-alert" size="16" class="mt-0.5 shrink-0" :class="w.level === 'error' ? 'text-rose-400' : 'text-amber-400'" />
              <span><span class="sr-only">{{ w.level === 'error' ? 'Hata: ' : 'Uyarı: ' }}</span>{{ w.text }}</span>
            </li>
          </ul>
        </template>

        <template v-if="p.gore.value && p.stats.value">
          <div class="panel flex flex-wrap items-center justify-between gap-4 !p-4">
            <div class="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              <p><span class="text-zinc-400">Nominal çap</span> <b class="tabular-nums text-white">{{ fmt(p.parsed.value.input!.d0 * 100, 1) }} cm</b></p>
              <p><span class="text-zinc-400">Nominal alan S0</span> <b class="tabular-nums text-white">{{ fmt(p.gore.value.nominalArea / 10000, 3) }} m²</b></p>
              <p v-if="p.gore.value.sphereR"><span class="text-zinc-400">Küre yarıçapı R</span> <b class="tabular-nums text-white">{{ fmt(p.gore.value.sphereR, 1) }} cm</b></p>
              <p><span class="text-zinc-400">PDF</span> <b class="tabular-nums text-white">{{ pdfPages }} sayfa A4</b></p>
              <p><span class="text-zinc-400">Dilim</span> <b class="tabular-nums text-white">{{ fmt(p.gore.value.height, 1) }} × {{ fmt(p.stats.value.boundsW, 1) }} cm</b></p>
            </div>
            <NuxtLink :to="speedLink" class="btn" title="Bu nominal çapla paraşüt hız hesaplayıcısını aç"><Icon name="lucide:arrow-down-to-line" size="16" /> Bu çapla iniş hızı</NuxtLink>
          </div>

          <ParachuteTabBar v-model="tab" :items="tabs" id-prefix="gore" label="Görünüm" variant="pill" />

          <div v-show="tab === 'pattern'" id="gore-panel-pattern" role="tabpanel" aria-labelledby="gore-tab-pattern">
            <GorePreview v-model:grid="grid" v-model:dims="dims" :gore="p.gore.value" />
          </div>
          <div v-show="tab === 'table'" id="gore-panel-table" role="tabpanel" aria-labelledby="gore-tab-table">
            <GoreTable :gore="p.gore.value" :stats="p.stats.value" :rows="p.table.value" :n="nInt" />
          </div>
          <div v-show="tab === 'fabric'" id="gore-panel-fabric" role="tabpanel" aria-labelledby="gore-tab-fabric">
            <GoreFabric :nest="p.nest.value" :cords="p.cords.value" :roll="p.parsed.value.roll" :stats="p.stats.value" :n="nInt" />
          </div>
          <div v-show="tab === 'method'" id="gore-panel-method" role="tabpanel" aria-labelledby="gore-tab-method">
            <GoreMethod />
          </div>
        </template>
      </div>
    </div>
  </div>
</template>
