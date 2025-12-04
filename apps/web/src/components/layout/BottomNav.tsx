import { Link } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { Home, PieChart, Plus, Settings, AlertCircle } from 'lucide-react'

import { useTRPC } from '@/integrations/trpc-react'

export function BottomNav() {
  const trpc = useTRPC()
  const needsReviewQuery = useQuery(
    trpc.expenses.needsReviewCount.queryOptions(),
  )
  const reviewCount = needsReviewQuery.data ?? 0

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="flex items-center justify-around bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full px-4 py-3 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
        <Link
          to="/"
          className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2"
        >
          <Home size={24} strokeWidth={2.5} />
        </Link>

        <Link
          to="/analysis"
          className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2"
        >
          <PieChart size={24} strokeWidth={2.5} />
        </Link>

        <Link
          to="/review"
          className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2"
        >
          <div className="relative">
            <AlertCircle size={24} strokeWidth={2.5} />
            {reviewCount > 0 && (
              <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs w-4 h-4 rounded-full flex items-center justify-center">
                {reviewCount}
              </span>
            )}
          </div>
        </Link>

        <Link
          to="/add"
          className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2"
        >
          <Plus size={24} strokeWidth={2.5} />
        </Link>

        <Link
          to="/settings"
          className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2"
        >
          <Settings size={24} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
