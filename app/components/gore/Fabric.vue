<script setup lang="ts">
import type { GoreStats } from '~/utils/gore'
import type { CordList, NestResult } from '~/utils/goreNest'
import { fmt } from '~/utils/format'

const props = defineProps<{ nest: NestResult | null; cords: CordList | null; roll: number | null; stats: GoreStats; n: number }>()

const svg = computed(() => {
  const r = props.nest
  if (!r?.feasible || !r.polys || !props.roll) return ''
  const W = props.roll
  const L = r.lengthCm ?? 0
  const body = r.polys.map((p) => `<polygon points="${p.map((q) => `${q.x.toFixed(2)},${q.y.toFixed(2)}`).join(' ')}" fill="rgba(245,158,11,0.14)" stroke="#f4f4f5" stroke-width="${(W / 400).toFixed(3)}" stroke-linejoin="round"/>`).join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-1 -1 ${(W + 2).toFixed(2)} ${(L + 2).toFixed(2)}"><rect x="0" y="0" width="${W}" height="${L.toFixed(2)}" fill="none" stroke="#71717a" stroke-width="${(W / 300).toFixed(3)}" stroke-dasharray="${(W / 60).toFixed(2)} ${(W / 100).toFixed(2)}"/>${body}</svg>`
})
</script>

<template>
  <div class="space-y-4">
    <div v-if="roll === null" class="panel flex items-start gap-3 text-sm text-zinc-300">
      <Icon name="lucide:info" size="16" class="mt-0.5 shrink-0 text-zinc-400" />
      <p>Kumaş boyu, fire ve maliyet için soldan <b class="text-zinc-100">rulo enini</b> girin.</p>
    </div>
    <template v-else-if="nest">
      <div v-if="!nest.feasible" class="panel flex items-start gap-3 !border-rose-500/40 bg-rose-500/5 text-sm text-rose-100" role="alert">
        <Icon name="lucide:circle-alert" size="16" class="mt-0.5 shrink-0 text-rose-400" />
        <p>{{ nest.message }}</p>
      </div>
      <template v-else>
        <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ParachuteStatCard icon="lucide:ruler" label="Gereken kumaş boyu" :value="fmt((nest.lengthCm ?? 0) / 100, 2)" unit="m" :sub="`${fmt(roll, 0)} cm en · ${fmt(nest.lengthCm, 1)} cm`" />
          <ParachuteStatCard icon="lucide:scissors" label="Fire" :value="fmt(nest.wastePct, 1)" unit="%" :sub="`Kullanılan ${fmt((nest.usedAreaCm2 ?? 0) / 10000, 3)} m² (dikiş payı dahil)`" />
          <ParachuteStatCard icon="lucide:layout-grid" label="Dizilim" :value="nest.orientation === 'along' ? `${nest.rows} sıra × ${nest.perRow}` : `${nest.perRow} hat × ${nest.rows}`" :sub="nest.orientation === 'along' ? 'Dilim ekseni rulo boyunda, baş-sonlu yan yana' : 'Dilim ekseni rulo enine dik, baş-sonlu arka arkaya'" />
          <ParachuteStatCard icon="lucide:banknote" label="Maliyet" :value="nest.cost === null || nest.cost === undefined ? '—' : fmt(nest.cost, 2)" :unit="nest.cost === null || nest.cost === undefined ? '' : 'TL'" :sub="nest.cost === null || nest.cost === undefined ? 'Birim fiyat girilmedi' : 'Kumaş boyu × birim fiyat'" />
        </div>
        <div class="panel !p-4">
          <h2 class="mb-1 text-base font-semibold text-white">Kumaş üzerinde dizilim</h2>
          <p class="mb-3 text-sm text-zinc-400">Basit satır dizilimi: komşu dilimler baş-sonlu çevrilerek yan yana dizilir. Kumaşın damar yönü dilim eksenine denk gelmeyebilir; gerekirse dilim eksenini damarla hizalayan dizilimi elle seçin.</p>
          <div class="grid place-items-center rounded-xl border border-space-700 bg-space-900 p-3" role="img" :aria-label="`${n} dilimin ${fmt(roll, 0)} cm enindeki ruloya dizilimi`">
            <!-- eslint-disable-next-line vue/no-v-html -->
            <div class="nest-svg w-full max-w-3xl" v-html="svg" />
          </div>
        </div>
      </template>
    </template>

    <div v-if="cords" class="panel !p-0 overflow-hidden">
      <div class="border-b border-space-700 px-4 py-3">
        <h2 class="text-base font-semibold text-white">Şok kordonu listesi</h2>
        <p class="text-sm text-zinc-400">Her dilim için bir kordon (adet = N).</p>
      </div>
      <table class="data-table">
        <thead><tr><th scope="col">Parça</th><th scope="col" class="num">Adet</th><th scope="col" class="num">Kesim boyu (cm)</th><th scope="col" class="num">Toplam (m)</th></tr></thead>
        <tbody>
          <tr>
            <td>Şok kordonu <span class="text-xs text-zinc-500">({{ fmt(cords.baseCm, 1) }} cm{{ cords.lengthCm > cords.baseCm ? ` + ${fmt(cords.lengthCm - cords.baseCm, 1)} cm pay` : '' }})</span></td>
            <td class="num">{{ cords.count }}</td>
            <td class="num">{{ fmt(cords.lengthCm, 1) }}</td>
            <td class="num">{{ fmt(cords.totalM, 2) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<style scoped>
.nest-svg :deep(svg) {
  width: 100%;
  height: auto;
  max-height: 70vh;
  display: block;
}
</style>
