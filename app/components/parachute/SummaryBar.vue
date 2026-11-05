<script setup lang="ts">
import type { Analysis } from '~/utils/parachute'
import { fmt } from '~/utils/format'

const props = defineProps<{ analysis: Analysis | null; pending: boolean; errorCount: number }>()
const overall = computed(() => props.analysis?.limits.overall ?? 'none')
</script>

<template>
  <div
    class="sticky top-3 z-20 rounded-2xl border border-space-600 bg-space-900/85 px-4 py-3 shadow-lg shadow-black/30 backdrop-blur"
    role="status"
    aria-live="polite"
  >
    <div v-if="analysis" class="flex flex-wrap items-center gap-x-8 gap-y-1">
      <div>
        <p class="text-[11px] uppercase tracking-wide text-zinc-500">Terminal hız</p>
        <p class="text-2xl font-bold leading-tight tabular-nums text-white">
          {{ fmt(analysis.result.v, 2) }} <span class="text-sm font-normal text-zinc-400">m/s</span>
          <span class="ml-2 hidden text-sm font-normal text-zinc-500 sm:inline">{{ fmt(analysis.result.vKmh, 1) }} km/h</span>
        </p>
      </div>
      <div>
        <p class="text-[11px] uppercase tracking-wide text-zinc-500">Enerji</p>
        <p class="text-lg font-semibold leading-tight tabular-nums text-zinc-100">{{ fmt(analysis.result.energy, 1) }} <span class="text-sm font-normal text-zinc-400">J</span></p>
      </div>
      <div class="hidden sm:block">
        <p class="text-[11px] uppercase tracking-wide text-zinc-500">Yoğunluk</p>
        <p class="text-lg font-semibold leading-tight tabular-nums text-zinc-100">{{ fmt(analysis.result.rho, 3) }} <span class="text-sm font-normal text-zinc-400">kg/m³</span></p>
      </div>
      <div v-if="analysis.inverse" class="hidden md:block">
        <p class="text-[11px] uppercase tracking-wide text-zinc-500">Gereken çap</p>
        <p class="text-lg font-semibold leading-tight tabular-nums text-zinc-100">Ø {{ fmt(analysis.inverse.dRequired, 3) }} <span class="text-sm font-normal text-zinc-400">m</span></p>
      </div>
      <div class="ml-auto flex items-center gap-3">
        <Icon v-if="pending" name="lucide:loader-circle" size="16" class="animate-spin text-zinc-400" />
        <span
          class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium"
          :class="overall === 'pass' ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300' : overall === 'fail' ? 'border-rose-500/40 bg-rose-500/10 text-rose-300' : 'border-space-600 text-zinc-400'"
        >
          <Icon :name="overall === 'pass' ? 'lucide:circle-check' : overall === 'fail' ? 'lucide:circle-x' : 'lucide:minus-circle'" size="14" />
          {{ overall === 'pass' ? 'Geçti' : overall === 'fail' ? 'Kaldı' : 'Limit yok' }}
        </span>
      </div>
    </div>
    <p v-else-if="errorCount" class="flex items-center gap-2 text-sm text-rose-300">
      <Icon name="lucide:circle-alert" size="16" /> {{ errorCount }} alanda hata var; düzeltince sonuçlar burada görünür.
    </p>
    <p v-else class="flex items-center gap-2 text-sm text-zinc-400">
      <Icon name="lucide:keyboard" size="16" /> Başlamak için sistem kütlesini ve paraşüt çapını girin.
    </p>
  </div>
</template>
