<script setup lang="ts">
import { compareScenarios } from '~/utils/linkBudget'
import type { LineResult } from '~/utils/linkBudget'
import { copyText } from '~/utils/export'
import { fmt } from '~/utils/format'

const props = defineProps<{ a: LineResult; b: LineResult; labelA: string; labelB: string; justif: Record<string, string>; dec: number }>()
const cmp = computed(() => compareScenarios(props.a, props.b))
const d = (x: number | null) => (x === null ? '—' : fmt(x, props.dec))
const sg = (x: number) => (Math.abs(x) < 1e-9 ? '0' : `${x > 0 ? '+' : '−'}${fmt(Math.abs(x), props.dec)}`)

// Girdi bazlı farklar (bilgi amaçlı)
const changed = computed(() => {
  const x = props.a.inputs
  const y = props.b.inputs
  const out: { k: string; a: string; b: string }[] = []
  const add = (k: string, a: unknown, b: unknown) => a !== b && out.push({ k, a: String(a), b: String(b) })
  add('Frekans [MHz]', x.freqMHz, y.freqMHz); add('SF', x.sf, y.sf); add('BW [kHz]', x.bwKHz, y.bwKHz)
  add('Eğik mesafe [km]', fmt(x.geoMode === 'slant' ? x.slantM / 1000 : props.a.geometry.slantM / 1000, 2), fmt(y.geoMode === 'slant' ? y.slantM / 1000 : props.b.geometry.slantM / 1000, 2))
  add('İrtifa [m]', x.altM, y.altM); add('L_prop modu', x.singleLprop ? 'tek kalem' : 'kalem kalem', y.singleLprop ? 'tek kalem' : 'kalem kalem')
  add('Yayılım modeli', x.propModel, y.propModel); add('Anten deseni modu', x.patternMode, y.patternMode)
  return out
})

const copied = ref(false)
async function copy() {
  const lines = [['Parametre', props.labelA, props.labelB, 'Marja etkisi [dB]', 'Gerekçe'].join('\t')]
  for (const r of cmp.value.rows) lines.push([r.label, d(r.a), d(r.b), sg(r.effect), (props.justif[r.key] ?? '').replace(/\s+/g, ' ')].join('\t'))
  lines.push(['Toplam marj', d(cmp.value.marginA), d(cmp.value.marginB), sg(cmp.value.total), ''].join('\t'))
  copied.value = await copyText(lines.join('\n'))
  setTimeout(() => (copied.value = false), 2000)
}
</script>

<template>
  <section aria-labelledby="lb-senaryo" class="space-y-4">
    <div class="panel">
      <div class="mb-3 flex flex-wrap items-start justify-between gap-3">
        <ParachuteSectionHeader heading-id="lb-senaryo" icon="lucide:git-compare" title="Senaryo karşılaştırması" :subtitle="`${labelA} → ${labelB}: her bütçe kaleminin marja etkisi. Etkilerin toplamı toplam marj değişimine eşittir.`" />
        <button type="button" class="btn" @click="copy"><Icon :name="copied ? 'lucide:check' : 'lucide:copy'" size="16" /> {{ copied ? 'Kopyalandı' : 'Tabloyu kopyala' }}</button>
      </div>
      <div class="relative overflow-x-auto">
        <table class="data-table min-w-[44rem]">
          <caption class="sr-only">Senaryo karşılaştırma tablosu</caption>
          <thead><tr><th scope="col">Parametre</th><th scope="col" class="num">{{ labelA }}</th><th scope="col" class="num">{{ labelB }}</th><th scope="col" class="num">Marja etkisi</th><th scope="col">Gerekçe</th></tr></thead>
          <tbody>
            <tr v-for="r in cmp.rows" :key="r.key" :class="Math.abs(r.effect) > 1e-9 ? '' : 'text-zinc-500'">
              <td>{{ r.label }}</td>
              <td class="num">{{ d(r.a) }}</td>
              <td class="num">{{ d(r.b) }}</td>
              <td class="num font-medium" :class="r.effect > 1e-9 ? 'text-emerald-300' : r.effect < -1e-9 ? 'text-rose-300' : ''">{{ sg(r.effect) }} dB</td>
              <td>
                <input v-if="Math.abs(r.effect) > 1e-9" v-model="justif[r.key]" class="input !py-1" :aria-label="`${r.label} değişiklik gerekçesi`" placeholder="Gerekçe yazın…" />
              </td>
            </tr>
            <tr class="bg-space-700/40 font-semibold">
              <td>Toplam link marjı</td>
              <td class="num">{{ d(cmp.marginA) }} dB</td>
              <td class="num">{{ d(cmp.marginB) }} dB</td>
              <td class="num" :class="cmp.total >= 0 ? 'text-emerald-300' : 'text-rose-300'">{{ sg(cmp.total) }} dB</td>
              <td />
            </tr>
          </tbody>
        </table>
      </div>
    </div>
    <div v-if="changed.length" class="panel">
      <p class="mb-2 text-sm font-medium text-zinc-200">Değişen girdiler</p>
      <ul class="grid gap-x-6 gap-y-1 text-sm sm:grid-cols-2">
        <li v-for="c in changed" :key="c.k" class="flex justify-between gap-3 text-zinc-300"><span class="text-zinc-500">{{ c.k }}</span><span class="tabular-nums">{{ c.a }} → {{ c.b }}</span></li>
      </ul>
    </div>
  </section>
</template>
