<script setup lang="ts">
import type { LineAnalysis } from '~/utils/linkBudget'
import { MAX_RANGE_M } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'

const props = defineProps<{ a: LineAnalysis; dec: number }>()
const d = (x: number) => fmt(x, props.dec)
const at = computed(() => props.a.result.airtime)
</script>

<template>
  <section aria-labelledby="lb-lora" class="space-y-4">
    <div class="panel">
      <ParachuteSectionHeader class="mb-3" heading-id="lb-lora" icon="lucide:audio-lines" title="LoRa karşılaştırma (SF7–SF12)" :subtitle="`Seçili BW ${String(a.result.inputs.bwKHz).replace('.', ',')} kHz ve CR 4/${4 + a.result.inputs.cr} ile; hassasiyet teorik, menzil 0 dB marjla. Aktif SF vurgulanır.`" />
      <div class="relative overflow-x-auto">
        <table class="data-table min-w-[40rem]">
          <caption class="sr-only">SF karşılaştırma tablosu</caption>
          <thead><tr><th scope="col">SF</th><th scope="col" class="num">Hassasiyet [dBm]</th><th scope="col" class="num">Marj [dB]</th><th scope="col" class="num">Menzil [km]</th><th scope="col" class="num">Airtime [ms]</th><th scope="col" class="num">Bit hızı [bit/s]</th></tr></thead>
          <tbody>
            <tr v-for="r in a.sfRows" :key="r.sf" :class="r.active ? 'bg-arc-500/10 font-semibold' : ''">
              <td>SF{{ r.sf }} <span v-if="r.active" class="ml-1 text-[11px] font-medium text-arc-400">aktif</span></td>
              <td class="num">{{ d(r.sensDbm) }}</td>
              <td class="num" :class="r.marginDb < 0 ? 'text-rose-300' : ''">{{ d(r.marginDb) }}</td>
              <td class="num">{{ r.rangeUnbounded ? `≥ ${fmt(MAX_RANGE_M / 1000, 0)}` : fmt(r.rangeKm, 2) }}</td>
              <td class="num">{{ fmt(r.airtimeMs, 1) }}</td>
              <td class="num">{{ fmt(r.bitRateBps, 0) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <ParachuteStatCard icon="lucide:timer" label="Sembol süresi (Tsym)" :value="fmt(at.tsymS * 1000, 3)" unit="ms" :sub="at.ldroOn ? 'Düşük veri hızı optimizasyonu açık' : 'LDRO kapalı'" />
      <ParachuteStatCard icon="lucide:align-left" label="Preamble süresi" :value="fmt(at.tPreambleS * 1000, 2)" unit="ms" :sub="`${a.result.inputs.preamble} + 4,25 sembol`" />
      <ParachuteStatCard icon="lucide:binary" label="Payload sembolü" :value="fmt(at.payloadSymbols, 0)" :sub="`${a.result.inputs.payload} bayt · ${a.result.inputs.explicitHeader ? 'explicit' : 'implicit'} header`" />
      <ParachuteStatCard icon="lucide:clock" label="Toplam airtime" :value="fmt(at.totalS * 1000, 2)" unit="ms" :sub="`${fmt(a.result.bitRateBps, 0)} bit/s`" />
    </div>
  </section>
</template>
