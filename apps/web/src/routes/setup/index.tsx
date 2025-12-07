import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

import { SetupForm } from './-components/setup-form'
import { WaitingForExpense } from './-components/waiting-for-expense'
import { AlreadySetup } from './-components/already-setup'

// Search params for post-setup state
const setupSearchSchema = z.object({
  completed: z.boolean().optional(),
  userId: z.string().optional(),
  userName: z.string().optional(),
})

export const Route = createFileRoute('/setup/')({
  component: SetupPage,
  validateSearch: setupSearchSchema,
  loaderDeps: ({ search }) => ({ search }),
  loader: async ({ context }) => {
    // Prefetch setup status server-side
    const isSetupComplete = await context.queryClient.fetchQuery(context.trpc.settings.isSetupComplete.queryOptions())
    return { isSetupComplete }
  },
})

function SetupPage() {
  const { isSetupComplete } = Route.useLoaderData()
  const { completed, userId, userName } = Route.useSearch()

  // Show "waiting for expense" screen after setup
  if (completed && userId && userName) {
    return <WaitingForExpense userName={userName} userId={userId} />
  }

  // Show "already setup" message if setup was completed previously
  if (isSetupComplete) {
    return <AlreadySetup />
  }

  return <SetupForm />
}
