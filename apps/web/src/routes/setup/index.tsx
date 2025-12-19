import { createFileRoute } from '@tanstack/react-router'

import { SetupForm } from './-components/setup-form'
import { AlreadySetup } from './-components/already-setup'

export const Route = createFileRoute('/setup/')({
  component: SetupPage,
  loader: async ({ context }) => {
    const isSetupComplete = await context.queryClient.ensureQueryData(context.trpc.settings.isSetupComplete.queryOptions())
    return { isSetupComplete }
  },
})

function SetupPage() {
  const { isSetupComplete } = Route.useLoaderData()

  if (isSetupComplete) {
    return <AlreadySetup />
  }

  return <SetupForm />
}
