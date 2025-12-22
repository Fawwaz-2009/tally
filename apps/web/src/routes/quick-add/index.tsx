import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Receipt } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'

export const Route = createFileRoute('/quick-add/')({
  component: QuickAddIndex,
})

function QuickAddIndex() {
  const navigate = useNavigate()
  const trpc = useTRPC()

  const { data: sessions = [] } = useQuery(trpc.shortcut.listSessions.queryOptions())

  // No sessions
  if (sessions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Receipt className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h1 className="text-xl font-bold mb-2">No Receipts</h1>
            <p className="text-muted-foreground">Use the iOS Shortcut to share a receipt image first.</p>
          </div>
          <Button onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
            Go Home
          </Button>
        </div>
      </div>
    )
  }

  // Multiple sessions - show list
  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Quick Add Receipts</h1>
          <p className="text-muted-foreground">Select a receipt to add</p>
        </div>

        <div className="space-y-3">
          {sessions.map((session) => (
            <button
              key={session.sessionId}
              onClick={() =>
                navigate({
                  to: '/quick-add/$sessionId',
                  params: { sessionId: session.sessionId },
                })
              }
              className="w-full flex items-center gap-3 p-4 bg-card border rounded-xl hover:bg-accent transition-colors"
            >
              <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                <img src={session.imageUrl} alt="Receipt" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 text-left">
                <p className="font-medium">Receipt</p>
                <p className="text-sm text-muted-foreground">{new Date(session.createdAt).toLocaleTimeString()}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
