import { Button } from '@/components/ui/button'
import { EmptyState, LoadingState, ErrorState } from '@/components/expense'

import { ExpenseRow } from './expense-row'

interface Expense {
  id: string
  status: string
  amount: number | null
  currency: string | null
  baseAmount: number | null
  baseCurrency: string | null
  merchant: string | null
  createdAt: Date
  expenseDate: Date | null
}

interface ExpenseListProps {
  expenses: Expense[]
  baseCurrency: string
  isLoading: boolean
  isError: boolean
  errorMessage?: string
  hasActiveFilters: boolean
  onClearFilters: () => void
}

export function ExpenseList({
  expenses,
  baseCurrency,
  isLoading,
  isError,
  errorMessage,
  hasActiveFilters,
  onClearFilters,
}: ExpenseListProps) {
  return (
    <div>
      <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide mb-4">
        {hasActiveFilters ? 'Filtered Expenses' : 'Recent Expenses'}
        {!isLoading && expenses.length > 0 && (
          <span className="ml-2 text-xs">({expenses.length})</span>
        )}
      </h2>

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
          <EmptyState
            title="No expenses yet"
            description="Add your first expense to get started!"
            action={{ label: 'Add Expense', to: '/add' }}
          />
        )
      ) : (
        <div className="divide-y divide-border/50">
          {expenses.map((expense) => (
            <ExpenseRow
              key={expense.id}
              expense={expense}
              baseCurrency={baseCurrency}
            />
          ))}
        </div>
      )}
    </div>
  )
}
