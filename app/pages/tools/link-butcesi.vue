<script setup lang="ts">
import { MAX_RANGE_M } from '~/utils/linkBudget'
import type { LineResult } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'
import { copyText } from '~/utils/export'

useSeoMeta({
  title: 'RF Link Bütçesi · Arcturus Tools',
  description: 'Roket telemetrisi için Friis/FSPL, parçalı kayıp modeli, LoRa hassasiyeti, link marjı, menzil, airtime ve veri bütçesi.',
  ogTitle: 'RF Link Bütçesi · Arcturus Tools',
  ogDescription: 'Roket telemetri linki için link marjı, menzil ve LoRa hesaplayıcı.',
})

const lb = useLinkBudgetForm()
const { lines, views, decimals } = lb

const mainTab = ref('line0')
const view = ref('summary')

const lineName = (n: number) => (lines[n]!.a.name ?? '').trim() || `Hat ${n + 1}`
const mainTabs = computed(() => [
  { id: 'line0', label: lineName(0), icon: 'lucide:radio-tower', dot: views.value[0]!.a.analysis ? ('ok' as const) : undefined },
  { id: 'line1', label: lineName(1), icon: 'lucide:radio-tower', dot: views.value[1]!.a.analysis ? ('ok' as const) : undefined },
  { id: 'compare', label: 'Hat karşılaştırması', icon: 'lucide:columns-2' },
])
const n = computed(() => (mainTab.value === 'line0' ? 0 : mainTab.value === 'line1' ? 1 : -1))

const line = computed(() => (n.value >= 0 ? lines[n.value]! : null))
const form = computed(() => (n.value >= 0 ? lb.formOf(n.value) : null))
const cur = computed(() => {
  if (!line.value) return null
  const v = views.value[n.value]!
  return line.value.active === 'b' && v.b ? v.b : v.a
})
const errors = computed(() => (n.value >= 0 ? lb.visibleErrors(n.value, line.value!.active) : {}))
const errCount = computed(() => Object.keys(errors.value).length)
const analysis = computed(() => cur.value?.analysis ?? null)
const result = computed(() => analysis.value?.result ?? null)
const idPrefix = computed(() => `l${n.value}${line.value?.active ?? 'a'}`)
const dec = computed(() => decimals.value)

const scenarioTab = computed(() => {
  if (n.value < 0) return null
  const v = views.value[n.value]!
  const a = v.a.analysis?.result
  const b = v.b?.analysis?.result
  return a && b ? { a, b } : null
})

const viewTabs = computed(() => [
  { id: 'summary', label: 'Özet', icon: 'lucide:layout-grid', dot: result.value?.warnings.some((w) => w.level !== 'info') ? ('warn' as const) : undefined },
  { id: 'charts', label: 'Grafikler', icon: 'lucide:chart-line' },
  { id: 'lora', label: 'LoRa & veri', icon: 'lucide:audio-lines' },
  { id: 'sens', label: 'Duyarlılık', icon: 'lucide:sliders-horizontal' },
  { id: 'scenario', label: 'Senaryolar', icon: 'lucide:git-compare', dot: line.value?.b ? ('ok' as const) : undefined },
  { id: 'report', label: 'Rapor', icon: 'lucide:file-text' },
  { id: 'formulas', label: 'Formüller', icon: 'lucide:sigma' },
])

// tüm geçerli senaryolar (dışa aktarma ve hat karşılaştırması için)
const allItems = computed(() => {
  const out: { label: string; r: LineResult }[] = []
  lines.forEach((l, i) => {
    const v = views.value[i]!
    const name = lineName(i)
    if (v.a.analysis) out.push({ label: l.b ? `${name} · ${l.labelA}` : name, r: v.a.analysis.result })
    if (l.b && v.b?.analysis) out.push({ label: `${name} · ${l.labelB}`, r: v.b.analysis.result })
  })
  return out
})

const km = (r: LineResult) => (r.rangeZero.unbounded ? `≥ ${fmt(MAX_RANGE_M / 1000, 0)} km` : `${fmt(r.rangeZero.meters / 1000, 2)} km`)
const statusCls = (r: LineResult) => (r.status === 'ok' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : r.status === 'low' ? 'border-amber-500/40 bg-amber-500/10 text-amber-300' : 'border-rose-500/40 bg-rose-500/10 text-rose-300')
const statusTxt = (r: LineResult) => (r.status === 'ok' ? 'Yeterli' : r.status === 'low' ? 'Yetersiz / sınırda' : 'Link yok')

const copied = ref(false)
async function copyLink() {
  const ok = await copyText(lb.shareUrl())
  if (!ok) window.prompt('Bağlantıyı kopyalayın:', lb.shareUrl())
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-arc-400"><Icon name="lucide:arrow-left" size="14" /> Dashboard</NuxtLink>

    <header class="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon name="lucide:radio-tower" size="28" /></span>
        <div>
          <h1 class="text-2xl font-bold text-white">RF Link Bütçesi</h1>
          <p class="text-sm text-zinc-400">Friis/FSPL, parçalı kayıp modeli, LoRa hassasiyeti, marj, menzil, airtime ve veri bütçesi.</p>
        </div>
      </div>
      <div class="flex flex-wrap items-center gap-2">
        <button type="button" class="btn" @click="lb.loadReference"><Icon name="lucide:flask-conical" size="16" /> Referans hatları yükle</button>
        <div class="inline-flex items-center gap-2 rounded-xl border border-space-600 bg-space-700 px-3 py-1.5 text-sm text-zinc-200">
          <label for="lb-dec" class="text-xs text-zinc-400">dB basamağı</label>
          <select id="lb-dec" v-model.number="decimals" class="rounded bg-space-900 px-1.5 py-0.5 text-sm"><option :value="1">1</option><option :value="2">2</option></select>
        </div>
        <button type="button" class="btn" @click="copyLink"><Icon :name="copied ? 'lucide:check' : 'lucide:link'" size="16" /> {{ copied ? 'Kopyalandı' : 'Bağlantıyı kopyala' }}</button>
      </div>
    </header>

    <ParachuteTabBar v-model="mainTab" :items="mainTabs" id-prefix="lbmain" label="Hatlar" class="mt-6" />

    <!-- Hat karşılaştırması -->
    <div v-if="mainTab === 'compare'" id="lbmain-panel-compare" role="tabpanel" aria-labelledby="lbmain-tab-compare" class="mt-5">
      <LinkbudgetLineCompare :items="allItems" :dec="dec" />
    </div>

    <!-- Hat paneli -->
    <div v-else-if="line && form" :id="`lbmain-panel-${mainTab}`" role="tabpanel" :aria-labelledby="`lbmain-tab-${mainTab}`" class="mt-5">
      <div class="sticky top-3 z-20 rounded-2xl border border-space-600 bg-space-900/85 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur" role="status" aria-live="polite">
        <div v-if="result" class="flex flex-wrap items-center gap-x-8 gap-y-1">
          <div>
            <p class="text-[11px] uppercase tracking-wide text-zinc-500">Link marjı</p>
            <p class="text-2xl font-bold leading-tight tabular-nums" :class="result.marginUsed < 0 ? 'text-rose-300' : 'text-white'">{{ fmt(result.marginUsed, dec) }} <span class="text-sm font-normal text-zinc-400">dB</span></p>
          </div>
          <div>
            <p class="text-[11px] uppercase tracking-wide text-zinc-500">P_rx</p>
            <p class="text-lg font-semibold leading-tight tabular-nums text-zinc-100">{{ fmt(result.prxDbm, 2) }} <span class="text-sm font-normal text-zinc-400">dBm</span></p>
          </div>
          <div class="hidden sm:block">
            <p class="text-[11px] uppercase tracking-wide text-zinc-500">Menzil (0 dB)</p>
            <p class="text-lg font-semibold leading-tight tabular-nums text-zinc-100">{{ km(result) }}</p>
          </div>
          <div class="hidden md:block">
            <p class="text-[11px] uppercase tracking-wide text-zinc-500">Eğik mesafe</p>
            <p class="text-lg font-semibold leading-tight tabular-nums text-zinc-100">{{ fmt(result.geometry.slantM / 1000, 2) }} km</p>
          </div>
          <div class="ml-auto flex items-center gap-3">
            <Icon v-if="lb.pending.value" name="lucide:loader-circle" size="16" class="animate-spin text-zinc-400" />
            <span class="rounded-full border px-3 py-1 text-xs font-medium" :class="statusCls(result)">{{ statusTxt(result) }}</span>
          </div>
        </div>
        <p v-else-if="errCount" class="flex items-center gap-2 text-sm text-rose-300"><Icon name="lucide:circle-alert" size="16" /> {{ errCount }} alanda hata var; düzeltince sonuçlar burada görünür.</p>
        <p v-else class="flex items-center gap-2 text-sm text-zinc-400"><Icon name="lucide:keyboard" size="16" /> Başlamak için frekans, güç, anten kazançları ve mesafeyi girin ya da referans hatları yükleyin.</p>
      </div>

      <div class="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[26rem_minmax(0,1fr)]">
        <!-- Sol: girdiler -->
        <div class="space-y-3 lg:sticky lg:top-[6.25rem] lg:max-h-[calc(100vh-7.5rem)] lg:self-start lg:overflow-y-auto lg:pr-1">
          <div class="panel space-y-4">
            <div class="flex items-center justify-between gap-2">
              <h2 class="text-base font-semibold text-white">Girdiler</h2>
              <button type="button" class="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-arc-400" @click="lb.resetLine(n)"><Icon name="lucide:rotate-ccw" size="12" /> Hattı sıfırla</button>
            </div>

            <!-- Senaryo seçici -->
            <div class="rounded-xl border border-space-700 bg-space-900/50 p-3">
              <div class="flex flex-wrap items-center gap-2" role="group" aria-label="Senaryo">
                <button type="button" class="rounded-lg border px-3 py-1.5 text-xs transition" :class="line.active === 'a' ? 'border-arc-500 bg-arc-500/15 text-white' : 'border-space-600 text-zinc-300 hover:border-arc-500'" @click="line.active = 'a'">A · {{ line.labelA }}</button>
                <button v-if="line.b" type="button" class="rounded-lg border px-3 py-1.5 text-xs transition" :class="line.active === 'b' ? 'border-arc-500 bg-arc-500/15 text-white' : 'border-space-600 text-zinc-300 hover:border-arc-500'" @click="line.active = 'b'">B · {{ line.labelB }}</button>
                <button v-if="!line.b" type="button" class="btn !px-3 !py-1.5 text-xs" @click="lb.addScenarioB(n)"><Icon name="lucide:copy-plus" size="14" /> Senaryo B ekle (A'dan kopyala)</button>
                <button v-else type="button" class="ml-auto inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-rose-300" @click="lb.removeScenarioB(n)"><Icon name="lucide:trash-2" size="12" /> B'yi sil</button>
              </div>
              <div v-if="line.b" class="mt-2 grid grid-cols-2 gap-2">
                <div><label :for="`${idPrefix}-la`" class="mb-0.5 block text-[11px] text-zinc-500">A etiketi</label><input :id="`${idPrefix}-la`" v-model="line.labelA" class="input !py-1" /></div>
                <div><label :for="`${idPrefix}-lb`" class="mb-0.5 block text-[11px] text-zinc-500">B etiketi</label><input :id="`${idPrefix}-lb`" v-model="line.labelB" class="input !py-1" /></div>
              </div>
              <p v-else class="mt-2 text-xs text-zinc-500">Aynı hat için ikinci bir konfigürasyon (ör. ÖTR → KTR) ekleyip farkı marja etkisiyle görebilirsiniz.</p>
            </div>

            <LinkbudgetLineInputForm :form="form" :errors="errors" :id-prefix="idPrefix" />
            <LinkbudgetLossForm :form="form" :errors="errors" :id-prefix="idPrefix" />
          </div>
        </div>

        <!-- Sağ: sonuçlar -->
        <div class="min-w-0 space-y-4">
          <ParachuteTabBar v-model="view" :items="viewTabs" id-prefix="lbview" label="Sonuç bölümleri" variant="pill" />

          <div v-if="view === 'formulas'" id="lbview-panel-formulas" role="tabpanel" aria-labelledby="lbview-tab-formulas">
            <LinkbudgetFormulaPanel />
          </div>

          <template v-else>
            <div v-if="!analysis || !result" class="panel grid place-items-center gap-3 py-14 text-center">
              <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon :name="errCount ? 'lucide:circle-alert' : 'lucide:radio-tower'" size="28" /></span>
              <div>
                <p class="font-medium text-white">{{ errCount ? `${errCount} alanda hata var` : 'Sonuçlar burada görünecek' }}</p>
                <p class="mt-1 max-w-sm text-sm text-zinc-400">{{ errCount ? 'Soldaki kırmızı ile işaretli alanları düzeltin.' : 'Soldan frekans, güç, anten kazançları ve mesafeyi girin; diğer değerler varsayılanlarla hesaplanır.' }}</p>
                <button v-if="!errCount" type="button" class="btn mt-4" @click="lb.loadReference"><Icon name="lucide:flask-conical" size="16" /> Referans hatları yükle</button>
              </div>
            </div>

            <template v-else>
              <div v-if="view === 'summary'" id="lbview-panel-summary" role="tabpanel" aria-labelledby="lbview-tab-summary" class="space-y-6">
                <LinkbudgetResultCards :r="result" :dec="dec" />
                <ParachuteWarningsList :warnings="result.warnings" />
                <LinkbudgetBudgetTable :r="result" :dec="dec" />
              </div>
              <div v-else-if="view === 'charts'" id="lbview-panel-charts" role="tabpanel" aria-labelledby="lbview-tab-charts"><LinkbudgetChartsPanel :a="analysis" :dec="dec" /></div>
              <div v-else-if="view === 'lora'" id="lbview-panel-lora" role="tabpanel" aria-labelledby="lbview-tab-lora" class="space-y-6">
                <LinkbudgetLoraTable :a="analysis" :dec="dec" />
                <LinkbudgetDataBudget :data="analysis.data" :duty-limit="result.inputs.dutyLimitPct" />
              </div>
              <div v-else-if="view === 'sens'" id="lbview-panel-sens" role="tabpanel" aria-labelledby="lbview-tab-sens"><LinkbudgetSensitivityTable :rows="analysis.sensRows" :dec="dec" /></div>
              <div v-else-if="view === 'scenario'" id="lbview-panel-scenario" role="tabpanel" aria-labelledby="lbview-tab-scenario">
                <LinkbudgetScenarioTable v-if="scenarioTab" :a="scenarioTab.a" :b="scenarioTab.b" :label-a="line.labelA" :label-b="line.labelB" :justif="line.justif" :dec="dec" />
                <div v-else class="panel text-sm text-zinc-400">
                  <p v-if="!line.b">Senaryo karşılaştırması için soldan <b class="text-zinc-200">"Senaryo B ekle"</b> butonuna basın, ardından B'deki değerleri değiştirin (ör. alıcı anten 12 → 9 dBi).</p>
                  <p v-else>Karşılaştırma için A ve B senaryolarının ikisi de geçerli girdilere sahip olmalı.</p>
                </div>
              </div>
              <div v-else-if="view === 'report'" id="lbview-panel-report" role="tabpanel" aria-labelledby="lbview-tab-report"><LinkbudgetExportPanel :r="result" :all="allItems" :dec="dec" /></div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>
