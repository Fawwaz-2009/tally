import { builtinModules } from 'node:module'
import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { VitePWA } from 'vite-plugin-pwa'

// Node.js built-ins to externalize during SSR
const nodeBuiltins = [...builtinModules, ...builtinModules.map((m) => `node:${m}`)]

const config = defineConfig(({ mode }) => {
  // Load all env vars (not just VITE_* prefixed) for server-side use
  const env = loadEnv(mode, process.cwd(), '')

  // Populate process.env with loaded variables for server-side code
  Object.entries(env).forEach(([key, value]) => {
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  })

  return {
    plugins: [
      // this is the plugin that enables path aliases
      viteTsConfigPaths({
        projects: ['./tsconfig.json'],
      }),
      tailwindcss(),
      tanstackStart({
        srcDirectory: 'src',
        start: { entry: './start.tsx' },
        server: { entry: '../server/server.ts' },
      }),
      nitro({
        config: {
          // Node.js server preset for self-hosted deployment
          preset: 'node_server',
          // Externalize native modules that can't be bundled
          externals: {
            external: ['better-sqlite3'],
          },
        },
      }),
      viteReact(),
      VitePWA({
        registerType: 'autoUpdate',
        includeAssets: ['favicon.ico', 'logo192.png', 'logo512.png', 'apple-touch-icon.png'],
        manifest: false, // Use existing manifest.json in public/
        workbox: {
          // Cache app shell and static assets
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          // Don't precache API routes or server-rendered pages
          navigateFallback: null,
          // Runtime caching for API responses
          runtimeCaching: [
            {
              // Cache receipt images aggressively
              urlPattern: /^.*\/api\/files\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'receipt-images',
                expiration: {
                  maxEntries: 100,
                  maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
                },
              },
            },
            {
              // Cache Google Fonts
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-stylesheets',
                expiration: {
                  maxEntries: 10,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-webfonts',
                expiration: {
                  maxEntries: 30,
                  maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
                },
              },
            },
          ],
        },
        devOptions: {
          enabled: true, // Enable in dev for testing
        },
      }),
    ],
    // SSR externals - Node.js built-ins and native modules
    ssr: {
      external: [...nodeBuiltins, 'better-sqlite3'],
    },
    // Resolve alias for 'crypto' - react-dom imports 'crypto' without the 'node:' prefix
    resolve: {
      alias: {
        crypto: 'node:crypto',
      },
    },
  }
})

export default config
