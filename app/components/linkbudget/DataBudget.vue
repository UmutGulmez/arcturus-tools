<script setup lang="ts">
import type { DataBudget } from '~/utils/linkBudget'
import { fmt } from '~/utils/format'

const props = defineProps<{ data: DataBudget | null; dutyLimit: number | null }>()
const ok = computed(() => props.data?.capacityOk)
</script>

<template>
  <section aria-labelledby="lb-veri" class="panel">
    <ParachuteSectionHeader class="mb-3" heading-id="lb-veri" icon="lucide:database" title="Veri bütçesi" subtitle="Telemetri paketi ve paket hızına göre kanal doluluğu." />
    <p v-if="!data" class="text-sm text-zinc-400">Hesap için "Veri ve mevzuat" bölümünden paket boyutu ve paket hızını girin.</p>
    <template v-else>
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <ParachuteStatCard icon="lucide:gauge" label="Gereken bit hızı" :value="fmt(data.requiredBps, 0)" unit="bit/s" />
        <ParachuteStatCard icon="lucide:activity" label="Kullanılabilir bit hızı" :value="fmt(data.availableBps, 0)" unit="bit/s" />
        <ParachuteStatCard icon="lucide:timer" label="Paket airtime" :value="fmt(data.airtimeMs, 1)" unit="ms" />
        <ParachuteStatCard icon="lucide:percent" label="Kanal doluluğu" :value="fmt(data.occupancyPct, 2)" unit="%" :tone="ok ? 'good' : 'bad'" :sub="dutyLimit !== null ? `Duty limiti %${fmt(dutyLimit, 2)}` : 'Duty limiti girilmedi'" />
      </div>
      <p class="mt-3 flex items-start gap-2 rounded-xl border px-4 py-3 text-sm" :class="ok ? 'border-emerald-500/30 bg-emerald-500/5 text-emerald-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-100'" role="status">
        <Icon :name="ok ? 'lucide:circle-check' : 'lucide:circle-x'" size="16" class="mt-0.5 shrink-0" />
        <span>
          {{ ok ? 'Link kapasitesi yeterli görünüyor.' : data.dutyOk === false ? 'Duty cycle limiti aşılıyor.' : 'Link kapasitesi yetersiz (doluluk ≥ %100).' }}
          Bu ayarlarla en fazla ≈ {{ fmt(data.maxPacketRate, 2) }} paket/s gönderilebilir.
        </span>
      </p>
    </template>
  </section>
</template>
