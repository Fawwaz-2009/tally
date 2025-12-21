import { useEffect, useState } from 'react'

interface KeyboardState {
  isOpen: boolean
  height: number
  visualViewportHeight: number
}

/**
 * Hook to detect iOS keyboard state using Visual Viewport API
 *
 * On iOS, the layout viewport doesn't resize when the keyboard opens.
 * Instead, the visual viewport shrinks. This hook monitors those changes.
 *
 * @see https://developer.mozilla.org/en-US/docs/Web/API/Visual_Viewport_API
 */
export function useIOSKeyboard(): KeyboardState {
  const [keyboardState, setKeyboardState] = useState<KeyboardState>({
    isOpen: false,
    height: 0,
    visualViewportHeight: typeof window !== 'undefined' ? window.innerHeight : 0,
  })

  useEffect(() => {
    // Check if Visual Viewport API is available (iOS Safari 13+)
    if (typeof window === 'undefined' || !window.visualViewport) {
      return
    }

    const visualViewport = window.visualViewport
    const initialHeight = window.innerHeight

    const handleResize = () => {
      const currentHeight = visualViewport.height
      const keyboardHeight = initialHeight - currentHeight
      const isOpen = keyboardHeight > 100 // Threshold to detect keyboard (100px)

      setKeyboardState({
        isOpen,
        height: isOpen ? keyboardHeight : 0,
        visualViewportHeight: currentHeight,
      })
    }

    // Listen to visual viewport resize events
    visualViewport.addEventListener('resize', handleResize)
    visualViewport.addEventListener('scroll', handleResize)

    return () => {
      visualViewport.removeEventListener('resize', handleResize)
      visualViewport.removeEventListener('scroll', handleResize)
    }
  }, [])

  return keyboardState
}
