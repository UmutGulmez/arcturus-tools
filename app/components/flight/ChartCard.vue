<script setup lang="ts">
import { COLUMN_BY_KEY } from '~/utils/columns'
import { useFlight } from '~/composables/useFlightStore'

const props = defineProps<{ needs: string[]; title: string }>()
const s = useFlight()
const missing = computed(() => {
  const d = s.active.value?.data
  return props.needs.filter((k) => !d?.cols[k]).map((k) => COLUMN_BY_KEY.get(k)?.label ?? k)
})
</script>

<template>
  <div class="panel chart-card min-w-0 !p-4" :class="s.report.value ? '!border-zinc-300 !bg-white' : ''">
    <slot v-if="!missing.length" />
    <div v-else class="grid min-h-[8rem] place-items-center text-center">
      <div>
        <Icon name="lucide:eye-off" size="20" class="mx-auto mb-2 text-zinc-500" />
        <p class="text-sm font-medium text-zinc-300">{{ title }}</p>
        <p class="mt-1 text-xs text-zinc-500">Bu görünüm için {{ missing.join(', ') }} sütunu gerekli. OpenRocket dışa aktarımında bu değişkeni seçin.</p>
      </div>
    </div>
  </div>
</template>
