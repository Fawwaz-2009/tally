//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  {
    ignores: [
      // Build outputs
      '.nitro/**',
      '.output/**',
      '.vinxi/**',
      'dist/**',
      'storybook-static/**',
      // Config files (not in tsconfig)
      'eslint.config.js',
      'prettier.config.js',
      // Generated/test infrastructure
      'public/mockServiceWorker.js',
      '.storybook/**',
    ],
  },
  ...tanstackConfig,
  {
    rules: {
      '@typescript-eslint/array-type': 'off',
    },
  },
]
