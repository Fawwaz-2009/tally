import { AlertCircle, CheckCircle } from 'lucide-react'

interface NotificationProps {
  message: string
  type: 'success' | 'error'
  onClose: () => void
}

export function Notification({ message, type, onClose }: NotificationProps) {
  return (
    <div
      className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 animate-in slide-in-from-top-2 ${
        type === 'success' ? 'bg-green-600 text-white' : 'bg-destructive text-destructive-foreground'
      }`}
    >
      {type === 'success' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      <span>{message}</span>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        &times;
      </button>
    </div>
  )
}
