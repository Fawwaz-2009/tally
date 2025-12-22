import { Link } from '@tanstack/react-router'
import { Home, PieChart, Plus, Settings, Zap } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function BottomNav() {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-full max-w-sm px-4">
      <div className="flex items-center justify-around bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-full px-2 py-3 shadow-2xl shadow-zinc-200/50 dark:shadow-black/50">
        <Link to="/" className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2">
          <Home size={24} strokeWidth={2.5} />
        </Link>

        <Link to="/analysis" className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2">
          <PieChart size={24} strokeWidth={2.5} />
        </Link>

        <div className="-mt-8 pointer-events-none">
          <Link to="/add" className="pointer-events-auto">
            <Button
              size="icon"
              className="h-14 w-14 rounded-full bg-orange-600 hover:bg-orange-500 text-white shadow-lg shadow-orange-900/20 border-4 border-white dark:border-zinc-950"
            >
              <Plus size={28} strokeWidth={3} />
            </Button>
          </Link>
        </div>

        <Link to="/quick-add" className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2">
          <Zap size={24} strokeWidth={2.5} />
        </Link>

        <Link to="/settings" className="text-zinc-500 dark:text-zinc-400 hover:text-orange-500 transition-colors [&.active]:text-orange-500 p-2">
          <Settings size={24} strokeWidth={2.5} />
        </Link>
      </div>
    </div>
  )
}
