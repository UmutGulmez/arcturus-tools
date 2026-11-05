<script setup lang="ts">
defineProps<{ icon: string; label: string; value: string; unit?: string; sub?: string; tone?: 'default' | 'good' | 'bad' }>()
</script>

<template>
  <div class="panel flex gap-3 !p-4">
    <span class="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-space-700 text-arc-400"><Icon :name="icon" size="20" /></span>
    <div class="min-w-0">
      <p class="text-xs text-zinc-400">{{ label }}</p>
      <p class="break-words text-xl font-bold tabular-nums" :class="tone === 'good' ? 'text-emerald-300' : tone === 'bad' ? 'text-rose-300' : 'text-white'">
        {{ value }} <span v-if="unit" class="text-sm font-normal text-zinc-400">{{ unit }}</span>
      </p>
      <p v-if="sub" class="text-xs text-zinc-500"><slot name="sub">{{ sub }}</slot></p>
    </div>
  </div>
</template>
