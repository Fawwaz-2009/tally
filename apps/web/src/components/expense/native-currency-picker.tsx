import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'
import { getCurrencyOptions } from '@/lib/expense-utils'
import { useTRPC } from '@/integrations/trpc-react'

const allCurrencies = getCurrencyOptions()

interface NativeCurrencyPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Mobile-optimized currency picker using native <select>.
 * Currencies are sorted: recently used (last 3 months) first, then alphabetically.
 */
export function NativeCurrencyPicker({ value, onChange, className }: NativeCurrencyPickerProps) {
  const trpc = useTRPC()

  // Fetch recently used currencies
  const { data: recentCurrenciesData } = useQuery(trpc.expenses.getRecentCurrencies.queryOptions())
  const recentCurrencies: string[] = recentCurrenciesData ?? []

  // Build sorted currency list: recent first, then alphabetical
  const sortedCurrencies = useMemo(() => {
    const recentSet = new Set<string>(recentCurrencies)

    // Separate into recent and other
    const others = allCurrencies.filter((c) => !recentSet.has(c.value))

    // Sort recent by usage order (from API), others alphabetically
    const recentSorted = recentCurrencies
      .map((code: string) => allCurrencies.find((c) => c.value === code))
      .filter((c): c is (typeof allCurrencies)[number] => c !== undefined)

    const othersSorted = others.sort((a, b) => a.label.localeCompare(b.label))

    return { recent: recentSorted, others: othersSorted }
  }, [recentCurrencies])

  return (
    <div className={cn('relative', className)}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'w-full h-full appearance-none bg-background border border-input rounded-md px-3 pr-8',
          'text-base font-medium cursor-pointer',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50'
        )}
      >
        {/* Recent currencies section */}
        {sortedCurrencies.recent.length > 0 && (
          <optgroup label="Recent">
            {sortedCurrencies.recent.map((currency) => (
              <option key={currency.value} value={currency.value}>
                {currency.label}
              </option>
            ))}
          </optgroup>
        )}

        {/* All other currencies */}
        <optgroup label={sortedCurrencies.recent.length > 0 ? 'All Currencies' : 'Currencies'}>
          {sortedCurrencies.others.map((currency) => (
            <option key={currency.value} value={currency.value}>
              {currency.label}
            </option>
          ))}
        </optgroup>
      </select>

      {/* Custom dropdown arrow */}
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <ChevronDown className="h-4 w-4 text-muted-foreground" />
      </div>
    </div>
  )
}
