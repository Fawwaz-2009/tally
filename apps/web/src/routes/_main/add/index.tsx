import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { CheckCircle } from 'lucide-react'

import type { ExpenseFormData } from '@/components/expense/expense-form'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { ExpenseForm } from '@/components/expense/expense-form'

export const Route = createFileRoute('/_main/add/')({
  component: AddExpense,
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(context.trpc.users.list.queryOptions()),
      context.queryClient.ensureQueryData(context.trpc.merchants.list.queryOptions()),
    ])
  },
})

function AddExpense() {
  const trpc = useTRPC()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data: users } = useQuery(trpc.users.list.queryOptions())

  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [formKey, setFormKey] = useState(0)

  const createMutation = useMutation(
    trpc.expenses.create.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: trpc.expenses.list.queryKey() })
        queryClient.invalidateQueries({ queryKey: trpc.merchants.list.queryKey() })
        setSuccess(true)
      },
      onError: (err) => {
        setError(err.message || 'Failed to create expense')
      },
    }),
  )

  const handleSubmit = (data: ExpenseFormData) => {
    setError(null)

    const user = users?.find((u) => u.id === data.userId) || users?.[0]
    if (!user) {
      setError('Please select a user')
      return
    }

    if (!data.image) {
      setError('Please select a receipt image')
      return
    }

    const formData = new FormData()
    formData.append('image', data.image)
    formData.append('userName', user.name)
    formData.append('merchantName', data.merchantName)
    formData.append('currency', data.currency)
    formData.append('amount', String(data.amount))
    if (data.expenseDate) {
      formData.append('expenseDate', data.expenseDate)
    }

    createMutation.mutate(formData)
  }

  const handleAddAnother = () => {
    setSuccess(false)
    setError(null)
    setFormKey((k) => k + 1) // Reset form state
  }

  // Success view
  if (success) {
    return (
      <div className="px-6 pt-12 pb-24">
        <div className="max-w-sm mx-auto w-full text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-heading mb-2">Expense Added!</h1>
            <p className="text-muted-foreground">Your expense has been saved successfully.</p>
          </div>
          <div className="flex flex-col gap-3 pt-4">
            <Button onClick={handleAddAnother} size="lg" className="w-full">
              Add Another Expense
            </Button>
            <Button variant="outline" onClick={() => navigate({ to: '/' })} size="lg" className="w-full">
              Go to Dashboard
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Add Expense</h1>
          <p className="text-muted-foreground">Upload a receipt and enter expense details</p>
        </div>

        <ExpenseForm
          key={formKey}
          mode="create"
          users={users}
          defaultUserId={users?.[0]?.id}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          error={error}
        />
      </div>
    </div>
  )
}
