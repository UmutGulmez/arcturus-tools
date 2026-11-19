<script setup lang="ts">
import { fmt } from '~/utils/format'

const s = useFlight()
const [t0, t1] = [computed(() => s.tRange.value[0]), computed(() => s.tRange.value[1])]
const value = computed({
  get: () => s.cursor.value ?? t0.value,
  set: (v: number) => { s.playing.value = false; s.setCursor(Number(v), { pin: true }) },
})
const step = computed(() => Math.max((t1.value - t0.value) / 2000, 0.001))
const speeds = [1, 5, 10]
const toggle = () => (s.playing.value = !s.playing.value)
const unpin = () => { s.playing.value = false; s.setCursor(null, { pin: false }) }
const dig = (v: number | null, k: string) => (v === null ? '—' : fmt(v, k === 'mach' || k === 'stab' ? 2 : k === 'aoa' ? 1 : v >= 1000 ? 0 : 1))
</script>

<template>
  <div class="timebar no-print sticky bottom-0 z-20 -mx-5 mt-6 border-t border-space-600 bg-space-900/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:px-8 lg:-mx-10 lg:px-10">
    <div class="flex flex-wrap items-center gap-3">
      <button type="button" class="btn btn-primary !px-3" :aria-label="s.playing.value ? 'Duraklat' : 'Oynat'" @click="toggle">
        <Icon :name="s.playing.value ? 'lucide:pause' : 'lucide:play'" size="16" />{{ s.playing.value ? 'Duraklat' : 'Oynat' }}
      </button>
      <div class="flex rounded-xl border border-space-600 p-0.5" role="group" aria-label="Oynatma hızı">
        <button v-for="x in speeds" :key="x" type="button" class="rounded-lg px-2.5 py-1 text-xs tabular-nums" :class="s.speed.value === x ? 'bg-space-600 text-white' : 'text-zinc-400 hover:text-zinc-200'" :aria-pressed="s.speed.value === x" @click="s.speed.value = x">{{ x }}x</button>
      </div>
      <input v-model.number="value" type="range" :min="t0" :max="t1" :step="step" class="h-2 min-w-[10rem] flex-1 accent-indigo-500" aria-label="Zaman imleci" />
      <span class="w-24 text-right text-sm tabular-nums text-zinc-200">{{ s.cursor.value === null ? '—' : fmt(s.cursor.value, 2) }} s</span>
      <button type="button" class="btn !px-2.5" :disabled="s.cursor.value === null" aria-label="İmleci temizle" title="İmleci temizle" @click="unpin"><Icon name="lucide:x" size="16" /></button>
    </div>
    <dl v-if="s.readout.value" class="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-xs" aria-live="off">
      <div v-for="r in s.readout.value" :key="r.key" class="flex items-baseline gap-1">
        <dt class="text-zinc-500">{{ r.label }}</dt>
        <dd class="font-medium tabular-nums text-zinc-100">{{ dig(r.value, r.key) }}<span v-if="r.unit" class="ml-0.5 font-normal text-zinc-500">{{ r.unit }}</span></dd>
      </div>
      <p v-if="s.pinned.value" class="ml-auto text-zinc-500">sabit (fareyle gezmek imleci taşımaz; × ile bırak)</p>
    </dl>
    <p v-else class="mt-1 text-xs text-zinc-500">Grafiklerin üzerinde gezinin ya da çubuğu sürükleyin; anlık değerler burada görünür.</p>
  </div>
</template>
