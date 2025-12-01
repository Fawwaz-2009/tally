import { createFileRoute, redirect } from '@tanstack/react-router'

export const Route = createFileRoute('/_main/')({
  component: Dashboard,
  beforeLoad: async ({ context }) => {
    const isSetupComplete = await context.queryClient.fetchQuery(
      context.trpc.settings.isSetupComplete.queryOptions(),
    )
    if (!isSetupComplete) {
      throw redirect({ to: '/setup' })
    }
  },
})

function Dashboard() {
  return (
    <div className="px-6 pt-12 pb-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Overview</h1>
      </div>

      <div className="mb-6">
        <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-1">
          Total Spent
        </div>
        <div className="text-5xl font-mono font-bold tracking-tighter tabular-nums">
          $0.00
        </div>
      </div>

      <div className="text-center py-20 text-muted-foreground">
        <p className="text-lg mb-2">No expenses yet</p>
        <p className="text-sm">Add your first expense to get started</p>
      </div>
    </div>
  )
}
