import { Link } from '@tanstack/react-router'
import { CheckCircle2, Home } from 'lucide-react'

import { Button } from '@/components/ui/button'

export function AlreadySetup() {
  return (
    <div className="min-h-screen flex flex-col justify-center px-6 py-12">
      <div className="max-w-sm mx-auto w-full text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 dark:bg-green-900/30 mb-4">
          <CheckCircle2 className="w-8 h-8 text-green-600 dark:text-green-400" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight font-heading mb-2">Already Set Up</h1>
        <p className="text-muted-foreground mb-8">Tally has already been configured and is ready to use.</p>
        <Button asChild className="w-full" size="lg">
          <Link to="/">
            <Home className="w-4 h-4 mr-2" />
            Go to Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
