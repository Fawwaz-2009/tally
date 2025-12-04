import { Search, X } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { DateRange } from '@/components/expense'

export interface DashboardFilters {
  dateRange: DateRange
  userId?: string
  category?: string
  search?: string
}

interface FilterControlsProps {
  filters: DashboardFilters
  users: Array<{ id: string; name: string }> | undefined
  categories: string[]
  onFilterChange: (
    key: keyof DashboardFilters,
    value: string | undefined,
  ) => void
  onClearFilters: () => void
  hasActiveFilters: boolean
}

export function FilterControls({
  filters,
  users,
  categories,
  onFilterChange,
  onClearFilters,
  hasActiveFilters,
}: FilterControlsProps) {
  return (
    <div className="mb-6 space-y-3">
      <div className="flex flex-wrap gap-2">
        <Select
          value={filters.dateRange}
          onValueChange={(value) =>
            onFilterChange('dateRange', value as DateRange)
          }
        >
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue placeholder="Date range" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="last-7-days">Last 7 days</SelectItem>
            <SelectItem value="this-month">This month</SelectItem>
            <SelectItem value="last-month">Last month</SelectItem>
            <SelectItem value="all-time">All time</SelectItem>
          </SelectContent>
        </Select>

        <Select
          value={filters.userId || 'all'}
          onValueChange={(value) =>
            onFilterChange('userId', value === 'all' ? undefined : value)
          }
        >
          <SelectTrigger className="w-[140px]" size="sm">
            <SelectValue placeholder="All users" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All users</SelectItem>
            {users?.map((user) => (
              <SelectItem key={user.id} value={user.id}>
                {user.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {categories.length > 0 && (
          <Select
            value={filters.category || 'all'}
            onValueChange={(value) =>
              onFilterChange('category', value === 'all' ? undefined : value)
            }
          >
            <SelectTrigger className="w-[160px]" size="sm">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category} value={category}>
                  {category}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearFilters}
            className="h-8"
          >
            <X className="w-3 h-3 mr-1" />
            Clear
          </Button>
        )}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search by merchant..."
          value={filters.search || ''}
          onChange={(e) =>
            onFilterChange('search', e.target.value || undefined)
          }
          className="pl-9 h-9"
        />
      </div>
    </div>
  )
}
