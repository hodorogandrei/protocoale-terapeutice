import Link from 'next/link'
import { Search, Menu, Bookmark, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center">
        {/* Logo and Title */}
        <div className="mr-4 flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="h-8 w-8 rounded-md bg-medical-blue flex items-center justify-center">
              <span className="text-white font-bold text-lg">PT</span>
            </div>
            <span className="hidden font-bold sm:inline-block">
              Protocoale Terapeutice
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex items-center space-x-6 text-sm font-medium flex-1">
          <Link
            href="/"
            className="transition-colors hover:text-medical-blue text-foreground/60"
          >
            <Home className="h-5 w-5 sm:hidden" />
            <span className="hidden sm:inline">Acasă</span>
          </Link>
          <Link
            href="/protocoale"
            className="transition-colors hover:text-medical-blue text-foreground/60"
          >
            Toate Protocoalele
          </Link>
          <Link
            href="/specialitati"
            className="transition-colors hover:text-medical-blue text-foreground/60"
          >
            Specialități
          </Link>
        </nav>

        {/* Search and Actions */}
        <div className="flex items-center space-x-2">
          <Link href="/favorite">
            <Button variant="ghost" size="icon">
              <Bookmark className="h-5 w-5" />
              <span className="sr-only">Favorite</span>
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="sm:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Meniu</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
