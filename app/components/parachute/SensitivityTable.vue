<script setup lang="ts">
import type { SensitivityResult } from '~/utils/parachute'
import { fmt } from '~/utils/format'

const props = defineProps<{ sens: SensitivityResult }>()
const sign = (v: number) => (v >= 0 ? '+' : '')
const maxImpact = computed(() => Math.max(...props.sens.rows.map((r) => r.impactPct), 1e-9))
</script>

<template>
  <section aria-labelledby="duyarlilik-baslik" class="panel">
    <ParachuteSectionHeader
      class="mb-4"
      heading-id="duyarlilik-baslik"
      icon="lucide:sliders-horizontal"
      title="Duyarlılık (±%10)"
      :subtitle="`Her parametre tek başına ±%10 değiştirilir; terminal hızdaki (${fmt(sens.baseV, 2)} m/s) değişim gösterilir.`"
    />
    <div class="relative overflow-x-auto">
      <table class="data-table">
        <caption class="sr-only">Parametrelerin terminal hıza etkisi</caption>
        <thead>
          <tr>
            <th scope="col">Parametre</th>
            <th scope="col" class="num">Nominal</th>
            <th scope="col" class="num">−%10 → v</th>
            <th scope="col" class="num">Δv</th>
            <th scope="col" class="num">+%10 → v</th>
            <th scope="col" class="num">Δv</th>
            <th scope="col" class="w-40">Etki</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="r in sens.rows" :key="r.key" :class="sens.topKeys.includes(r.key) ? 'bg-arc-500/10' : ''">
            <th scope="row" class="!normal-case !tracking-normal !text-sm !font-normal !text-zinc-200">{{ r.label }}</th>
            <td class="num">{{ fmt(r.nominal, 3) }} {{ r.unit }}</td>
            <td class="num">{{ fmt(r.vMinus, 2) }}</td>
            <td class="num">{{ sign(r.dMinusPct) }}{{ fmt(r.dMinusPct, 2) }}%</td>
            <td class="num">{{ fmt(r.vPlus, 2) }}</td>
            <td class="num">{{ sign(r.dPlusPct) }}{{ fmt(r.dPlusPct, 2) }}%</td>
            <td>
              <div class="flex items-center gap-2">
                <div class="h-2 flex-1 overflow-hidden rounded-full bg-space-700" aria-hidden="true">
                  <div class="h-full rounded-full" :class="sens.topKeys.includes(r.key) ? 'bg-arc-500' : 'bg-zinc-500'" :style="{ width: `${(r.impactPct / maxImpact) * 100}%` }" />
                </div>
                <span v-if="sens.topKeys.includes(r.key)" class="whitespace-nowrap text-[11px] font-medium text-arc-400">En etkili</span>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
