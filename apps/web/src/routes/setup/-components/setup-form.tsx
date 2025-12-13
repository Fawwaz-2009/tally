import { useNavigate } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { effectTsResolver } from '@hookform/resolvers/effect-ts'
import { Schema } from 'effect'
import { useMutation } from '@tanstack/react-query'

import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { CurrencyPicker } from '@/components/expense/currency-picker'

const setupFormSchema = Schema.Struct({
  name: Schema.String.pipe(Schema.minLength(1, { message: () => 'Name is required' }), Schema.maxLength(100)),
  currency: Schema.String.pipe(Schema.length(3, { message: () => 'Please select a currency' })),
})

type SetupFormValues = Schema.Schema.Type<typeof setupFormSchema>

export function SetupForm() {
  const trpc = useTRPC()
  const navigate = useNavigate()

  const form = useForm<SetupFormValues>({
    resolver: effectTsResolver(setupFormSchema),
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
                  <FormControl>
                    <CurrencyPicker value={field.value} onChange={field.onChange} />
                  </FormControl>
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
