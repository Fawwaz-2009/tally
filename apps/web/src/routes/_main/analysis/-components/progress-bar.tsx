interface ProgressBarProps {
  value: number
  max: number
  color?: string
}

export function ProgressBar({
  value,
  max,
  color = 'bg-primary',
}: ProgressBarProps) {
  const percentage = max > 0 ? Math.round((value / max) * 100) : 0

  return (
    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
      <div
        className={`h-full rounded-full transition-all duration-300 ${color}`}
        style={{ width: `${percentage}%` }}
      />
    </div>
  )
}
