<script setup lang="ts">
import type { Layer } from '~/utils/pcbTrace'
import { viaCountForPower, viaCurrent, viaInductanceNh, viaThermal } from '~/utils/pcbVia'
import { checkNum, reportLine, sig, type PcbWarning } from '~/utils/pcbUnits'
import type { HowItem } from './How.vue'

const u = usePcbUnits()
const form = reactive({ hole: '0.3', plating: '25', board: '1.6', n: '4', layer: 'internal' as Layer, deltaT: '10', power: '2', dtAllow: '10' })
convertFieldsOnUnitChange(form, ['hole', 'board'], [])
const lenU = computed(() => u.len.value)

const r = computed(() => {
  const errs: string[] = []
  const take = (raw: string, label: string, rule: Parameters<typeof checkNum>[2]) => {
    const c = checkNum(raw, label, rule)
    if (c.err) errs.push(c.err)
    return c.v
  }
  const hole = take(form.hole, 'Delik çapı', { min: 0, minExclusive: true })
  const plating = take(form.plating, 'Kaplama kalınlığı', { min: 0, minExclusive: true, max: 200 })
  const board = take(form.board, 'Kart kalınlığı', { min: 0, minExclusive: true })
  const n = take(form.n, 'Via sayısı', { min: 1, int: true, max: 10000 })
  const dT = take(form.deltaT, 'ΔT', { min: 0, minExclusive: true, max: 1000 })
  const p = take(form.power, 'Bileşen gücü', { min: 0, minExclusive: true })
  const dta = take(form.dtAllow, 'İzin verilen sıcaklık farkı', { min: 0, minExclusive: true })
  if (hole === null || plating === null || board === null) return { errs, ok: false as const }
  const holeMm = u.lenToMm(hole)
  const boardMm = u.lenToMm(board)
  if (plating / 1000 >= holeMm / 2) errs.push('Kaplama kalınlığı delik yarıçapından küçük olmalı.')
  if (errs.length) return { errs, ok: false as const }
  const warn: PcbWarning[] = []
  if (plating < 15 || plating > 50) warn.push({ level: 'warning', text: 'Kaplama kalınlığı 15–50 µm dışında; tipik fabrika değerleri bu aralıktadır (girdi yine kullanıldı).' })
  if (boardMm / holeMm > 12) warn.push({ level: 'warning', text: 'Kart kalınlığı / delik çapı oranı 12’den büyük (yüksek en-boy oranı): kaplama üretimi zor olabilir.' })
  if (holeMm >= 4 * boardMm) warn.push({ level: 'warning', text: 'Endüktans formülü h > d/4 için anlamlıdır; bu girdide güvenilmez.' })
  const cur = dT !== null ? viaCurrent({ holeMm, platingUm: plating, deltaT: dT, layer: form.layer }) : null
  if (dT !== null && (dT < 10 || dT > 100)) warn.push({ level: 'warning', text: 'ΔT, IPC-2221 aralığının (10–100 °C) dışında.' })
  const th = n !== null ? viaThermal({ holeMm, platingUm: plating, lengthMm: boardMm, n }) : null
  const need = p !== null && dta !== null ? viaCountForPower({ powerW: p, deltaTK: dta, holeMm, platingUm: plating, lengthMm: boardMm }) : null
  return { errs, ok: true as const, holeMm, boardMm, plating, n, dT, cur, th, need, p, dta, l: viaInductanceNh(boardMm, holeMm), warn }
})

const rep = computed(() => {
  const x = r.value
  if (!x.ok) return { cur: '', th: '', need: '', ind: '' }
  const geo = [`D=${sig(x.holeMm)} mm`, `t=${sig(x.plating)} µm`]
  return {
    cur: x.cur ? reportLine('Via akımı (yaklaşık)', 'A = π·(D−t)·t; I = k·ΔT^0,44·A^0,725 (IPC-2221)', [...geo, `ΔT=${sig(x.dT!)} °C`, form.layer === 'external' ? 'k=0,048' : 'k=0,024'], [`A=${sig(x.cur.areaMm2, 3)} mm²`, `I≈${sig(x.cur.currentA)} A`]) : '',
    th: x.th ? reportLine('Via ısıl direnci', 'R = L/(k·A), k_Cu = 385 W/m·K; N via paralel R/N', [...geo, `L=${sig(x.boardMm)} mm`, `N=${x.n}`], [`R_tek=${sig(x.th.single)} K/W`, `R_${x.n}=${sig(x.th.parallel)} K/W`]) : '',
    need: x.need ? reportLine('Gereken via sayısı', 'N = ⌈P·R_tek/ΔT_izin⌉', [...geo, `L=${sig(x.boardMm)} mm`, `P=${sig(x.p!)} W`, `ΔT_izin=${sig(x.dta!)} K`], [`N=${x.need.count}`]) : '',
    ind: reportLine('Via endüktansı (yaklaşık)', 'L ≈ 5,08·h·[ln(4h/d)+1] nH (h, d inç)', [`h=${sig(x.boardMm)} mm`, `d=${sig(x.holeMm)} mm`], [`L≈${sig(x.l)} nH`]),
  }
})

const how: HowItem[] = [
  { t: 'Akım kapasitesi (yaklaşık)', f: 'A = π·(D − t)·t     I = k·ΔT^0,44·A^0,725     A mil² cinsinden', src: 'Namlu kesiti halka olarak alınır ve IPC-2221 iz formülüne verilir.', range: 'IPC-2221 aralığı: ΔT 10–100 °C, ≤ 35 A. Via için doğrudan bir standart eğrisi yoktur; sonuç yaklaşıktır.', assume: 'Varsayılan k = 0,024 (iç katman, muhafazakâr). Akım, iz ve via arasında eşit paylaşılır; ısı iletimi çevre bakıra dahil edilmez. Kaplama kalınlığı bölgesel olarak homojen kabul edilir (D: delik çapı).' },
  { t: 'Isıl direnç ve via sayısı', f: 'R_via = L / (k·A)     k_Cu = 385 W/(m·K)     R_N = R_via / N     N = ⌈P·R_via / ΔT_izin⌉', src: 'Fourier tek boyutlu ısı iletimi; bakır iletkenlik değeri tipik kitap değeridir.', range: 'Tek boyutlu, kararlı hal. Kısa vialarda (L ≈ kart kalınlığı) iyi bir ilk tahmindir.', assume: 'Isı yalnızca namlu boyunca iletilir; yatay yayılma, dolgulu via, epoksi/reçine ve bileşen pedi direnci hesaba katılmaz. Gerçek durumda sonuç genelde daha iyidir; ancak ısı kaynağı ile via arası ve bakır yayılma dirençleri ayrıca eklenmelidir. Via sayısı yalnızca bir tahmindir.' },
  { t: 'Endüktans (yaklaşık, Johnson)', f: 'L ≈ 5,08·h·[ln(4h/d) + 1]  nH     h, d inç', src: 'H. Johnson & M. Graham, High-Speed Digital Design.', range: 'h ≫ d (ince, uzun via). Dönüş yolu ve anti-pad etkisi dahil değildir.', assume: 'Yaklaşık değerdir; ±%20 gibi sapmalar beklenebilir. Hızlı sinyal analizinde 3B çözücü kullanın.' },
]
</script>

<template>
  <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
    <div class="panel space-y-4">
      <GoreField id="v-d" v-model="form.hole" label="Delik çapı D" :unit="lenU" />
      <GoreField id="v-t" v-model="form.plating" label="Kaplama kalınlığı t" unit="µm" help="Genellikle 20–30 µm; fabrika şartnamesinden alın." />
      <GoreField id="v-h" v-model="form.board" label="Kart kalınlığı (via boyu)" :unit="lenU" />
      <p class="border-t border-space-700 pt-3 text-xs uppercase tracking-widest text-zinc-500">Akım</p>
      <fieldset>
        <legend class="mb-1 text-[13px] font-medium text-zinc-200">k katsayısı</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
          <button type="button" :aria-pressed="form.layer === 'internal'" class="rounded-lg px-2 py-1.5" :class="form.layer === 'internal' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.layer = 'internal'">0,024 (iç)</button>
          <button type="button" :aria-pressed="form.layer === 'external'" class="rounded-lg px-2 py-1.5" :class="form.layer === 'external' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.layer = 'external'">0,048 (dış)</button>
        </div>
      </fieldset>
      <GoreField id="v-dt" v-model="form.deltaT" label="Sıcaklık artışı ΔT" unit="°C" />
      <p class="border-t border-space-700 pt-3 text-xs uppercase tracking-widest text-zinc-500">Isıl</p>
      <GoreField id="v-n" v-model="form.n" label="Via sayısı N (paralel)" />
      <GoreField id="v-p" v-model="form.power" label="Bileşen gücü" unit="W" />
      <GoreField id="v-da" v-model="form.dtAllow" label="İzin verilen sıcaklık farkı (via boyunca)" unit="K" />
    </div>

    <div class="min-w-0 space-y-4">
      <PcbNotices :items="r.ok ? r.warn : []" :errors="r.errs" />
      <template v-if="r.ok">
        <PcbCard v-if="r.cur" title="Via akım kapasitesi (yaklaşık)" :report="rep.cur">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PcbStat label="Namlu kesiti" :value="sig(r.cur.areaMm2)" unit="mm²" :sub="`${sig(r.cur.areaMil2)} mil²`" />
            <PcbStat label="Akım (yaklaşık)" :value="sig(r.cur.currentA)" unit="A" />
          </div>
        </PcbCard>
        <PcbCard v-if="r.th" title="Isıl direnç" :report="rep.th">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PcbStat label="Tek via" :value="sig(r.th.single)" unit="K/W" />
            <PcbStat :label="`${r.n} via paralel`" :value="sig(r.th.parallel)" unit="K/W" />
          </div>
        </PcbCard>
        <PcbCard v-if="r.need" title="Güç bileşeni altı için gereken via sayısı (tahmin)" :report="rep.need">
          <PcbStat label="Gereken via" :value="String(r.need.count)" unit="adet" :sub="`${sig(r.p!)} W · ΔT ≤ ${sig(r.dta!)} K`" />
        </PcbCard>
        <PcbCard title="Via endüktansı (yaklaşık)" :report="rep.ind">
          <PcbStat label="Johnson tahmini" :value="sig(r.l)" unit="nH" />
        </PcbCard>
      </template>
      <PcbHow :items="how" />
    </div>
  </div>
</template>
