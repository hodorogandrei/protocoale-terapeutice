import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CategoryCardProps {
  title: string
  icon: string
  count: number
  href: string
  description?: string
}

export function CategoryCard({ title, icon, count, href, description }: CategoryCardProps) {
  return (
    <Link href={href}>
      <Card className="hover:shadow-lg transition-all hover:scale-105 cursor-pointer h-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="text-4xl mb-2">{icon}</div>
            <Badge variant="secondary">{count}</Badge>
          </div>
          <CardTitle className="text-xl">{title}</CardTitle>
        </CardHeader>
        {description && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{description}</p>
          </CardContent>
        )}
      </Card>
    </Link>
  )
}
