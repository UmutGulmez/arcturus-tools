<script setup lang="ts">
import { tools, categories } from '~/data/tools'

// Mobil menü (hamburger)
const open = ref(false)
const route = useRoute()
watch(() => route.fullPath, () => (open.value = false))

// Masaüstü daraltma; cookie'de tutulur, böylece SSR ile uyumlu ve sayfa yenilemede kalıcı
const collapsedCookie = useCookie<boolean>('sidebar-collapsed', { default: () => false, maxAge: 60 * 60 * 24 * 365 })
const collapsed = computed(() => collapsedCookie.value)
const toggle = () => (collapsedCookie.value = !collapsedCookie.value)

const byCategory = (c: string) => tools.filter((t) => t.category === c)

// Daraltılmışken etiketleri masaüstünde gizle
const hideWhenCollapsed = computed(() => (collapsed.value ? 'lg:hidden' : ''))
const itemCls = computed(() => [
  'flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-300 hover:bg-space-700',
  collapsed.value ? 'lg:justify-center lg:px-0' : '',
])
</script>

<template>
  <aside
    class="flex flex-col border-b border-space-600 bg-space-900/80 backdrop-blur transition-[width] duration-200 lg:sticky lg:top-0 lg:h-screen lg:shrink-0 lg:border-b-0 lg:border-r"
    :class="collapsed ? 'lg:w-[4.75rem]' : 'lg:w-72'"
  >
    <!-- Üst: logo + başlık -->
    <div class="flex items-center justify-between gap-2 p-4" :class="collapsed ? 'lg:flex-col lg:px-2' : ''">
      <NuxtLink to="/" class="flex min-w-0 items-center gap-3" aria-label="Arcturus Roket Takımı">
        <img src="/img/logoarcturus-256.png" alt="Arcturus logosu" width="256" height="200" class="h-11 w-auto shrink-0" />
        <span class="min-w-0 leading-tight" :class="hideWhenCollapsed">
          <span class="block text-base font-bold text-white">Arcturus</span>
          <span class="block text-sm text-zinc-300">Roket Takımı</span>
        </span>
      </NuxtLink>

      <button class="text-zinc-300 lg:hidden" :aria-label="open ? 'Menüyü kapat' : 'Menüyü aç'" :aria-expanded="open" @click="open = !open">
        <Icon :name="open ? 'lucide:x' : 'lucide:menu'" size="24" />
      </button>
      <button
        class="hidden shrink-0 rounded-lg p-1.5 text-zinc-400 hover:bg-space-700 hover:text-white lg:block"
        :aria-label="collapsed ? 'Paneli genişlet' : 'Paneli daralt'"
        :aria-expanded="!collapsed"
        :title="collapsed ? 'Paneli genişlet' : 'Paneli daralt'"
        @click="toggle"
      >
        <Icon :name="collapsed ? 'lucide:panel-left-open' : 'lucide:panel-left-close'" size="18" />
      </button>
    </div>

    <!-- Menü -->
    <nav :class="[open ? 'block' : 'hidden', 'lg:block min-h-0 flex-1 overflow-y-auto px-3 pb-4']" aria-label="Araçlar">
      <NuxtLink to="/" :class="itemCls" exact-active-class="!bg-space-700 !text-arc-400" title="Dashboard">
        <Icon name="lucide:layout-dashboard" size="16" class="shrink-0" />
        <span :class="hideWhenCollapsed">Dashboard</span>
      </NuxtLink>

      <div v-for="c in categories" :key="c" class="mt-5">
        <p class="mb-1 px-3 text-[11px] uppercase tracking-widest text-zinc-500" :class="hideWhenCollapsed">{{ c }}</p>
        <div v-if="collapsed" class="mx-3 mb-2 hidden border-t border-space-700 lg:block" aria-hidden="true" />
        <NuxtLink
          v-for="t in byCategory(c)"
          :key="t.slug"
          :to="`/tools/${t.slug}`"
          :class="itemCls"
          active-class="!bg-space-700 !text-arc-400"
          :title="t.name"
        >
          <Icon :name="t.icon" size="16" class="shrink-0" />
          <span class="truncate" :class="hideWhenCollapsed">{{ t.name }}</span>
          <span v-if="t.status === 'ready'" class="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-400" :class="hideWhenCollapsed" title="Hazır" />
        </NuxtLink>
      </div>
    </nav>

    <!-- Alt: imza -->
    <div :class="[open ? 'block' : 'hidden', 'lg:block shrink-0 border-t border-space-700 px-4 py-3']">
      <a
        href="https://umututku.com"
        target="_blank"
        rel="noopener noreferrer"
        class="group flex items-center gap-2 text-xs text-zinc-500 transition hover:text-zinc-200"
        :class="collapsed ? 'lg:justify-center' : ''"
        title="Umut Utku Gülmez tarafından yapıldı"
        aria-label="Umut Utku Gülmez tarafından yapıldı (umututku.com)"
      >
        <Icon name="lucide:code-xml" size="14" class="shrink-0 group-hover:text-arc-400" />
        <span :class="hideWhenCollapsed">
          <span class="text-zinc-300 group-hover:text-arc-400">Umut Utku Gülmez</span> tarafından yapıldı
        </span>
      </a>
    </div>
  </aside>
</template>
