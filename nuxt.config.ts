export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  // İkonlar pakete gömülür; çalışma anında dış sunucudan ikon çekilmez
  icon: { clientBundle: { scan: true, sizeLimitKb: 512, icons: ['lucide:activity', 'lucide:arrow-down-to-line', 'lucide:corner-right-up', 'lucide:crosshair', 'lucide:flame', 'lucide:fuel', 'lucide:gauge', 'lucide:mountain', 'lucide:move-diagonal', 'lucide:move-horizontal', 'lucide:move-up-right', 'lucide:rocket', 'lucide:scale', 'lucide:scissors', 'lucide:wand-sparkles', 'lucide:rotate-ccw', 'lucide:layers', 'lucide:ruler', 'lucide:circle-dashed', 'lucide:circle-alert', 'lucide:triangle-alert', 'lucide:info', 'lucide:link', 'lucide:check', 'lucide:file-code', 'lucide:file-down', 'lucide:drafting-compass', 'lucide:file-spreadsheet', 'lucide:move-vertical', 'lucide:square-dashed', 'lucide:spline', 'lucide:layout-grid', 'lucide:banknote', 'lucide:arrow-left', 'lucide:sigma', 'lucide:timer', 'lucide:trending-up', 'lucide:umbrella', 'lucide:weight', 'lucide:wind', 'lucide:wind-arrow-down', 'lucide:circuit-board', 'lucide:clipboard-copy', 'lucide:split', 'lucide:audio-lines', 'lucide:chevron-down', 'lucide:route', 'lucide:circle-dot', 'lucide:audio-waveform', 'lucide:thermometer', 'lucide:cpu'] } },
  css: ['~/assets/scss/main.scss'],
  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      title: 'Arcturus Tools',
      meta: [{ name: 'description', content: 'Arcturus Roket Takımı mühendislik hesaplayıcıları' }],
    },
  },
})
