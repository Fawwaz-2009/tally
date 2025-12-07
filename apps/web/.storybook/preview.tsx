import type { Preview } from '@storybook/react-vite'
import { initialize, mswLoader } from 'msw-storybook-addon'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider, createMemoryHistory, createRouter, createRootRoute } from '@tanstack/react-router'

import { TRPCProvider } from '@/integrations/trpc-react'
import { initTRPCClient, getTRPCClient } from '@/integrations/root-provider'

import '../src/styles.css'

// Initialize MSW
initialize()

const preview: Preview = {
  decorators: [
    (Story) => {
      // Fresh QueryClient per story to avoid state leaking
      const queryClient = new QueryClient({
        defaultOptions: {
          queries: {
            retry: false,
            staleTime: Infinity,
          },
        },
      })

      // Initialize tRPC client (MSW will intercept the HTTP requests)
      initTRPCClient()
      const trpcClient = getTRPCClient()

      // Create router with Story as the root component
      // TanStack Router's RouterProvider doesn't accept children -
      // it renders the route tree, so Story must be part of the route
      const rootRoute = createRootRoute({
        component: Story,
      })

      const router = createRouter({
        routeTree: rootRoute,
        history: createMemoryHistory({ initialEntries: ['/'] }),
      })

      return (
        <QueryClientProvider client={queryClient}>
          <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
            <RouterProvider router={router} />
          </TRPCProvider>
        </QueryClientProvider>
      )
    },
  ],
  loaders: [mswLoader],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
  },
}

export default preview
