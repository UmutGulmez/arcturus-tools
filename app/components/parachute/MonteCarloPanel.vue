<script setup lang="ts">
import type { RunState } from '~/composables/useParachuteWorker'
import type { McResult } from '~/utils/parachute'
import type { FieldErrors, FormState } from '~/utils/parachuteFields'
import { FIELDS } from '~/utils/parachuteFields'

defineProps<{
  form: FormState
  errors: FieldErrors
  blocked: boolean
  state: RunState<McResult>
  stale: boolean
}>()
defineEmits<{ run: [] }>()

const keys = ['n', 'seed', 'sm', 'scd', 'srho', 'sproj'] as const
</script>

<template>
  <section aria-labelledby="mc-baslik" class="space-y-4">
    <div class="panel">
      <ParachuteSectionHeader
        heading-id="mc-baslik"
        icon="lucide:dices"
        title="Monte Carlo belirsizlik analizi"
        subtitle="Kütle, Cd, ρ ve izdüşüm oranı normal dağılımla (1σ) değiştirilir; terminal hızın dağılımı çıkarılır. Hız limiti varsa aşma olasılığı hesaplanır."
      />
      <div class="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <ParachuteFormField v-for="k in keys" :key="k" :spec="FIELDS[k]" :model-value="form[k]" :error="errors[k]" @update:model-value="form[k] = $event" />
      </div>
      <div class="mt-4 flex flex-wrap items-center gap-3">
        <button type="button" class="btn btn-primary" :disabled="blocked || state.status === 'running'" @click="$emit('run')">
          <Icon name="lucide:dices" size="16" /> Hesapla
        </button>
        <ParachuteRunStatus :status="state.status" :error="state.error" :stale="stale" />
      </div>
    </div>

    <div v-if="state.result" class="grid gap-4 xl:grid-cols-2">
      <ParachuteMonteCarloSummary :mc="state.result" />
      <ParachuteHistogram
        :edges="state.result.hist.edges"
        :counts="state.result.hist.counts"
        :v-limit="state.result.vLimit"
        :mean="state.result.mean"
        x-label="Terminal hız (m/s)"
      />
    </div>
  </section>
</template>
