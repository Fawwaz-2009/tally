import { useEffect } from 'react'

/**
 * Component that tracks visual viewport height and updates a CSS custom property
 *
 * This enables CSS to respond to iOS keyboard opening/closing by using
 * var(--visual-viewport-height) instead of vh units.
 *
 * Place this component at the root of your app.
 */
export function VisualViewportProvider() {
  useEffect(() => {
    if (typeof window === 'undefined' || !window.visualViewport) {
      return
    }

    const updateViewportHeight = () => {
      const vh = window.visualViewport!.height
      document.documentElement.style.setProperty('--visual-viewport-height', `${vh}px`)
    }

    // Set initial value
    updateViewportHeight()

    // Update on resize and scroll
    window.visualViewport.addEventListener('resize', updateViewportHeight)
    window.visualViewport.addEventListener('scroll', updateViewportHeight)

    return () => {
      window.visualViewport!.removeEventListener('resize', updateViewportHeight)
      window.visualViewport!.removeEventListener('scroll', updateViewportHeight)
    }
  }, [])

  return null
}
