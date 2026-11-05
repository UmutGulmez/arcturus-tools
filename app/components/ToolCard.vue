<script setup lang="ts">
import type { Tool } from '~/data/tools'
defineProps<{ tool: Tool }>()
</script>

<template>
  <NuxtLink
    :to="`/tools/${tool.slug}`"
    :class="tool.status === 'ready' ? 'border-arc-500/30 bg-gradient-to-br from-arc-500/10 to-space-800/80' : 'border-space-600 bg-space-800/60 opacity-75 hover:opacity-100'"
    class="glow-card block rounded-2xl border p-5"
  >
    <div class="flex items-start justify-between">
      <span class="grid place-items-center w-11 h-11 rounded-xl bg-arc-500/10 text-arc-400"><Icon :name="tool.icon" size="22" /></span>
      <span
        class="text-[11px] px-2 py-0.5 rounded-full border"
        :class="tool.status === 'ready' ? 'border-emerald-500/30 text-emerald-400' : 'border-space-600 text-zinc-400'"
      >
        {{ tool.status === 'ready' ? 'Hazır' : 'Yakında' }}
      </span>
    </div>
    <h3 class="mt-4 font-semibold text-white">{{ tool.name }}</h3>
    <p class="mt-1 text-sm text-zinc-400">{{ tool.description }}</p>
    <p class="mt-4 text-xs text-arc-400">{{ tool.category }}</p>
  </NuxtLink>
</template>
