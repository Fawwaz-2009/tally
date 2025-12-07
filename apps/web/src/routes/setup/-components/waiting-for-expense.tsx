import { Link } from '@tanstack/react-router'

import { Button } from '@/components/ui/button'
import { ExpenseCapture } from '@/components/expense/expense-capture'

interface WaitingForExpenseProps {
  userName: string
  userId: string
}

export function WaitingForExpense({ userName, userId }: WaitingForExpenseProps) {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Welcome, {userName}!</h1>
          <p className="text-muted-foreground">Upload a screenshot of a payment to complete setup</p>
        </div>

        <ExpenseCapture userId={userId} />

        <div className="text-center mt-6">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Skip for now</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
