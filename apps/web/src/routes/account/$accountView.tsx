import { createFileRoute } from '@tanstack/react-router'
import { AccountView } from '@daveyplate/better-auth-ui'

export const Route = createFileRoute('/account/$accountView')({
  component: RouteComponent,
})

function RouteComponent() {
  const { accountView } = Route.useParams()

  return (
    <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <AccountView pathname={accountView} />
      </div>
    </main>
  )
}
