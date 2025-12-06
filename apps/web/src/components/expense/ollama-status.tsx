import { AlertCircle, CheckCircle2, Loader2, Server, XCircle } from 'lucide-react'

interface OllamaHealthData {
  available: boolean
  configured: boolean
  modelAvailable: boolean
  model: string
  host: string
  models: string[]
}

interface OllamaStatusProps {
  isLoading: boolean
  data: OllamaHealthData | undefined
}

export function OllamaStatus({ isLoading, data }: OllamaStatusProps) {
  return (
    <div className="mb-4 p-3 rounded-lg bg-muted/50 text-sm">
      <div className="flex items-center gap-2">
        <Server className="w-4 h-4 text-muted-foreground" />
        <span className="text-muted-foreground">AI Extraction:</span>
        {isLoading ? (
          <span className="flex items-center gap-1 text-muted-foreground">
            <Loader2 className="w-3 h-3 animate-spin" />
            Checking...
          </span>
        ) : data?.available && data.modelAvailable ? (
          <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle2 className="w-3 h-3" />
            Ready ({data.model})
          </span>
        ) : data?.available && !data.configured ? (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" />
            Model not configured
          </span>
        ) : data?.available && !data.modelAvailable ? (
          <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
            <AlertCircle className="w-3 h-3" />
            Model &quot;{data.model}&quot; not found
          </span>
        ) : (
          <span className="flex items-center gap-1 text-destructive">
            <XCircle className="w-3 h-3" />
            Ollama unavailable
          </span>
        )}
      </div>
      {data && !data.available && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Make sure Ollama is running at {data.host}
        </p>
      )}
      {data?.available && !data.modelAvailable && data.models.length > 0 && (
        <p className="text-xs text-muted-foreground mt-1 ml-6">
          Available: {data.models.slice(0, 3).join(', ')}
          {data.models.length > 3 && ` +${data.models.length - 3} more`}
        </p>
      )}
    </div>
  )
}
