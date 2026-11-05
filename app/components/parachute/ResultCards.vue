<script setup lang="ts">
import type { Analysis } from '~/utils/parachute'
import { fmt } from '~/utils/format'

const props = defineProps<{ analysis: Analysis; pending?: boolean }>()
const r = computed(() => props.analysis.result)
const lim = computed(() => props.analysis.limits)
</script>

<template>
  <section aria-label="Sonuçlar" :aria-busy="pending ? 'true' : 'false'" class="space-y-4 transition-opacity" :class="{ 'opacity-60': pending }">
    <div class="panel panel-hero grid items-center gap-5 sm:grid-cols-[15rem_minmax(0,1fr)]">
      <ParachuteSpeedGauge :value="r.v" :limit="lim.speed?.limit ?? null" />
      <div class="min-w-0 space-y-4">
        <div>
          <p class="text-xs uppercase tracking-wide text-zinc-400">Terminal iniş hızı</p>
          <p class="text-4xl font-bold tabular-nums text-white">{{ fmt(r.v, 2) }} <span class="text-lg font-normal text-zinc-400">m/s</span></p>
          <p class="text-sm tabular-nums text-zinc-400">{{ fmt(r.vKmh, 2) }} km/h · eşdeğer düşme {{ fmt(r.dropHeight, 2) }} m</p>
        </div>
        <ParachuteLimitMeter v-if="lim.speed" label="Hız limiti" :check="lim.speed" unit="m/s" />
        <ParachuteLimitMeter v-if="lim.energy" label="Enerji limiti" :check="lim.energy" unit="J" :digits="1" />
        <p v-if="!lim.speed && !lim.energy" class="flex items-center gap-2 text-xs text-zinc-500">
          <Icon name="lucide:info" size="14" /> Geçti/kaldı kontrolü için soldan hız veya enerji limiti girin.
        </p>
      </div>
    </div>

    <div v-if="analysis.inverse" class="panel flex flex-wrap items-center gap-4 !border-arc-500/40 bg-arc-500/5">
      <span class="grid h-11 w-11 place-items-center rounded-xl bg-arc-500/15 text-arc-400"><Icon name="lucide:ruler" size="22" /></span>
      <div class="min-w-0 flex-1">
        <p class="text-xs text-zinc-400">{{ fmt(analysis.inverse.vTarget, 2) }} m/s hedefi için gereken nominal çap</p>
        <p class="text-2xl font-bold tabular-nums text-white">Ø {{ fmt(analysis.inverse.dRequired, 3) }} <span class="text-sm font-normal text-zinc-400">m</span></p>
      </div>
      <p class="text-sm tabular-nums" :class="analysis.inverse.diff > 0 ? 'text-amber-300' : 'text-emerald-300'">
        {{ analysis.inverse.diff >= 0 ? '+' : '' }}{{ fmt(analysis.inverse.diff, 3) }} m ({{ analysis.inverse.diffPct >= 0 ? '+' : '' }}%{{ fmt(analysis.inverse.diffPct, 1) }})
        <span class="block text-xs text-zinc-500">{{ analysis.inverse.diff > 0 ? 'Daha büyük paraşüt gerekir' : 'Mevcut paraşüt yeterli' }}</span>
      </p>
    </div>

    <div class="grid gap-3 sm:grid-cols-2">
      <ParachuteStatCard icon="lucide:zap" label="Kinetik enerji" :value="fmt(r.energy, 1)" unit="J" :tone="lim.energy ? (lim.energy.pass ? 'good' : 'bad') : 'default'" :sub="`½·m·v² · m = ${fmt(r.totalMass, 2)} kg`" />
      <ParachuteStatCard icon="lucide:wind" label="Hava yoğunluğu (ρ)" :value="fmt(r.rho, 4)" unit="kg/m³" :sub="r.rhoSource === 'isa' ? `ISA · ${fmt(r.atm.T - 273.15, 1)} °C · ${fmt(r.atm.p / 100, 1)} hPa` : 'Sabit değer (ISA yerine)'" />
      <ParachuteStatCard icon="lucide:circle-dashed" label="Etkin alan (A)" :value="fmt(r.area, 3)" unit="m²" :sub="`CdA = ${fmt(r.cdA, 3)} m²`" />
      <ParachuteStatCard icon="lucide:weight" label="Ağırlık (W = m·g)" :value="fmt(r.weight, 1)" unit="N" :sub="`${fmt(r.totalMass, 2)} kg toplam kütle`" />
    </div>
  </section>
</template>
