import { useState } from 'react'
import { Receipt, ZoomIn } from 'lucide-react'

import { ImagePreviewDialog } from './image-preview-dialog'

interface ReceiptPreviewProps {
  /** URL of the receipt image */
  imageUrl: string | null | undefined
  /** Merchant name for accessibility */
  merchantName?: string | null
}

/**
 * Receipt preview thumbnail with tap-to-expand functionality.
 *
 * Displays a preview image that can be tapped to open a full-screen view.
 * Shows a placeholder when no image is available.
 */
export function ReceiptPreview({ imageUrl, merchantName }: ReceiptPreviewProps) {
  const [isFullScreenOpen, setIsFullScreenOpen] = useState(false)

  if (!imageUrl) {
    return <ReceiptPlaceholder />
  }

  return (
    <>
      <ReceiptThumbnail
        imageUrl={imageUrl}
        onTap={() => setIsFullScreenOpen(true)}
      />
      <ImagePreviewDialog
        open={isFullScreenOpen}
        onOpenChange={setIsFullScreenOpen}
        imageUrl={imageUrl}
        alt={`Receipt from ${merchantName || 'Unknown Merchant'}`}
      />
    </>
  )
}

interface ReceiptThumbnailProps {
  imageUrl: string
  onTap: () => void
}

function ReceiptThumbnail({ imageUrl, onTap }: ReceiptThumbnailProps) {
  return (
    <button
      type="button"
      onClick={onTap}
      className="relative h-48 w-full bg-muted overflow-hidden shrink-0 group cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <img
        src={imageUrl}
        alt="Receipt"
        className="w-full h-full object-contain brightness-90 group-hover:brightness-100 group-active:brightness-100 transition-all duration-200"
      />

      {/* Subtle bottom gradient for visual transition to content below */}
      <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-background/60 to-transparent pointer-events-none" />

      {/* Tap indicator - visible on hover/focus, subtle on mobile */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="bg-background/80 backdrop-blur-sm rounded-full px-4 py-2 flex items-center gap-2 opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 group-active:opacity-100 transition-opacity shadow-lg">
          <ZoomIn className="w-4 h-4" />
          <span className="text-xs font-mono uppercase tracking-wider">
            View Receipt
          </span>
        </div>
      </div>

      {/* Receipt badge */}
      <div className="absolute top-3 right-3 bg-background/60 backdrop-blur-md rounded-full px-3 py-1 flex items-center gap-2 pointer-events-none">
        <Receipt className="w-3 h-3 text-foreground" />
        <span className="text-[10px] font-mono text-foreground uppercase tracking-wider">
          Receipt
        </span>
      </div>
    </button>
  )
}

function ReceiptPlaceholder() {
  return (
    <div className="h-24 w-full bg-muted flex items-center justify-center shrink-0">
      <Receipt className="w-8 h-8 text-muted-foreground" />
    </div>
  )
}
