import { useState, useEffect, useCallback } from 'react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery, useQueryClient } from '@tanstack/react-query'

import { BottomNav } from '@/components/layout/BottomNav'
import { PendingSessionsModal } from '@/components/expense/pending-sessions-modal'

interface PendingSession {
  sessionId: string
  imageUrl: string
  contentType: string
  createdAt: number
  expiresIn: number
}

interface SessionsResponse {
  success: boolean
  sessions: PendingSession[]
  count: number
}

export const Route = createFileRoute('/_main')({
  component: MainLayout,
})

function MainLayout() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [hasAutoRedirected, setHasAutoRedirected] = useState(false)

  // Use TanStack Query to check for pending sessions
  // refetchOnWindowFocus ensures we check when user returns to the app
  const { data: sessionsData } = useQuery<SessionsResponse>({
    queryKey: ['shortcut-sessions'],
    queryFn: async () => {
      const response = await fetch('/api/shortcut/sessions')
      if (!response.ok) {
        return { success: false, sessions: [], count: 0 }
      }
      return response.json()
    },
    refetchOnWindowFocus: true,
    refetchInterval: false, // Don't poll, just refetch on focus
    staleTime: 0, // Always consider data stale so it refetches on focus
  })

  const pendingSessions = sessionsData?.sessions ?? []

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
      // Optimistically update the cache
      queryClient.setQueryData<SessionsResponse>(['shortcut-sessions'], (old) => {
        if (!old) return old
        const updated = old.sessions.filter((s) => s.sessionId !== sessionId)

        // If only one left, close modal and redirect
        if (updated.length === 1) {
          setShowSessionsModal(false)
          setHasAutoRedirected(true)
          navigate({ to: '/quick-add', search: { session: updated[0].sessionId } })
        }
        // If none left, close modal
        if (updated.length === 0) {
          setShowSessionsModal(false)
        }

        return { ...old, sessions: updated, count: updated.length }
      })
    },
    [navigate, queryClient],
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
