import { useState } from 'react'
import { Check, ChevronsUpDown, Plus } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'

import { cn } from '@/lib/utils'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

interface MerchantPickerProps {
  value: string
  onChange: (value: string) => void
  className?: string
}

export function MerchantPicker({ value, onChange, className }: MerchantPickerProps) {
  const trpc = useTRPC()
  const [open, setOpen] = useState(false)
  const [inputValue, setInputValue] = useState('')

  const { data: merchants = [] } = useQuery(trpc.merchants.list.queryOptions())

  // Find the selected merchant to show category badge
  const selectedMerchant = merchants.find((m) => m.displayName.toLowerCase() === value.toLowerCase())

  // Filter merchants based on input
  const filteredMerchants = inputValue
    ? merchants.filter((m) => m.displayName.toLowerCase().includes(inputValue.toLowerCase()))
    : merchants

  // Check if the current input is a new merchant (not in the list)
  const isNewMerchant = inputValue.trim() !== '' && !merchants.some((m) => m.displayName.toLowerCase() === inputValue.toLowerCase())

  const handleSelect = (merchantName: string) => {
    onChange(merchantName)
    setOpen(false)
    setInputValue('')
  }

  const handleCreateNew = () => {
    onChange(inputValue.trim())
    setOpen(false)
    setInputValue('')
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" aria-expanded={open} className={cn('w-full justify-between font-normal', className)}>
          <span className="flex items-center gap-2 truncate">
            {value || 'Select merchant...'}
            {selectedMerchant?.category && (
              <Badge variant="secondary" className="text-xs">
                {selectedMerchant.category}
              </Badge>
            )}
          </span>
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[280px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search or add merchant..." value={inputValue} onValueChange={setInputValue} />
          <CommandList>
            <CommandEmpty>
              {inputValue.trim() ? (
                <button
                  type="button"
                  onClick={handleCreateNew}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Add "{inputValue.trim()}"
                </button>
              ) : (
                'No merchants found.'
              )}
            </CommandEmpty>
            {isNewMerchant && filteredMerchants.length > 0 && (
              <CommandGroup heading="Create new">
                <CommandItem onSelect={handleCreateNew} className="cursor-pointer">
                  <Plus className="mr-2 h-4 w-4" />
                  Add "{inputValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
            <CommandGroup heading={filteredMerchants.length > 0 ? 'Recent merchants' : undefined}>
              {filteredMerchants.map((merchant) => (
                <CommandItem
                  key={merchant.id}
                  value={merchant.displayName}
                  onSelect={() => handleSelect(merchant.displayName)}
                  className="cursor-pointer"
                >
                  <Check className={cn('mr-2 h-4 w-4', value.toLowerCase() === merchant.displayName.toLowerCase() ? 'opacity-100' : 'opacity-0')} />
                  <span className="flex-1 truncate">{merchant.displayName}</span>
                  {merchant.category && (
                    <Badge variant="outline" className="text-xs ml-2">
                      {merchant.category}
                    </Badge>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
