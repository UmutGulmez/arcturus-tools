<script setup lang="ts">
import {
  bestDividers, crystalLoadCap, dividerVout, lcCapacitor, lcImpedance, lcInductor, lcResonance, rcCapacitor, rcCutoff, rcResistor,
  shunt, type Series,
} from '~/utils/pcbCircuit'
import { checkNum, reportLine, sig, type PcbWarning } from '~/utils/pcbUnits'
import type { HowItem } from './How.vue'

const hide = (e: string[]) => e.filter((m) => !/değer girin/.test(m))
const copyText = (t: string) => navigator.clipboard?.writeText(t).catch(() => window.prompt('Metni kopyalayın:', t))
const sub = ref<'div' | 'xtal' | 'filt' | 'shunt'>('div')
const subs = [
  { id: 'div', label: 'Gerilim bölücü', icon: 'lucide:split' },
  { id: 'xtal', label: 'Kristal yükü', icon: 'lucide:audio-lines' },
  { id: 'filt', label: 'RC / LC filtre', icon: 'lucide:activity' },
  { id: 'shunt', label: 'Akım shunt', icon: 'lucide:gauge' },
] as const

const take = (errs: string[]) => (raw: string, label: string, rule: Parameters<typeof checkNum>[2]) => {
  const c = checkNum(raw, label, rule)
  if (c.err) errs.push(c.err)
  return c.v
}
const pos = { min: 0, minExclusive: true } as const
const eng = (x: number, unit: string) => {
  const a = Math.abs(x)
  const p: [number, string][] = [[1e9, 'G'], [1e6, 'M'], [1e3, 'k'], [1, ''], [1e-3, 'm'], [1e-6, 'µ'], [1e-9, 'n'], [1e-12, 'p']]
  const [f, s] = p.find(([f]) => a >= f) ?? [1e-12, 'p']
  return `${sig(x / f)} ${s}${unit}`
}

// ---- Bölücü
const dv = reactive({ vout: '', vref: '', series: 'E96' as Series, rmin: '1000', rmax: '1000000', r1: '', r2: '' })
const dvR = computed(() => {
  const errs: string[] = []
  const t = take(errs)
  const vout = t(dv.vout, 'Hedef Vout', pos)
  const vref = t(dv.vref, 'Vref', pos)
  const rmin = t(dv.rmin, 'En küçük R', pos)
  const rmax = t(dv.rmax, 'En büyük R', pos)
  if (rmin !== null && rmax !== null && rmax / rmin > 1e4) errs.push('R aralığı en çok 4 dekad olabilir (en büyük / en küçük ≤ 10000).')
  if (rmin !== null && rmax !== null && rmax <= rmin) errs.push('En büyük R, en küçük R’den büyük olmalı.')
  if (vout !== null && vref !== null && vout <= vref) errs.push('Vout, Vref değerinden büyük olmalı (Vout = Vref·(1 + R1/R2) ≥ Vref).')
  if (errs.length || vout === null || vref === null || rmin === null || rmax === null) return { errs, ok: false as const }
  const pairs = bestDividers({ vout, vref, series: dv.series, rMin: rmin, rMax: rmax, top: 5 })
  return { errs, ok: true as const, pairs, vout, vref, ratio: vout / vref - 1 }
})
const dvFwd = computed(() => {
  if (!dv.r1.trim() || !dv.r2.trim()) return null
  const errs: string[] = []
  const t = take(errs)
  const r1 = t(dv.r1, 'R1', pos)
  const r2 = t(dv.r2, 'R2', pos)
  const vref = t(dv.vref, 'Vref', pos)
  if (errs.length || r1 === null || r2 === null || vref === null) return { errs, v: null, r1, r2 }
  return { errs, v: dividerVout(vref, r1, r2), r1, r2 }
})
const dvRep = (p: { r1: number; r2: number; vout: number; errPct: number }) =>
  reportLine('Gerilim bölücü', 'Vout = Vref·(1 + R1/R2)', [`Vref=${sig(dvR.value.ok ? dvR.value.vref : 0)} V`, `hedef=${sig(dvR.value.ok ? dvR.value.vout : 0)} V`, dv.series], [`R1=${eng(p.r1, 'Ω')}`, `R2=${eng(p.r2, 'Ω')}`, `Vout=${sig(p.vout, 4)} V`, `hata=${sig(p.errPct)} %`])

// ---- Kristal
const xt = reactive({ cl: '', cs: '' })
const xtR = computed(() => {
  const errs: string[] = []
  const t = take(errs)
  const cl = t(xt.cl, 'CL (datasheet)', pos)
  const cs = t(xt.cs, 'Cstray', { min: 0 })
  if (errs.length || cl === null || cs === null) return { errs, ok: false as const }
  const warn: PcbWarning[] = []
  if (cs >= cl) errs.push('Cstray, CL değerinden küçük olmalı (aksi halde C1 = C2 ≤ 0).')
  if (errs.length) return { errs, ok: false as const }
  if (cs < 1 || cs > 10) warn.push({ level: 'warning', text: 'Cstray tipik olarak 2–5 pF civarındadır; 1–10 pF dışındaki değerleri kartınızdan doğrulayın.' })
  return { errs, ok: true as const, c: crystalLoadCap(cl * 1e-12, cs * 1e-12) * 1e12, cl, cs, warn }
})
const xtRep = computed(() => (xtR.value.ok ? reportLine('Kristal yük kapasitörü', 'C1 = C2 = 2·(CL − Cstray)', [`CL=${sig(xtR.value.cl)} pF`, `Cstray=${sig(xtR.value.cs)} pF`], [`C1=C2=${sig(xtR.value.c)} pF`]) : ''))

// ---- Filtre
const fl = reactive({ kind: 'rc' as 'rc' | 'lc', solve: 'f' as 'f' | 'x' | 'y', r: '1000', c: '100', l: '10', f: '' })
// birimler: R [Ω], C [nF], L [µH], f [Hz]
const flR = computed(() => {
  const errs: string[] = []
  const t = take(errs)
  const rc = fl.kind === 'rc'
  const x = fl.solve === 'x' ? null : t(rc ? fl.r : fl.l, rc ? 'R' : 'L', pos) // x: R veya L
  const y = fl.solve === 'y' ? null : t(fl.c, 'C', pos)
  const f = fl.solve === 'f' ? null : t(fl.f, rc ? 'Kesim frekansı' : 'Rezonans frekansı', pos)
  if (errs.length) return { errs, ok: false as const }
  const C = (y ?? 0) * 1e-9
  const X = rc ? (x ?? 0) : (x ?? 0) * 1e-6
  let res: string[]
  let rep: string
  if (rc) {
    if (fl.solve === 'f') { const fc = rcCutoff(X, C); res = [`fc=${eng(fc, 'Hz')}`]; rep = reportLine('RC filtre', 'fc = 1/(2π·R·C)', [`R=${eng(X, 'Ω')}`, `C=${eng(C, 'F')}`], res) }
    else if (fl.solve === 'x') { const R = rcResistor(f!, C); res = [`R=${eng(R, 'Ω')}`]; rep = reportLine('RC filtre', 'R = 1/(2π·fc·C)', [`fc=${eng(f!, 'Hz')}`, `C=${eng(C, 'F')}`], res) }
    else { const Cn = rcCapacitor(f!, X); res = [`C=${eng(Cn, 'F')}`]; rep = reportLine('RC filtre', 'C = 1/(2π·fc·R)', [`fc=${eng(f!, 'Hz')}`, `R=${eng(X, 'Ω')}`], res) }
  } else if (fl.solve === 'f') {
    const f0 = lcResonance(X, C)
    res = [`f0=${eng(f0, 'Hz')}`, `Z=√(L/C)=${eng(lcImpedance(X, C), 'Ω')}`]
    rep = reportLine('LC filtre', 'f0 = 1/(2π·√(L·C))', [`L=${eng(X, 'H')}`, `C=${eng(C, 'F')}`], res)
  } else if (fl.solve === 'x') { const L = lcInductor(f!, C); res = [`L=${eng(L, 'H')}`]; rep = reportLine('LC filtre', 'L = 1/((2π·f0)²·C)', [`f0=${eng(f!, 'Hz')}`, `C=${eng(C, 'F')}`], res) }
  else { const Cn = lcCapacitor(f!, X); res = [`C=${eng(Cn, 'F')}`]; rep = reportLine('LC filtre', 'C = 1/((2π·f0)²·L)', [`f0=${eng(f!, 'Hz')}`, `L=${eng(X, 'H')}`], res) }
  return { errs, ok: true as const, res, rep }
})

// ---- Shunt
const sh = reactive({ i: '', r: '', g: '', bits: '', vref: '' })
const shR = computed(() => {
  const errs: string[] = []
  const t = take(errs)
  const i = t(sh.i, 'Akım', pos)
  const r = t(sh.r, 'Shunt direnci', pos)
  const g = t(sh.g, 'Yükseltici kazancı', pos)
  const bits = t(sh.bits, 'ADC bit sayısı', { min: 1, max: 32, int: true })
  const vref = t(sh.vref, 'ADC Vref', pos)
  if (errs.length || i === null || r === null || g === null || bits === null || vref === null) return { errs, ok: false as const }
  const res = shunt({ currentA: i, rShunt: r / 1000, gain: g, adcBits: bits, adcVref: vref })
  const warn: PcbWarning[] = []
  if (res.saturated) warn.push({ level: 'error', text: `Yükseltilmiş gerilim (${sig(res.vAdc)} V) ADC Vref değerini (${sig(vref)} V) aşıyor: ölçüm doyar. Tam ölçek akım ${sig(res.fullScaleA)} A.` })
  return { errs, ok: true as const, res, warn, i, r, g, bits, vref }
})
const shRep = computed(() => {
  const x = shR.value
  if (!x.ok) return ''
  return reportLine('Akım shunt', 'V = I·R; P = I²·R; ΔI = (Vref/2^N)/(G·R)', [`I=${sig(x.i)} A`, `R=${sig(x.r)} mΩ`, `G=${sig(x.g)}`, `ADC ${x.bits} bit, Vref=${sig(x.vref)} V`], [`Vshunt=${sig(x.res.vShunt * 1000)} mV`, `P=${sig(x.res.powerW * 1000)} mW`, `çözünürlük=${sig(x.res.lsbA * 1000)} mA/LSB`])
})

const how: Record<string, HowItem[]> = {
  div: [{ t: 'Gerilim bölücü / regülatör geri besleme', f: 'Vout = Vref·(1 + R1/R2)     hata % = (Vout_gerçek − Vout_hedef)/Vout_hedef·100', src: 'Standart direnç bölücü; E24 ve E96 değerleri IEC 60063 serileridir.', range: 'Vout ≥ Vref. Aranan R aralığı 4 dekadla sınırlıdır.', assume: 'İdeal dirençler (tolerans, sıcaklık katsayısı ve geri besleme pini sızıntı akımı yok). Aynı oran ×10 ölçeklerinde tek satır gösterilir; ölçek seçimini geri besleme akımı ve gürültüye göre siz yapın.' }],
  xtal: [{ t: 'Kristal yük kapasitörü', f: 'CL = C1·C2/(C1 + C2) + Cstray     →     C1 = C2 = 2·(CL − Cstray)', src: 'Pierce osilatörü için standart yük kapasitansı ilişkisi (kristal datasheet’leri, uygulama notları).', range: 'Cstray tipik 2–5 pF; kart yerleşimine bağlıdır.', assume: 'C1 = C2 simetrik. Standart değere en yakın kapasitörü seçip osilatör marjını ölçün.' }],
  filt: [{ t: 'RC ve LC filtre', f: 'fc = 1/(2π·R·C)     f0 = 1/(2π·√(L·C))     Z0 = √(L/C)', src: 'Birinci derece RC (−3 dB noktası) ve rezonans frekansı formülleri.', range: 'İdeal bileşenler.', assume: 'Kaynak/yük empedansı, bileşen parazitleri ve kayıplar (ESR, Q) hesaba katılmaz. RC’de fc −3 dB noktasıdır.' }],
  shunt: [{ t: 'Akım ölçüm shunt', f: 'Vshunt = I·R     P = I²·R     LSB_akım = (Vref/2^N) / (G·R)     I_tam ölçek = Vref/(G·R)', src: 'Ohm kanunu ve ideal N-bit ADC.', range: 'Yükseltilmiş gerilim ≤ ADC Vref.', assume: 'Ofset, kazanç hatası, gürültü ve direnç ısınma kayması çözünürlüğü kötüleştirir; ideal LSB değeri alt sınırdır.' }],
}
</script>

<template>
  <div class="space-y-4">
    <div role="tablist" aria-label="Devre yardımcıları" class="flex gap-1 overflow-x-auto rounded-2xl border border-space-600 bg-space-800/70 p-1">
      <button
        v-for="s in subs" :key="s.id" type="button" role="tab" :aria-selected="sub === s.id"
        class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-xl px-3.5 py-2 text-sm transition"
        :class="sub === s.id ? 'bg-space-600 font-medium text-white shadow' : 'text-zinc-400 hover:text-zinc-200'"
        @click="sub = s.id"
      ><Icon :name="s.icon" size="16" /> {{ s.label }}</button>
    </div>

    <!-- Gerilim bölücü -->
    <div v-show="sub === 'div'" class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="panel space-y-4">
        <GoreField id="d-vo" v-model="dv.vout" label="Hedef çıkış Vout" unit="V" />
        <GoreField id="d-vr" v-model="dv.vref" label="Referans Vref (geri besleme)" unit="V" />
        <fieldset>
          <legend class="mb-1 text-[13px] font-medium text-zinc-200">Seri</legend>
          <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
            <button v-for="s in (['E24', 'E96'] as const)" :key="s" type="button" :aria-pressed="dv.series === s" class="rounded-lg px-2 py-1.5" :class="dv.series === s ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="dv.series = s">{{ s }}</button>
          </div>
        </fieldset>
        <div class="grid grid-cols-2 gap-3">
          <GoreField id="d-rn" v-model="dv.rmin" label="En küçük R" unit="Ω" />
          <GoreField id="d-rx" v-model="dv.rmax" label="En büyük R" unit="Ω" />
        </div>
        <button type="button" class="btn w-full" @click="Object.assign(dv, { vout: '3.3', vref: '0.8' })"><Icon name="lucide:wand-sparkles" size="16" /> Örnek değerleri doldur</button>
        <p class="border-t border-space-700 pt-3 text-xs uppercase tracking-widest text-zinc-500">Ters kontrol (isteğe bağlı)</p>
        <div class="grid grid-cols-2 gap-3">
          <GoreField id="d-r1" v-model="dv.r1" label="R1" unit="Ω" placeholder="boş" />
          <GoreField id="d-r2" v-model="dv.r2" label="R2" unit="Ω" placeholder="boş" />
        </div>
      </div>
      <div class="min-w-0 space-y-4">
        <PcbNotices :items="[]" :errors="hide([...dvR.errs, ...(dvFwd?.errs ?? [])])" />
        <PcbCard v-if="dvR.ok" :title="`En yakın ${dv.series} çiftleri (R1/R2 ideal = ${sig(dvR.ratio, 4)})`" :report="dvRep(dvR.pairs[0]!)">
          <div class="overflow-x-auto">
            <table class="data-table">
              <thead><tr><th>R1</th><th>R2</th><th class="num">Vout (V)</th><th class="num">Hata (%)</th><th class="w-px"><span class="sr-only">Kopyala</span></th></tr></thead>
              <tbody>
                <tr v-for="(p, k) in dvR.pairs" :key="k">
                  <td class="tabular-nums">{{ eng(p.r1, 'Ω') }}</td><td class="tabular-nums">{{ eng(p.r2, 'Ω') }}</td>
                  <td class="num">{{ sig(p.vout, 4) }}</td><td class="num" :class="Math.abs(p.errPct) > 1 ? 'text-amber-300' : ''">{{ p.errPct >= 0 ? '+' : '−' }}{{ sig(Math.abs(p.errPct), 2) }}</td>
                  <td><button type="button" class="text-xs text-arc-400 underline" :title="'Bu çifti rapora kopyala'" @click="copyText(dvRep(p))">kopyala</button></td>
                </tr>
              </tbody>
            </table>
          </div>
          <p class="mt-2 text-xs text-zinc-500">Aynı oran ×10 ölçeklerinde tek satır gösterilir. “Rapora kopyala” ilk satırı kopyalar.</p>
        </PcbCard>
        <PcbCard v-if="dvFwd && dvFwd.v !== null" title="Ters kontrol: verilen R1, R2 ile Vout" :report="reportLine('Gerilim bölücü', 'Vout = Vref·(1 + R1/R2)', [`R1=${eng(dvFwd.r1!, 'Ω')}`, `R2=${eng(dvFwd.r2!, 'Ω')}`, `Vref=${sig(Number(dv.vref.replace(',', '.')))} V`], [`Vout=${sig(dvFwd.v, 4)} V`])">
          <PcbStat label="Vout" :value="sig(dvFwd.v, 4)" unit="V" />
        </PcbCard>
        <PcbHow :items="how.div!" />
      </div>
    </div>

    <!-- Kristal -->
    <div v-show="sub === 'xtal'" class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="panel space-y-4">
        <GoreField id="x-cl" v-model="xt.cl" label="Kristalin yük kapasitansı CL (datasheet)" unit="pF" />
        <GoreField id="x-cs" v-model="xt.cs" label="Kart parazit kapasitansı Cstray" unit="pF" help="Pad, iz ve çip pin kapasitansı toplamı." />
        <button type="button" class="btn w-full" @click="Object.assign(xt, { cl: '12', cs: '3' })"><Icon name="lucide:wand-sparkles" size="16" /> Örnek değerleri doldur</button>
      </div>
      <div class="min-w-0 space-y-4">
        <PcbNotices :items="xtR.ok ? xtR.warn : []" :errors="hide(xtR.errs)" />
        <PcbCard v-if="xtR.ok" title="Yük kapasitörleri" :report="xtRep">
          <PcbStat label="C1 = C2" :value="sig(xtR.c)" unit="pF" />
        </PcbCard>
        <PcbHow :items="how.xtal!" />
      </div>
    </div>

    <!-- Filtre -->
    <div v-show="sub === 'filt'" class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="panel space-y-4">
        <fieldset>
          <legend class="mb-1 text-[13px] font-medium text-zinc-200">Filtre tipi</legend>
          <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
            <button type="button" :aria-pressed="fl.kind === 'rc'" class="rounded-lg px-2 py-1.5" :class="fl.kind === 'rc' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="fl.kind = 'rc'">RC</button>
            <button type="button" :aria-pressed="fl.kind === 'lc'" class="rounded-lg px-2 py-1.5" :class="fl.kind === 'lc' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="fl.kind = 'lc'">LC</button>
          </div>
        </fieldset>
        <fieldset>
          <legend class="mb-1 text-[13px] font-medium text-zinc-200">Hesaplanacak</legend>
          <div class="grid grid-cols-3 gap-1 rounded-xl border border-space-600 bg-space-900 p-1 text-sm">
            <button type="button" :aria-pressed="fl.solve === 'f'" class="rounded-lg px-2 py-1.5" :class="fl.solve === 'f' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="fl.solve = 'f'">Frekans</button>
            <button type="button" :aria-pressed="fl.solve === 'x'" class="rounded-lg px-2 py-1.5" :class="fl.solve === 'x' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="fl.solve = 'x'">{{ fl.kind === 'rc' ? 'R' : 'L' }}</button>
            <button type="button" :aria-pressed="fl.solve === 'y'" class="rounded-lg px-2 py-1.5" :class="fl.solve === 'y' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="fl.solve = 'y'">C</button>
          </div>
        </fieldset>
        <GoreField v-if="fl.solve !== 'x'" id="f-x" :model-value="fl.kind === 'rc' ? fl.r : fl.l" :label="fl.kind === 'rc' ? 'R' : 'L'" :unit="fl.kind === 'rc' ? 'Ω' : 'µH'" @update:model-value="(v: string) => (fl.kind === 'rc' ? (fl.r = v) : (fl.l = v))" />
        <GoreField v-if="fl.solve !== 'y'" id="f-c" v-model="fl.c" label="C" unit="nF" />
        <GoreField v-if="fl.solve !== 'f'" id="f-f" v-model="fl.f" :label="fl.kind === 'rc' ? 'Kesim frekansı fc' : 'Rezonans frekansı f0'" unit="Hz" />
      </div>
      <div class="min-w-0 space-y-4">
        <PcbNotices :items="[]" :errors="hide(flR.errs)" />
        <PcbCard v-if="flR.ok" :title="fl.kind === 'rc' ? 'RC filtre' : 'LC filtre'" :report="flR.rep">
          <div class="grid grid-cols-2 gap-4"><PcbStat v-for="(x, k) in flR.res" :key="k" :label="x.split('=')[0]!" :value="x.split('=').slice(1).join('=')" /></div>
        </PcbCard>
        <PcbHow :items="how.filt!" />
      </div>
    </div>

    <!-- Shunt -->
    <div v-show="sub === 'shunt'" class="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
      <div class="panel space-y-4">
        <GoreField id="s-i" v-model="sh.i" label="Maksimum akım" unit="A" />
        <GoreField id="s-r" v-model="sh.r" label="Shunt direnci" unit="mΩ" />
        <GoreField id="s-g" v-model="sh.g" label="Akım algılama yükselticisi kazancı" help="Yükseltici yoksa 1 girin." />
        <GoreField id="s-b" v-model="sh.bits" label="ADC çözünürlüğü" unit="bit" />
        <GoreField id="s-v" v-model="sh.vref" label="ADC referans gerilimi" unit="V" />
        <button type="button" class="btn w-full" @click="Object.assign(sh, { i: '10', r: '5', g: '20', bits: '12', vref: '3.3' })"><Icon name="lucide:wand-sparkles" size="16" /> Örnek değerleri doldur</button>
      </div>
      <div class="min-w-0 space-y-4">
        <PcbNotices :items="shR.ok ? shR.warn : []" :errors="hide(shR.errs)" />
        <PcbCard v-if="shR.ok" title="Shunt ve ADC çözünürlüğü" :report="shRep" :tone="shR.res.saturated ? 'bad' : undefined">
          <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
            <PcbStat label="Vshunt" :value="sig(shR.res.vShunt * 1000)" unit="mV" />
            <PcbStat label="Güç kaybı" :value="sig(shR.res.powerW * 1000)" unit="mW" :sub="`${sig(shR.res.powerW)} W`" />
            <PcbStat label="ADC girişi" :value="sig(shR.res.vAdc)" unit="V" />
            <PcbStat label="Akım çözünürlüğü" :value="sig(shR.res.lsbA * 1000)" unit="mA/LSB" />
            <PcbStat label="Tam ölçek akım" :value="sig(shR.res.fullScaleA)" unit="A" />
          </div>
        </PcbCard>
        <PcbHow :items="how.shunt!" />
      </div>
    </div>
  </div>
</template>
