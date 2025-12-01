import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_main/settings')({ component: Settings })

function Settings() {
  return (
    <div className="px-6 pt-12 pb-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Settings</h1>
      <div className="text-center py-20 text-muted-foreground">
        <p>Coming soon</p>
      </div>
    </div>
  )
}
