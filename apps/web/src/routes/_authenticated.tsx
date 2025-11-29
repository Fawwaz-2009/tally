import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { authClient } from '@/lib/auth-client'
import { createIsomorphicFn } from '@tanstack/react-start'
import { getRequest } from '@tanstack/react-start/server'

const getSession = createIsomorphicFn()
  .server(async () => {
    // Dynamic imports to ensure server-only code doesn't leak to client bundle
    const { env } = await import('cloudflare:workers')
    const { getAuth } = await import('@repo/data-ops/lib')

    const request = getRequest()
    const auth = getAuth({ BETTER_AUTH_SECRET: env.BETTER_AUTH_SECRET })
    // Direct call - no HTTP request, reads session from cookies via headers
    const session = await auth.api.getSession({ headers: request.headers })
    return { data: session }
  })
  .client(async () => authClient.getSession())

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: async ({}) => {
    const session = await getSession()
    if (!session.data) {
      throw redirect({ to: '/auth/$authView', params: { authView: 'sign-in' } })
    }
    return { session }
  },
  component: () => <Outlet />,
})
