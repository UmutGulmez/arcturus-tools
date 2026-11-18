<script setup lang="ts">
import type { GoreErrors, GoreFormState } from '~/composables/useGoreForm'

defineProps<{ form: GoreFormState; errors: GoreErrors }>()
defineEmits<{ preset: []; reset: [] }>()

const shapes = [
  { id: 'hemisphere', label: 'Yarım küre' },
  { id: 'cap', label: 'Küre kapağı' },
  { id: 'flat', label: 'Düz (çokgen)' },
] as const
</script>

<template>
  <form class="panel space-y-5" novalidate aria-label="Kalıp girdileri" @submit.prevent>
    <div class="flex items-center justify-between gap-2">
      <h2 class="text-base font-semibold text-white">Girdiler</h2>
      <div class="flex items-center gap-3">
        <button type="button" class="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-arc-400" @click="$emit('preset')">
          <Icon name="lucide:wand-sparkles" size="12" /> Örnek doldur
        </button>
        <button type="button" class="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-arc-400" @click="$emit('reset')">
          <Icon name="lucide:rotate-ccw" size="12" /> Sıfırla
        </button>
      </div>
    </div>

    <fieldset class="min-w-0 space-y-3">
      <legend class="mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500"><Icon name="lucide:circle-dashed" size="14" /> Kubbe</legend>
      <GoreField id="g-d" v-model="form.d" label="Nominal çap (D0)" unit="m" required :error="errors.d" help="Düz serilmiş dairenin çapı; Paraşüt Hız Hesaplayıcı’daki nominal çapla aynı tanım. Alan S0 = πD0²/4." />
      <div role="radiogroup" aria-label="Şekil" class="grid grid-cols-3 gap-1 rounded-xl border border-space-600 bg-space-900 p-1">
        <button
          v-for="s in shapes"
          :key="s.id"
          type="button"
          role="radio"
          :aria-checked="form.shape === s.id"
          class="rounded-lg px-2 py-1.5 text-xs transition"
          :class="form.shape === s.id ? 'bg-space-600 font-medium text-white' : 'text-zinc-400 hover:text-zinc-200'"
          @click="form.shape = s.id"
        >
          {{ s.label }}
        </button>
      </div>
      <GoreField v-if="form.shape === 'cap'" id="g-cap" v-model="form.cap" label="Kapak yarı açısı" unit="°" :error="errors.cap" help="90° yarım küre; daha büyük açı daha derin kubbe. Alan her durumda nominal alana eşit tutulur." />
      <div class="grid grid-cols-2 gap-3">
        <GoreField id="g-n" v-model="form.n" label="Dilim sayısı (N)" required :error="errors.n" help="En az 4. 6’dan azında kubbe poligonlaşır." />
        <GoreField id="g-vent" v-model="form.vent" label="Tepe deliği çapı" unit="cm" :error="errors.vent" help="Tepe delik (spill/vent). Boş bırakırsan delik yok sayılır." />
      </div>
    </fieldset>

    <fieldset class="min-w-0 space-y-3 border-t border-space-700 pt-4">
      <legend class="float-left mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500"><Icon name="lucide:ruler" size="14" /> Paylar</legend>
      <div class="clear-both grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1" role="radiogroup" aria-label="Dikiş payı modu">
        <button type="button" role="radio" :aria-checked="form.seamMode === 'uniform'" class="rounded-lg px-2 py-1.5 text-xs transition" :class="form.seamMode === 'uniform' ? 'bg-space-600 font-medium text-white' : 'text-zinc-400 hover:text-zinc-200'" @click="form.seamMode = 'uniform'">Tek değer</button>
        <button type="button" role="radio" :aria-checked="form.seamMode === 'sides'" class="rounded-lg px-2 py-1.5 text-xs transition" :class="form.seamMode === 'sides' ? 'bg-space-600 font-medium text-white' : 'text-zinc-400 hover:text-zinc-200'" @click="form.seamMode = 'sides'">Kenar kenar</button>
      </div>
      <GoreField v-if="form.seamMode === 'uniform'" id="g-seam" v-model="form.seam" label="Dikiş payı" unit="cm" :error="errors.seam" help="Dört kenara da uygulanır. Boş = 0 (kalıp dikiş çizgisidir)." />
      <div v-else class="grid grid-cols-2 gap-3">
        <GoreField id="g-sr" v-model="form.seamR" label="Sağ" unit="cm" :error="errors.seamR" />
        <GoreField id="g-st" v-model="form.seamT" label="Üst (tepe)" unit="cm" :error="errors.seamT" />
        <GoreField id="g-sl" v-model="form.seamL" label="Sol" unit="cm" :error="errors.seamL" />
        <GoreField id="g-sb" v-model="form.seamB" label="Alt (etek)" unit="cm" :error="errors.seamB" />
      </div>
      <GoreField id="g-hem" v-model="form.hem" label="Etek katlama payı" unit="cm" :error="errors.hem" help="Alt kenardaki dikiş payına eklenir." />
      <div>
        <p class="mb-1 text-[13px] font-medium text-zinc-200">Köşe birleşimi</p>
        <div class="grid grid-cols-2 gap-1 rounded-xl border border-space-600 bg-space-900 p-1" role="radiogroup" aria-label="Köşe birleşimi">
          <button type="button" role="radio" :aria-checked="form.join === 'miter'" class="rounded-lg px-2 py-1.5 text-xs transition" :class="form.join === 'miter' ? 'bg-space-600 font-medium text-white' : 'text-zinc-400 hover:text-zinc-200'" @click="form.join = 'miter'">Miter (sivri)</button>
          <button type="button" role="radio" :aria-checked="form.join === 'bevel'" class="rounded-lg px-2 py-1.5 text-xs transition" :class="form.join === 'bevel' ? 'bg-space-600 font-medium text-white' : 'text-zinc-400 hover:text-zinc-200'" @click="form.join = 'bevel'">Bevel (kesik)</button>
        </div>
      </div>
    </fieldset>

    <fieldset class="min-w-0 space-y-3 border-t border-space-700 pt-4">
      <legend class="float-left mb-3 flex items-center gap-2 text-[11px] font-medium uppercase tracking-widest text-zinc-500"><Icon name="lucide:layers" size="14" /> Kumaş ve kordon</legend>
      <div class="clear-both grid grid-cols-2 gap-3">
        <GoreField id="g-roll" v-model="form.roll" label="Rulo eni" unit="cm" :error="errors.roll" placeholder="isteğe bağlı" help="Girersen kumaş boyu, fire ve dilim sığma kontrolü hesaplanır." />
        <GoreField id="g-price" v-model="form.price" label="Birim fiyat" unit="TL/m" :error="errors.price" placeholder="isteğe bağlı" help="Kumaşın boy metresi fiyatı (rulo eni sabit)." />
        <GoreField id="g-cf" v-model="form.cordFactor" label="Kordon çarpanı" unit="× D0" :error="errors.cordFactor" help="Kordon boyu = çarpan × D0 + bağlantı payı. Adet = N." />
        <GoreField id="g-ca" v-model="form.cordAllow" label="Bağlantı payı" unit="cm" :error="errors.cordAllow" help="Kordon başına düğüm/halka payı. Boş = 0." />
      </div>
    </fieldset>
  </form>
</template>
