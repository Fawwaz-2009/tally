import { useMemo } from 'react'

import { percentage as calcPercentage, sum } from '@repo/isomorphic/money'
import type { DateRange } from '@/lib/date-utils'
import { getDateRangeBounds } from '@/lib/date-utils'

interface User {
  id: string
  name: string
}

// Expense data from list() query (includes merchant info)
interface ExpenseWithMerchant {
  id: string
  userId: string
  merchantId: string
  baseAmount: number
  expenseDate: Date
  merchantName: string
  category: string | null
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

export function useAnalytics(expenses: ExpenseWithMerchant[] | undefined, users: User[] | undefined, dateRange: DateRange): Analytics | null {
  return useMemo(() => {
    if (!expenses || expenses.length === 0) return null

    // Filter by date range
    let filteredExpenses = [...expenses]

    const bounds = getDateRangeBounds(dateRange)
    if (bounds) {
      filteredExpenses = filteredExpenses.filter((expense) => {
        const dateToCheck = new Date(expense.expenseDate)
        return dateToCheck >= bounds.start && dateToCheck <= bounds.end
      })
    }

    if (filteredExpenses.length === 0) return null

    const getBaseAmount = (e: ExpenseWithMerchant) => e.baseAmount

    // Calculate total using money utility for precision
    const totalSpending = sum(filteredExpenses.map(getBaseAmount))

    const userMap = new Map(users?.map((u) => [u.id, u.name]) || [])

    // Category breakdown - simplified, single category per expense (from merchant)
    const categoryMap = new Map<string, { amount: number; count: number }>()
    filteredExpenses.forEach((e) => {
      const category = e.category ?? 'Uncategorized'
      const baseAmount = getBaseAmount(e)

      const existing = categoryMap.get(category) || { amount: 0, count: 0 }
      categoryMap.set(category, {
        amount: existing.amount + baseAmount,
        count: existing.count + 1,
      })
    })

    const categoryBreakdown = Array.from(categoryMap.entries())
      .map(([category, data]) => ({
        label: category,
        amount: data.amount,
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
      const merchant = e.merchantName || 'Unknown'
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
