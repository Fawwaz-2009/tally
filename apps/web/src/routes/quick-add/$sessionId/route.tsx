import { createFileRoute, Outlet } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'

export const Route = createFileRoute('/quick-add/$sessionId')({
  loader: async ({ context, params }) => {
    const { sessionId } = params

    // Fetch session data for this specific session
    await context.queryClient.ensureQueryData(
      context.trpc.shortcut.getSession.queryOptions({ sessionId })
    )
  },
  component: SessionLayout,
})

function SessionLayout() {
  const navigate = Route.useNavigate()
  const trpc = useTRPC()
  const { sessionId } = Route.useParams()
  console.log("ROTUER_SESSION_PAGE")

  // Session data was prefetched in loader
  const { data: sessionData } = useQuery(trpc.shortcut.getSession.queryOptions({ sessionId }))

  return (
    <div className="min-h-screen bg-background">
      {/* Header with receipt preview */}
      <div className="sticky top-0 z-10 bg-background border-b">
        <div className="flex items-center gap-3 p-4">
          <button
            onClick={() => navigate({ to: '/' })}
            className="p-2 -ml-2 hover:bg-muted rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-muted flex-shrink-0">
            {sessionData && <img src={sessionData.imageUrl} alt="Receipt" className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="font-semibold truncate">Quick Add Expense</h1>
            <p className="text-sm text-muted-foreground">Add receipt from iOS Shortcut</p>
          </div>
        </div>
      </div>

      {/* Child routes render here */}
      <Outlet />
    </div>
  )
}
