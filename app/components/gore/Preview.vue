<script setup lang="ts">
import type { Gore } from '~/utils/gore'
import { goreSvg } from '~/utils/goreExport'

const props = defineProps<{ gore: Gore }>()
const grid = defineModel<boolean>('grid', { default: false })
const dims = defineModel<boolean>('dims', { default: true })

// Yalnızca bu araç üretir (kullanıcı metni içermez), bu yüzden v-html güvenlidir.
const svg = computed(() => goreSvg(props.gore, { grid: grid.value, dims: dims.value, theme: 'screen', physical: false, scaleSquare: false }))
</script>

<template>
  <div class="panel !p-4">
    <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
      <h2 class="text-base font-semibold text-white">Dilim kalıbı</h2>
      <div class="flex flex-wrap gap-4 text-sm text-zinc-300">
        <label class="inline-flex cursor-pointer items-center gap-2"><input v-model="dims" type="checkbox" class="accent-arc-500" /> Ölçü okları</label>
        <label class="inline-flex cursor-pointer items-center gap-2"><input v-model="grid" type="checkbox" class="accent-arc-500" /> 1 cm ızgara</label>
      </div>
    </div>
    <div class="grid place-items-center rounded-xl border border-space-700 bg-space-900 p-2" role="img" :aria-label="`Dilim kalıbı önizlemesi: yükseklik ${gore.height.toFixed(1)} cm, etek genişliği ${gore.widthBottom.toFixed(1)} cm`">
      <!-- eslint-disable-next-line vue/no-v-html -->
      <div class="gore-svg w-full" v-html="svg" />
    </div>
    <p class="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-zinc-500">
      <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0.5 w-5 bg-zinc-100" /> Kesim çizgisi (dikiş payı dahil)</span>
      <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0 w-5 border-t-2 border-dashed border-amber-400" /> Dikiş çizgisi</span>
      <span class="inline-flex items-center gap-1.5"><span class="inline-block h-0 w-5 border-t border-dashed border-zinc-500" /> Kumaş ekseni</span>
    </p>
  </div>
</template>

<style scoped>
.gore-svg :deep(svg) {
  width: 100%;
  height: auto;
  max-height: 72vh;
  display: block;
}
</style>
