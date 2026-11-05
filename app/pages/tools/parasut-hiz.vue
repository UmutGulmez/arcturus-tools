<script setup lang="ts">
import { downloadText, simSeriesRows, summaryRows, toCsv } from '~/utils/export'

useSeoMeta({
  title: 'Paraşüt Hız Hesaplayıcı · Arcturus Tools',
  description:
    'Paraşüt terminal iniş hızı, gereken çap, kinetik enerji, dinamik iniş simülasyonu ve Monte Carlo belirsizlik analizi.',
  ogTitle: 'Paraşüt Hız Hesaplayıcı · Arcturus Tools',
  ogDescription: 'Paraşüt terminal iniş hızı hesaplayıcı: rakım, sıcaklık ve belirsizlik analiziyle.',
})

const p = useParachuteForm()
const { sim, mc, runSim, runMc } = useParachuteWorker()

const tab = ref('calc')
const tabs = [
  { id: 'calc', label: 'Hesaplayıcı', icon: 'lucide:calculator' },
  { id: 'compare', label: 'Çoklu karşılaştırma', icon: 'lucide:table-2' },
]
const view = ref('summary')

const simStale = computed(() => sim.status === 'done' && sim.key !== p.simKey.value)
const mcStale = computed(() => mc.status === 'done' && mc.key !== p.mcKey.value)

const runSimulation = () => p.simParams.value && runSim(p.simParams.value, p.simKey.value)
const runMonteCarlo = () => p.mcParams.value && runMc(p.mcParams.value, p.mcKey.value)

// ---- dışa aktarma ve paylaşım
function exportJson() {
  const a = p.analysis.value
  if (!a) return
  const simSummary = sim.result && { ...sim.result, t: undefined, h: undefined, v: undefined, a: undefined, drag: undefined }
  downloadText(
    'parasut-hiz.json',
    JSON.stringify({ olusturulma: new Date().toISOString(), ...a, monteCarlo: mc.result, simulasyon: simSummary }, null, 2),
    'application/json',
  )
}
function exportCsv() {
  const a = p.analysis.value
  if (a) downloadText('parasut-hiz.csv', toCsv(summaryRows(a, mc.result, sim.result)), 'text/csv')
}
function exportSimCsv() {
  if (sim.result) downloadText('parasut-simulasyon.csv', toCsv(simSeriesRows(sim.result)), 'text/csv')
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

const errorCount = computed(() => Object.keys(p.visibleStaticErrors.value).length)

const views = computed(() => [
  { id: 'summary', label: 'Özet', icon: 'lucide:layout-grid', dot: p.analysis.value?.warnings.some((w) => w.level === 'warning') ? ('warn' as const) : undefined },
  { id: 'sim', label: 'Simülasyon', icon: 'lucide:chart-line', dot: sim.status === 'running' ? ('run' as const) : simStale.value ? ('warn' as const) : sim.status === 'done' ? ('ok' as const) : undefined },
  { id: 'mc', label: 'Belirsizlik', icon: 'lucide:dices', dot: mc.status === 'running' ? ('run' as const) : mcStale.value ? ('warn' as const) : mc.status === 'done' ? ('ok' as const) : undefined },
  { id: 'formulas', label: 'Formüller', icon: 'lucide:sigma' },
])
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-arc-400">
      <Icon name="lucide:arrow-left" size="14" /> Dashboard
    </NuxtLink>

    <header class="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon name="lucide:arrow-down-to-line" size="28" /></span>
        <div>
          <h1 class="text-2xl font-bold text-white">Paraşüt Hız Hesaplayıcı</h1>
          <p class="text-sm text-zinc-400">Terminal iniş hızı, ters boyutlandırma, simülasyon ve belirsizlik analizi.</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-2">
        <button type="button" class="btn" @click="copyLink">
          <Icon :name="copied ? 'lucide:check' : 'lucide:link'" size="16" /> {{ copied ? 'Kopyalandı' : 'Bağlantıyı kopyala' }}
        </button>
        <button type="button" class="btn" :disabled="!p.analysis.value" @click="exportJson"><Icon name="lucide:file-json" size="16" /> JSON</button>
        <button type="button" class="btn" :disabled="!p.analysis.value" @click="exportCsv"><Icon name="lucide:file-spreadsheet" size="16" /> CSV</button>
        <button type="button" class="btn" :disabled="!sim.result" @click="exportSimCsv"><Icon name="lucide:chart-line" size="16" /> Simülasyon CSV</button>
      </div>
    </header>

    <ParachuteTabBar v-model="tab" :items="tabs" id-prefix="main" label="Görünüm" class="mt-6" />

    <div v-show="tab === 'calc'" id="main-panel-calc" role="tabpanel" aria-labelledby="main-tab-calc" class="mt-5">
      <ParachuteSummaryBar :analysis="p.analysis.value" :pending="p.pending.value" :error-count="errorCount" />

      <div class="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[24rem_minmax(0,1fr)]">
        <div class="lg:sticky lg:top-[6.25rem] lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <ParachuteInputForm :form="p.form" :errors="p.allErrors.value" :presets="p.presets" @preset="p.applyPreset" @reset="p.reset" />
        </div>

        <div class="min-w-0 space-y-4">
          <ParachuteTabBar v-model="view" :items="views" id-prefix="view" label="Sonuç bölümleri" variant="pill" />

          <div v-show="view === 'summary'" id="view-panel-summary" role="tabpanel" aria-labelledby="view-tab-summary" class="space-y-6">
            <div v-if="!p.analysis.value && !errorCount" class="panel grid place-items-center gap-3 py-14 text-center">
              <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon name="lucide:arrow-down-to-line" size="28" /></span>
              <div>
                <p class="font-medium text-white">Sonuçlar burada görünecek</p>
                <p class="mt-1 max-w-sm text-sm text-zinc-400">Soldan <b class="text-zinc-200">sistem kütlesi</b> ve <b class="text-zinc-200">paraşüt çapını</b> girin; diğer değerler varsayılanlarla hesaplanır. Ya da hazır bir örnek seçin.</p>
              </div>
            </div>
            <div v-else-if="!p.analysis.value" class="panel border-rose-500/40 text-sm text-rose-200" role="alert">
              <p class="flex items-center gap-2 font-medium"><Icon name="lucide:circle-alert" size="16" /> {{ errorCount }} alanda hata var</p>
              <p class="mt-1 text-rose-200/80">Sonuçları görmek için soldaki kırmızı ile işaretli alanları düzeltin.</p>
            </div>
            <template v-else>
              <ParachuteResultCards :analysis="p.analysis.value" :pending="p.pending.value" />
              <ParachuteWarningsList :warnings="p.analysis.value.warnings" />
              <ParachuteSensitivityTable :sens="p.analysis.value.sensitivity" />
            </template>
          </div>

          <div v-show="view === 'sim'" id="view-panel-sim" role="tabpanel" aria-labelledby="view-tab-sim">
            <ParachuteSimulationPanel
              :form="p.form"
              :errors="p.simErrors.value"
              :blocked="!p.simParams.value"
              :state="sim"
              :stale="simStale"
              @run="runSimulation"
            />
          </div>

          <div v-show="view === 'mc'" id="view-panel-mc" role="tabpanel" aria-labelledby="view-tab-mc">
            <ParachuteMonteCarloPanel
              :form="p.form"
              :errors="p.mcErrors.value"
              :blocked="!p.mcParams.value"
              :state="mc"
              :stale="mcStale"
              @run="runMonteCarlo"
            />
          </div>

          <div v-show="view === 'formulas'" id="view-panel-formulas" role="tabpanel" aria-labelledby="view-tab-formulas">
            <ParachuteFormulaPanel />
          </div>
        </div>
      </div>
    </div>

    <div v-show="tab === 'compare'" id="main-panel-compare" role="tabpanel" aria-labelledby="main-tab-compare" class="mt-6">
      <ParachuteComparePanel :env="p.env.value" />
    </div>
  </div>
</template>
