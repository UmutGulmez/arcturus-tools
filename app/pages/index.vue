<script setup lang="ts">
import { tools, categories } from "~/data/tools";

const query = ref("");
const active = ref<string>("Tümü");

const searchEl = ref<HTMLInputElement | null>(null);
function onSlash(e: KeyboardEvent) {
  const t = e.target as HTMLElement;
  if (e.key === "/" && !["INPUT", "TEXTAREA"].includes(t.tagName)) {
    e.preventDefault();
    searchEl.value?.focus();
  }
}
onMounted(() => window.addEventListener("keydown", onSlash));
onBeforeUnmount(() => window.removeEventListener("keydown", onSlash));

const filtered = computed(() =>
  [...tools]
    .sort((a, b) => Number(b.status === "ready") - Number(a.status === "ready"))
    .filter(
      (t) =>
        (active.value === "Tümü" || t.category === active.value) &&
        (t.name + t.description)
          .toLocaleLowerCase("tr")
          .includes(query.value.toLocaleLowerCase("tr")),
    ),
);
</script>

<template>
  <div class="max-w-6xl mx-auto">
    <header class="panel panel-hero !p-7">
      <h1 class="text-3xl font-bold text-white">Mühendislik Araçları</h1>
      <p class="mt-1 text-zinc-400">
        Arcturus Roket Takımı'nın roketçilik çalışmaları sırasında kullanılması
        adına özgün bir şekilde geliştirdiği mühendislik araçları. Eğer bu
        araçlarda bir hata bulursanız, lütfen bize bildirin.
      </p>
    </header>

    <div class="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
      <div class="rounded-xl border border-space-600 bg-space-800/80 p-4">
        <p class="text-2xl font-bold text-arc-400">{{ tools.length }}</p>
        <p class="text-xs text-zinc-400">Toplam araç</p>
      </div>
      <div class="rounded-xl border border-space-600 bg-space-800/80 p-4">
        <p class="text-2xl font-bold text-arc-400">{{ categories.length }}</p>
        <p class="text-xs text-zinc-400">Kategori</p>
      </div>
      <div
        class="rounded-xl border border-space-600 bg-space-800/80 p-4 col-span-2 sm:col-span-1"
      >
        <p class="text-2xl font-bold text-arc-400">
          {{ tools.filter((t) => t.status === "ready").length }}
        </p>
        <p class="text-xs text-zinc-400">Kullanıma hazır</p>
      </div>
    </div>

    <div class="mt-8 flex flex-col sm:flex-row gap-3">
      <div class="relative flex-1">
        <Icon
          name="lucide:search"
          size="16"
          class="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500"
        />
        <input
          ref="searchEl"
          v-model="query"
          type="search"
          placeholder="Araç ara…  ( / )"
          class="w-full rounded-xl bg-space-800 border border-space-600 pl-10 pr-4 py-2.5 text-sm outline-none focus:border-arc-500"
        />
      </div>
    </div>
    <div class="mt-3 flex flex-wrap gap-2">
      <button
        v-for="c in ['Tümü', ...categories]"
        :key="c"
        class="px-3 py-1.5 rounded-full text-xs border transition"
        :class="
          active === c
            ? 'bg-arc-500 border-arc-500 text-white font-medium'
            : 'border-space-600 text-zinc-300 hover:border-arc-500'
        "
        @click="active = c"
      >
        {{ c }}
      </button>
    </div>

    <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <ToolCard v-for="t in filtered" :key="t.slug" :tool="t" />
    </div>
    <p v-if="!filtered.length" class="mt-10 text-center text-zinc-500">
      Sonuç bulunamadı.
    </p>
  </div>
</template>
