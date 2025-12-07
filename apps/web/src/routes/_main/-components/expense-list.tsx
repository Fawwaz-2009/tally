import { useState } from 'react'
import { AnimatePresence } from 'motion/react'

import { Button } from '@/components/ui/button'
import { EmptyState, LoadingState, ErrorState } from '@/components/expense'

import { ExpenseCard, type ExpenseCardData } from './expense-card'
import { ExpenseDrawer } from './expense-drawer'

interface User {
  id: string
  name: string
}

interface ExpenseListProps {
  expenses: ExpenseCardData[]
  baseCurrency: string
  users?: User[]
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function ExpenseList({ expenses, baseCurrency, users, isLoading, isError, errorMessage, hasActiveFilters, onClearFilters }: ExpenseListProps) {
  const [selectedExpense, setSelectedExpense] = useState<ExpenseCardData | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const handleExpenseClick = (expense: ExpenseCardData) => {
    setSelectedExpense(expense)
    setDrawerOpen(true)
  }

  const getUserName = (userId: string | null): string | undefined => {
    if (!userId || !users) return undefined
    return users.find((u) => u.id === userId)?.name
  }

  return (
    <div className="px-4">
      <div className="px-2 py-2 text-xs font-mono text-muted-foreground uppercase tracking-widest">
        {hasActiveFilters ? 'Filtered Expenses' : 'Recent Activity'}
        {!isLoading && expenses.length > 0 && <span className="ml-2">({expenses.length})</span>}
      </div>

      {isLoading ? (
        <LoadingState />
      ) : isError ? (
        <ErrorState message={errorMessage || 'Unknown error'} />
      ) : expenses.length === 0 ? (
        hasActiveFilters ? (
          <div className="text-center py-12 text-muted-foreground">
            <p className="text-lg mb-2">No matching expenses</p>
            <p className="text-sm mb-4">Try adjusting your filters</p>
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              Clear filters
            </Button>
          </div>
        ) : (
          <EmptyState title="No expenses yet" description="Add your first expense to get started!" action={{ label: 'Add Expense', to: '/add' }} />
        )
      ) : (
        <div className="space-y-1 pb-4">
          <AnimatePresence mode="popLayout">
            {expenses.map((expense, index) => (
              <ExpenseCard
                key={expense.id}
                expense={expense}
                baseCurrency={baseCurrency}
                onClick={() => handleExpenseClick(expense)}
                index={index}
                userName={getUserName(expense.userId)}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      <ExpenseDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        expense={selectedExpense}
        baseCurrency={baseCurrency}
        userName={selectedExpense ? getUserName(selectedExpense.userId) : undefined}
      />
    </div>
  )
}
