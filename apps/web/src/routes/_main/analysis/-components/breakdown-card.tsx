import { Card, CardContent } from '@/components/ui/card'

import { SectionHeader } from './section-header'
import { BreakdownItem, CategoryBreakdownItem } from './breakdown-item'

// Colors for different breakdown sections
export const categoryColors = ['bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-orange-500', 'bg-pink-500', 'bg-cyan-500', 'bg-amber-500', 'bg-indigo-500']

export const userColors = ['bg-emerald-500', 'bg-teal-500', 'bg-lime-500', 'bg-green-600']

export const merchantColors = ['bg-rose-500', 'bg-red-500', 'bg-fuchsia-500', 'bg-violet-500', 'bg-pink-600']

interface CategoryBreakdownCardProps {
  icon: React.ElementType
  title: string
  subtitle?: string
  items: Array<{
    label: string
    amount: number
    count: number
    percentage: number
  }>
  currency: string
}

export function CategoryBreakdownCard({ icon, title, subtitle, items, currency }: CategoryBreakdownCardProps) {
  if (items.length === 0) return null

  const maxAmount = items[0].amount

  return (
    <Card>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <CardContent className="space-y-1">
        {items.map((item, index) => (
          <CategoryBreakdownItem
            key={item.label}
            label={item.label}
            amount={item.amount}
            count={item.count}
            percentage={item.percentage}
            maxAmount={maxAmount}
            color={categoryColors[index % categoryColors.length]}
            currency={currency}
          />
        ))}
      </CardContent>
    </Card>
  )
}

interface BreakdownCardProps {
  icon: React.ElementType
  title: string
  subtitle?: string
  items: Array<{
    label: string
    amount: number
    percentage: number
  }>
  colors: string[]
  currency: string
}

export function BreakdownCard({ icon, title, subtitle, items, colors, currency }: BreakdownCardProps) {
  if (items.length === 0) return null

  const maxAmount = items[0].amount

  return (
    <Card>
      <SectionHeader icon={icon} title={title} subtitle={subtitle} />
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <BreakdownItem
            key={item.label}
            label={item.label}
            amount={item.amount}
            percentage={item.percentage}
            maxAmount={maxAmount}
            color={colors[index % colors.length]}
            currency={currency}
          />
        ))}
      </CardContent>
    </Card>
  )
}
