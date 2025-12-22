import { Outlet, createFileRoute } from '@tanstack/react-router'

import { BottomNav } from '@/components/layout/BottomNav'
import { usePendingSessionsRedirect } from '@/hooks/use-pending-sessions-redirect'

export const Route = createFileRoute('/_main')({
  component: MainLayout,
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.shortcut.listSessions.queryOptions())
  },
})

function MainLayout() {
  usePendingSessionsRedirect()

  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  )
}
