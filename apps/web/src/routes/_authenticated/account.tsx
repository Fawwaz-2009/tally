import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/_authenticated/account')({
  component: AccountPage,
})

function AccountPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">Account</h1>
        <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
          <p className="text-gray-700">
            This is a protected page. You are authenticated and can view
            sensitive content here.
          </p>
        </div>
      </div>
    </div>
  )
}
