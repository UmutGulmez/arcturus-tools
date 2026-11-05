<script setup lang="ts">
import { MAX_RANGE_M } from '~/utils/linkBudget'
import type { LineResult } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'

const props = defineProps<{ items: { label: string; r: LineResult }[]; dec: number }>()
const d = (x: number) => fmt(x, props.dec)
const rng = (r: LineResult) => (r.rangeZero.unbounded ? `≥ ${fmt(MAX_RANGE_M / 1000, 0)} km` : `${fmt(r.rangeZero.meters / 1000, 2)} km`)
const statusTxt = (r: LineResult) => (r.status === 'ok' ? 'Yeterli' : r.status === 'low' ? 'Yetersiz/sınırda' : 'Link yok')
const metrics: { label: string; get: (r: LineResult) => string }[] = [
  { label: 'Frekans', get: (r) => `${fmt(r.inputs.freqMHz, 0)} MHz` },
  { label: 'Eğik mesafe', get: (r) => `${fmt(r.geometry.slantM / 1000, 2)} km` },
  { label: 'EIRP', get: (r) => `${d(r.eirpDbm)} dBm` },
  { label: 'Yol kaybı (L_fs)', get: (r) => `${d(r.pathLossDb)} dB` },
  { label: 'L_prop toplam', get: (r) => `${d(r.lpropTotal)} dB` },
  { label: 'Alınan güç (P_rx)', get: (r) => `${fmt(r.prxDbm, 2)} dBm` },
  { label: 'Hassasiyet', get: (r) => `${d(r.sens.used)} dBm` },
  { label: 'Link marjı', get: (r) => `${d(r.marginUsed)} dB` },
  { label: 'Durum', get: statusTxt },
  { label: 'Menzil (0 dB marj)', get: rng },
  { label: 'LoRa (SF / BW)', get: (r) => `SF${r.inputs.sf} / ${String(r.inputs.bwKHz).replace('.', ',')} kHz` },
  { label: 'Airtime', get: (r) => `${fmt(r.airtime.totalS * 1000, 1)} ms` },
]
</script>

<template>
  <section aria-labelledby="lb-hatlar" class="panel">
    <ParachuteSectionHeader class="mb-3" heading-id="lb-hatlar" icon="lucide:columns-2" title="Hat karşılaştırması" subtitle="Geçerli girdisi olan hatlar yan yana gösterilir." />
    <p v-if="items.length < 2" class="text-sm text-zinc-400">Karşılaştırma için iki hattın da geçerli girdilerle tamamlanması gerekir. İki referans hattı yüklemek için üstteki "Referans hatları yükle" butonunu kullanın.</p>
    <div v-else class="relative overflow-x-auto">
      <table class="data-table min-w-[28rem]">
        <caption class="sr-only">İki RF hattının karşılaştırması</caption>
        <thead><tr><th scope="col">Parametre</th><th v-for="it in items" :key="it.label" scope="col" class="num">{{ it.label }}</th></tr></thead>
        <tbody>
          <tr v-for="m in metrics" :key="m.label">
            <td>{{ m.label }}</td>
            <td v-for="it in items" :key="it.label" class="num" :class="m.label === 'Link marjı' && it.r.marginUsed < 0 ? 'text-rose-300' : ''">{{ m.get(it.r) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
