<script setup lang="ts">
const props = defineProps<{ id: string; label: string; modelValue: string; unit?: string; error?: string; help?: string; required?: boolean; placeholder?: string }>()
defineEmits<{ 'update:modelValue': [value: string] }>()
const padRight = computed(() => (props.unit ? `${props.unit.length * 0.5 + 1.6}rem` : undefined))
</script>

<template>
  <div class="group min-w-0">
    <label :for="id" class="mb-1 flex items-end gap-1 text-[13px] font-medium leading-tight text-zinc-200">
      <span>{{ label }}<span v-if="required" class="text-rose-400" aria-hidden="true"> *</span></span>
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
        :placeholder="placeholder ?? (required ? 'değer girin' : '0')"
        :aria-required="required ? 'true' : undefined"
        :aria-invalid="error ? 'true' : 'false'"
        :aria-describedby="`${id}-help${error ? ` ${id}-err` : ''}`"
        @input="$emit('update:modelValue', ($event.target as HTMLInputElement).value)"
      />
      <span v-if="unit" class="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">{{ unit }}</span>
    </div>
    <p v-if="error" :id="`${id}-err`" class="mt-1 flex items-start gap-1 text-xs text-rose-400" role="alert">
      <Icon name="lucide:circle-alert" size="12" class="mt-0.5 shrink-0" /> {{ error }}
    </p>
    <p :id="`${id}-help`" class="mt-1 hidden text-xs leading-snug text-zinc-500 group-focus-within:block">{{ help }}</p>
  </div>
</template>
