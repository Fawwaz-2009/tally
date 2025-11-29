//  @ts-check

import { tanstackConfig } from '@tanstack/eslint-config'

export default [
  ...tanstackConfig,
  {
    rules: {
        '@typescript-eslint/array-type': 'off',
      'import/consistent-type-specifier-style': 'warn',
      'sort-imports': 'warn',
      'import/order': 'warn'
    },
  },
]
