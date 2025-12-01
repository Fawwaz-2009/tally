import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_main/analysis')({ component: Analysis })

function Analysis() {
  return (
    <div className="px-6 pt-12 pb-6">
      <h1 className="text-3xl font-bold tracking-tight mb-6">Analysis</h1>
      <div className="text-center py-20 text-muted-foreground">
        <p>Coming soon</p>
      </div>
    </div>
  )
}
