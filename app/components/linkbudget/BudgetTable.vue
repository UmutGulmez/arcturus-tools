<script setup lang="ts">
import type { LineResult } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'

const props = defineProps<{ r: LineResult; dec: number }>()
const GAIN = '#56B4E9'
const LOSS = '#D55E00'
const d = (x: number) => fmt(x, props.dec)
const sgn = (x: number) => (x < 0 ? '−' : '+')

// Kümülatif seviye [dBm]: P_tx'ten başlayıp her kalemle değişir
const rows = computed(() => {
  let level = 0
  return props.r.rows.map((row) => {
    if (row.kind === 'gain' || row.kind === 'loss') level += row.contribution
    return { ...row, level: row.kind === 'sens' || row.kind === 'margin' ? null : level }
  })
})
</script>

<template>
  <section aria-labelledby="lb-butce" class="panel">
    <ParachuteSectionHeader class="mb-3" heading-id="lb-butce" icon="lucide:list-ordered" title="Bütçe dökümü" subtitle="Verici gücünden başlayarak kazançlar (+) ve kayıplar (−) tek tek eklenir." />
    <div class="relative overflow-x-auto">
      <table class="data-table min-w-[34rem]">
        <caption class="sr-only">Link bütçesi kalem dökümü</caption>
        <thead><tr><th scope="col">Kalem</th><th scope="col" class="num">Değer</th><th scope="col" class="num">Marja katkı</th><th scope="col" class="num">Seviye [dBm]</th></tr></thead>
        <tbody>
          <tr v-for="row in rows" :key="row.key" :class="row.kind === 'result' || row.kind === 'margin' ? 'bg-space-700/40 font-semibold' : ''">
            <td>
              <span v-if="row.kind === 'gain' || row.kind === 'loss'" class="mr-2 inline-block h-2.5 w-2.5 rounded-sm align-middle" :style="{ background: row.kind === 'gain' ? GAIN : LOSS }" aria-hidden="true" />
              {{ row.label }}
            </td>
            <td class="num">{{ d(row.value) }} {{ row.unit }}</td>
            <td class="num" :style="row.kind === 'gain' ? { color: GAIN } : row.kind === 'loss' ? { color: LOSS } : undefined">
              <template v-if="row.kind === 'gain' || row.kind === 'loss'">{{ sgn(row.contribution) }}{{ d(Math.abs(row.contribution)) }} dB</template>
              <template v-else-if="row.kind === 'sens'">−({{ d(row.value) }}) dB</template>
            </td>
            <td class="num text-zinc-400">{{ row.level === null ? '' : d(row.level) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mt-3 flex flex-wrap gap-4 text-xs text-zinc-400">
      <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: GAIN }" /> Kazanç (+)</span>
      <span class="inline-flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-sm" :style="{ background: LOSS }" /> Kayıp (−)</span>
      <span>Yol kaybı (alternatif biçim): {{ fmt(r.pathLossAltDb, 2) }} dB</span>
    </p>
  </section>
</template>
