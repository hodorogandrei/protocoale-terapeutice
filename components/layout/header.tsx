import Link from 'next/link'
import { Search, Menu, Bookmark, Home, FileText, Activity } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-20 items-center">
        {/* Logo and Title */}
        <div className="mr-6 flex">
          <Link href="/" className="mr-8 flex items-center space-x-3">
            <div className="h-10 w-10 rounded-lg bg-medical-blue flex items-center justify-center">
              <span className="text-white font-bold text-xl">PT</span>
            </div>
            <span className="hidden font-bold text-lg sm:inline-block">
              Protocoale Terapeutice
            </span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex items-center gap-2 text-base font-medium flex-1">
          <Link
            href="/"
            className="transition-colors hover:text-medical-blue text-foreground/60 py-2 px-3 rounded-lg hover:bg-blue-50 flex items-center gap-2"
          >
            <Home className="h-5 w-5" />
            <span className="hidden sm:inline">Acasă</span>
          </Link>
          <Link
            href="/protocoale"
            className="transition-colors hover:text-medical-blue text-foreground/60 py-2 px-3 rounded-lg hover:bg-blue-50 flex items-center gap-2"
          >
            <FileText className="h-5 w-5" />
            <span className="hidden sm:inline">Toate Protocoalele</span>
          </Link>
          <Link
            href="/specialitati"
            className="transition-colors hover:text-medical-blue text-foreground/60 py-2 px-3 rounded-lg hover:bg-blue-50 flex items-center gap-2"
          >
            <Activity className="h-5 w-5" />
            <span className="hidden sm:inline">Specialități</span>
          </Link>
        </nav>

        {/* Search and Actions */}
        <div className="flex items-center space-x-3">
          <Link href="/favorite">
            <Button variant="ghost" size="lg">
              <Bookmark className="h-6 w-6" />
              <span className="sr-only">Favorite</span>
            </Button>
          </Link>
          <Button variant="ghost" size="lg" className="sm:hidden">
            <Menu className="h-6 w-6" />
            <span className="sr-only">Meniu</span>
          </Button>
        </div>
      </div>
    </header>
  )
}
