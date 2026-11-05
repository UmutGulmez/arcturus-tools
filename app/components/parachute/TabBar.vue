<script setup lang="ts">
export interface TabItem {
  id: string
  label: string
  icon?: string
  /** küçük durum noktası: ok (yeşil), warn (sarı), run (yanıp söner) */
  dot?: 'ok' | 'warn' | 'run'
}

const props = withDefaults(
  defineProps<{ items: TabItem[]; modelValue: string; idPrefix: string; label: string; variant?: 'underline' | 'pill' }>(),
  { variant: 'underline' },
)
const emit = defineEmits<{ 'update:modelValue': [id: string] }>()

function onKey(e: KeyboardEvent) {
  const i = props.items.findIndex((t) => t.id === props.modelValue)
  const last = props.items.length - 1
  const next =
    e.key === 'ArrowRight' ? (i + 1) % props.items.length
    : e.key === 'ArrowLeft' ? (i - 1 + props.items.length) % props.items.length
    : e.key === 'Home' ? 0
    : e.key === 'End' ? last
    : -1
  if (next < 0) return
  e.preventDefault()
  const id = props.items[next]!.id
  emit('update:modelValue', id)
  nextTick(() => document.getElementById(`${props.idPrefix}-tab-${id}`)?.focus())
}

const dotCls = { ok: 'bg-emerald-400', warn: 'bg-amber-400', run: 'bg-arc-400 animate-pulse' }
</script>

<template>
  <div
    role="tablist"
    :aria-label="label"
    class="flex gap-1 overflow-x-auto"
    :class="variant === 'pill' ? 'rounded-2xl border border-space-600 bg-space-800/70 p-1' : 'border-b border-space-600'"
    @keydown="onKey"
  >
    <button
      v-for="t in items"
      :id="`${idPrefix}-tab-${t.id}`"
      :key="t.id"
      type="button"
      role="tab"
      :aria-selected="modelValue === t.id"
      :aria-controls="`${idPrefix}-panel-${t.id}`"
      :tabindex="modelValue === t.id ? 0 : -1"
      class="inline-flex shrink-0 items-center gap-2 whitespace-nowrap text-sm transition"
      :class="
        variant === 'pill'
          ? [
              'rounded-xl px-3.5 py-2',
              modelValue === t.id ? 'bg-space-600 font-medium text-white shadow' : 'text-zinc-400 hover:text-zinc-200',
            ]
          : [
              '-mb-px border-b-2 px-4 py-2.5',
              modelValue === t.id ? 'border-arc-500 font-medium text-white' : 'border-transparent text-zinc-400 hover:text-zinc-200',
            ]
      "
      @click="emit('update:modelValue', t.id)"
    >
      <Icon v-if="t.icon" :name="t.icon" size="16" />
      {{ t.label }}
      <span v-if="t.dot" class="h-2 w-2 rounded-full" :class="dotCls[t.dot]" aria-hidden="true" />
    </button>
  </div>
</template>
