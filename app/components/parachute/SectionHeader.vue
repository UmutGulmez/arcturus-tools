<script setup lang="ts">
defineProps<{ icon: string; title: string; subtitle?: string; headingId?: string }>()
</script>

<template>
  <div class="flex items-start gap-3">
    <span class="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-arc-500/10 text-arc-400"><Icon :name="icon" size="18" /></span>
    <div class="min-w-0">
      <h2 :id="headingId" class="text-base font-semibold leading-9 text-white">{{ title }}</h2>
      <p v-if="subtitle" class="-mt-1 text-sm text-zinc-400">{{ subtitle }}</p>
    </div>
  </div>
</template>
