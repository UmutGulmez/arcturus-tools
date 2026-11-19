<script setup lang="ts">
import { parseNumber } from '~/utils/format'
import { DEFAULT_THRESHOLDS, type Thresholds } from '~/utils/flightMetrics'

const s = useFlight()
type K = keyof Thresholds
const fields: { k: K; label: string; unit: string; hint: string }[] = [
  { k: 'stabWarn', label: 'Min. stabilite (uyarı)', unit: 'kalibre', hint: 'Altı sarı' },
  { k: 'stabCrit', label: 'Min. stabilite (kritik)', unit: 'kalibre', hint: 'Altı kırmızı' },
  { k: 'railMin', label: 'Min. raf çıkış hızı', unit: 'm/s', hint: 'Altı sarı' },
  { k: 'landMax', label: 'Maks. iniş hızı', unit: 'm/s', hint: 'Boşsa denetlenmez' },
]
const text = reactive<Record<K, string>>({ stabWarn: '', stabCrit: '', railMin: '', landMax: '' })
const sync = () => fields.forEach((f) => (text[f.k] = s.thresholds[f.k] === null ? '' : String(s.thresholds[f.k]).replace('.', ',')))
onMounted(() => nextTick(sync))
watch(() => ({ ...s.thresholds }), sync)
const set = (k: K) => { const raw = text[k].trim(); s.thresholds[k] = raw === '' ? null : parseNumber(raw) }
const reset = () => { Object.assign(s.thresholds, DEFAULT_THRESHOLDS) }
</script>

<template>
  <div class="panel space-y-4 !p-4">
    <div>
      <h3 class="text-sm font-semibold text-white">Eşikler</h3>
      <p class="text-xs text-zinc-500">Yarışma şartnamesine göre ayarlayın; tarayıcınızda saklanır.</p>
    </div>
    <div class="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <div v-for="f in fields" :key="f.k">
        <label :for="`th-${f.k}`" class="mb-1 block text-xs text-zinc-400">{{ f.label }}</label>
        <div class="relative">
          <input :id="`th-${f.k}`" v-model="text[f.k]" class="input pr-16" inputmode="decimal" :placeholder="f.k === 'landMax' ? 'yok' : ''" @input="set(f.k)" />
          <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{{ f.unit }}</span>
        </div>
        <p class="mt-0.5 text-[11px] text-zinc-500">{{ f.hint }}</p>
      </div>
    </div>
    <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
      <div class="flex items-center gap-2 text-sm">
        <span class="text-zinc-400">Hız</span>
        <div class="flex rounded-xl border border-space-600 p-0.5" role="group" aria-label="Hız birimi">
          <button type="button" class="rounded-lg px-2.5 py-1 text-xs" :class="s.units.speed === 'ms' ? 'bg-space-600 text-white' : 'text-zinc-400'" :aria-pressed="s.units.speed === 'ms'" @click="s.units.speed = 'ms'">m/s</button>
          <button type="button" class="rounded-lg px-2.5 py-1 text-xs" :class="s.units.speed === 'kmh' ? 'bg-space-600 text-white' : 'text-zinc-400'" :aria-pressed="s.units.speed === 'kmh'" @click="s.units.speed = 'kmh'">km/h</button>
        </div>
      </div>
      <div class="flex items-center gap-2 text-sm">
        <span class="text-zinc-400">İvme</span>
        <div class="flex rounded-xl border border-space-600 p-0.5" role="group" aria-label="İvme birimi">
          <button type="button" class="rounded-lg px-2.5 py-1 text-xs" :class="s.units.acc === 'ms2' ? 'bg-space-600 text-white' : 'text-zinc-400'" :aria-pressed="s.units.acc === 'ms2'" @click="s.units.acc = 'ms2'">m/s²</button>
          <button type="button" class="rounded-lg px-2.5 py-1 text-xs" :class="s.units.acc === 'g' ? 'bg-space-600 text-white' : 'text-zinc-400'" :aria-pressed="s.units.acc === 'g'" @click="s.units.acc = 'g'">g</button>
        </div>
      </div>
      <button type="button" class="btn ml-auto !py-1 text-xs" @click="reset"><Icon name="lucide:rotate-ccw" size="14" />Varsayılan eşikler</button>
    </div>
  </div>
</template>
