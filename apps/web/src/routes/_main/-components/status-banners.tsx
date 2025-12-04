import { Link } from '@tanstack/react-router'
import { AlertTriangle, Loader2 } from 'lucide-react'

interface StatusBannersProps {
  needsReviewCount: number
  processingCount: number
}

export function StatusBanners({
  needsReviewCount,
  processingCount,
}: StatusBannersProps) {
  if (needsReviewCount === 0 && processingCount === 0) return null

  return (
    <div className="space-y-2 px-4 py-4">
      {needsReviewCount > 0 && (
        <Link to="/review" className="block">
          <div className="bg-orange-500/10 border border-orange-500/20 rounded-xl p-3 flex items-center justify-between hover:bg-orange-500/15 transition-colors cursor-pointer group">
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-500">
                <AlertTriangle size={16} />
              </div>
              <div>
                <div className="text-sm font-bold text-orange-500 leading-none mb-1">
                  Action Required
                </div>
                <div className="text-xs text-muted-foreground">
                  {needsReviewCount} expense{needsReviewCount !== 1 ? 's' : ''}{' '}
                  need review
                </div>
              </div>
            </div>
            <div className="text-orange-500 text-xs font-mono uppercase tracking-wider group-hover:underline decoration-orange-500/50">
              Resolve
            </div>
          </div>
        </Link>
      )}

      {processingCount > 0 && (
        <div className="bg-blue-500/5 border border-blue-500/10 rounded-xl p-3 flex items-center gap-3">
          <div className="h-8 w-8 bg-blue-500/10 rounded-full flex items-center justify-center text-blue-500">
            <Loader2 size={16} className="animate-spin" />
          </div>
          <div>
            <div className="text-sm font-bold text-blue-500 leading-none mb-1">
              Processing
            </div>
            <div className="text-xs text-muted-foreground">
              {processingCount} expense{processingCount !== 1 ? 's' : ''} pending
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
