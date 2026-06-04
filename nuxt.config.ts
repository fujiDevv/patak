// https://nuxt.com/docs/api/configuration/nuxt-config
// @ts-ignore
if (typeof process !== 'undefined' && process.platform === 'darwin') {
  // @ts-ignore
  process.env.TMPDIR = '/tmp'
}

export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  devtools: { enabled: true },
  modules: ['@nuxtjs/tailwindcss', '@vite-pwa/nuxt'],
  pwa: {
    registerType: 'autoUpdate',
    manifest: {
      name: 'Patak Civic Outage Tracker',
      short_name: 'Patak',
      description: 'Official tracker for power and water outages in Metro Manila.',
      theme_color: '#1e3a8a',
      background_color: '#f8fafc',
      display: 'standalone',
      orientation: 'portrait',
      icons: [
        {
          src: '/pwa-192x192.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: '/pwa-512x512.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    },
    workbox: {
      navigateFallback: '/'
    },
    devOptions: {
      enabled: true,
      type: 'module'
    }
  }
})

