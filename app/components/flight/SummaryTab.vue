<script setup lang="ts">
import { buildKpis, fmtKpi, kpiCsv } from '~/utils/flightKpi'
import { eventLabel } from '~/utils/flightChart'
import { downloadText } from '~/utils/export'

const { s } = useChartCtx()
const f = computed(() => s.active.value!)
const kpis = computed(() => buildKpis(f.value.metrics, s.thresholds, s.units))
const groups = computed(() => ['Performans', 'Motor', 'Stabilite', 'Kurtarma ve iniş'].map((g) => ({ g, items: kpis.value.filter((k) => k.group === g) })).filter((x) => x.items.length))
const events = computed(() => f.value.data.events.filter((e) => e.type !== 'SIM_WARN'))
const phases = computed(() => f.value.metrics.phases)
const total = computed(() => Math.max(phases.value.reduce((a, p) => a + (p.t1 - p.t0), 0), 1e-9))

const ring = { ok: 'border-emerald-500/50 bg-emerald-500/5', warn: 'border-amber-500/50 bg-amber-500/5', crit: 'border-rose-500/60 bg-rose-500/10', none: 'border-space-600 bg-space-800/80' }
const txt = { ok: 'text-emerald-300', warn: 'text-amber-300', crit: 'text-rose-300', none: 'text-white' }
const statusText = { ok: 'Uygun', warn: 'Uyarı', crit: 'Kritik', none: '' }

const jump = (t: number) => s.setCursor(t, { pin: true })
const exportCsv = () => downloadText('ucus-kpi.csv', kpiCsv([{ name: f.value.name, kpis: kpis.value }]), 'text/csv')
const evKey = (e: { type: string; t: number }, i: number) => `${e.type}-${e.t}-${i}`
</script>

<template>
  <div class="space-y-6">
    <section aria-labelledby="ev-h">
      <div class="mb-2 flex items-center justify-between">
        <h2 id="ev-h" class="text-sm font-semibold text-white">Olay zaman çizelgesi</h2>
        <span class="text-xs text-zinc-500">Olaya tıklayınca tüm grafiklerde o ana atlanır</span>
      </div>
      <div class="panel !p-4">
        <ol class="flex gap-0 overflow-x-auto pb-2">
          <li v-for="(e, i) in events" :key="evKey(e, i)" class="relative flex min-w-[7rem] shrink-0 flex-col items-center px-1 text-center">
            <span class="absolute left-0 right-0 top-[9px] h-px bg-space-600" aria-hidden="true" />
            <button type="button" class="relative z-10 grid h-[18px] w-[18px] place-items-center rounded-full border-2 border-arc-500 bg-space-900 hover:bg-arc-500" :aria-label="`${eventLabel(e.type)}, t=${e.t} s, bu ana git`" @click="jump(e.t)" />
            <span class="mt-2 text-xs font-medium text-zinc-200">{{ eventLabel(e.type) }}</span>
            <span class="text-[11px] tabular-nums text-zinc-500">{{ e.t.toFixed(2) }} s</span>
          </li>
        </ol>
        <p v-if="!events.length" class="text-sm text-zinc-500">Dosyada olay satırı yok; fazlar verilerden tahmin edildi.</p>
        <div v-if="phases.length" class="mt-3">
          <p class="mb-1 text-xs text-zinc-500">Uçuş fazları (süreye orantılı)</p>
          <div class="flex h-7 overflow-hidden rounded-lg">
            <button v-for="p in phases" :key="p.key" type="button" class="min-w-[3px] text-[11px] font-medium text-white/90 hover:brightness-110" :style="{ width: `${((p.t1 - p.t0) / total) * 100}%`, background: p.color }" :title="`${p.label}: ${p.t0.toFixed(2)} – ${p.t1.toFixed(2)} s (${(p.t1 - p.t0).toFixed(1)} s)`" @click="jump(p.t0)" />
          </div>
          <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-400">
            <li v-for="p in phases" :key="p.key" class="flex items-center gap-1.5">
              <span class="h-2 w-2 rounded-full" :style="{ background: p.color }" />{{ p.label }}
              <span class="tabular-nums text-zinc-500">{{ (p.t1 - p.t0).toFixed(1) }} s</span>
            </li>
          </ul>
        </div>
      </div>
    </section>

    <section v-for="g in groups" :key="g.g" :aria-label="g.g">
      <div class="mb-2 flex items-center justify-between">
        <h2 class="text-sm font-semibold text-white">{{ g.g }}</h2>
        <button v-if="g.g === 'Performans'" type="button" class="btn !py-1 text-xs" @click="exportCsv"><Icon name="lucide:download" size="14" />KPI CSV</button>
      </div>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
        <div v-for="k in g.items" :key="k.id" class="kpi rounded-2xl border p-4" :class="ring[k.status]">
          <div class="flex items-start justify-between gap-2">
            <p class="text-xs text-zinc-400">{{ k.label }}</p>
            <Icon :name="k.icon" size="16" class="shrink-0 text-zinc-500" />
          </div>
          <p class="mt-1 break-words text-2xl font-bold tabular-nums" :class="txt[k.status]">{{ fmtKpi(k) }} <span class="text-sm font-normal text-zinc-400">{{ k.unit }}</span></p>
          <p class="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-zinc-500">
            <span v-if="k.status !== 'none'" class="font-medium" :class="txt[k.status]">{{ statusText[k.status] }}</span>
            <span v-if="k.approx" class="rounded bg-space-700 px-1.5 text-[10px] text-zinc-300">yaklaşık</span>
            <span v-if="k.sub">{{ k.sub }}</span>
          </p>
        </div>
      </div>
    </section>

    <section v-if="f.metrics.stabCheck || f.metrics.fallbacks.length" aria-label="Veri notları">
      <h2 class="mb-2 text-sm font-semibold text-white">Veri notları</h2>
      <ul class="space-y-2 text-sm">
        <li v-if="f.metrics.stabCheck" class="flex gap-2 rounded-xl border px-4 py-3" :class="f.metrics.stabCheck.maxDiff < 0.05 ? 'border-space-600 bg-space-800/60 text-zinc-300' : 'border-amber-500/30 bg-amber-500/5 text-amber-100'">
          <Icon :name="f.metrics.stabCheck.maxDiff < 0.05 ? 'lucide:circle-check' : 'lucide:triangle-alert'" size="16" class="mt-0.5 shrink-0" />
          <span>Stabilite tutarlılık kontrolü: (CP − CG) / referans uzunluk ile dosyadaki stabilite sütunu {{ f.metrics.stabCheck.rows }} satırda karşılaştırıldı; en büyük fark {{ f.metrics.stabCheck.maxDiff.toFixed(4) }} kalibre{{ f.metrics.stabCheck.maxDiff < 0.05 ? '.' : ' (0,05 toleransını aşıyor; veriler değiştirilmedi).' }}</span>
        </li>
        <li v-for="(x, i) in f.metrics.fallbacks" :key="i" class="flex gap-2 rounded-xl border border-space-600 bg-space-800/60 px-4 py-3 text-zinc-300"><Icon name="lucide:info" size="16" class="mt-0.5 shrink-0" />{{ x }}</li>
      </ul>
    </section>
  </div>
</template>
