<script setup lang="ts">
defineProps<{ label: string; value: string; unit?: string; sub?: string }>()
</script>

<template>
  <div class="min-w-0">
    <p class="text-xs text-zinc-400">{{ label }}</p>
    <p class="text-xl font-semibold tabular-nums text-white">{{ value }}<span v-if="unit" class="ml-1 text-sm font-normal text-zinc-400">{{ unit }}</span></p>
    <p v-if="sub" class="text-xs tabular-nums text-zinc-500">{{ sub }}</p>
  </div>
</template>
