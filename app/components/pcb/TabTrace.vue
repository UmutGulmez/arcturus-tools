<script setup lang="ts">
import { maxCurrent, traceResistance, traceWarnings, widthCurrentCurve, widthForCurrent, type Layer } from '~/utils/pcbTrace'
import { checkNum, mmToMil, reportLine, sig, umToMil, umToOz } from '~/utils/pcbUnits'
import type { HowItem } from './How.vue'

const u = usePcbUnits()
const form = reactive({ mode: 'width' as 'width' | 'current', layer: 'external' as Layer, current: '1', deltaT: '10', cu: '1', width: '0.3', length: '100', temp: '20' })
convertFieldsOnUnitChange(form, ['width', 'length'], ['cu'])
const cuLabel = computed(() => (u.cu.value === 'oz' ? 'oz' : 'µm'))

const r = computed(() => {
  const errs: string[] = []
  const take = (raw: string, label: string, rule: Parameters<typeof checkNum>[2]) => {
    const c = checkNum(raw, label, rule)
    if (c.err) errs.push(c.err)
    return c.v
  }
  const dT = take(form.deltaT, 'ΔT', { min: 0, minExclusive: true, max: 1000 })
  const cuV = take(form.cu, 'Bakır kalınlığı', { min: 0, minExclusive: true, max: 10000 })
  const len = take(form.length, 'İz uzunluğu', { min: 0, minExclusive: true })
  const temp = take(form.temp, 'İz sıcaklığı', { min: -273, max: 1000 })
  const cur = form.mode === 'width' ? take(form.current, 'Akım', { min: 0, minExclusive: true, max: 1000 }) : null
  const wid = form.mode === 'current' ? take(form.width, 'İz genişliği', { min: 0, minExclusive: true }) : null
  if (errs.length || dT === null || cuV === null || len === null || temp === null) return { errs, ok: false as const }
  const copperUm = u.cuToUm(cuV)
  let widthMm: number
  let currentA: number
  if (form.mode === 'width') {
    if (cur === null) return { errs, ok: false as const }
    currentA = cur
    widthMm = widthForCurrent({ currentA, deltaT: dT, copperUm, layer: form.layer }).widthMm
  } else {
    if (wid === null) return { errs, ok: false as const }
    widthMm = u.lenToMm(wid)
    currentA = maxCurrent({ widthMm, deltaT: dT, copperUm, layer: form.layer }).currentA
  }
  const res = traceResistance({ lengthMm: u.lenToMm(len), widthMm, copperUm, tempC: temp, currentA })
  const curve = widthCurrentCurve(copperUm, dT, Math.max(widthMm * 2, 0.5), 60)
  return { errs, ok: true as const, dT, copperUm, widthMm, currentA, res, curve, lenMm: u.lenToMm(len), temp, warn: traceWarnings({ deltaT: dT, copperUm, currentA, widthMm }) }
})

const lenU = computed(() => u.len.value)
const layerName = computed(() => (form.layer === 'external' ? 'dış katman (k=0,048)' : 'iç katman (k=0,024)'))
const wDisp = (mm: number) => (u.len.value === 'mm' ? `${sig(mm)} mm (${sig(mmToMil(mm))} mil)` : `${sig(mmToMil(mm))} mil (${sig(mm)} mm)`)
const cuDisp = (um: number) => `${sig(umToOz(um))} oz (${sig(um)} µm)`

const rep1 = computed(() => {
  const x = r.value
  if (!x.ok) return ''
  return form.mode === 'width'
    ? reportLine('İz genişliği', 'I = k·ΔT^0,44·A^0,725; w = A/t (IPC-2221)', [`I=${sig(x.currentA)} A`, `ΔT=${sig(x.dT)} °C`, `Cu=${cuDisp(x.copperUm)}`, layerName.value], [`w=${wDisp(x.widthMm)}`])
    : reportLine('Maksimum akım', 'I = k·ΔT^0,44·(w·t)^0,725 (IPC-2221)', [`w=${wDisp(x.widthMm)}`, `ΔT=${sig(x.dT)} °C`, `Cu=${cuDisp(x.copperUm)}`, layerName.value], [`Imax=${sig(x.currentA)} A`])
})
const rep2 = computed(() => {
  const x = r.value
  if (!x.ok) return ''
  return reportLine('İz direnci', 'R = ρ·L/(w·t); R(T) = R20·(1+0,00393·(T−20)); ΔV = I·R; P = I²R', [`L=${sig(x.lenMm)} mm`, `w=${sig(x.widthMm)} mm`, `Cu=${sig(x.copperUm)} µm`, `T=${sig(x.temp)} °C`, `I=${sig(x.currentA)} A`], [`R=${sig(x.res.rT * 1000)} mΩ`, `ΔV=${sig(x.res.vDrop * 1000)} mV`, `P=${sig(x.res.powerW * 1000)} mW`])
})

const chart = computed(() => {
  const x = r.value
  if (!x.ok) return null
  const f = (mm: number) => u.mmToLen(mm)
  return {
    x: x.curve.map((p) => f(p.widthMm)),
    ext: x.curve.map((p) => p.external),
    int: x.curve.map((p) => p.internal),
    point: { x: f(x.widthMm), y: x.currentA },
  }
})

const how: HowItem[] = [
  { t: 'Genişlik ↔ akım (IPC-2221)', f: 'I = k·ΔT^0,44·A^0,725     A [mil²] = w [mil]·t [mil]     k = 0,048 (dış), 0,024 (iç)     w = A / t', src: 'IPC-2221 (Generic Standard on Printed Board Design), iz akım taşıma grafiklerinin eğri uydurması.', range: 'Yaklaşık: ΔT 10–100 °C, bakır 0,5–3 oz, akım ≤ 35 A, genişlik ≤ 400 mil. Dışında sarı uyarı çıkar, sonuç yine verilir.', assume: 'IPC-2221 eskidir ve özellikle iç katmanlarda muhafazakârdır (gerçekte iç katman daha fazla akım taşıyabilir). Çevre sıcaklığı, komşu izler ve hava akışı modellenmez. IPC-2152 uygulanmadı: doğrulanmış kapalı formu yok.' },
  { t: 'İz direnci, gerilim düşümü, ısı kaybı', f: 'R20 = ρ·L/(w·t)     R(T) = R20·(1 + 0,00393·(T − 20))     ΔV = I·R     P = I²·R', src: 'Bakır özdirenci ρ = 1,72e-8 Ω·m (20 °C), sıcaklık katsayısı 0,00393 /°C.', range: 'Katsayı −40…150 °C için doğrusal yaklaşımdır.', assume: 'Düz, düzgün kalınlıkta iz; kenar akım yığılması, via ve köşe dirençleri dahil değildir. Akım olarak girdiğiniz değer (veya genişlik modunda hesaplanan maksimum akım) kullanılır.' },
]
</script>

<template>
  <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
    <div class="panel space-y-4">
      <fieldset>
        <legend class="mb-1 text-[13px] font-medium text-zinc-200">Hesap yönü</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
          <button type="button" :aria-pressed="form.mode === 'width'" class="rounded-lg px-2 py-1.5" :class="form.mode === 'width' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.mode = 'width'">Akım → genişlik</button>
          <button type="button" :aria-pressed="form.mode === 'current'" class="rounded-lg px-2 py-1.5" :class="form.mode === 'current' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.mode = 'current'">Genişlik → akım</button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="mb-1 text-[13px] font-medium text-zinc-200">Katman</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
          <button type="button" :aria-pressed="form.layer === 'external'" class="rounded-lg px-2 py-1.5" :class="form.layer === 'external' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.layer = 'external'">Dış</button>
          <button type="button" :aria-pressed="form.layer === 'internal'" class="rounded-lg px-2 py-1.5" :class="form.layer === 'internal' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.layer = 'internal'">İç</button>
        </div>
      </fieldset>
      <GoreField v-if="form.mode === 'width'" id="tr-i" v-model="form.current" label="Akım" unit="A" />
      <GoreField v-else id="tr-w" v-model="form.width" label="İz genişliği" :unit="lenU" />
      <GoreField id="tr-dt" v-model="form.deltaT" label="İzin verilen sıcaklık artışı ΔT" unit="°C" />
      <GoreField id="tr-cu" v-model="form.cu" label="Bakır kalınlığı" :unit="cuLabel" />
      <p class="border-t border-space-700 pt-3 text-xs uppercase tracking-widest text-zinc-500">Direnç ve ısı kaybı</p>
      <GoreField id="tr-l" v-model="form.length" label="İz uzunluğu" :unit="lenU" />
      <GoreField id="tr-t" v-model="form.temp" label="İz sıcaklığı" unit="°C" />
    </div>

    <div class="min-w-0 space-y-4">
      <PcbNotices :items="r.ok ? r.warn : []" :errors="r.errs" />
      <div v-if="r.ok" class="space-y-4">
        <p class="flex items-start gap-2 rounded-xl border border-space-600 bg-space-800/60 px-4 py-3 text-sm text-zinc-400">
          <Icon name="lucide:info" size="16" class="mt-0.5 shrink-0 text-arc-400" />
          IPC-2221 eskidir ve özellikle iç katmanlarda muhafazakârdır; IPC-2152 bu araçta uygulanmadı.
        </p>
        <PcbCard :title="form.mode === 'width' ? 'Gereken iz genişliği' : 'Maksimum akım'" :report="rep1">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <template v-if="form.mode === 'width'">
              <PcbStat label="İz genişliği" :value="sig(u.mmToLen(r.widthMm))" :unit="lenU" :sub="`${sig(u.len.value === 'mm' ? mmToMil(r.widthMm) : r.widthMm)} ${u.len.value === 'mm' ? 'mil' : 'mm'}`" />
              <PcbStat label="Kesit alanı" :value="sig(mmToMil(r.widthMm) * umToMil(r.copperUm))" unit="mil²" />
              <PcbStat label="Akım" :value="sig(r.currentA)" unit="A" />
            </template>
            <template v-else>
              <PcbStat label="Maksimum akım" :value="sig(r.currentA)" unit="A" />
              <PcbStat label="İz genişliği" :value="sig(u.mmToLen(r.widthMm))" :unit="lenU" />
              <PcbStat label="Kesit alanı" :value="sig(mmToMil(r.widthMm) * umToMil(r.copperUm))" unit="mil²" />
            </template>
          </div>
        </PcbCard>
        <PcbCard title="Direnç, gerilim düşümü ve ısı kaybı" :report="rep2">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <PcbStat label="R (20 °C)" :value="sig(r.res.r20 * 1000)" unit="mΩ" />
            <PcbStat :label="`R (${r.temp} °C)`" :value="sig(r.res.rT * 1000)" unit="mΩ" />
            <PcbStat label="Gerilim düşümü" :value="sig(r.res.vDrop * 1000)" unit="mV" />
            <PcbStat label="Isı kaybı I²R" :value="sig(r.res.powerW * 1000)" unit="mW" />
          </div>
        </PcbCard>
        <PcbChart
          v-if="chart"
          title="Genişlik–akım eğrisi"
          :x-label="`İz genişliği (${lenU})`"
          y-label="Akım (A)"
          :x="chart.x" :external="chart.ext" :internal="chart.int" :point="chart.point"
        />
      </div>
      <PcbHow :items="how" />
    </div>
  </div>
</template>
