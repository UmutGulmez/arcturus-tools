export default defineNuxtConfig({
  compatibilityDate: '2025-01-01',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@nuxt/icon'],
  css: ['~/assets/scss/main.scss'],
  app: {
    head: {
      htmlAttrs: { lang: 'tr' },
      title: 'Arcturus Tools',
      meta: [{ name: 'description', content: 'Arcturus Roket Takımı mühendislik hesaplayıcıları' }],
    },
  },
})
