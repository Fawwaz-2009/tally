import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router'
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools'
import { TanStackDevtools } from '@tanstack/react-devtools'

import { ThemeProvider } from '../components/theme-provider'

import TanStackQueryDevtools from '../integrations/tanstack-query-devtools'

import appCss from '../styles.css?url'

import type { QueryClient } from '@tanstack/react-query'

import type { TRPCOptionsProxy } from '@trpc/tanstack-react-query'
import type { TRPCRouter } from '@server/trpc/router'

interface MyRouterContext {
  queryClient: QueryClient

  trpc: TRPCOptionsProxy<TRPCRouter>
}

export const Route = createRootRouteWithContext<MyRouterContext>()({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0',
      },
      {
        title: 'Tally',
      },
      {
        name: 'theme-color',
        content: '#09090b',
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Oswald:wght@400;500;700&family=Red+Hat+Mono:wght@300;400;500;700&display=swap',
      },
      {
        rel: 'stylesheet',
        href: appCss,
      },
    ],
  }),
  component: RootComponent,
  shellComponent: RootDocument,
})

function RootComponent() {
  return <Outlet />
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body
        className="bg-background text-foreground font-sans antialiased min-h-screen selection:bg-primary selection:text-primary-foreground pb-24"
        style={{ fontFamily: '"Red Hat Mono", monospace' }}
      >
        <ThemeProvider defaultTheme="system" storageKey="tally-theme">
          <style>{`
            h1, h2, h3, h4, h5, h6, .font-heading {
              font-family: 'Oswald', sans-serif;
            }
          `}</style>
          {children}
          <TanStackDevtools
            config={{
              position: 'bottom-right',
            }}
            plugins={[
              {
                name: 'Tanstack Router',
                render: <TanStackRouterDevtoolsPanel />,
              },
              TanStackQueryDevtools,
            ]}
          />
          <Scripts />
        </ThemeProvider>
      </body>
    </html>
  )
}
