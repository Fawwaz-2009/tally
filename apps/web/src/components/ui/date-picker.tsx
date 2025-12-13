import * as React from 'react'
import { format, parse } from 'date-fns'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Input } from '@/components/ui/input'

interface DatePickerProps {
  /** Value as Date object or YYYY-MM-DD string */
  value: Date | string | undefined
  /** Called with YYYY-MM-DD string (for form compatibility) */
  onChange: (date: string) => void
  placeholder?: string
  className?: string
  disabled?: boolean
}

/**
 * Responsive date picker component.
 * - Desktop: Uses shadcn Calendar with Popover
 * - Mobile: Uses native date input for better UX
 *
 * Accepts Date or string, always returns YYYY-MM-DD string for form compatibility.
 */
export function DatePicker({ value, onChange, placeholder = 'Pick a date', className, disabled }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  // Convert value to Date for calendar display
  const dateValue = React.useMemo(() => {
    if (!value) return undefined
    if (value instanceof Date) return value
    // Parse YYYY-MM-DD string
    try {
      return parse(value, 'yyyy-MM-dd', new Date())
    } catch {
      return undefined
    }
  }, [value])

  // Format date for native input (YYYY-MM-DD)
  const nativeValue = dateValue ? format(dateValue, 'yyyy-MM-dd') : ''

  const handleNativeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value)
  }

  const handleCalendarSelect = (date: Date | undefined) => {
    onChange(date ? format(date, 'yyyy-MM-dd') : '')
    setOpen(false)
  }

  return (
    <>
      {/* Mobile: Native date input */}
      <Input
        type="date"
        value={nativeValue}
        onChange={handleNativeChange}
        disabled={disabled}
        className={cn('md:hidden', className)}
      />

      {/* Desktop: Popover with Calendar */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            disabled={disabled}
            className={cn('hidden md:flex w-full justify-start text-left font-normal', !dateValue && 'text-muted-foreground', className)}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {dateValue ? format(dateValue, 'PPP') : <span>{placeholder}</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <Calendar mode="single" selected={dateValue} onSelect={handleCalendarSelect} initialFocus />
        </PopoverContent>
      </Popover>
    </>
  )
}
