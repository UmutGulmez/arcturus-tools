<script setup lang="ts">
import type { McResult } from '~/utils/parachute'
import { fmt } from '~/utils/format'

defineProps<{ mc: McResult }>()
</script>

<template>
  <div class="panel relative overflow-x-auto !p-4">
    <table class="data-table">
      <caption class="sr-only">Monte Carlo özet istatistikleri</caption>
      <thead>
        <tr><th scope="col">İstatistik</th><th scope="col" class="num">Değer</th></tr>
      </thead>
      <tbody>
        <tr><th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">Örnek sayısı · seed</th><td class="num">{{ fmt(mc.n, 0) }} · {{ mc.seed }}</td></tr>
        <tr><th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">Nominal hız</th><td class="num">{{ fmt(mc.nominal, 2) }} m/s</td></tr>
        <tr><th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">Ortalama</th><td class="num">{{ fmt(mc.mean, 2) }} m/s</td></tr>
        <tr><th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">Standart sapma</th><td class="num">{{ fmt(mc.std, 2) }} m/s</td></tr>
        <tr><th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">Min – Max</th><td class="num">{{ fmt(mc.min, 2) }} – {{ fmt(mc.max, 2) }} m/s</td></tr>
        <tr><th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">%5 – %95 yüzdelik</th><td class="num">{{ fmt(mc.p5, 2) }} – {{ fmt(mc.p95, 2) }} m/s</td></tr>
        <tr v-if="mc.exceedProb !== null">
          <th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">Hız limitini ({{ fmt(mc.vLimit, 2) }} m/s) aşma olasılığı</th>
          <td class="num" :class="mc.exceedProb > 0.05 ? 'text-rose-300' : 'text-emerald-300'">%{{ fmt(mc.exceedProb * 100, 2) }}</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>
