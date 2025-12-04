import { useNavigate } from '@tanstack/react-router'
import { CheckCircle2, Home } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface SuccessViewProps {
  previewUrl: string | undefined
  amount: string
  currency: string
  merchant: string
  onAddAnother: () => void
}

export function SuccessView({
  previewUrl,
  amount,
  currency,
  merchant,
  onAddAnother,
}: SuccessViewProps) {
  const navigate = useNavigate()

  return (
    <div className="px-6 pt-12 pb-24">
      <div className="max-w-sm mx-auto w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">
          Expense Saved!
        </h1>
        <p className="text-muted-foreground mb-6">
          Your expense has been added successfully.
        </p>

        {previewUrl && (
          <div className="mb-4">
            <img
              src={previewUrl}
              alt="Uploaded receipt"
              className="w-32 h-32 object-cover rounded-lg mx-auto border"
            />
          </div>
        )}

        <div className="bg-muted/50 rounded-lg p-4 mb-6 text-left">
          <div className="text-sm text-muted-foreground mb-1">
            Saved expense:
          </div>
          <div className="font-mono text-lg font-semibold">
            {currency} {amount}
          </div>
          {merchant && (
            <div className="text-sm text-muted-foreground">{merchant}</div>
          )}
        </div>

        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            size="lg"
            onClick={() => navigate({ to: '/' })}
          >
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Button>
          <Button
            variant="outline"
            className="w-full"
            size="lg"
            onClick={onAddAnother}
          >
            Add Another Expense
          </Button>
        </div>
      </div>
    </div>
  )
}
