<script setup lang="ts">
import {
  microstrip, microstripDiff, microstripWarnings, stripline, striplineWarnings, widthForZ0Microstrip, widthForZ0Stripline,
  widthForZdiffMicrostrip,
} from '~/utils/pcbImpedance'
import { checkNum, reportLine, sig, type PcbWarning } from '~/utils/pcbUnits'
import type { HowItem } from './How.vue'

const u = usePcbUnits()
// Stackup değerleri kodda sabit değil: kullanıcı girer (örnek değerler isteğe bağlı doldurulur).
const form = reactive({
  type: 'micro' as 'micro' | 'strip', mode: 'z0' as 'z0' | 'width', target: 'z0' as 'z0' | 'zdiff',
  er: '', h: '', cu: '', width: '', zt: '', diff: false, s: '',
})
convertFieldsOnUnitChange(form as unknown as Record<string, string>, ['h', 'width', 's'], ['cu'])
const lenU = computed(() => u.len.value)
const cuLabel = computed(() => (u.cu.value === 'oz' ? 'oz' : 'µm'))
function example() {
  Object.assign(form, { er: '4.4', h: u.len.value === 'mm' ? '1.6' : '63', cu: u.cu.value === 'oz' ? '1' : '35', width: u.len.value === 'mm' ? '3' : '118', zt: '50', s: u.len.value === 'mm' ? '0.2' : '8' })
}

const r = computed(() => {
  const errs: string[] = []
  const take = (raw: string, label: string, rule: Parameters<typeof checkNum>[2]) => {
    const c = checkNum(raw, label, rule)
    if (c.err) errs.push(c.err)
    return c.v
  }
  const er = take(form.er, 'εr', { min: 1, max: 200 })
  const h = take(form.h, form.type === 'micro' ? 'Dielektrik yüksekliği h' : 'Düzlemler arası mesafe b', { min: 0, minExclusive: true })
  const cu = take(form.cu, 'Bakır kalınlığı', { min: 0, minExclusive: true })
  const w = form.mode === 'z0' ? take(form.width, 'İz genişliği', { min: 0, minExclusive: true }) : null
  const zt = form.mode === 'width' ? take(form.zt, form.target === 'zdiff' && form.type === 'micro' ? 'Hedef Zdiff' : 'Hedef Z0', { min: 0, minExclusive: true, max: 1000 }) : null
  const diffOn = form.type === 'micro' && (form.diff || (form.mode === 'width' && form.target === 'zdiff'))
  const s = diffOn ? take(form.s, 'Çift içi boşluk s', { min: 0, minExclusive: true }) : null
  if (errs.length || er === null || h === null || cu === null) return { errs, ok: false as const }
  const hMm = u.lenToMm(h)
  const tMm = u.cuToUm(cu) / 1000
  const sMm = s !== null ? u.lenToMm(s) : null
  if (form.type === 'strip' && tMm >= hMm) errs.push('Bakır kalınlığı düzlemler arası mesafeden küçük olmalı.')
  if (errs.length) return { errs, ok: false as const }
  let wMm: number
  let wErr: string | null = null
  const wNull = (): number => { wErr = 'Hedef empedansa bu stackup ile ulaşılamıyor (izin makul genişlik aralığı dışında). Hedefi veya h değerini değiştirin.'; return NaN }
  if (form.mode === 'z0') {
    if (w === null) return { errs, ok: false as const }
    wMm = u.lenToMm(w)
  } else {
    if (zt === null) return { errs, ok: false as const }
    if (form.type === 'strip') wMm = widthForZ0Stripline(zt, hMm, tMm, er) ?? wNull()
    else if (form.target === 'zdiff') {
      if (sMm === null) return { errs, ok: false as const }
      wMm = widthForZdiffMicrostrip(zt, sMm, hMm, tMm, er) ?? wNull()
    } else wMm = widthForZ0Microstrip(zt, hMm, tMm, er) ?? wNull()
  }
  if (wErr) return { errs: [...errs, wErr], ok: false as const }
  const warn: PcbWarning[] = [{ level: 'warning', text: 'Belirsizlik ±%5–10: kritik hatlarda sonucu fabrikanın stackup hesaplayıcısıyla doğrulayın.' }]
  const line = form.type === 'micro' ? microstrip({ wMm, hMm, tMm, er }) : stripline({ wMm, bMm: hMm, tMm, er })
  warn.push(...(form.type === 'micro' ? microstripWarnings({ wMm, hMm, tMm, er }) : striplineWarnings({ wMm, bMm: hMm, tMm })))
  const zdiff = form.type === 'micro' && sMm !== null && diffOn ? microstripDiff({ wMm, hMm, tMm, er, sMm }) : null
  if (zdiff !== null && sMm !== null && (sMm / hMm < 0.1 || sMm / hMm > 5)) warn.push({ level: 'warning', text: 'Diferansiyel yaklaşığı için kaynakta kesin aralık yok; s/h = 0,1–5 dışında özellikle belirsizdir.' })
  return { errs, ok: true as const, er, hMm, tMm, wMm, sMm, line, zdiff, warn }
})

const typeName = computed(() => (form.type === 'micro' ? 'Mikroşerit (Hammerstad–Jensen)' : 'Simetrik şerit hat (IPC-2141)'))
const rep = computed(() => {
  const x = r.value
  if (!x.ok) return ''
  const inp = [`εr=${sig(x.er)}`, `${form.type === 'micro' ? 'h' : 'b'}=${sig(x.hMm)} mm`, `t=${sig(x.tMm * 1000)} µm`, `w=${sig(x.wMm)} mm`]
  if (x.sMm !== null && x.zdiff !== null) inp.push(`s=${sig(x.sMm)} mm`)
  const res = [`Z0=${sig(x.line.z0)} Ω`, `εeff=${sig(x.line.eeff)}`, `gecikme=${sig(x.line.delayPsPerMm)} ps/mm`]
  if (x.zdiff !== null) res.push(`Zdiff≈${sig(x.zdiff)} Ω`)
  return reportLine(typeName.value, form.type === 'micro' ? 'Hammerstad–Jensen Z0(w,h,t,εr); Zdiff≈2·Z0·(1−0,48·e^(−0,96·s/h))' : 'Z0 = 60/√εr·ln(4b/(0,67π(0,8w+t)))', inp, res)
})

const how: HowItem[] = [
  { t: 'Mikroşerit Z0 ve efektif εr', f: 'Z01(u) = η0/(2π)·ln(f(u)/u + √(1+(2/u)²))     f(u) = 6 + (2π−6)·exp(−(30,666/u)^0,7528)     u = w/h\nεeff(u) = (εr+1)/2 + (εr−1)/2·(1+10/u)^(−a·b)     a(u) = 1 + (1/49)·ln[(u⁴+(u/52)²)/(u⁴+0,432)] + (1/18,7)·ln[1+(u/18,1)³]     b = 0,564·((εr−0,9)/(εr+3))^0,053\nKalınlık: Δu1 = (t/(πh))·ln(1 + 4e/((t/h)·coth²√(6,517u)))     Δur = ½·(1 + 1/cosh√(εr−1))·Δu1     u1 = u+Δu1, ur = u+Δur\nZ0 = Z01(ur)/√εeff(ur)     εeff,t = εeff(ur)·(Z01(u1)/Z01(ur))²', src: 'Hammerstad & Jensen (1980); formül kümesi QUCS teknik dokümantasyonunda (Single microstrip line) yayımlanmıştır. Gecikme = √εeff / c.', range: 'Kaynakta: 0,01 ≤ w/h ≤ 100, εr ≤ 128; εeff için ≈%0,2, Z0 için ≈%1 doğruluk (formülün kendisi). Kalınlık düzeltmesi t ≪ h, t < w/2 için.', assume: 'Dağılma (frekansla εeff artışı) yok; kaplama, lehim maskesi ve kesit trapezi (aşındırma) hesaba katılmaz. Pratik belirsizlik ±%5–10 (malzeme εr toleransı, aşındırma, maske). Kritik hatlarda fabrika stackup hesaplayıcısıyla doğrulayın.' },
  { t: 'Simetrik şerit hat', f: 'Z0 = 60/√εr · ln[4b / (0,67·π·(0,8·w + t))]     gecikme = √εr / c', src: 'IPC-2141 (Controlled Impedance Circuit Boards and High Speed Logic Design). b: iki referans düzlemi arası toplam mesafe.', range: 'w/(b−t) < 0,35 ve t/b < 0,25. Dışında sarı uyarı çıkar.', assume: 'Hat iki düzlemin tam ortasında, homojen dielektrik. Dengesiz (asimetrik) şerit hat için bu araç yoktur.' },
  { t: 'Kenar kenara bağlı diferansiyel çift (mikroşerit)', f: 'Zdiff ≈ 2·Z0·(1 − 0,48·e^(−0,96·s/h))', src: 'IPC-2141 yaklaşığı.', range: 'Kaynakta kesin aralık verilmemiştir; s/h için 0,1–5 dışında sarı uyarı çıkar. Şerit hat için doğrulanmış bir formül uygulanmadı.', assume: 'Z0, tek uçlu hesaptaki aynı geometriden alınır; eşit genişlikli simetrik çift.' },
  { t: 'Hedef empedanstan genişlik', f: 'Z0(w) = hedef  →  ikiye bölme (bisection)', src: 'Sayısal çözüm; Z0 genişlikle monoton azalır.', range: 'Mikroşerit: w ∈ [0,01·h, 100·h]. Şerit hat: ln argümanı > 1 kalan genişlikler.', assume: 'Hedefe bu aralıkta ulaşılamıyorsa açık hata gösterilir.' },
]
</script>

<template>
  <div class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
    <div class="panel space-y-4">
      <fieldset>
        <legend class="mb-1 text-[13px] font-medium text-zinc-200">Hat tipi</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
          <button type="button" :aria-pressed="form.type === 'micro'" class="rounded-lg px-2 py-1.5" :class="form.type === 'micro' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.type = 'micro'">Mikroşerit</button>
          <button type="button" :aria-pressed="form.type === 'strip'" class="rounded-lg px-2 py-1.5" :class="form.type === 'strip' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.type = 'strip'">Şerit hat</button>
        </div>
      </fieldset>
      <fieldset>
        <legend class="mb-1 text-[13px] font-medium text-zinc-200">Hesap yönü</legend>
        <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
          <button type="button" :aria-pressed="form.mode === 'z0'" class="rounded-lg px-2 py-1.5" :class="form.mode === 'z0' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.mode = 'z0'">Geometri → Z0</button>
          <button type="button" :aria-pressed="form.mode === 'width'" class="rounded-lg px-2 py-1.5" :class="form.mode === 'width' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.mode = 'width'">Hedef Z0 → genişlik</button>
        </div>
      </fieldset>
      <p class="text-xs leading-snug text-zinc-500">Stackup değerlerini fabrikanızın verilerinden girin; araç sabit bir fabrika değeri varsaymaz.</p>
      <GoreField id="z-er" v-model="form.er" label="Dielektrik sabiti εr" required />
      <GoreField id="z-h" v-model="form.h" :label="form.type === 'micro' ? 'Dielektrik yüksekliği h' : 'Düzlemler arası mesafe b'" :unit="lenU" required />
      <GoreField id="z-cu" v-model="form.cu" label="Bakır kalınlığı t" :unit="cuLabel" required />
      <GoreField v-if="form.mode === 'z0'" id="z-w" v-model="form.width" label="İz genişliği w" :unit="lenU" required />
      <template v-else>
        <fieldset v-if="form.type === 'micro'">
          <legend class="mb-1 text-[13px] font-medium text-zinc-200">Hedef</legend>
          <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
            <button type="button" :aria-pressed="form.target === 'z0'" class="rounded-lg px-2 py-1.5" :class="form.target === 'z0' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.target = 'z0'">Z0 (tek uçlu)</button>
            <button type="button" :aria-pressed="form.target === 'zdiff'" class="rounded-lg px-2 py-1.5" :class="form.target === 'zdiff' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="form.target = 'zdiff'">Zdiff</button>
          </div>
        </fieldset>
        <GoreField id="z-zt" v-model="form.zt" :label="form.target === 'zdiff' && form.type === 'micro' ? 'Hedef Zdiff' : 'Hedef Z0'" unit="Ω" required />
      </template>
      <label v-if="form.type === 'micro' && !(form.mode === 'width' && form.target === 'zdiff')" class="flex items-center gap-2 text-sm text-zinc-200">
        <input v-model="form.diff" type="checkbox" class="h-4 w-4 accent-indigo-500" /> Kenar kenara bağlı diferansiyel çift
      </label>
      <GoreField v-if="form.type === 'micro' && (form.diff || (form.mode === 'width' && form.target === 'zdiff'))" id="z-s" v-model="form.s" label="Çift içi boşluk s" :unit="lenU" required />
      <button type="button" class="btn w-full" @click="example"><Icon name="lucide:wand-sparkles" size="16" /> Örnek değerleri doldur (FR-4, 1 oz)</button>
    </div>

    <div class="min-w-0 space-y-4">
      <p v-if="!r.ok && !r.errs.length" class="panel text-sm text-zinc-400">Sonuç için εr, h, bakır kalınlığı ve genişliği (veya hedef Z0) girin.</p>
      <PcbNotices :items="r.ok ? r.warn : []" :errors="r.ok ? [] : r.errs.filter((e) => !/değer girin/.test(e))" />
      <PcbCard v-if="r.ok" :title="typeName" :report="rep">
        <div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <PcbStat label="Z0" :value="sig(r.line.z0)" unit="Ω" />
          <PcbStat label="Efektif εr" :value="sig(r.line.eeff)" />
          <PcbStat label="Gecikme" :value="sig(r.line.delayPsPerMm)" unit="ps/mm" />
          <PcbStat v-if="r.zdiff !== null" label="Zdiff (yaklaşık)" :value="sig(r.zdiff)" unit="Ω" />
          <PcbStat v-if="form.mode === 'width'" label="Gereken iz genişliği" :value="sig(u.mmToLen(r.wMm))" :unit="lenU" :sub="`${sig(r.wMm)} mm`" />
        </div>
      </PcbCard>
      <PcbHow :items="how" />
    </div>
  </div>
</template>
