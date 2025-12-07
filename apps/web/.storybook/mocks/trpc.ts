import { createTRPCMsw, httpLink } from 'msw-trpc'
import superjson from 'superjson'
import type { TRPCRouter } from '@server/trpc/router'

export const trpcMsw = createTRPCMsw<TRPCRouter>({
  links: [
    httpLink({
      url: '/api/trpc',
    }),
  ],
  transformer: { input: superjson, output: superjson },
})
