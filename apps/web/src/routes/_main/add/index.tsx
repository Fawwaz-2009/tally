import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'

import { useTRPC } from '@/integrations/trpc-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ReviewStage, SuccessStage, UploadStage } from '@/components/expense/capture-flow'

// Search params schema
const searchSchema = z.object({
  stage: z.enum(['review', 'success']).optional(),
  id: z.string().optional(),
})

type SearchParams = z.infer<typeof searchSchema>

export const Route = createFileRoute('/_main/add/')({
  component: AddExpense,
  validateSearch: (search): SearchParams => {
    const result = searchSchema.safeParse(search)
    if (!result.success) {
      return {}
    }
    // Require id when stage is set
    if (result.data.stage && !result.data.id) {
      return {}
    }
    return result.data
  },
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(context.trpc.users.list.queryOptions())
  },
})

function AddExpense() {
  const trpc = useTRPC()
  const navigate = useNavigate({ from: Route.fullPath })
  const search = Route.useSearch()

  const { data: users } = useQuery(trpc.users.list.queryOptions())
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Set default user when users load
  if (users && users.length > 0 && !selectedUserId) {
    setSelectedUserId(users[0].id)
  }

  // Navigation handlers
  const goToReview = (expenseId: string) => {
    navigate({ search: { stage: 'review', id: expenseId }, replace: true })
  }

  const goToSuccess = (expenseId: string) => {
    navigate({ search: { stage: 'success', id: expenseId }, replace: true })
  }

  const reset = () => {
    navigate({ search: {}, replace: true })
  }

  const handleUploadComplete = (expenseId: string, needsReview: boolean) => {
    if (needsReview) {
      goToReview(expenseId)
    } else {
      goToSuccess(expenseId)
    }
  }

  // Render based on stage
  const renderStage = () => {
    if (search.stage === 'review' && search.id) {
      return <ReviewStage expenseId={search.id} onComplete={goToSuccess} onBack={reset} />
    }

    if (search.stage === 'success' && search.id) {
      return <SuccessStage expenseId={search.id} onAddAnother={reset} />
    }

    // Default: Upload stage
    return (
      <>
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Capture Receipt</h1>
          <p className="text-muted-foreground">Upload a screenshot of a payment to extract expense details</p>
        </div>

        {/* User selector - only show if multiple users */}
        {users && users.length > 1 && (
          <div className="mb-4 space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {users.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <UploadStage userId={selectedUserId} onComplete={handleUploadComplete} />
      </>
    )
  }

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full">{renderStage()}</div>
    </div>
  )
}
