import { Inbox, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { Card, CardContent } from '@/components/ui/card'

type EmptyStateProps = {
  title: string
  description: string
  icon?: LucideIcon
  children?: ReactNode
}

export function EmptyState({ title, description, icon: Icon = Inbox, children }: EmptyStateProps) {
  return (
    <Card className="border-dashed">
      <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
        <Icon className="text-muted-foreground size-10" aria-hidden="true" />
        <h2 className="text-lg font-medium">{title}</h2>
        <p className="text-muted-foreground max-w-md text-sm">{description}</p>
        {children}
      </CardContent>
    </Card>
  )
}
