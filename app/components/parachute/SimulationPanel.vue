<script setup lang="ts">
import type { RunState } from '~/composables/useParachuteWorker'
import type { SimResult } from '~/utils/parachute'
import type { FieldErrors, FormState } from '~/utils/parachuteFields'
import { FIELDS } from '~/utils/parachuteFields'
import { fmt } from '~/utils/format'

const props = defineProps<{
  form: FormState
  errors: FieldErrors
  blocked: boolean
  state: RunState<SimResult>
  stale: boolean
}>()
defineEmits<{ run: [] }>()

const BLUE = '#56B4E9'
const ORANGE = '#E69F00'
const GREEN = '#009E73'
const PURPLE = '#CC79A7'

const r = computed(() => props.state.result)
const charts = computed(() => {
  const s = r.value
  if (!s) return []
  return [
    { title: 'Hız – zaman', xLabel: 'Zaman (s)', yLabel: 'Hız (m/s)', series: [{ name: 'Hız', color: BLUE, x: s.t, y: s.v }] },
    { title: 'İrtifa – zaman', xLabel: 'Zaman (s)', yLabel: 'İrtifa (m)', yDigits: 1, series: [{ name: 'İrtifa', color: ORANGE, x: s.t, y: s.h }] },
    { title: 'Hız – irtifa', xLabel: 'Hız (m/s)', yLabel: 'İrtifa (m)', yDigits: 1, series: [{ name: 'Hız–irtifa', color: GREEN, x: s.v, y: s.h }] },
    { title: 'İvme – zaman', xLabel: 'Zaman (s)', yLabel: 'İvme (m/s²)', series: [{ name: 'İvme', color: PURPLE, x: s.t, y: s.a }] },
    { title: 'Sürüklenme kuvveti – zaman', xLabel: 'Zaman (s)', yLabel: 'Sürükleme (N)', yDigits: 1, series: [{ name: 'Sürükleme', color: BLUE, x: s.t, y: s.drag }] },
  ]
})
</script>

<template>
  <section aria-labelledby="sim-baslik" class="space-y-4">
    <div class="panel">
      <ParachuteSectionHeader
        heading-id="sim-baslik"
        icon="lucide:chart-line"
        title="Dinamik iniş simülasyonu"
        subtitle="RK4 (dt = 0,01 s) ile m·dv/dt = m·g − ½ρ(h)v²CdA çözülür; ρ her adımda irtifaya göre ISA'dan alınır."
      />
      <div class="mt-4 grid gap-4 sm:grid-cols-2">
        <ParachuteFormField :spec="FIELDS.v0" :model-value="form.v0" :error="errors.v0" @update:model-value="form.v0 = $event" />
        <ParachuteFormField :spec="FIELDS.h0" :model-value="form.h0" :error="errors.h0" @update:model-value="form.h0 = $event" />
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-primary" :disabled="blocked || state.status === 'running'" @click="$emit('run')">
          <Icon name="lucide:play" size="16" /> Hesapla
        </button>
        <ParachuteRunStatus :status="state.status" :error="state.error" :stale="stale" />
      </div>
    </div>

    <template v-if="r">
      <div class="grid gap-3 sm:grid-cols-2">
        <ParachuteStatCard icon="lucide:timer" label="Toplam iniş süresi" :value="fmt(r.totalTime, 2)" unit="s" :sub="r.truncated ? 'Süre sınırına (2 saat) ulaşıldı' : `${fmt(r.h[0], 0)} m irtifadan`" />
        <ParachuteStatCard icon="lucide:arrow-down-to-line" label="Yere çarpma hızı" :value="fmt(r.impactSpeed, 2)" unit="m/s" :sub="`Terminal: ${fmt(r.terminalSpeed, 2)} m/s`" />
        <ParachuteStatCard v-if="r.t95 !== null" icon="lucide:gauge" label="Terminalin %95'ine ulaşma" :value="fmt(r.t95, 2)" unit="s" :sub="`Kaybedilen irtifa: ${fmt(r.hLost95, 1)} m`" />
        <ParachuteStatCard v-else-if="!r.decel" icon="lucide:gauge" label="Terminalin %95'ine ulaşma" value="—" sub="İniş boyunca ulaşılamadı" />
        <ParachuteStatCard v-if="r.decel" icon="lucide:chevrons-down" label="Yavaşlama (→ 1,05·v_t)" :value="fmt(r.decel.time, 2)" unit="s" :sub="`Mesafe: ${fmt(r.decel.distance, 1)} m`" />
      </div>
      <div class="grid gap-4 xl:grid-cols-2">
        <ParachuteLineChart v-for="c in charts" :key="c.title" v-bind="c" />
      </div>
    </template>
  </section>
</template>
