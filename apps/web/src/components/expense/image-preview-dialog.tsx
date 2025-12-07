import { X, ZoomIn } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'

interface ImagePreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  imageUrl: string | null | undefined
  alt?: string
}

export function ImagePreviewDialog({ open, onOpenChange, imageUrl, alt = 'Full view' }: ImagePreviewDialogProps) {
  if (!imageUrl) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] p-0 overflow-hidden">
        <DialogTitle className="sr-only">{alt}</DialogTitle>
        <div className="relative">
          <Button variant="ghost" size="icon" className="absolute top-2 right-2 z-10 bg-black/50 hover:bg-black/70 text-white" onClick={() => onOpenChange(false)}>
            <X className="w-4 h-4" />
          </Button>
          <img src={imageUrl} alt={alt} className="w-full max-h-[85vh] object-contain" />
        </div>
      </DialogContent>
    </Dialog>
  )
}

interface ImagePreviewThumbnailProps {
  imageUrl: string | null | undefined
  onClick: () => void
  alt?: string
  maxHeight?: string
  className?: string
}

export function ImagePreviewThumbnail({ imageUrl, onClick, alt = 'Preview', maxHeight = 'max-h-48', className }: ImagePreviewThumbnailProps) {
  if (!imageUrl) return null

  return (
    <div className={className}>
      <button type="button" onClick={onClick} className="relative w-full group cursor-zoom-in">
        <img src={imageUrl} alt={alt} className={`w-full ${maxHeight} object-contain rounded-lg border`} />
        <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-colors rounded-lg">
          <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </button>
      <p className="text-xs text-center text-muted-foreground mt-1">Click to expand</p>
    </div>
  )
}
