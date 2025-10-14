import Link from 'next/link'
import { FileQuestion } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center py-16">
        <div className="container px-4">
          <div className="max-w-md mx-auto text-center">
            <FileQuestion className="h-24 w-24 mx-auto text-gray-400 mb-6" />
            <h1 className="text-3xl font-bold mb-3">Protocol Negăsit</h1>
            <p className="text-muted-foreground mb-6">
              Protocolul căutat nu a fost găsit în baza de date. Verificați codul
              protocolului sau căutați în lista completă.
            </p>
            <div className="flex gap-4 justify-center">
              <Link href="/protocoale">
                <Button>Toate Protocoalele</Button>
              </Link>
              <Link href="/">
                <Button variant="outline">Înapoi Acasă</Button>
              </Link>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
