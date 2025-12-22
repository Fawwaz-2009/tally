import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'

export const Route = createFileRoute('/quick-add/$sessionId/')({
  beforeLoad: async ({ context, params }) => {
    // This only runs when at exactly /quick-add/$sessionId/ - safe to redirect!
    const users = await context.queryClient.ensureQueryData(
      context.trpc.users.list.queryOptions()
    )

    // If exactly 1 user, auto-add to URL and go to merchant
    if (users.length === 1) {
      throw redirect({
        to: '/quick-add/$sessionId/merchant',
        params: { sessionId: params.sessionId },
        search: { user: users[0].id },
      })
    }
    // Otherwise render this page (multiple users)
  },
  component: UserSelect,
})

function UserSelect() {
  const navigate = useNavigate({ from: Route.fullPath })
  const trpc = useTRPC()
  const { sessionId } = Route.useParams()

  // Users data was prefetched in parent loader
  const { data: users = [] } = useQuery(trpc.users.list.queryOptions())

  const handleUserSelect = (userId: string) => {
    navigate({
      to: '/quick-add/$sessionId/merchant',
      params: { sessionId },
      search: { user: userId },
    })
  }

  return (
    <div className="p-4 space-y-2">
      {users.map((user) => (
        <button
          key={user.id}
          onClick={() => handleUserSelect(user.id)}
          className="w-full flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-lg font-semibold text-primary">{user.name.charAt(0).toUpperCase()}</span>
            </div>
            <span className="font-medium">{user.name}</span>
          </div>
          <ChevronRight className="w-5 h-5 text-muted-foreground" />
        </button>
      ))}
    </div>
  )
}
