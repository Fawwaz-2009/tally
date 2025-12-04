import { CardHeader, CardTitle } from '@/components/ui/card'

interface SectionHeaderProps {
  icon: React.ElementType
  title: string
  subtitle?: string
}

export function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: SectionHeaderProps) {
  return (
    <CardHeader className="pb-4">
      <CardTitle className="flex items-center gap-2 text-lg">
        <Icon className="w-5 h-5" />
        {title}
      </CardTitle>
      {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
    </CardHeader>
  )
}
