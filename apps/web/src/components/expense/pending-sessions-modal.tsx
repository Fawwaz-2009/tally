import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { X, Receipt, Clock, Trash2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
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
  onDismiss: () => void
  onSessionDeleted: (sessionId: string) => void
}

/**
 * Modal to display pending quick-add sessions.
 * Shown when the PWA is opened and there are pending sessions from iOS Shortcuts.
 */
export function PendingSessionsModal({ sessions, onDismiss, onSessionDeleted }: PendingSessionsModalProps) {
  const navigate = useNavigate()
  const [deletingSession, setDeletingSession] = useState<string | null>(null)

  const handleSelectSession = (sessionId: string) => {
    navigate({ to: '/quick-add', search: { session: sessionId } })
  }

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
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onDismiss} />

      {/* Modal */}
      <div className="relative bg-background w-full sm:max-w-md sm:rounded-xl rounded-t-xl max-h-[80vh] overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <div>
            <h2 className="text-lg font-semibold">Pending Receipts</h2>
            <p className="text-sm text-muted-foreground">
              {sessions.length === 1 ? '1 receipt waiting' : `${sessions.length} receipts waiting`}
            </p>
          </div>
          <button onClick={onDismiss} className="p-2 hover:bg-muted rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sessions list */}
        <div className="overflow-y-auto max-h-[60vh] p-4 space-y-3">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() => handleSelectSession(session.sessionId)}
              className={cn(
                'w-full flex items-center gap-4 p-3 bg-card border rounded-xl',
                'hover:bg-accent transition-colors text-left',
                'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2'
              )}
            >
              {/* Receipt thumbnail */}
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={session.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Receipt className="w-4 h-4" />
                  <span>Receipt image</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <Clock className="w-3 h-3" />
                  <span>{formatTimeAgo(session.createdAt)}</span>
                </div>
              </div>

              {/* Delete button */}
              <button
                onClick={(e) => handleDeleteSession(session.sessionId, e)}
                disabled={deletingSession === session.sessionId}
                className={cn(
                  'p-2 rounded-full hover:bg-destructive/10 transition-colors',
                  'text-muted-foreground hover:text-destructive',
                  deletingSession === session.sessionId && 'opacity-50'
                )}
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </button>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t">
          <Button variant="outline" onClick={onDismiss} className="w-full">
            Close
          </Button>
        </div>
      </div>
    </div>
  )
}
