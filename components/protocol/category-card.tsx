'use client'

import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

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
      <motion.div
        whileHover={{ scale: 1.03, y: -4 }}
        whileTap={{ scale: 0.98 }}
        transition={{ type: "spring", stiffness: 300, damping: 20 }}
      >
        <Card className="group relative overflow-hidden cursor-pointer h-full border-2 border-gray-200 hover:border-blue-500/50 transition-all duration-300 bg-white hover:shadow-2xl">
          {/* Gradient overlay on hover */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 transition-all duration-300" />

          <CardHeader className="pb-3 relative">
            <div className="flex items-start justify-between mb-4">
              <motion.div
                className="text-5xl"
                whileHover={{ scale: 1.1, rotate: 5 }}
                transition={{ type: "spring", stiffness: 400, damping: 10 }}
              >
                {icon}
              </motion.div>
              <Badge variant="secondary" className="text-sm px-3 py-1 font-semibold bg-blue-100 text-blue-700 group-hover:bg-blue-200 transition-colors">
                {count}
              </Badge>
            </div>
            <CardTitle className="text-xl font-bold group-hover:text-blue-600 transition-colors flex items-center justify-between">
              <span>{title}</span>
              <ArrowRight className="h-5 w-5 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all duration-300" />
            </CardTitle>
          </CardHeader>
          {description && (
            <CardContent className="pt-0 relative">
              <p className="text-sm text-muted-foreground leading-relaxed">{description}</p>
            </CardContent>
          )}
        </Card>
      </motion.div>
    </Link>
  )
}
