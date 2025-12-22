import { useCallback, useEffect, useState } from 'react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { BottomNav } from '@/components/layout/BottomNav'
import { PendingSessionsModal } from '@/components/expense/pending-sessions-modal'
import { useTRPC } from '@/integrations/trpc-react'

export const Route = createFileRoute('/_main')({
  component: MainLayout,
})

function MainLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const trpc = useTRPC()
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false)

  // Use tRPC to check for pending sessions
  // refetchOnWindowFocus ensures we check when user returns to the app
  const { data: pendingSessions = [] } = useQuery(
    trpc.shortcut.listSessions.queryOptions({
      refetchOnWindowFocus: true,
      refetchInterval: false,
      staleTime: 0,
    }),
  )

  // Mutation for deleting sessions
  const deleteSessionMutation = useMutation(
    trpc.shortcut.deleteSession.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.shortcut.listSessions.queryKey() })
      },
    }),
  )

  // Handle auto-redirect for single session
  useEffect(() => {
    if (pendingSessions.length === 1 && !hasAutoRedirected) {
      setHasAutoRedirected(true)
      navigate({ to: '/quick-add', search: { session: pendingSessions[0].sessionId } })
    } else if (pendingSessions.length > 1) {
      setShowSessionsModal(true)
    } else if (pendingSessions.length === 0) {
      setShowSessionsModal(false)
      // Reset auto-redirect flag when no sessions, so next single session will redirect
      setHasAutoRedirected(false)
    }
  }, [pendingSessions, navigate, hasAutoRedirected])

  const handleSessionDeleted = useCallback(
    (sessionId: string) => {
      deleteSessionMutation.mutate({ sessionId })

      // Optimistically update the UI
      const remaining = pendingSessions.filter((s) => s.sessionId !== sessionId)
      if (remaining.length === 1) {
        setShowSessionsModal(false)
        setHasAutoRedirected(true)
        navigate({ to: '/quick-add', search: { session: remaining[0].sessionId } })
      } else if (remaining.length === 0) {
        setShowSessionsModal(false)
      }
    },
    [deleteSessionMutation, pendingSessions, navigate],
  )

  const handleSessionSelected = useCallback(
    (sessionId: string) => {
      setShowSessionsModal(false)
      setHasAutoRedirected(true)
      navigate({ to: '/quick-add', search: { session: sessionId } })
    },
    [navigate],
  )

  return (
    <>
      <Outlet />
      <BottomNav />

      {/* Pending sessions modal - non-dismissible, must resolve all sessions */}
      {showSessionsModal && pendingSessions.length > 0 && (
        <PendingSessionsModal
          sessions={pendingSessions}
          onSessionSelected={handleSessionSelected}
          onSessionDeleted={handleSessionDeleted}
        />
      )}
    </>
  )
}
