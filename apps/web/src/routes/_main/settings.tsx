import { useState, useMemo } from 'react'
import { createFileRoute } from '@tanstack/react-router'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Users, Plus, Copy, Check, ExternalLink, Download, FileJson, FileSpreadsheet, Tag, Sun, Moon, Monitor } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { useTheme } from '@/components/theme-provider'
import { PageHeader } from '@/components/layout/page-header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export const Route = createFileRoute('/_main/settings')({ component: Settings })

const addUserFormSchema = z.object({
  id: z
    .string()
    .min(1, 'ID is required')
    .max(50)
    .regex(/^[a-z0-9-]+$/, 'ID must be lowercase alphanumeric with hyphens only'),
  name: z.string().min(1, 'Name is required').max(100),
})

type AddUserFormValues = z.infer<typeof addUserFormSchema>

type ExportFormat = 'csv' | 'json'

function Settings() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const { theme, setTheme } = useTheme()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const usersQuery = useQuery(trpc.users.list.queryOptions())
  const baseCurrencyQuery = useQuery(trpc.settings.getBaseCurrency.queryOptions())

  const form = useForm<AddUserFormValues>({
    resolver: zodResolver(addUserFormSchema),
    defaultValues: {
      id: '',
      name: '',
    },
  })

  const createUser = useMutation(
    trpc.users.create.mutationOptions({
      onSuccess: (newUser) => {
        queryClient.invalidateQueries({ queryKey: trpc.users.list.queryKey() })
        setSelectedUserId(newUser.id)
        form.reset()
        setDialogOpen(false)
      },
    }),
  )

  const onSubmit = (values: AddUserFormValues) => {
    createUser.mutate(values)
  }

  // Generate ID from name
  const handleNameChange = (name: string, onChange: (value: string) => void) => {
    onChange(name)
    // Auto-generate ID from name if ID is empty or was auto-generated
    const currentId = form.getValues('id')
    const suggestedId = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
    if (
      !currentId ||
      currentId ===
        form
          .getValues('name')
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
    ) {
      form.setValue('id', suggestedId)
    }
  }

  return (
    <div className="px-4 pt-12 pb-24 max-w-2xl mx-auto">
      <PageHeader title="Settings" />

      <div className="space-y-6">
        {/* Appearance Section */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>Customize how Tally looks on your device</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="bg-muted rounded-xl p-1 flex">
              <Button
                variant="ghost"
                onClick={() => setTheme('light')}
                className={`flex-1 rounded-lg gap-2 h-10 ${theme === 'light' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}
              >
                <Sun className="w-4 h-4" />
                Light
              </Button>
              <Button
                variant="ghost"
                onClick={() => setTheme('dark')}
                className={`flex-1 rounded-lg gap-2 h-10 ${theme === 'dark' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}
              >
                <Moon className="w-4 h-4" />
                Dark
              </Button>
              <Button
                variant="ghost"
                onClick={() => setTheme('system')}
                className={`flex-1 rounded-lg gap-2 h-10 ${theme === 'system' ? 'bg-background shadow-sm font-bold' : 'text-muted-foreground'}`}
              >
                <Monitor className="w-4 h-4" />
                System
              </Button>
            </div>
          </CardContent>
        </Card>
        {/* Base Currency Section */}
        <Card>
          <CardHeader>
            <CardTitle>Base Currency</CardTitle>
            <CardDescription>Your default currency for expense tracking</CardDescription>
          </CardHeader>
          <CardContent>
            {baseCurrencyQuery.isLoading ? (
              <div className="text-muted-foreground">Loading...</div>
            ) : baseCurrencyQuery.data ? (
              <div className="inline-flex items-center px-3 py-1.5 bg-muted rounded-md font-mono text-lg">{baseCurrencyQuery.data}</div>
            ) : (
              <div className="text-muted-foreground">Not set</div>
            )}
          </CardContent>
        </Card>

        {/* Users Section */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Users
                </CardTitle>
                <CardDescription className="mt-1">People who can submit expenses via the API</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4" />
                    Add User
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add New User</DialogTitle>
                    <DialogDescription>Create a new user who can submit expenses. Each user gets a unique ID for the iOS Shortcut.</DialogDescription>
                  </DialogHeader>
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Name</FormLabel>
                            <FormControl>
                              <Input placeholder="Partner" autoFocus {...field} onChange={(e) => handleNameChange(e.target.value, field.onChange)} />
                            </FormControl>
                            <FormDescription>Display name for this user</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="id"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>User ID</FormLabel>
                            <FormControl>
                              <Input placeholder="partner" {...field} />
                            </FormControl>
                            <FormDescription>Unique identifier used in the iOS Shortcut</FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" disabled={createUser.isPending}>
                          {createUser.isPending ? 'Creating...' : 'Create User'}
                        </Button>
                      </DialogFooter>
                    </form>
                  </Form>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {usersQuery.isLoading ? (
              <div className="text-muted-foreground">Loading users...</div>
            ) : usersQuery.data && usersQuery.data.length > 0 ? (
              <div className="space-y-2">
                {usersQuery.data.map((user) => (
                  <div
                    key={user.id}
                    className={`flex items-center justify-between p-3 rounded-lg border transition-colors cursor-pointer hover:bg-muted/50 ${
                      selectedUserId === user.id ? 'border-primary bg-primary/5' : ''
                    }`}
                    onClick={() => setSelectedUserId(selectedUserId === user.id ? null : user.id)}
                  >
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground font-mono">{user.id}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation()
                        setSelectedUserId(selectedUserId === user.id ? null : user.id)
                      }}
                    >
                      {selectedUserId === user.id ? 'Hide' : 'Setup'}
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p>No users yet</p>
                <p className="text-sm">Add a user to get started with expense tracking</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Shortcut Setup Instructions */}
        {selectedUserId && <ShortcutInstructions userId={selectedUserId} />}

        {/* Categories Section */}
        <CategoriesSection />

        {/* Export Section */}
        <ExportSection />
      </div>
    </div>
  )
}

interface ShortcutInstructionsProps {
  userId: string
}

function ShortcutInstructions({ userId }: ShortcutInstructionsProps) {
  const [copiedField, setCopiedField] = useState<'url' | 'userId' | null>(null)

  const apiEndpoint = typeof window !== 'undefined' ? `${window.location.origin}/api/expense` : '/api/expense'

  const copyToClipboard = async (text: string, field: 'url' | 'userId') => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>iOS Shortcut Setup</CardTitle>
        <CardDescription>Set up the iOS Shortcut to submit expenses from your phone</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Configuration Values */}
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">API Endpoint</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono break-all">{apiEndpoint}</code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(apiEndpoint, 'url')}>
                {copiedField === 'url' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">User ID</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 bg-muted rounded-md text-sm font-mono">{userId}</code>
              <Button variant="outline" size="icon" onClick={() => copyToClipboard(userId, 'userId')}>
                {copiedField === 'userId' ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>

        {/* Setup Steps */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-4">Setup Instructions</h4>
          <ol className="space-y-4 text-sm">
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">1</span>
              <div>
                <p className="font-medium">Open the Shortcuts app on your iPhone</p>
                <p className="text-muted-foreground mt-1">Create a new shortcut or import the Tally expense shortcut</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">2</span>
              <div>
                <p className="font-medium">Add a "Get Contents of URL" action</p>
                <p className="text-muted-foreground mt-1">Set the URL to the API endpoint shown above</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">3</span>
              <div>
                <p className="font-medium">Configure the request as Form data</p>
                <p className="text-muted-foreground mt-1">Set method to POST, Request Body to "Form", and add these fields:</p>
                <ul className="mt-2 space-y-1 text-muted-foreground">
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">image</code> - The screenshot file
                  </li>
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">userId</code> - Your user ID:{' '}
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">{userId}</code>
                  </li>
                  <li>
                    <code className="bg-muted px-1.5 py-0.5 rounded text-xs">caption</code> - (Optional) Override attribution, e.g., "household"
                  </li>
                </ul>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">4</span>
              <div>
                <p className="font-medium">Add "Select Photos" or use Share Sheet input</p>
                <p className="text-muted-foreground mt-1">Connect the photo to the "image" form field</p>
              </div>
            </li>
            <li className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-medium">5</span>
              <div>
                <p className="font-medium">Add the shortcut to your home screen</p>
                <p className="text-muted-foreground mt-1">Tap the share icon and select "Add to Home Screen" for quick access</p>
              </div>
            </li>
          </ol>
        </div>

        {/* Quick Tips */}
        <div className="border-t pt-6">
          <h4 className="font-medium mb-3">Quick Tips</h4>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>The shortcut works with screenshots from any banking or payment app</span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Each user needs their own unique User ID configured in their shortcut</span>
            </li>
            <li className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <span>Make sure your server is accessible from your phone (same network or public URL)</span>
            </li>
          </ul>
        </div>
      </CardContent>
    </Card>
  )
}

interface CategoryStats {
  category: string
  count: number
  totalAmount: number
}

function CategoriesSection() {
  const trpc = useTRPC()
  const queryClient = useQueryClient()
  const expensesQuery = useQuery(trpc.expenses.list.queryOptions())
  const baseCurrencyQuery = useQuery(trpc.settings.getBaseCurrency.queryOptions())

  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [isRenaming, setIsRenaming] = useState(false)

  const updateExpense = useMutation(
    trpc.expenses.update.mutationOptions({
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: trpc.expenses.list.queryKey(),
        })
      },
    }),
  )

  // Extract and count categories from expenses with totals
  const categoryStats: CategoryStats[] = useMemo(() => {
    if (!expensesQuery.data) return []

    const statsMap = new Map<string, { count: number; totalAmount: number }>()

    for (const expense of expensesQuery.data) {
      if (expense.state !== 'complete') continue

      if (expense.categories && Array.isArray(expense.categories)) {
        const amount = expense.baseAmount ?? expense.amount ?? 0
        // Distribute amount equally across categories
        const amountPerCategory = amount / expense.categories.length

        for (const category of expense.categories) {
          const normalized = category.trim()
          if (normalized) {
            const existing = statsMap.get(normalized) || {
              count: 0,
              totalAmount: 0,
            }
            statsMap.set(normalized, {
              count: existing.count + 1,
              totalAmount: existing.totalAmount + amountPerCategory,
            })
          }
        }
      }
    }

    // Convert to array and sort by total amount (descending)
    return Array.from(statsMap.entries())
      .map(([category, stats]) => ({
        category,
        count: stats.count,
        totalAmount: Math.round(stats.totalAmount),
      }))
      .sort((a, b) => b.totalAmount - a.totalAmount)
  }, [expensesQuery.data])

  const baseCurrency = baseCurrencyQuery.data ?? 'USD'

  const formatAmount = (amountInCents: number): string => {
    const amount = amountInCents / 100
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: baseCurrency,
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(amount)
    } catch {
      return `${baseCurrency} ${amount.toFixed(0)}`
    }
  }

  const handleRenameClick = (category: string, e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedCategory(category)
    setNewCategoryName(category)
    setRenameDialogOpen(true)
  }

  const handleRename = async () => {
    if (!selectedCategory || !newCategoryName.trim() || !expensesQuery.data) return
    if (newCategoryName.trim() === selectedCategory) {
      setRenameDialogOpen(false)
      return
    }

    setIsRenaming(true)
    try {
      // Find all expenses with this category and update them
      const expensesToUpdate = expensesQuery.data.filter((e) => e.categories?.includes(selectedCategory))

      for (const expense of expensesToUpdate) {
        if (!expense.id) continue
        const newCategories = expense.categories.map((c) => (c === selectedCategory ? newCategoryName.trim() : c))
        await updateExpense.mutateAsync({
          ...expense,
          id: expense.id,
          categories: newCategories,
        })
      }

      setRenameDialogOpen(false)
      setSelectedCategory(null)
      setNewCategoryName('')
    } finally {
      setIsRenaming(false)
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5" />
            Categories
          </CardTitle>
          <CardDescription>Tap a category to filter expenses. Click rename to merge similar categories.</CardDescription>
        </CardHeader>
        <CardContent>
          {expensesQuery.isLoading ? (
            <div className="text-muted-foreground">Loading categories...</div>
          ) : categoryStats.length > 0 ? (
            <div className="space-y-2">
              {categoryStats.map(({ category, count, totalAmount }) => (
                <div key={category} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors group">
                  <a href={`/?dateRange=all-time&category=${encodeURIComponent(category)}`} className="flex-1 min-w-0">
                    <div className="font-medium truncate">{category}</div>
                    <div className="text-sm text-muted-foreground">
                      {count} expense{count !== 1 ? 's' : ''} · {formatAmount(totalAmount)}
                    </div>
                  </a>
                  <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => handleRenameClick(category, e)}>
                    Rename
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-muted-foreground">
              <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
              <p>No categories yet</p>
              <p className="text-sm">Categories will appear here once you add expenses</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Rename Dialog */}
      <Dialog open={renameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Category</DialogTitle>
            <DialogDescription>Rename "{selectedCategory}" across all expenses. Use this to merge similar categories (e.g., "Food" and "food").</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium mb-2 block">New Category Name</label>
            <Input value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} placeholder="Enter new name" autoFocus />
            {categoryStats.some((c) => c.category.toLowerCase() === newCategoryName.toLowerCase() && c.category !== selectedCategory) && (
              <p className="text-sm text-amber-600 mt-2">This will merge with the existing "{newCategoryName}" category</p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameDialogOpen(false)} disabled={isRenaming}>
              Cancel
            </Button>
            <Button onClick={handleRename} disabled={isRenaming || !newCategoryName.trim()}>
              {isRenaming ? 'Renaming...' : 'Rename'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

interface Expense {
  id: string
  state: 'draft' | 'complete'
  amount: number | null
  currency: string | null
  merchant: string | null
  categories: string[] | null
  userId: string
  baseAmount: number | null
  receipt: {
    capturedAt: Date
  }
  completedAt: Date | null
}

function ExportSection() {
  const trpc = useTRPC()
  const [exportFormat, setExportFormat] = useState<ExportFormat>('csv')
  const [isExporting, setIsExporting] = useState(false)

  const expensesQuery = useQuery(trpc.expenses.list.queryOptions())
  const usersQuery = useQuery(trpc.users.list.queryOptions())

  const formatAmount = (amountInCents: number | null): string => {
    if (amountInCents === null) return ''
    return (amountInCents / 100).toFixed(2)
  }

  const formatDate = (date: Date | null): string => {
    if (!date) return ''
    return new Date(date).toISOString().split('T')[0]
  }

  const getUserName = (userId: string): string => {
    const user = usersQuery.data?.find((u) => u.id === userId)
    return user?.name || userId
  }

  const generateCSV = (expenses: Expense[]): string => {
    const headers = ['Date', 'Amount', 'Currency', 'Merchant', 'Categories', 'User', 'Status']
    const rows = expenses.map((expense) => [
      formatDate(expense.receipt.capturedAt),
      formatAmount(expense.amount),
      expense.currency || '',
      expense.merchant || '',
      (expense.categories || []).join('; '),
      getUserName(expense.userId),
      expense.state,
    ])

    const escapeCSV = (value: string): string => {
      if (value.includes(',') || value.includes('"') || value.includes('\n')) {
        return `"${value.replace(/"/g, '""')}"`
      }
      return value
    }

    const csvContent = [headers.join(','), ...rows.map((row) => row.map(escapeCSV).join(','))].join('\n')

    return csvContent
  }

  const generateJSON = (expenses: Expense[]): string => {
    const exportData = expenses.map((expense) => ({
      date: formatDate(expense.receipt.capturedAt),
      amount: expense.amount !== null ? expense.amount / 100 : null,
      currency: expense.currency,
      merchant: expense.merchant,
      categories: expense.categories || [],
      user: getUserName(expense.userId),
      userId: expense.userId,
      state: expense.state,
    }))

    return JSON.stringify(exportData, null, 2)
  }

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = filename
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  }

  const handleExport = async () => {
    if (!expensesQuery.data) return

    setIsExporting(true)
    try {
      const expenses = expensesQuery.data as Expense[]
      const timestamp = new Date().toISOString().split('T')[0]

      if (exportFormat === 'csv') {
        const csv = generateCSV(expenses)
        downloadFile(csv, `expenses-${timestamp}.csv`, 'text/csv;charset=utf-8;')
      } else {
        const json = generateJSON(expenses)
        downloadFile(json, `expenses-${timestamp}.json`, 'application/json')
      }
    } finally {
      setIsExporting(false)
    }
  }

  const expenseCount = expensesQuery.data?.length || 0

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="w-5 h-5" />
          Export Data
        </CardTitle>
        <CardDescription>Download your expense data in CSV or JSON format</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium">Format</label>
          <Select value={exportFormat} onValueChange={(value: ExportFormat) => setExportFormat(value)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="csv">
                <div className="flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>CSV (Spreadsheet)</span>
                </div>
              </SelectItem>
              <SelectItem value="json">
                <div className="flex items-center gap-2">
                  <FileJson className="w-4 h-4" />
                  <span>JSON (Data)</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="text-sm text-muted-foreground">
            {expensesQuery.isLoading ? 'Loading expenses...' : `${expenseCount} expense${expenseCount !== 1 ? 's' : ''} will be exported`}
          </div>
          <Button onClick={handleExport} disabled={isExporting || expensesQuery.isLoading || expenseCount === 0}>
            {isExporting ? (
              'Exporting...'
            ) : (
              <>
                <Download className="w-4 h-4" />
                Export
              </>
            )}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground border-t pt-4">
          <p className="font-medium mb-1">Exported fields:</p>
          <p>Date, Amount, Currency, Merchant, Categories, User, Status</p>
        </div>
      </CardContent>
    </Card>
  )
}
