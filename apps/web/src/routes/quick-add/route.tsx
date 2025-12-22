import { createFileRoute, Outlet } from '@tanstack/react-router'

export const Route = createFileRoute('/quick-add')({
  // NO beforeLoad redirects here - parent beforeLoad runs on EVERY child navigation!
  // Redirect logic lives in index.tsx pages which only run at their exact path
  loader: async ({ context }) => {
    // Preload data needed by all child routes
    await Promise.all([
      context.queryClient.ensureQueryData(context.trpc.shortcut.listSessions.queryOptions()),
      context.queryClient.ensureQueryData(context.trpc.users.list.queryOptions()),
      context.queryClient.ensureQueryData(context.trpc.merchants.list.queryOptions()),
      context.queryClient.ensureQueryData(context.trpc.settings.getBaseCurrency.queryOptions()),
    ])
  },
  component: Outlet,
})
