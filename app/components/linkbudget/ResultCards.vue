<script setup lang="ts">
import { MAX_RANGE_M } from '~/utils/linkBudget'
import type { LineResult, MaxRange } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'

const props = defineProps<{ r: LineResult; dec: number }>()
const d = (x: number) => fmt(x, props.dec)

const status = computed(() => {
  switch (props.r.status) {
    case 'ok': return { text: 'Yeterli', icon: 'lucide:circle-check', cls: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' }
    case 'low': return { text: 'Yetersiz / sınırda', icon: 'lucide:triangle-alert', cls: 'border-amber-500/40 bg-amber-500/10 text-amber-300' }
    default: return { text: 'Link yok', icon: 'lucide:circle-x', cls: 'border-rose-500/40 bg-rose-500/10 text-rose-300' }
  }
})
const km = (m: MaxRange) => (m.unbounded ? `≥ ${fmt(MAX_RANGE_M / 1000, 0)} km` : m.meters < 1000 ? `${fmt(m.meters, 0)} m` : `${fmt(m.meters / 1000, 2)} km`)
const eirpOver = computed(() => props.r.inputs.eirpLimitDbm !== null && props.r.eirpDbm > props.r.inputs.eirpLimitDbm)
</script>

<template>
  <section aria-label="Sonuçlar" class="space-y-4">
    <div class="panel panel-hero grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
      <div class="min-w-0">
        <p class="text-xs uppercase tracking-wide text-zinc-400">Link marjı · {{ r.sens.usedLabel }} hassasiyet</p>
        <p class="text-4xl font-bold tabular-nums" :class="r.marginUsed < 0 ? 'text-rose-300' : 'text-white'">
          {{ d(r.marginUsed) }} <span class="text-lg font-normal text-zinc-400">dB</span>
        </p>
        <p class="mt-1 text-sm tabular-nums text-zinc-400">
          Teorik: {{ d(r.marginTheory) }} dB ({{ d(r.sens.theory) }} dBm)
          <template v-if="r.marginDatasheet !== null"> · Datasheet: {{ d(r.marginDatasheet) }} dB ({{ d(r.sens.datasheet!) }} dBm)</template>
        </p>
        <p class="text-xs text-zinc-500">İstenen minimum marj: {{ d(r.inputs.minMarginDb) }} dB · L_prop: {{ r.inputs.singleLprop ? 'tek kalem' : 'kalem kalem' }}</p>
      </div>
      <span class="inline-flex items-center gap-1.5 justify-self-start rounded-full border px-4 py-1.5 text-sm font-medium" :class="status.cls">
        <Icon :name="status.icon" size="16" /> {{ status.text }}
      </span>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <ParachuteStatCard icon="lucide:radio-tower" label="Alınan güç (P_rx)" :value="fmt(r.prxDbm, 2)" unit="dBm" :sub="`P_tx ${d(r.inputs.ptxDbm)} dBm · L_fs ${d(r.pathLossDb)} dB`" />
      <ParachuteStatCard icon="lucide:route" label="Maksimum menzil" :value="km(r.rangeZero)" :sub="`${d(r.inputs.minMarginDb)} dB marjla: ${km(r.rangeRequired)}`" />
      <ParachuteStatCard icon="lucide:ruler" label="Eğik mesafe" :value="fmt(r.geometry.slantM / 1000, 2)" unit="km" :sub="`Yükselme açısı ${fmt(r.geometry.elDeg, 1)}° · λ = ${fmt(r.lambda, 3)} m`" />
      <ParachuteStatCard icon="lucide:zap" label="EIRP" :value="d(r.eirpDbm)" unit="dBm" :tone="eirpOver ? 'bad' : 'default'" :sub="eirpOver ? `Limit ${d(r.inputs.eirpLimitDbm!)} dBm aşılıyor · ERP ${d(r.erpDbm)} dBm` : `ERP ${d(r.erpDbm)} dBm${r.inputs.eirpLimitDbm !== null ? ` · limit ${d(r.inputs.eirpLimitDbm)} dBm altında` : ''}`" />
      <ParachuteStatCard v-if="r.horizonKm !== null" icon="lucide:mountain" label="Radyo ufku" :value="fmt(r.horizonKm, 1)" unit="km" :sub="`Sınırlayıcı: ${r.limiting}`" />
      <ParachuteStatCard icon="lucide:timer" label="LoRa airtime" :value="fmt(r.airtime.totalS * 1000, 1)" unit="ms" :sub="`${fmt(r.bitRateBps, 0)} bit/s · SF${r.inputs.sf} / ${String(r.inputs.bwKHz).replace('.', ',')} kHz`" />
    </div>
  </section>
</template>
