import type { Expense } from '@repo/data-ops/schemas'
import { formatAmount, isConfirmed } from '@/lib/expense-utils'

interface ExpenseMetadataProps {
  expense: Expense
}

export function ExpenseMetadata({ expense }: ExpenseMetadataProps) {
  // Only confirmed expenses have baseAmount/baseCurrency
  const showConversion = isConfirmed(expense) && expense.currency !== expense.baseCurrency

  return (
    <div className="mt-8 pt-6 border-t">
      <h3 className="text-sm font-medium text-muted-foreground mb-3">Details</h3>
      <dl className="space-y-2 text-sm">
        {showConversion && isConfirmed(expense) && (
          <>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Original Amount</dt>
              <dd className="font-mono tabular-nums">{formatAmount(expense.amount, expense.currency)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Base Amount</dt>
              <dd className="font-mono tabular-nums font-medium">{formatAmount(expense.baseAmount, expense.baseCurrency)}</dd>
            </div>
          </>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">Created</dt>
          <dd>
            {new Date(expense.createdAt).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
          </dd>
        </div>
        {isConfirmed(expense) && (
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Confirmed</dt>
            <dd>
              {new Date(expense.confirmedAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </dd>
          </div>
        )}
        <div className="flex justify-between">
          <dt className="text-muted-foreground">ID</dt>
          <dd className="font-mono text-xs">{expense.id}</dd>
        </div>
      </dl>
    </div>
  )
}
