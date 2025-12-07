import { useMemo } from 'react'

import { getDateRangeBounds, type DateRange } from '@/lib/date-utils'

interface Expense {
  id: string
  userId: string
  state: 'draft' | 'complete'
  amount: number | null
  baseAmount: number | null
  merchant: string | null
  categories: string[] | null
  receiptCapturedAt: Date
  expenseDate: Date | null
}

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

    let filteredExpenses = expenses.filter((e) => e.state === 'complete' && (e.baseAmount !== null || e.amount !== null))

    const bounds = getDateRangeBounds(dateRange)
    if (bounds) {
      filteredExpenses = filteredExpenses.filter((expense) => {
        const dateToCheck = new Date(expense.expenseDate || expense.receiptCapturedAt)
        return dateToCheck >= bounds.start && dateToCheck <= bounds.end
      })
    }

    if (filteredExpenses.length === 0) return null

    const getBaseAmount = (e: Expense) => e.baseAmount ?? e.amount ?? 0

    const totalSpending = filteredExpenses.reduce((sum, e) => sum + getBaseAmount(e), 0)

    const userMap = new Map(users?.map((u) => [u.id, u.name]) || [])

    // Category breakdown
    const categoryMap = new Map<string, { amount: number; count: number }>()
    filteredExpenses.forEach((e) => {
      const categories = e.categories || ['Uncategorized']
      const amountPerCategory = getBaseAmount(e) / categories.length
      categories.forEach((cat) => {
        const existing = categoryMap.get(cat) || { amount: 0, count: 0 }
        categoryMap.set(cat, {
          amount: existing.amount + amountPerCategory,
          count: existing.count + 1,
        })
      })
    })
    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        label: category,
        amount: Math.round(data.amount),
        count: data.count,
        percentage: Math.round((data.amount / totalSpending) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8)

    // User breakdown
    const userAmountMap = new Map<string, number>()
    filteredExpenses.forEach((e) => {
      userAmountMap.set(e.userId, (userAmountMap.get(e.userId) || 0) + getBaseAmount(e))
    })
    const userBreakdown = Array.from(userAmountMap.entries())
      .map(([userId, amount]) => ({
        label: userMap.get(userId) || userId,
        amount,
        percentage: Math.round((amount / totalSpending) * 100),
      }))
      .sort((a, b) => b.amount - a.amount)

    // Merchant breakdown
    const merchantMap = new Map<string, number>()
    filteredExpenses.forEach((e) => {
      const merchant = e.merchant || 'Unknown'
      merchantMap.set(merchant, (merchantMap.get(merchant) || 0) + getBaseAmount(e))
    })
    const merchantBreakdown = Array.from(merchantMap.entries())
      .map(([merchant, amount]) => ({
        label: merchant,
        amount,
        percentage: Math.round((amount / totalSpending) * 100),
      }))
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
