import { useState } from 'react'
import { Receipt, Clock, Trash2 } from 'lucide-react'

import { cn } from '@/lib/utils'

interface PendingSession {
  sessionId: string
  imageUrl: string
  contentType: string
  createdAt: number
  expiresIn: number
}

interface PendingSessionsModalProps {
  sessions: PendingSession[]
  onSessionSelected: (sessionId: string) => void
  onSessionDeleted: (sessionId: string) => void
}

/**
 * Modal to display pending quick-add sessions.
 * Shown when the PWA is opened and there are pending sessions from iOS Shortcuts.
 *
 * This modal is NON-DISMISSIBLE - user must resolve all pending sessions
 * by either selecting them to process or deleting (discarding) them.
 */
export function PendingSessionsModal({
  sessions,
  onSessionSelected,
  onSessionDeleted,
}: PendingSessionsModalProps) {
  const [deletingSession, setDeletingSession] = useState<string | null>(null)

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setDeletingSession(sessionId)

    try {
      const response = await fetch(`/api/shortcut/session/${sessionId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        onSessionDeleted(sessionId)
      }
    } catch {
      // Ignore errors
    } finally {
      setDeletingSession(null)
    }
  }

  const formatTimeAgo = (createdAt: number) => {
    const seconds = Math.floor((Date.now() - createdAt) / 1000)
    if (seconds < 60) return 'Just now'
    const minutes = Math.floor(seconds / 60)
    if (minutes === 1) return '1 minute ago'
    return `${minutes} minutes ago`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      {/* Backdrop - NO onClick, modal is non-dismissible */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Modal */}
      <div className="relative bg-background w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header - no close button */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold">Pending Receipts</h2>
          <p className="text-sm text-muted-foreground">
            {sessions.length === 1
              ? 'You have 1 receipt waiting to be added'
              : `You have ${sessions.length} receipts waiting to be added`}
          </p>
        </div>

        {/* Sessions list */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => onSessionSelected(session.sessionId)}
              className={cn(
                'w-full flex items-center gap-4 p-3 bg-card border rounded-xl',
                'hover:bg-accent transition-colors text-left',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
              )}
            >
              {/* Receipt thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={session.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm font-medium">
                  <Receipt className="w-4 h-4 text-muted-foreground" />
                  <span>Tap to add expense</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(session.createdAt)}</span>
                </div>
              </div>

              {/* Delete/Discard button */}
              <button
                onClick={(e) => handleDeleteSession(session.sessionId, e)}
                disabled={deletingSession === session.sessionId}
                className={cn(
                  'p-2 rounded-full hover:bg-destructive/10 transition-colors',
                  'text-muted-foreground hover:text-destructive',
                  deletingSession === session.sessionId && 'opacity-50',
                )}
                title="Discard this receipt"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </button>
          ))}
        </div>

        {/* Footer - helpful hint instead of close button */}
        <div className="p-4 border-t bg-muted/30">
          <p className="text-xs text-muted-foreground text-center">
            Tap a receipt to add it as an expense, or use the trash icon to discard it.
          </p>
        </div>
      </div>
    </div>
  )
}
