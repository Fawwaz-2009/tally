import { createFileRoute } from '@tanstack/react-router'
import { useMutation, useQuery } from '@tanstack/react-query'
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'
import { useTRPC } from '@/integrations/trpc-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldError,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { Loader2, Plus } from 'lucide-react'

export const Route = createFileRoute('/_authenticated/trpc-todo')({
  component: TRPCTodos,
  loader: async ({ context }) => {
    await context.queryClient.prefetchQuery(
      context.trpc.todos.list.queryOptions(),
    )
  },
})

const formSchema = z.object({
  name: z
    .string()
    .min(3, 'Todo must be at least 3 characters.')
    .max(100, 'Todo must be at most 100 characters.'),
})

function TRPCTodos() {
  const trpc = useTRPC()
  const { data, refetch, error, isError, isLoading } = useQuery(
    trpc.todos.list.queryOptions(),
  )

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
    },
  })

  const { mutate: addTodo, isPending } = useMutation({
    ...trpc.todos.add.mutationOptions(),
    onSuccess: () => {
      refetch()
      form.reset()
    },
  })

  function onSubmit(data: z.infer<typeof formSchema>) {
    addTodo({ name: data.name })
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
            <CardDescription>{error?.message}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="text-2xl">Todo List</CardTitle>
          <CardDescription>
            Manage your todos with tRPC and TanStack Query
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            id="todo-form"
            onSubmit={form.handleSubmit(onSubmit)}
            className="mb-6"
          >
            <FieldGroup>
              <Controller
                name="name"
                control={form.control}
                render={({ field, fieldState }) => (
                  <Field
                    orientation="horizontal"
                    data-invalid={fieldState.invalid}
                    className="items-center gap-3"
                  >
                    <div className="flex-1">
                      <FieldLabel htmlFor="todo-name">New Todo</FieldLabel>
                      <Input
                        {...field}
                        id="todo-name"
                        aria-invalid={fieldState.invalid}
                        placeholder="Enter a new todo..."
                        disabled={isPending}
                        autoComplete="off"
                      />
                      <FieldDescription>
                        Add a task to your todo list (3-100 characters)
                      </FieldDescription>
                      {fieldState.invalid && (
                        <FieldError errors={[fieldState.error]} />
                      )}
                    </div>
                    <Button type="submit" disabled={isPending} className="h-10">
                      {isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Adding...
                        </>
                      ) : (
                        <>
                          <Plus className="mr-2 h-4 w-4" />
                          Add
                        </>
                      )}
                    </Button>
                  </Field>
                )}
              />
            </FieldGroup>
          </form>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
            </div>
          ) : (
            <ul className="space-y-2">
              {data?.length === 0 ? (
                <li className="text-center py-8 text-gray-500">
                  No todos yet. Add one to get started!
                </li>
              ) : (
                data?.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-4 bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <span className="flex-1 text-gray-900">{t.name}</span>
                  </li>
                ))
              )}
            </ul>
          )}
        </CardContent>
        <CardFooter className="border-t pt-6">
          <p className="text-sm text-gray-500">
            Total todos: {data?.length ?? 0}
          </p>
        </CardFooter>
      </Card>
    </div>
  )
}
