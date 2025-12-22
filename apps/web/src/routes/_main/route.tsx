import { useState, useEffect, useCallback } from 'react'
import { Outlet, createFileRoute, useNavigate } from '@tanstack/react-router'

import { BottomNav } from '@/components/layout/BottomNav'
import { PendingSessionsModal } from '@/components/expense/pending-sessions-modal'

interface PendingSession {
  sessionId: string
  imageUrl: string
  contentType: string
  createdAt: number
  expiresIn: number
}

export const Route = createFileRoute('/_main')({
  component: MainLayout,
})

function MainLayout() {
  const navigate = useNavigate()
  const [pendingSessions, setPendingSessions] = useState<PendingSession[]>([])
  const [showSessionsModal, setShowSessionsModal] = useState(false)
  const [hasCheckedSessions, setHasCheckedSessions] = useState(false)

  // Check for pending sessions on mount
  useEffect(() => {
    async function checkPendingSessions() {
      try {
        const response = await fetch('/api/shortcut/sessions')
        if (!response.ok) return

        const data = await response.json()
        const sessions: PendingSession[] = data.sessions || []

        if (sessions.length === 1) {
          // Single session - redirect directly
          navigate({ to: '/quick-add', search: { session: sessions[0].sessionId } })
        } else if (sessions.length > 1) {
          // Multiple sessions - show picker
          setPendingSessions(sessions)
          setShowSessionsModal(true)
        }
      } catch {
        // Ignore errors - not critical
      } finally {
        setHasCheckedSessions(true)
      }
    }

    // Only check once per app launch
    if (!hasCheckedSessions) {
      checkPendingSessions()
    }
  }, [navigate, hasCheckedSessions])

  const handleSessionDeleted = useCallback((sessionId: string) => {
    setPendingSessions((prev) => {
      const updated = prev.filter((s) => s.sessionId !== sessionId)
      // If only one left, close modal and redirect
      if (updated.length === 1) {
        setShowSessionsModal(false)
        navigate({ to: '/quick-add', search: { session: updated[0].sessionId } })
        return []
      }
      // If none left, close modal
      if (updated.length === 0) {
        setShowSessionsModal(false)
      }
      return updated
    })
  }, [navigate])

  const handleDismissModal = useCallback(() => {
    setShowSessionsModal(false)
  }, [])

  return (
    <>
      <Outlet />
      <BottomNav />

      {/* Pending sessions modal */}
      {showSessionsModal && pendingSessions.length > 0 && (
        <PendingSessionsModal
          sessions={pendingSessions}
          onDismiss={handleDismissModal}
          onSessionDeleted={handleSessionDeleted}
        />
      )}
    </>
  )
}
