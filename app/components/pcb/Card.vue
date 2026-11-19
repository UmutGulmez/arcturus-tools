<script setup lang="ts">
const props = defineProps<{ title: string; report: string; tone?: 'ok' | 'warn' | 'bad' }>()
const copied = ref(false)
async function copy() {
  try {
    await navigator.clipboard.writeText(props.report)
    copied.value = true
    setTimeout(() => (copied.value = false), 2000)
  } catch {
    window.prompt('Metni kopyalayın:', props.report)
  }
}
const ring = { ok: 'border-emerald-500/30', warn: 'border-amber-500/30', bad: 'border-rose-500/40' }
</script>

<template>
  <section class="panel !p-4" :class="tone ? ring[tone] : ''">
    <div class="flex items-start justify-between gap-3">
      <h3 class="text-sm font-medium text-zinc-300">{{ title }}</h3>
      <button type="button" class="btn !px-2.5 !py-1 text-xs" :title="'Formül, girdiler ve sonucu tek satır olarak panoya kopyalar'" @click="copy">
        <Icon :name="copied ? 'lucide:check' : 'lucide:clipboard-copy'" size="14" /> {{ copied ? 'Kopyalandı' : 'Rapora kopyala' }}
      </button>
    </div>
    <div class="mt-3"><slot /></div>
  </section>
</template>
