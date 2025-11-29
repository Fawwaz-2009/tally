import { createFileRoute } from '@tanstack/react-router'
import { AuthView } from '@daveyplate/better-auth-ui'

export const Route = createFileRoute('/auth/$authView')({
  component: RouteComponent,
})

function RouteComponent() {
  const { authView } = Route.useParams()

  return (
    <main className="flex items-center justify-center min-h-screen bg-linear-to-b from-gray-50 to-white p-4">
      <div className="w-full max-w-md">
        <AuthView pathname={authView} />
      </div>
    </main>
  )
}
