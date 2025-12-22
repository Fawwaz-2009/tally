import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { z } from 'zod'
import { AlertCircle, ChevronRight, Plus, Receipt } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

const searchSchema = z.object({
  user: z.string(),
  merchant: z.string().optional(),
})

export const Route = createFileRoute('/quick-add/$sessionId/merchant')({
  validateSearch: searchSchema,
  component: MerchantSelect,
  beforeLoad: ({ search }) => {
    console.log("MERCHANT_SESSION_PAGE_BEFORE_LOAD")
    
    // NO redirects - just validate
    if (!search.user) {
      throw new Error('USER_REQUIRED')
    }
  },
  errorComponent: ({ error }) => {
    const navigate = useNavigate()
    const { sessionId } = Route.useParams()

    if (error.message === 'USER_REQUIRED') {
      return (
        <div className="min-h-[50vh] flex items-center justify-center p-6">
          <div className="text-center space-y-4 max-w-sm">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto">
              <AlertCircle className="w-8 h-8 text-orange-600" />
            </div>
            <div>
              <h1 className="text-xl font-bold mb-2">User Selection Required</h1>
              <p className="text-muted-foreground">Please select who made this purchase first.</p>
            </div>
            <Button
              onClick={() => navigate({ to: '/quick-add/$sessionId', params: { sessionId } })}
              size="lg"
              className="w-full"
            >
              Select User
            </Button>
          </div>
        </div>
      )
    }

    throw error
  },
})

function MerchantSelect() {
  const navigate = useNavigate({ from: Route.fullPath })
  const trpc = useTRPC()
  const { sessionId } = Route.useParams()
  const { user } = Route.useSearch()
  console.log("MERCHANT_SESSION_PAGE")
  

  const [merchantSearch, setMerchantSearch] = useState('')

  // Merchants data was prefetched in parent loader
  const { data: merchants = [] } = useQuery(trpc.merchants.list.queryOptions())

  const handleMerchantSelect = (merchantName: string) => {
    navigate({
      to: '/quick-add/$sessionId/details',
      params: { sessionId },
      search: { user, merchant: merchantName },
    })
  }

  // Filter merchants based on search
  const filteredMerchants = merchantSearch
    ? merchants.filter((m) => m.displayName.toLowerCase().includes(merchantSearch.toLowerCase()))
    : merchants.slice(0, 8) // Show top 8 recent merchants

  const isNewMerchant =
    merchantSearch.trim() !== '' &&
    !merchants.some((m) => m.displayName.toLowerCase() === merchantSearch.toLowerCase())

  return (
    <div className="p-4 space-y-4">
      {/* Search input */}
      <Input
        placeholder="Search or type merchant name..."
        value={merchantSearch}
        onChange={(e) => setMerchantSearch(e.target.value)}
        className="h-12 text-base"
        autoFocus
      />

      {/* Create new option */}
      {isNewMerchant && (
        <button
          onClick={() => handleMerchantSelect(merchantSearch.trim())}
          className="w-full flex items-center gap-3 p-4 bg-primary/5 border-2 border-primary/20 border-dashed rounded-xl hover:bg-primary/10 transition-colors"
        >
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Plus className="w-5 h-5 text-primary" />
          </div>
          <span className="font-medium text-primary">Add "{merchantSearch.trim()}"</span>
        </button>
      )}

      {/* Recent/filtered merchants */}
      <div className="space-y-2">
        {!merchantSearch && <p className="text-sm text-muted-foreground px-1">Recent merchants</p>}
        {filteredMerchants.map((merchant) => (
          <button
            key={merchant.id}
            onClick={() => handleMerchantSelect(merchant.displayName)}
            className="w-full flex items-center justify-between p-4 bg-card border rounded-xl hover:bg-accent transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                <Receipt className="w-5 h-5 text-muted-foreground" />
              </div>
              <div className="text-left">
                <span className="font-medium block">{merchant.displayName}</span>
                {merchant.category && <span className="text-sm text-muted-foreground">{merchant.category}</span>}
              </div>
            </div>
            <ChevronRight className="w-5 h-5 text-muted-foreground" />
          </button>
        ))}

        {filteredMerchants.length === 0 && !isNewMerchant && (
          <p className="text-center text-muted-foreground py-8">No merchants found</p>
        )}
      </div>
    </div>
  )
}
