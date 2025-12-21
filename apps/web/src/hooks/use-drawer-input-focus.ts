import { useEffect, useRef } from 'react'

/**
 * Hook to handle input focus behavior in iOS drawers
 *
 * On iOS, when an input inside a fixed/absolute positioned drawer is focused,
 * the browser may scroll the page in unexpected ways or the keyboard may
 * obstruct the input. This hook ensures focused inputs remain visible.
 *
 * @param enabled - Whether to enable the behavior (typically when drawer is open)
 */
export function useDrawerInputFocus(enabled: boolean) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!enabled || !containerRef.current) return

    const container = containerRef.current

    const handleFocusIn = (event: FocusEvent) => {
      const target = event.target as HTMLElement

      // Check if focused element is an input, textarea, or select
      if (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement
      ) {
        // Small delay to let the keyboard animate in
        setTimeout(() => {
          // Scroll the input into view within the drawer
          target.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'nearest',
          })
        }, 300)
      }
    }

    // Use capture phase to catch events before they bubble
    container.addEventListener('focusin', handleFocusIn, { capture: true })

    return () => {
      container.removeEventListener('focusin', handleFocusIn, { capture: true })
    }
  }, [enabled])

  return containerRef
}
