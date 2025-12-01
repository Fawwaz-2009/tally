import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { CheckCircle2, Copy, Home, Loader2, Smartphone } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'

interface WaitingForExpenseProps {
  userName: string
  userId: string
}

export function WaitingForExpense({ userName, userId }: WaitingForExpenseProps) {
  const trpc = useTRPC()
  const [copied, setCopied] = useState(false)

  // Build the example API request
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : ''
  const curlCommand = `curl -X POST '${baseUrl}/api/trpc/expenses.create' \\
  -H 'Content-Type: application/json' \\
  -d '${JSON.stringify({ json: { userId, amount: 1499, currency: 'USD', merchant: 'Coffee Shop', description: 'Morning coffee' } })}'`

  // Poll for expenses
  const { data: expenses } = useQuery({
    ...trpc.expenses.getByUser.queryOptions({ userId }),
    refetchInterval: (query) => {
      // Stop polling once we have expenses
      return query.state.data && query.state.data.length > 0 ? false : 2000
    },
  })

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(curlCommand)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Show success when expense is received
  if (expenses && expenses.length > 0) {
    const expense = expenses[0]
    return (
      <div className="min-h-screen flex flex-col justify-center px-6 py-12">
        <div className="max-w-sm mx-auto w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">
            First Expense Received!
          </h1>
          <p className="text-muted-foreground mb-6">
            Your setup is complete. Tally is ready to track your expenses.
          </p>

          <div className="bg-muted/50 rounded-lg p-4 mb-8 text-left">
            <div className="text-sm text-muted-foreground mb-1">Expense received:</div>
            <div className="font-mono text-lg font-semibold">
              {expense.currency} {((expense.amount ?? 0) / 100).toFixed(2)}
            </div>
            {expense.merchant && (
              <div className="text-sm text-muted-foreground">{expense.merchant}</div>
            )}
          </div>

          <Button asChild className="w-full" size="lg">
            <Link to="/">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-muted-foreground">
            Let's add your first expense to complete setup
          </p>
        </div>

        <div className="bg-muted/50 rounded-lg p-4 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Smartphone className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium">API Request</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={copyToClipboard}
              className="h-7 px-2"
            >
              {copied ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span className="ml-1 text-xs">{copied ? 'Copied!' : 'Copy'}</span>
            </Button>
          </div>

          <pre className="text-xs bg-background rounded p-3 overflow-x-auto whitespace-pre-wrap break-all font-mono">
            {curlCommand}
          </pre>
        </div>

        <div className="flex items-center justify-center gap-3 py-6 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span className="text-sm">Waiting for your first expense...</span>
        </div>

        <div className="text-center">
          <p className="text-xs text-muted-foreground mb-4">
            Run the command above in your terminal, or set up an iOS Shortcut to send the request.
          </p>
          <Button variant="ghost" size="sm" asChild>
            <Link to="/">Skip for now</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}
