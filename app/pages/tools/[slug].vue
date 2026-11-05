<script setup lang="ts">
import { getTool } from '~/data/tools'
const route = useRoute()
const tool = getTool(route.params.slug as string)
if (!tool) throw createError({ statusCode: 404, statusMessage: 'Araç bulunamadı', fatal: true })
useHead({ title: `${tool.name} · Arcturus Tools` })
</script>

<template>
  <div v-if="tool" class="max-w-3xl mx-auto">
    <NuxtLink to="/" class="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-arc-400"><Icon name="lucide:arrow-left" size="14" /> Dashboard</NuxtLink>
    <div class="mt-4 flex items-center gap-4">
      <span class="grid place-items-center w-14 h-14 rounded-2xl bg-arc-500/10 text-arc-400"><Icon :name="tool.icon" size="28" /></span>
      <div>
        <h1 class="text-2xl font-bold text-white">{{ tool.name }}</h1>
        <p class="text-sm text-zinc-400">{{ tool.description }}</p>
      </div>
    </div>
    <div class="mt-8 rounded-2xl border border-dashed border-space-600 bg-space-800/60 p-10 text-center text-zinc-400">
      <Icon name="lucide:construction" size="28" class="mx-auto mb-3 text-zinc-500" />
      Bu araç henüz geliştirilmedi.
    </div>
  </div>
</template>
