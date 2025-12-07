import { Link } from '@tanstack/react-router'
import { Loader2, AlertCircle, Plus, CheckCircle, TrendingUp } from 'lucide-react'

import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: React.ElementType
  title: string
  description?: string
  action?: {
    label: string
    to?: string
    onClick?: () => void
  }
}

export function EmptyState({ icon: Icon = Plus, title, description, action }: EmptyStateProps) {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <Icon className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg mb-2">{title}</p>
      {description && <p className="text-sm mb-6">{description}</p>}
      {action &&
        (action.to ? (
          <Button asChild>
            <Link to={action.to}>
              <Plus className="w-4 h-4 mr-2" />
              {action.label}
            </Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        ))}
    </div>
  )
}

export function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  action?: {
    label: string
    to?: string
    onClick?: () => void
  }
}

export function ErrorState({ title = 'Failed to load', message, action }: ErrorStateProps) {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
      <p className="text-lg mb-2">{title}</p>
      <p className="text-sm mb-4">{message}</p>
      {action &&
        (action.to ? (
          <Button asChild>
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        ))}
    </div>
  )
}

interface SuccessStateProps {
  title: string
  description?: string
  action?: {
    label: string
    to?: string
    onClick?: () => void
  }
}

export function SuccessState({ title, description, action }: SuccessStateProps) {
  return (
    <div className="text-center py-20">
      <CheckCircle className="w-12 h-12 mx-auto mb-4 text-green-500" />
      <h2 className="text-xl font-semibold mb-2">{title}</h2>
      {description && <p className="text-muted-foreground mb-6">{description}</p>}
      {action &&
        (action.to ? (
          <Button asChild>
            <Link to={action.to}>{action.label}</Link>
          </Button>
        ) : (
          <Button onClick={action.onClick}>{action.label}</Button>
        ))}
    </div>
  )
}

/**
 * Empty state specifically for analytics/charts
 */
export function AnalyticsEmptyState() {
  return (
    <div className="text-center py-20 text-muted-foreground">
      <TrendingUp className="w-12 h-12 mx-auto mb-4 opacity-50" />
      <p className="text-lg mb-2">No data to analyze</p>
      <p className="text-sm">Add some expenses to see spending analysis</p>
    </div>
  )
}
