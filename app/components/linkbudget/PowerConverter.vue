<script setup lang="ts">
import { fmt, parseNumber } from '~/utils/format'

const props = defineProps<{ dbm: string }>()
const emit = defineEmits<{ set: [dbm: string] }>()

const mw = ref('')
const asMw = computed(() => {
  const v = parseNumber(props.dbm)
  return v === null ? null : 10 ** (v / 10)
})
function onMw(e: Event) {
  mw.value = (e.target as HTMLInputElement).value
  const v = parseNumber(mw.value)
  if (v !== null && v > 0) emit('set', String(Number((10 * Math.log10(v)).toFixed(2))))
}
</script>

<template>
  <div class="rounded-xl border border-space-700 bg-space-900/60 p-3">
    <label for="lb-mw" class="mb-1 block text-xs font-medium text-zinc-300">mW → dBm dönüştürücü</label>
    <div class="flex items-center gap-2">
      <div class="relative flex-1">
        <input id="lb-mw" :value="mw" inputmode="decimal" class="input !py-1.5 pr-10" placeholder="ör. 100" @input="onMw" />
        <span class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">mW</span>
      </div>
      <Icon name="lucide:arrow-right" size="14" class="text-zinc-500" />
      <p class="w-24 text-xs tabular-nums text-zinc-400">
        <template v-if="mw && parseNumber(mw) && parseNumber(mw)! > 0">{{ fmt(10 * Math.log10(parseNumber(mw)!), 2) }} dBm</template>
        <template v-else-if="asMw !== null">{{ fmt(asMw, asMw < 10 ? 2 : 0) }} mW</template>
      </p>
    </div>
  </div>
</template>
