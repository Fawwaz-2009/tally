import { useMemo } from 'react'

import { allocateEvenly, percentage as calcPercentage, sum } from '@repo/isomorphic/money'
import type { ConfirmedExpense, Expense } from '@repo/data-ops/schemas'
import type { DateRange } from '@/lib/date-utils'
import { getDateRangeBounds } from '@/lib/date-utils'

interface User {
  id: string
  name: string
}

interface Analytics {
  totalSpending: number
  expenseCount: number
  categoryBreakdown: Array<{
    label: string
    amount: number
    count: number
    percentage: number
  }>
  userBreakdown: Array<{
    label: string
    amount: number
    percentage: number
  }>
  merchantBreakdown: Array<{
    label: string
    amount: number
    percentage: number
  }>
}

export function useAnalytics(expenses: Expense[] | undefined, users: User[] | undefined, dateRange: DateRange): Analytics | null {
  return useMemo(() => {
    if (!expenses) return null

    // Filter to only confirmed expenses (they have all required fields)
    let filteredExpenses = expenses.filter((e): e is ConfirmedExpense => e.state === 'confirmed')

    const bounds = getDateRangeBounds(dateRange)
    if (bounds) {
      filteredExpenses = filteredExpenses.filter((expense) => {
        const dateToCheck = new Date(expense.expenseDate)
        return dateToCheck >= bounds.start && dateToCheck <= bounds.end
      })
    }

    if (filteredExpenses.length === 0) return null

    const getBaseAmount = (e: ConfirmedExpense) => e.baseAmount

    // Calculate total using money utility for precision
    const totalSpending = sum(filteredExpenses.map(getBaseAmount))

    const userMap = new Map(users?.map((u) => [u.id, u.name]) || [])

    // Category breakdown - use allocateEvenly to prevent losing cents
    const categoryMap = new Map<string, { amount: number; count: number }>()
    filteredExpenses.forEach((e) => {
      const categories = e.categories.length > 0 ? e.categories : ['Uncategorized']
      const baseAmount = getBaseAmount(e)

      // Allocate evenly across categories, preserving total
      const allocations = allocateEvenly(baseAmount, categories.length)

      categories.forEach((cat: string, index: number) => {
        const existing = categoryMap.get(cat) || { amount: 0, count: 0 }
        categoryMap.set(cat, {
          amount: existing.amount + allocations[index],
          count: existing.count + 1,
        })
      })
    })

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        label: category,
        amount: data.amount, // Already properly allocated, no rounding needed
        count: data.count,
        percentage: Math.round(calcPercentage(data.amount, totalSpending)),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    // User breakdown
    const userAmountMap = new Map<string, number[]>()
    filteredExpenses.forEach((e) => {
      const existing = userAmountMap.get(e.userId) || []
      existing.push(getBaseAmount(e))
      userAmountMap.set(e.userId, existing)
    })

    const userBreakdown = Array.from(userAmountMap.entries())
      .map(([userId, amounts]) => {
        const amount = sum(amounts)
        return {
          label: userMap.get(userId) || userId,
          amount,
          percentage: Math.round(calcPercentage(amount, totalSpending)),
        }
      })
      .sort((a, b) => b.amount - a.amount)

    // Merchant breakdown
    const merchantAmountMap = new Map<string, number[]>()
    filteredExpenses.forEach((e) => {
      const merchant = e.merchant || 'Unknown'
      const existing = merchantAmountMap.get(merchant) || []
      existing.push(getBaseAmount(e))
      merchantAmountMap.set(merchant, existing)
    })

    const merchantBreakdown = Array.from(merchantAmountMap.entries())
      .map(([merchant, amounts]) => {
        const amount = sum(amounts)
        return {
          label: merchant,
          amount,
          percentage: Math.round(calcPercentage(amount, totalSpending)),
        }
      })
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    return {
      totalSpending,
      expenseCount: filteredExpenses.length,
      categoryBreakdown,
      userBreakdown,
      merchantBreakdown,
    }
  }, [expenses, users, dateRange])
}
