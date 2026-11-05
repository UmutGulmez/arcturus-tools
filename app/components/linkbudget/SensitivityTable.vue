<script setup lang="ts">
import type { SensRowLb } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'

const props = defineProps<{ rows: SensRowLb[]; dec: number }>()
const sg = (x: number) => (Number.isNaN(x) ? '—' : `${x > 0 ? '+' : x < 0 ? '−' : ''}${fmt(Math.abs(x), props.dec)} dB`)
const top = computed(() => Math.max(...props.rows.map((r) => Math.max(Math.abs(r.dMinus) || 0, Math.abs(r.dPlus) || 0))))
</script>

<template>
  <section aria-labelledby="lb-duyarlilik" class="panel">
    <ParachuteSectionHeader class="mb-3" heading-id="lb-duyarlilik" icon="lucide:sliders-horizontal" title="Duyarlılık analizi" subtitle="Her parametre tek başına değiştirilir; marjdaki değişim gösterilir." />
    <div class="relative overflow-x-auto">
      <table class="data-table min-w-[30rem]">
        <caption class="sr-only">Parametrelerin link marjına etkisi</caption>
        <thead><tr><th scope="col">Parametre</th><th scope="col" class="num">Eksi yönde</th><th scope="col" class="num">Artı yönde</th></tr></thead>
        <tbody>
          <tr v-for="r in rows" :key="r.label" :class="Math.max(Math.abs(r.dMinus) || 0, Math.abs(r.dPlus) || 0) === top ? 'bg-arc-500/10' : ''">
            <td>{{ r.label }}</td>
            <td class="num">{{ r.minus }} → {{ sg(r.dMinus) }}</td>
            <td class="num">{{ r.plus }} → {{ sg(r.dPlus) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>
