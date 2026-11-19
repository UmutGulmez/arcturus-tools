<script setup lang="ts">
import { buildKpis, fmtKpi } from '~/utils/flightKpi'

const s = useFlight()
const f = computed(() => s.active.value!)
const kpis = computed(() => buildKpis(f.value.metrics, s.thresholds, s.units))
const groups = computed(() => ['Performans', 'Motor', 'Stabilite', 'Kurtarma ve iniş'].map((g) => ({ g, items: kpis.value.filter((k) => k.group === g) })).filter((x) => x.items.length))
const st = { ok: 'Uygun', warn: 'Uyarı', crit: 'Kritik', none: '' }
const today = new Date().toLocaleDateString('tr-TR')
</script>

<template>
  <article class="report-sheet space-y-6 rounded-2xl bg-white p-8 text-zinc-900">
    <header class="flex items-end justify-between border-b border-zinc-300 pb-3">
      <div>
        <h1 class="text-xl font-bold">Uçuş Analizi Raporu</h1>
        <p class="text-sm text-zinc-600">{{ f.name }} · {{ f.data.rows.toLocaleString('tr-TR') }} satır, {{ f.data.columns.length }} sütun</p>
      </div>
      <p class="text-xs text-zinc-500">Arcturus Roket Takımı · {{ today }}</p>
    </header>
    <section v-for="g in groups" :key="g.g" class="break-inside-avoid">
      <h2 class="mb-1 text-sm font-semibold">{{ g.g }}</h2>
      <table class="w-full table-fixed border-collapse text-sm">
        <tbody>
          <tr v-for="k in g.items" :key="k.id" class="border-b border-zinc-200">
            <td class="w-[38%] py-1 pr-3">{{ k.label }}<span v-if="k.approx" class="text-xs text-zinc-500"> (yaklaşık)</span></td>
            <td class="w-[20%] py-1 text-right font-medium tabular-nums">{{ fmtKpi(k) }} {{ k.unit }}</td>
            <td class="w-[10%] py-1 pl-3 text-xs" :class="k.status === 'crit' ? 'font-semibold text-rose-700' : k.status === 'warn' ? 'font-semibold text-amber-700' : 'text-zinc-500'">{{ st[k.status] }}</td>
            <td class="py-1 pl-3 text-xs text-zinc-500">{{ k.sub }}</td>
          </tr>
        </tbody>
      </table>
    </section>
    <section v-if="f.data.warnings.length" class="break-inside-avoid">
      <h2 class="mb-1 text-sm font-semibold">OpenRocket uyarıları</h2>
      <ul class="list-disc pl-5 text-sm"><li v-for="(w, i) in f.data.warnings" :key="i">{{ w }}</li></ul>
    </section>
    <div class="grid gap-4">
      <div class="break-inside-avoid rounded-xl border border-zinc-200 p-3"><FlightProfileTab /></div>
      <div class="break-inside-avoid rounded-xl border border-zinc-200 p-3"><FlightStabilityTab /></div>
      <div class="break-inside-avoid rounded-xl border border-zinc-200 p-3"><FlightMotorTab /></div>
      <div class="break-inside-avoid rounded-xl border border-zinc-200 p-3"><FlightAeroTab /></div>
      <div class="break-inside-avoid rounded-xl border border-zinc-200 p-3"><FlightTrajectoryTab /></div>
    </div>
  </article>
</template>
