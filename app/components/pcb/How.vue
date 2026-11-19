<script setup lang="ts">
export interface HowItem { t: string; f: string; src: string; range: string; assume: string }
defineProps<{ items: HowItem[] }>()
</script>

<template>
  <details class="panel group !p-0">
    <summary class="flex cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 text-sm font-medium text-zinc-200">
      <span class="inline-flex items-center gap-2"><Icon name="lucide:sigma" size="16" class="text-arc-400" /> Nasıl hesaplandı</span>
      <Icon name="lucide:chevron-down" size="16" class="shrink-0 text-zinc-500 transition group-open:rotate-180" />
    </summary>
    <div class="divide-y divide-space-700 border-t border-space-700 px-5">
      <div v-for="s in items" :key="s.t" class="py-4">
        <p class="text-sm font-medium text-zinc-200">{{ s.t }}</p>
        <p class="mt-2 overflow-x-auto rounded-lg bg-space-900 px-3 py-2 font-mono text-xs leading-relaxed text-arc-400">{{ s.f }}</p>
        <dl class="mt-2 grid gap-x-4 gap-y-1 text-sm text-zinc-400 sm:grid-cols-[7rem_minmax(0,1fr)]">
          <dt class="text-zinc-500">Kaynak</dt><dd>{{ s.src }}</dd>
          <dt class="text-zinc-500">Geçerlilik</dt><dd>{{ s.range }}</dd>
          <dt class="text-zinc-500">Varsayımlar</dt><dd>{{ s.assume }}</dd>
        </dl>
      </div>
    </div>
  </details>
</template>
