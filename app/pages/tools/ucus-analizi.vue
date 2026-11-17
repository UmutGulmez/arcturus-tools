<script setup lang="ts">
import { createFlightStore, FLIGHT_KEY } from '~/composables/useFlightStore'

useSeoMeta({
  title: 'OpenRocket Uçuş Analizi · Arcturus Tools',
  description: 'OpenRocket simülasyon CSV dosyasını tarayıcıda analiz et: irtifa, hız, stabilite, itki, yörünge, KPI ve karşılaştırma.',
})

const store = createFlightStore()
provide(FLIGHT_KEY, store)
const { files, active, report } = store

const tab = ref('summary')
const tabs = computed(() => [
  { id: 'summary', label: 'Özet', icon: 'lucide:layout-grid' },
  { id: 'profile', label: 'Uçuş profili', icon: 'lucide:chart-line' },
  { id: 'stability', label: 'Stabilite', icon: 'lucide:crosshair' },
  { id: 'motor', label: 'Motor ve kütle', icon: 'lucide:flame' },
  { id: 'aero', label: 'Aerodinamik', icon: 'lucide:wind' },
  { id: 'traj', label: 'Yörünge ve iniş', icon: 'lucide:route' },
  { id: 'atmos', label: 'Atmosfer', icon: 'lucide:cloud' },
  { id: 'builder', label: 'Grafik oluşturucu', icon: 'lucide:sliders-horizontal' },
  { id: 'table', label: 'Veri tablosu', icon: 'lucide:table' },
  { id: 'compare', label: 'Karşılaştırma', icon: 'lucide:git-compare', dot: files.value.length > 1 ? ('ok' as const) : undefined },
])
const showSettings = ref(false)
const print = () => window.print()
// Karşılaştırma sekmesi yalnızca 2+ dosyada anlamlı; dosya sayısı düşerse özet'e dön
watch(() => files.value.length, (n) => { if (!n) tab.value = 'summary' })
</script>

<template>
  <div class="mx-auto max-w-[1500px]">
    <header class="no-print mb-6 flex flex-wrap items-start justify-between gap-3">
      <div class="flex items-start gap-3">
        <span class="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-arc-500/10 text-arc-400"><Icon name="lucide:chart-line" size="22" /></span>
        <div>
          <h1 class="text-2xl font-bold text-white">OpenRocket Uçuş Analizi</h1>
          <p class="text-sm text-zinc-400">Simülasyon CSV'sini yükleyin; veriler grafik, kart ve tablo olarak gösterilir.</p>
        </div>
      </div>
      <div v-if="active" class="flex flex-wrap gap-2">
        <button type="button" class="btn" :aria-expanded="showSettings" @click="showSettings = !showSettings"><Icon name="lucide:settings-2" size="16" />Eşikler ve birimler</button>
        <button type="button" class="btn" :aria-pressed="report" @click="report = !report"><Icon name="lucide:file-text" size="16" />{{ report ? 'Rapor görünümünden çık' : 'Rapor görünümü' }}</button>
        <button v-if="report" type="button" class="btn btn-primary" @click="print"><Icon name="lucide:printer" size="16" />Yazdır / PDF</button>
      </div>
    </header>

    <div class="space-y-4">
      <div v-show="!report" class="no-print"><FlightUploadPanel /></div>
      <FlightSettingsPanel v-if="active && showSettings && !report" class="no-print" />

      <template v-if="active">
        <FlightReportView v-if="report" />
        <template v-else>
          <ParachuteTabBar v-model="tab" :items="tabs" id-prefix="flt" label="Uçuş analizi görünümleri" variant="pill" class="no-print" />
          <div :id="`flt-panel-${tab}`" role="tabpanel" :aria-labelledby="`flt-tab-${tab}`" class="min-w-0">
            <FlightSummaryTab v-if="tab === 'summary'" />
            <FlightProfileTab v-else-if="tab === 'profile'" />
            <FlightStabilityTab v-else-if="tab === 'stability'" />
            <FlightMotorTab v-else-if="tab === 'motor'" />
            <FlightAeroTab v-else-if="tab === 'aero'" />
            <FlightTrajectoryTab v-else-if="tab === 'traj'" />
            <FlightAtmosTab v-else-if="tab === 'atmos'" />
            <FlightBuilderTab v-else-if="tab === 'builder'" />
            <FlightTableTab v-else-if="tab === 'table'" />
            <FlightCompareTab v-else-if="tab === 'compare'" />
          </div>
        </template>
        <FlightTimeBar v-if="!report" />
      </template>

      <section v-else-if="!store.loading.value" class="panel panel-hero">
        <h2 class="text-base font-semibold text-white">Başlamak için bir CSV yükleyin</h2>
        <p class="mt-1 text-sm text-zinc-300">OpenRocket'te Simülasyon → Dışa aktar → CSV ("Export to CSV") ile aldığınız dosyayı sürükleyin. Tüm değişkenleri seçmek gerekmez; eksik sütunlara ihtiyaç duyan grafikler gizlenir ve hangi sütunun gerektiği belirtilir.</p>
      </section>
    </div>
  </div>
</template>
