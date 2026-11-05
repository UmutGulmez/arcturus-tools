<script setup lang="ts">
import type { FieldSpec } from '~/utils/parachuteFields'

const props = defineProps<{ spec: FieldSpec; modelValue: string; error?: string; compact?: boolean }>()
defineEmits<{ 'update:modelValue': [value: string] }>()

const id = computed(() => `field-${props.spec.key}`)
const placeholder = computed(() => (props.spec.defaultValue || (props.spec.required ? 'değer girin' : 'isteğe bağlı')))
const padRight = computed(() => (props.spec.unit ? `${props.spec.unit.length * 0.5 + 1.6}rem` : undefined))
</script>

<template>
  <div class="group">
    <label
      :for="id"
      class="mb-1 flex items-end gap-1 text-[13px] font-medium leading-tight text-zinc-200"
      :class="compact ? 'min-h-[2.1rem]' : ''"
    >
      <span>{{ spec.label }}<span v-if="spec.required" class="text-rose-400" aria-hidden="true"> *</span></span>
      <Icon name="lucide:info" size="12" class="mb-0.5 ml-auto shrink-0 text-zinc-600 transition group-hover:text-zinc-400 group-focus-within:text-arc-400" :title="spec.help" aria-hidden="true" />
    </label>
    <div class="relative">
      <input
        :id="id"
        :value="modelValue"
        type="text"
        inputmode="decimal"
        autocomplete="off"
        class="input tabular-nums"
        :style="{ paddingRight: padRight }"
        :placeholder="placeholder"
        :aria-required="spec.required ? 'true' : undefined"
        :aria-invalid="error ? 'true' : 'false'"
        :aria-describedby="`${id}-help${error ? ` ${id}-err` : ''}`"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="spec.unit" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{{ spec.unit }}</span>
    </div>
    <p v-if="error" :id="`${id}-err`" class="mt-1 flex items-start gap-1 text-xs text-rose-400" role="alert">
      <Icon name="lucide:circle-alert" size="12" class="mt-0.5 shrink-0" /> {{ error }}
    </p>
    <!-- Yardım metni yalnızca alan odaktayken açılır (ekran okuyucular için her zaman bağlı) -->
    <p :id="`${id}-help`" class="mt-1 hidden text-xs leading-snug text-zinc-500 group-focus-within:block">{{ spec.help }}</p>
  </div>
</template>
