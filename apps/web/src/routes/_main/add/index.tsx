import { useState } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ExpenseCapture } from '@/components/expense/expense-capture'

export const Route = createFileRoute('/_main/add/')({ component: AddExpense })

function AddExpense() {
  const trpc = useTRPC()
  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const [selectedUserId, setSelectedUserId] = useState<string>('')

  // Set default user when users load
  if (usersQuery.data && usersQuery.data.length > 0 && !selectedUserId) {
    setSelectedUserId(usersQuery.data[0].id)
  }

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Capture Receipt</h1>
          <p className="text-muted-foreground">Upload a screenshot of a payment to extract expense details</p>
        </div>

        {/* User selector - only show if multiple users */}
        {usersQuery.data && usersQuery.data.length > 1 && (
          <div className="mb-4 space-y-2">
            <Label>User</Label>
            <Select value={selectedUserId} onValueChange={setSelectedUserId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select user" />
              </SelectTrigger>
              <SelectContent>
                {usersQuery.data.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <ExpenseCapture userId={selectedUserId} showAddAnother />
      </div>
    </div>
  )
}
