import { Link } from '@tanstack/react-router'
import { AlertCircle, ChevronRight } from 'lucide-react'

interface ReviewBannerProps {
  count: number
}

export function ReviewBanner({ count }: ReviewBannerProps) {
  if (count === 0) return null

  return (
    <Link
      to="/review"
      className="flex items-center justify-between p-4 mb-6 bg-amber-100 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded-lg hover:bg-amber-200 dark:hover:bg-amber-900/50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400" />
        <span className="font-medium text-amber-800 dark:text-amber-200">
          {count} {count === 1 ? 'expense needs' : 'expenses need'} attention
        </span>
      </div>
      <ChevronRight className="w-5 h-5 text-amber-600 dark:text-amber-400" />
    </Link>
  )
}
