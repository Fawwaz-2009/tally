import { AlertCircle } from 'lucide-react'

interface ReviewWarningProps {
  errorMessage: string
}

export function ReviewWarning({ errorMessage }: ReviewWarningProps) {
  return (
    <div className="mb-6 p-4 border border-yellow-500/20 bg-yellow-500/10 rounded-lg">
      <div className="flex items-start gap-2">
        <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
        <div>
          <p className="font-medium text-yellow-600">Review Required</p>
          <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
        </div>
      </div>
    </div>
  )
}
