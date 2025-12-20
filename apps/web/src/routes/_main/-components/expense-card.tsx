import { format } from 'date-fns'
import { motion } from 'motion/react'

import { AmountDisplay } from '@/components/expense/amount-display'

// Expense data from list() query (includes merchant info)
export interface ExpenseCardData {
  id: string
  userId: string
  merchantId: string
  imageKey: string
  amount: number
  currency: string
  baseAmount: number
  baseCurrency: string
  description: string | null
  expenseDate: Date
  createdAt: Date
  merchantName: string
  category: string | null
}

interface ExpenseCardProps {
  expense: ExpenseCardData
  baseCurrency: string
  onClick?: () => void
  index?: number
  userName?: string
}

export function ExpenseCard({ expense, baseCurrency, onClick, index = 0, userName }: ExpenseCardProps) {
  const isDifferentCurrency = expense.currency !== baseCurrency

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05, duration: 0.3 }}
      onClick={onClick}
      className="group relative bg-card text-card-foreground p-4 transition-all active:scale-[0.98] cursor-pointer"
    >
      {/* Receipt jagged edge effect - bottom */}
      <div
        className="absolute -bottom-1 left-0 right-0 h-2 bg-card z-10"
        style={{
          maskImage: 'conic-gradient(from 135deg at top, transparent 90deg, black 0)',
          maskSize: '12px 10px',
          WebkitMaskImage: 'conic-gradient(from 135deg at top, transparent 90deg, black 0)',
          WebkitMaskSize: '12px 10px',
          maskPosition: 'bottom',
          WebkitMaskPosition: 'bottom',
          maskRepeat: 'repeat-x',
          WebkitMaskRepeat: 'repeat-x',
        }}
      />

      {/* Main Content */}
      <div className="flex justify-between items-start gap-3">
        {/* Left: Date & Merchant */}
        <div className="flex flex-col gap-1 min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">
              {format(new Date(expense.expenseDate), 'MMM dd • HH:mm')}
            </span>
          </div>

          <h3 className="text-lg font-bold leading-tight tracking-tight uppercase line-clamp-1">{expense.merchantName}</h3>

          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {userName && (
              <div className="flex items-center gap-1.5 bg-muted rounded-full pr-2 pl-1.5 py-0.5">
                <span className="text-[10px] font-medium text-muted-foreground uppercase">{userName}</span>
              </div>
            )}

            {expense.category && (
              <span className="text-[10px] font-mono text-muted-foreground uppercase">
                #{expense.category}
              </span>
            )}
          </div>
        </div>

        {/* Right: Amount */}
        <div className="text-right shrink-0 max-w-[45%]">
          <AmountDisplay amount={expense.baseAmount} currency={baseCurrency} size="md" />
          {isDifferentCurrency && (
            <div className="text-[10px] text-muted-foreground font-mono mt-0.5">
              <AmountDisplay amount={expense.amount} currency={expense.currency} size="sm" className="text-muted-foreground" />
            </div>
          )}
        </div>
      </div>

      {/* Decorative Dashed Line */}
      <div className="absolute bottom-0 left-2 right-2 border-b border-dashed border-border" />
    </motion.div>
  )
}
