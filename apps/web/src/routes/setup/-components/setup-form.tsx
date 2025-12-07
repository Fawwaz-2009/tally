import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import cc from 'currency-codes'
import { useMutation } from '@tanstack/react-query'
import { Check, ChevronsUpDown } from 'lucide-react'
import { cn } from '@/lib/utils'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command'

const setupFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  currency: z.string().length(3, 'Please select a currency'),
})

type SetupFormValues = z.infer<typeof setupFormSchema>

// Get all currencies with their details
const currencies = cc.codes().map((code) => {
  const info = cc.code(code)
  return {
    value: code,
    label: `${code} - ${info?.currency ?? code}`,
  }
})

export function SetupForm() {
  const trpc = useTRPC()
  const navigate = useNavigate()

  const form = useForm<SetupFormValues>({
    resolver: zodResolver(setupFormSchema),
    defaultValues: {
      name: '',
      currency: '',
    },
  })

  const completeSetup = useMutation(
    trpc.settings.completeSetup.mutationOptions({
      onSuccess: (result) => {
        navigate({
          to: '/setup',
          search: {
            completed: true,
            userId: result.userId,
            userName: form.getValues('name'),
          },
        })
      },
    }),
  )

  const onSubmit = (values: SetupFormValues) => {
    completeSetup.mutate({
      userName: values.name,
      currency: values.currency,
    })
  }

  const isSubmitting = completeSetup.isPending

  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight font-heading mb-2">Welcome to Tally</h1>
          <p className="text-muted-foreground">Let's get you set up in just a moment</p>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Your Name</FormLabel>
                  <FormControl>
                    <Input placeholder="John" autoComplete="given-name" autoFocus {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="currency"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Base Currency</FormLabel>
                  <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button variant="outline" role="combobox" className={cn('w-full justify-between', !field.value && 'text-muted-foreground')}>
                          {field.value ? currencies.find((c) => c.value === field.value)?.label : 'Search currencies...'}
                          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-full p-0" align="start">
                      <Command
                        filter={(value, search) => {
                          // Case-insensitive search that prioritizes currency code matches
                          const searchLower = search.toLowerCase()
                          const valueLower = value.toLowerCase()

                          // Check if the currency code (first 3 chars) starts with search
                          const codeMatch = valueLower.slice(0, 3).startsWith(searchLower)
                          if (codeMatch) return 1

                          // Fall back to checking if search appears anywhere in value
                          if (valueLower.includes(searchLower)) return 0.5

                          return 0
                        }}
                      >
                        <CommandInput placeholder="Search currency..." />
                        <CommandList>
                          <CommandEmpty>No currency found.</CommandEmpty>
                          <CommandGroup>
                            {currencies.map((currency) => (
                              <CommandItem
                                key={currency.value}
                                value={currency.label}
                                onSelect={() => {
                                  field.onChange(currency.value)
                                }}
                              >
                                <Check className={cn('mr-2 h-4 w-4', field.value === currency.value ? 'opacity-100' : 'opacity-0')} />
                                {currency.label}
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
              {isSubmitting ? 'Setting up...' : 'Get Started'}
            </Button>
          </form>
        </Form>
      </div>
    </div>
  )
}
