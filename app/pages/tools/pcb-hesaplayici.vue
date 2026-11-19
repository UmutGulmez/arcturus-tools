<script setup lang="ts">
useSeoMeta({
  title: 'PCB Hesaplayıcı Paketi · Arcturus Tools',
  description: 'İz genişliği ve akım (IPC-2221), via, empedans, ısıl ve devre yardımcıları: tarayıcıda, anlık sonuç.',
  ogTitle: 'PCB Hesaplayıcı Paketi · Arcturus Tools',
  ogDescription: 'PCB tasarımı için formülleri ve kaynakları açık hesaplayıcılar.',
})

const u = usePcbUnits()
const route = useRoute()
const router = useRouter()
const tabs = [
  { id: 'iz', label: 'İz genişliği ve akım', icon: 'lucide:route' },
  { id: 'via', label: 'Via', icon: 'lucide:circle-dot' },
  { id: 'empedans', label: 'Empedans', icon: 'lucide:audio-waveform' },
  { id: 'isil', label: 'Isıl', icon: 'lucide:thermometer' },
  { id: 'devre', label: 'Devre yardımcıları', icon: 'lucide:cpu' },
]
const q = route.query.tab
const tab = ref(typeof q === 'string' && tabs.some((t) => t.id === q) ? q : 'iz')
watch(tab, (t) => router.replace({ query: { ...route.query, tab: t } }))
</script>

<template>
  <div class="mx-auto max-w-7xl">
    <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-arc-400">
      <Icon name="lucide:arrow-left" size="14" /> Dashboard
    </NuxtLink>

    <header class="mt-4 flex flex-wrap items-start justify-between gap-4">
      <div class="flex items-center gap-4">
        <span class="grid h-14 w-14 place-items-center rounded-2xl bg-arc-500/10 text-arc-400"><Icon name="lucide:circuit-board" size="28" /></span>
        <div>
          <h1 class="text-2xl font-bold text-white">PCB Hesaplayıcı Paketi</h1>
          <p class="text-sm text-zinc-400">Formülü, kaynağı ve geçerlilik aralığı açık hesaplayıcılar. Her şey tarayıcında hesaplanır.</p>
        </div>
      </div>
      <div class="flex flex-wrap gap-3" role="group" aria-label="Birimler">
        <div class="inline-flex rounded-xl border border-space-600 bg-space-900 p-1 text-sm" role="group" aria-label="Uzunluk birimi">
          <button type="button" :aria-pressed="u.len.value === 'mm'" class="rounded-lg px-3 py-1" :class="u.len.value === 'mm' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="u.len.value = 'mm'">mm</button>
          <button type="button" :aria-pressed="u.len.value === 'mil'" class="rounded-lg px-3 py-1" :class="u.len.value === 'mil' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="u.len.value = 'mil'">mil</button>
        </div>
        <div class="inline-flex rounded-xl border border-space-600 bg-space-900 p-1 text-sm" role="group" aria-label="Bakır kalınlığı birimi">
          <button type="button" :aria-pressed="u.cu.value === 'oz'" class="rounded-lg px-3 py-1" :class="u.cu.value === 'oz' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="u.cu.value = 'oz'">oz</button>
          <button type="button" :aria-pressed="u.cu.value === 'um'" class="rounded-lg px-3 py-1" :class="u.cu.value === 'um' ? 'bg-space-600 text-white' : 'text-zinc-400'" @click="u.cu.value = 'um'">µm</button>
        </div>
      </div>
    </header>
    <p class="mt-2 text-xs text-zinc-500">1 oz = 35 µm = 1,378 mil · 1 mil = 0,0254 mm</p>

    <div class="mt-5 space-y-5">
      <ParachuteTabBar v-model="tab" :items="tabs" id-prefix="pcb" label="Hesaplayıcılar" variant="pill" />
      <div v-show="tab === 'iz'" id="pcb-panel-iz" role="tabpanel" aria-labelledby="pcb-tab-iz"><PcbTabTrace /></div>
      <div v-show="tab === 'via'" id="pcb-panel-via" role="tabpanel" aria-labelledby="pcb-tab-via"><PcbTabVia /></div>
      <div v-show="tab === 'empedans'" id="pcb-panel-empedans" role="tabpanel" aria-labelledby="pcb-tab-empedans"><PcbTabImpedance /></div>
      <div v-show="tab === 'isil'" id="pcb-panel-isil" role="tabpanel" aria-labelledby="pcb-tab-isil"><PcbTabThermal /></div>
      <div v-show="tab === 'devre'" id="pcb-panel-devre" role="tabpanel" aria-labelledby="pcb-tab-devre"><PcbTabCircuit /></div>
    </div>
  </div>
</template>
