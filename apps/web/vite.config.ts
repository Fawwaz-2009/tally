import { defineConfig, loadEnv } from 'vite'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'
import viteReact from '@vitejs/plugin-react'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'
import { nitro } from 'nitro/vite'
import { builtinModules } from 'node:module'

// Node.js built-ins to externalize during SSR
const nodeBuiltins = [
  ...builtinModules,
  ...builtinModules.map((m) => `node:${m}`),
]

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
    ],
    // SSR externals - Node.js built-ins and native modules
    ssr: {
      external: [...nodeBuiltins, 'better-sqlite3'],
    },
    // Resolve alias for 'crypto' - required because better-auth (or its dependencies)
    // imports 'crypto' without the 'node:' prefix. This is a workaround for a
    // third-party dependency issue, not our code.
    resolve: {
      alias: {
        crypto: 'node:crypto',
      },
    },
  }
})

export default config
