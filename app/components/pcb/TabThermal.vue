<script setup lang="ts">
import { junctionTemp } from '~/utils/pcbCircuit'
import { checkNum, reportLine, sig, type PcbWarning } from '~/utils/pcbUnits'
import type { HowItem } from './How.vue'

// Datasheet değerleri kullanıcıdan alınır; varsayılan değer yoktur.
const form = reactive({ p: '', ta: '', rth: '', tjmax: '' })
const example = () => Object.assign(form, { p: '1.5', ta: '40', rth: '35', tjmax: '125' })

const r = computed(() => {
  const errs: string[] = []
  const take = (raw: string, label: string, rule: Parameters<typeof checkNum>[2]) => {
    const c = checkNum(raw, label, rule)
    if (c.err) errs.push(c.err)
    return c.v
  }
  const p = take(form.p, 'Güç P', { min: 0, max: 10000 })
  const ta = take(form.ta, 'Ortam sıcaklığı Ta', { min: -273, max: 1000 })
  const rth = take(form.rth, 'RθJA', { min: 0, minExclusive: true, max: 10000 })
  const tj = take(form.tjmax, 'Tj_max', { min: -273, max: 1000 })
  if (errs.length || p === null || ta === null || rth === null || tj === null) return { errs, ok: false as const }
  if (tj <= ta) return { errs: ['Tj_max, ortam sıcaklığından büyük olmalı.'], ok: false as const }
  const out = junctionTemp({ powerW: p, taC: ta, rthJA: rth, tjMaxC: tj })
  const warn: PcbWarning[] = []
  if (!out.ok) warn.push({ level: 'error', text: `Tj (${sig(out.tj)} °C) Tj_max değerini (${sig(tj)} °C) aşıyor: marj negatif.` })
  else if (out.margin < 0.2 * (tj - ta)) warn.push({ level: 'warning', text: 'Marj, izin verilen sıcaklık yükselişinin %20’sinden az. Bakır alanı/hava akışı payı bırakın.' })
  return { errs, ok: true as const, out, warn, p, ta, rth, tj }
})
const rep = computed(() => {
  const x = r.value
  if (!x.ok) return ''
  return reportLine('Kavşak sıcaklığı', 'Tj = Ta + P·RθJA; marj = Tj_max − Tj', [`P=${sig(x.p)} W`, `Ta=${sig(x.ta)} °C`, `RθJA=${sig(x.rth)} K/W`, `Tj_max=${sig(x.tj)} °C`], [`Tj=${sig(x.out.tj)} °C`, `marj=${sig(x.out.margin)} K`, `P_max=${sig(x.out.pMax)} W`])
})
const how: HowItem[] = [
  { t: 'Kavşak sıcaklığı ve marj', f: 'Tj = Ta + P·RθJA     marj = Tj_max − Tj     P_max = (Tj_max − Ta)/RθJA', src: 'Tek direnç (kavşak–ortam) ısıl modeli, JEDEC JESD51 tanımındaki RθJA.', range: 'Kararlı hal. RθJA, datasheet’teki kart ve ölçüm koşulları için geçerlidir.', assume: 'RθJA kartınızın bakır alanı, katman sayısı ve hava akışına göre değişir. Bu araç bakır alanından RθJA tahmini yapmaz (güvenilir kapalı form yok): datasheet’teki “bakır alanı – RθJA” eğrisine bakın veya ΨJT/RθJC ile ayrıntılı model kurun.' },
]
</script>

<template>
  <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
    <div class="panel space-y-4">
      <p class="text-xs leading-snug text-zinc-500">Değerleri bileşen datasheet’inden girin; araç varsayılan değer koymaz.</p>
      <GoreField id="t-p" v-model="form.p" label="Harcanan güç P" unit="W" required />
      <GoreField id="t-ta" v-model="form.ta" label="Ortam sıcaklığı Ta" unit="°C" required />
      <GoreField id="t-r" v-model="form.rth" label="RθJA (datasheet)" unit="K/W" required />
      <GoreField id="t-tj" v-model="form.tjmax" label="Tj_max (datasheet)" unit="°C" required />
      <button type="button" class="btn w-full" @click="example"><Icon name="lucide:wand-sparkles" size="16" /> Örnek değerleri doldur</button>
    </div>
    <div class="min-w-0 space-y-4">
      <p v-if="!r.ok && !r.errs.length" class="panel text-sm text-zinc-400">Sonuç için dört değeri de girin.</p>
      <PcbNotices :items="r.ok ? r.warn : []" :errors="r.ok ? [] : r.errs.filter((e) => !/değer girin/.test(e))" />
      <PcbCard v-if="r.ok" title="Kavşak sıcaklığı ve marj" :report="rep" :tone="r.out.ok ? 'ok' : 'bad'">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <PcbStat label="Tj" :value="sig(r.out.tj)" unit="°C" />
          <PcbStat label="Marj (Tj_max − Tj)" :value="sig(r.out.margin)" unit="K" />
          <PcbStat label="İzin verilen maks. güç" :value="sig(r.out.pMax)" unit="W" />
        </div>
      </PcbCard>
      <p class="flex items-start gap-2 rounded-xl border border-space-600 bg-space-800/60 px-4 py-3 text-sm text-zinc-400">
        <Icon name="lucide:info" size="16" class="mt-0.5 shrink-0 text-arc-400" />
        Bakır alanının RθJA’ya etkisi için datasheet’teki “bakır alanı eğrisi”ne bakın; burada tahmin edilmez.
      </p>
      <PcbHow :items="how" />
    </div>
  </div>
</template>
