<script setup lang="ts">
const s = useFlight()
const over = ref(false)
const input = ref<HTMLInputElement | null>(null)
const warnOpen = ref(false)

async function onFiles(list: FileList | File[] | null) {
  if (!list || !list.length) return
  await s.addFiles(Array.from(list))
  if (input.value) input.value.value = ''
}
const onDrop = (e: DragEvent) => { over.value = false; onFiles(e.dataTransfer?.files ?? null) }
const fmtSize = (n: number) => (n > 1e6 ? `${(n / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1e3))} KB`)
const f = computed(() => s.active.value)
</script>

<template>
  <section class="space-y-3" aria-label="Dosya yükleme">
    <div
      class="rounded-2xl border-2 border-dashed text-center transition"
      :class="[over ? 'border-arc-500 bg-arc-500/10' : 'border-space-600 bg-space-800/50', s.files.value.length ? 'px-4 py-3' : 'p-5']"
      @dragover.prevent="over = true"
      @dragleave.prevent="over = false"
      @drop.prevent="onDrop"
    >
      <Icon v-if="!s.files.value.length" name="lucide:upload" size="26" class="mx-auto text-arc-400" />
      <p class="text-sm text-zinc-200" :class="s.files.value.length ? 'hidden' : 'mt-2'">OpenRocket "Export to CSV" dosyalarını buraya sürükleyin</p>
      <div class="flex flex-wrap items-center justify-center gap-2" :class="s.files.value.length ? '' : 'mt-3'">
        <button type="button" class="btn btn-primary" :disabled="s.loading.value" @click="input?.click()"><Icon name="lucide:folder-open" size="16" />Dosya seç</button>
        <button type="button" class="btn" :disabled="s.loading.value" @click="s.loadSample()"><Icon name="lucide:flask-conical" size="16" />Örnek veriyi yükle</button>
        <button v-if="s.files.value.length" type="button" class="btn" @click="s.clearAll()"><Icon name="lucide:trash-2" size="16" />Tümünü kaldır</button>
        <input ref="input" type="file" accept=".csv,.txt,text/csv" multiple class="sr-only" aria-label="CSV dosyası seç" @change="onFiles(($event.target as HTMLInputElement).files)" />
      </div>
      <p v-if="s.loading.value" class="mt-3 flex items-center justify-center gap-2 text-sm text-zinc-300" role="status"><Icon name="lucide:loader-circle" size="16" class="animate-spin" />Dosya işleniyor</p>
      <p class="flex items-center justify-center gap-1.5 text-xs text-zinc-500" :class="s.files.value.length ? 'mt-2' : 'mt-3'"><Icon name="lucide:shield-check" size="14" />Dosyalar yalnızca tarayıcınızda işlenir; hiçbir sunucuya gönderilmez.</p>
    </div>

    <ul v-if="s.issues.value.length" class="space-y-2" role="alert">
      <li v-for="(e, i) in s.issues.value" :key="i" class="flex items-start gap-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
        <Icon name="lucide:circle-alert" size="16" class="mt-0.5 shrink-0 text-rose-400" /><span><b class="font-medium">{{ e.name }}:</b> {{ e.message }}</span>
      </li>
    </ul>

    <ul v-if="s.files.value.length" class="flex flex-wrap gap-2">
      <li v-for="x in s.files.value" :key="x.id">
        <div class="flex items-center gap-2 rounded-xl border py-1 pl-3 pr-1 text-sm" :class="s.activeId.value === x.id ? 'border-arc-500 bg-arc-500/10' : 'border-space-600 bg-space-800/70'">
          <span class="h-2.5 w-2.5 rounded-full" :style="{ background: x.color }" aria-hidden="true" />
          <button type="button" class="max-w-[16rem] truncate text-left" :aria-pressed="s.activeId.value === x.id" :title="`${x.fileName} — bu dosyayı görüntüle`" @click="s.activeId.value = x.id">
            {{ x.name }} <span class="text-xs text-zinc-500">{{ fmtSize(x.size) }}</span>
          </button>
          <button type="button" class="rounded-lg p-1.5 text-zinc-400 hover:bg-space-700 hover:text-white" :aria-label="`${x.name} dosyasını kaldır`" @click="s.remove(x.id)"><Icon name="lucide:x" size="14" /></button>
        </div>
      </li>
    </ul>

    <div v-if="f" class="panel flex flex-wrap items-center gap-x-6 gap-y-2 !p-4 text-sm">
      <div class="min-w-0"><p class="text-xs text-zinc-500">Simülasyon</p><p class="truncate font-medium text-white">{{ f.name }}</p></div>
      <div><p class="text-xs text-zinc-500">Satır</p><p class="font-medium tabular-nums text-white">{{ f.data.rows.toLocaleString('tr-TR') }}</p></div>
      <div><p class="text-xs text-zinc-500">Sütun</p><p class="font-medium tabular-nums text-white">{{ f.data.columns.length }}<span v-if="f.data.columns.some((c) => !c.known)" class="ml-1 text-xs text-amber-300">({{ f.data.columns.filter((c) => !c.known).length }} bilinmeyen)</span></p></div>
      <button v-if="f.data.warnings.length || f.data.notes.length" type="button" class="btn ml-auto !py-1.5" :aria-expanded="warnOpen" @click="warnOpen = !warnOpen">
        <Icon name="lucide:triangle-alert" size="16" class="text-amber-400" />OpenRocket uyarıları ({{ f.data.warnings.length + f.data.notes.length }})
        <Icon :name="warnOpen ? 'lucide:chevron-up' : 'lucide:chevron-down'" size="14" />
      </button>
      <ul v-if="warnOpen" class="w-full space-y-1.5 border-t border-space-700 pt-3 text-sm">
        <li v-for="(w, i) in f.data.warnings" :key="`w${i}`" class="flex gap-2 text-amber-100"><Icon name="lucide:triangle-alert" size="14" class="mt-1 shrink-0 text-amber-400" />{{ w }}</li>
        <li v-for="(w, i) in f.data.notes" :key="`n${i}`" class="flex gap-2 text-zinc-300"><Icon name="lucide:info" size="14" class="mt-1 shrink-0 text-zinc-400" />{{ w }}</li>
      </ul>
    </div>
  </section>
</template>
