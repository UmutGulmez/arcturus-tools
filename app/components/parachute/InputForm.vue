<script setup lang="ts">
import type { FieldErrors, FieldKey, FormState, Preset } from '~/utils/parachuteFields'
import { FIELDS } from '~/utils/parachuteFields'

defineProps<{ form: FormState; errors: FieldErrors; presets: Preset[] }>()
defineEmits<{ preset: [p: Preset]; reset: [] }>()

const sections: { title: string; icon: string; cols: 1 | 2; keys: FieldKey[] }[] = [
  { title: 'Temel girdiler', icon: 'lucide:scale', cols: 2, keys: ['m', 'd'] },
  { title: 'Paraşüt geometrisi', icon: 'lucide:circle-dashed', cols: 2, keys: ['cd', 'proj', 'hole', 'mp'] },
  { title: 'Saha ve hava', icon: 'lucide:cloud-sun', cols: 2, keys: ['h', 'dT', 'g', 'rhoFixed'] },
  { title: 'Hedef ve limitler', icon: 'lucide:target', cols: 2, keys: ['vTarget', 'vLimit', 'eLimit'] },
]
</script>

<template>
  <form class="panel space-y-5" novalidate aria-label="Paraşüt girdileri" @submit.prevent>
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-base font-semibold text-white">Girdiler</h2>
      <button type="button" class="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-arc-400" @click="$emit('reset')">
        <Icon name="lucide:rotate-ccw" size="12" /> Sıfırla
      </button>
    </div>

    <div>
      <p class="mb-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">Hazır örnekler</p>
      <div class="flex flex-wrap gap-1.5">
        <button
          v-for="p in presets"
          :key="p.id"
          type="button"
          class="rounded-lg border border-space-600 bg-space-900 px-2.5 py-1.5 text-xs text-zinc-300 transition hover:border-arc-500 hover:text-white"
          @click="$emit('preset', p)"
        >
          {{ p.label }}
        </button>
      </div>
    </div>

    <fieldset v-for="s in sections" :key="s.title" class="min-w-0 space-y-3 border-t border-space-700 pt-4">
      <legend class="float-left mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500">
        <Icon :name="s.icon" size="14" /> {{ s.title }}
      </legend>
      <div class="clear-both grid grid-cols-2 gap-x-3 gap-y-3">
        <ParachuteFormField
          v-for="k in s.keys"
          :key="k"
          :spec="FIELDS[k]"
          :model-value="form[k]"
          :error="errors[k]"
          compact
          :class="s.keys.length % 2 === 1 && k === s.keys[s.keys.length - 1] ? 'col-span-2' : ''"
          @update:model-value="form[k] = $event"
        />
      </div>
    </fieldset>
  </form>
</template>
