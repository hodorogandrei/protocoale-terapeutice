'use client'

import { useState, useEffect } from 'react'
import { Bookmark, BookmarkCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toggleBookmark, isBookmarked } from '@/lib/bookmarks'

interface BookmarkButtonProps {
  protocolId: string
  code: string
  title: string
  variant?: 'default' | 'ghost' | 'outline'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  showText?: boolean
}

export function BookmarkButton({
  protocolId,
  code,
  title,
  variant = 'ghost',
  size = 'icon',
  showText = false,
}: BookmarkButtonProps) {
  const [bookmarked, setBookmarked] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    setBookmarked(isBookmarked(protocolId))
  }, [protocolId])

  const handleToggle = () => {
    const newState = toggleBookmark(protocolId, code, title)
    setBookmarked(newState)

    // Show toast notification (optional)
    if (newState) {
      console.log('Protocol adăugat la favorite')
    } else {
      console.log('Protocol eliminat din favorite')
    }
  }

  // Don't render during SSR to avoid hydration mismatch
  if (!mounted) {
    return (
      <Button variant={variant} size={size} disabled>
        <Bookmark className="h-4 w-4" />
      </Button>
    )
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleToggle}
      title={bookmarked ? 'Elimină din favorite' : 'Adaugă la favorite'}
    >
      {bookmarked ? (
        <BookmarkCheck className="h-4 w-4 fill-current" />
      ) : (
        <Bookmark className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-2">
          {bookmarked ? 'Salvat' : 'Salvează'}
        </span>
      )}
    </Button>
  )
}
