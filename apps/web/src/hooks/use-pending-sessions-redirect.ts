import { useEffect } from 'react'
import { useMatchRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'

/**
 * Hook that redirects to /quick-add if there are pending sessions.
 * Skips redirect if already on /quick-add or its children.
 */
export function usePendingSessionsRedirect() {
  const navigate = useNavigate()
  const matchRoute = useMatchRoute()
  const trpc = useTRPC()

  const isOnQuickAdd = !!matchRoute({ to: '/quick-add', fuzzy: true })

  const { data: pendingSessions = [] } = useQuery({
    ...trpc.shortcut.listSessions.queryOptions(),
    refetchOnWindowFocus: 'always',
    staleTime: 0,
  })

  useEffect(() => {
    if (isOnQuickAdd) return

    if (pendingSessions.length > 0) {
      navigate({ to: '/quick-add' })
    }
  }, [pendingSessions, navigate, isOnQuickAdd])

  return { pendingSessions, isOnQuickAdd }
}
