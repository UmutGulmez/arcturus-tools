export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  // İkonlar pakete gömülür; çalışma anında dış sunucudan ikon çekilmez
  icon: { clientBundle: { scan: true, sizeLimitKb: 512, icons: ['lucide:activity', 'lucide:arrow-down-to-line', 'lucide:corner-right-up', 'lucide:crosshair', 'lucide:flame', 'lucide:fuel', 'lucide:gauge', 'lucide:mountain', 'lucide:move-diagonal', 'lucide:move-horizontal', 'lucide:move-up-right', 'lucide:rocket', 'lucide:scale', 'lucide:sigma', 'lucide:timer', 'lucide:trending-up', 'lucide:umbrella', 'lucide:weight', 'lucide:wind', 'lucide:wind-arrow-down'] } },
  css: ['~/assets/scss/main.scss'],
  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      title: 'Arcturus Tools',
      meta: [{ name: 'description', content: 'Arcturus Roket Takımı mühendislik hesaplayıcıları' }],
    },
  },
})
