import type { StorybookConfig } from '@storybook/react-vite'
import { mergeConfig } from 'vite'
import viteTsConfigPaths from 'vite-tsconfig-paths'
import tailwindcss from '@tailwindcss/vite'

const config: StorybookConfig = {
  framework: '@storybook/react-vite',

  stories: ['../src/**/*.stories.@(ts|tsx)'],

  addons: ['@storybook/addon-a11y', '@storybook/addon-vitest'],

  staticDirs: ['../public'],

  viteFinal: async (config) => {
    return mergeConfig(config, {
      plugins: [
        viteTsConfigPaths({
          projects: ['../tsconfig.json'],
        }),
        tailwindcss(),
      ],
    })
  },
}

export default config
