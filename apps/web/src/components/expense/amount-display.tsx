import { useEffect, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { formatAmount } from '@/lib/expense-utils'

type AmountSize = 'sm' | 'md' | 'lg' | 'xl' | 'hero'

const sizeConfig: Record<AmountSize, { maxFontSize: number; minFontSize: number }> = {
  sm: { maxFontSize: 14, minFontSize: 12 },
  md: { maxFontSize: 20, minFontSize: 14 },
  lg: { maxFontSize: 28, minFontSize: 18 },
  xl: { maxFontSize: 40, minFontSize: 24 },
  hero: { maxFontSize: 48, minFontSize: 28 },
}

interface AmountDisplayProps {
  /** Amount in cents */
  amount: number | null
  /** Currency code (e.g., 'USD', 'IDR') */
  currency: string | null
  /** Preset size - determines max/min font size range */
  size?: AmountSize
  /** Additional class names */
  className?: string
  /** Whether to show loading state */
  isLoading?: boolean
}

/**
 * A responsive amount display component that automatically scales
 * the font size to fit within its container while maintaining readability.
 *
 * Usage:
 * ```tsx
 * <AmountDisplay amount={123456} currency="USD" size="hero" />
 * ```
 */
export function AmountDisplay({ amount, currency, size = 'md', className, isLoading = false }: AmountDisplayProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const textRef = useRef<HTMLSpanElement>(null)
  const [fontSize, setFontSize] = useState(sizeConfig[size].maxFontSize)

  const formattedAmount = formatAmount(amount, currency)
  const { maxFontSize, minFontSize } = sizeConfig[size]

  useEffect(() => {
    const container = containerRef.current
    const text = textRef.current

    if (!container || !text || isLoading) return

    // Reset to max size to measure
    setFontSize(maxFontSize)

    // Use requestAnimationFrame to ensure the DOM has updated
    requestAnimationFrame(() => {
      const containerWidth = container.offsetWidth
      const textWidth = text.scrollWidth

      if (textWidth > containerWidth) {
        // Calculate the scale factor needed
        const scale = containerWidth / textWidth
        const newFontSize = Math.max(
          minFontSize,
          Math.floor(maxFontSize * scale * 0.95), // 0.95 for a bit of padding
        )
        setFontSize(newFontSize)
      }
    })
  }, [formattedAmount, maxFontSize, minFontSize, isLoading])

  if (isLoading) {
    const loadingHeight = size === 'hero' ? 'h-12' : size === 'xl' ? 'h-10' : size === 'lg' ? 'h-8' : 'h-6'
    return (
      <div className={cn('w-full', className)}>
        <div className={cn('bg-muted animate-pulse rounded w-3/4', loadingHeight)} />
      </div>
    )
  }

  return (
    <div ref={containerRef} className={cn('w-full overflow-hidden', className)}>
      <span ref={textRef} className="font-mono font-bold tracking-tighter tabular-nums whitespace-nowrap block" style={{ fontSize: `${fontSize}px`, lineHeight: 1.1 }}>
        {formattedAmount}
      </span>
    </div>
  )
}
