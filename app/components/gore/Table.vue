<script setup lang="ts">
import type { Gore, GoreStats, Station } from '~/utils/gore'
import { sideLength } from '~/utils/gore'
import { fmt } from '~/utils/format'

const props = defineProps<{ gore: Gore; stats: GoreStats; rows: Station[]; n: number }>()
const side = computed(() => sideLength(props.gore))
</script>

<template>
  <div class="space-y-4">
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <ParachuteStatCard icon="lucide:move-vertical" label="Dilim yüksekliği" :value="fmt(gore.height, 2)" unit="cm" sub="Tepe deliği kenarından etek çizgisine, eksen boyunca" />
      <ParachuteStatCard icon="lucide:move-horizontal" label="Etek / tepe genişliği" :value="`${fmt(gore.widthBottom, 2)} / ${fmt(gore.widthTop, 2)}`" unit="cm" sub="Dikiş çizgisinde (pay hariç)" />
      <ParachuteStatCard icon="lucide:square-dashed" label="Dilim alanı" :value="fmt(stats.area, 1)" unit="cm²" :sub="`Dikiş payıyla ${fmt(stats.cutArea, 1)} cm²`" />
      <ParachuteStatCard icon="lucide:ruler" label="Dilim çevresi (dikiş çizgisi)" :value="fmt(stats.seamPerimeter, 1)" unit="cm" :sub="`Tüm dilimler: ${fmt(stats.seamPerimeter * n / 100, 2)} m`" />
      <ParachuteStatCard icon="lucide:spline" label="Toplam dikiş uzunluğu" :value="fmt(stats.totalSeamLength / 100, 2)" unit="m" :sub="`${n} yan dikiş × ${fmt(side, 1)} cm (her dikiş iki dilimi birleştirir)`" />
      <ParachuteStatCard icon="lucide:circle-dashed" label="Etek kenarı (toplam)" :value="fmt(stats.totalHemLength / 100, 2)" unit="m" :sub="`Tepe delik kenarı: ${fmt(stats.totalVentEdge / 100, 2)} m`" />
    </div>

    <div class="panel !p-0 overflow-hidden">
      <div class="border-b border-space-700 px-4 py-3">
        <h2 class="text-base font-semibold text-white">Genişlik tablosu (5 cm aralık)</h2>
        <p class="text-sm text-zinc-400">Kalıbı elle çizerek kesenler için. Mesafe, tepe deliği kenarından eksen boyunca ölçülür; genişlik eksene dik, bütün dilim genişliğidir.</p>
      </div>
      <div class="max-h-[28rem] overflow-auto">
        <table class="data-table">
          <caption class="sr-only">Dilim genişliği, tepe deliği kenarından uzaklığa göre</caption>
          <thead class="sticky top-0 bg-space-800">
            <tr>
              <th scope="col" class="num">Mesafe (cm)</th>
              <th scope="col" class="num">Dikiş çizgisi genişliği (cm)</th>
              <th scope="col" class="num">Kesim genişliği, pay dahil (cm)</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, i) in rows" :key="i" :class="i === rows.length - 1 ? 'bg-space-700/40' : ''">
              <td class="num">{{ fmt(r.y, 1) }}<span v-if="i === rows.length - 1" class="ml-2 text-xs text-zinc-500">etek</span></td>
              <td class="num">{{ fmt(r.width, 2) }}</td>
              <td class="num">{{ fmt(r.cutWidth, 2) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>
