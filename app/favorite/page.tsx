'use client'

import { useState, useEffect } from 'react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ProtocolCard } from '@/components/protocol/protocol-card'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Bookmark, Trash2 } from 'lucide-react'
import type { Protocol } from '@/types/protocol'

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<Protocol[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Load favorites from localStorage
    loadFavorites()
  }, [])

  const loadFavorites = () => {
    try {
      const stored = localStorage.getItem('favoriteProtocols')
      if (stored) {
        const favoriteIds = JSON.parse(stored) as string[]
        // In a real app, fetch these protocols from the API
        // For now, we'll just show the IDs
        setFavorites([])
      }
    } catch (error) {
      console.error('Failed to load favorites:', error)
    } finally {
      setLoading(false)
    }
  }

  const clearAllFavorites = () => {
    if (confirm('Sigur doriți să ștergeți toate protocoalele favorite?')) {
      localStorage.removeItem('favoriteProtocols')
      setFavorites([])
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold mb-4 flex items-center gap-3">
                  <Bookmark className="h-8 w-8 text-medical-blue" />
                  Protocoale Favorite
                </h1>
                <p className="text-lg text-muted-foreground">
                  Protocoalele pe care le-ai salvat pentru acces rapid
                </p>
              </div>

              {favorites.length > 0 && (
                <Button variant="destructive" onClick={clearAllFavorites}>
                  <Trash2 className="mr-2 h-4 w-4" />
                  Șterge Toate
                </Button>
              )}
            </div>
          </div>

          <Separator className="my-8" />

          {/* Content */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-medical-blue" />
            </div>
          ) : favorites.length > 0 ? (
            <>
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {favorites.length} {favorites.length === 1 ? 'protocol salvat' : 'protocoale salvate'}
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {favorites.map((protocol) => (
                  <ProtocolCard key={protocol.id} protocol={protocol} />
                ))}
              </div>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📑</div>
              <h3 className="text-xl font-semibold mb-2">
                Niciun protocol salvat
              </h3>
              <p className="text-muted-foreground mb-6">
                Salvează protocoalele pe care le folosești frecvent pentru acces rapid.
                Apasă pe butonul de bookmark din pagina fiecărui protocol.
              </p>
              <Button onClick={() => (window.location.href = '/protocoale')}>
                Explorează Protocoalele
              </Button>
            </div>
          )}

          {/* How to use */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
              <Bookmark className="h-5 w-5" />
              Cum funcționează favoritele?
            </h3>
            <div className="space-y-3 text-sm text-muted-foreground">
              <p>
                <strong>Salvare:</strong> Apasă pe butonul de bookmark (🔖) din
                pagina oricărui protocol pentru a-l adăuga la favorite.
              </p>
              <p>
                <strong>Acces rapid:</strong> Protocoalele salvate vor apărea în
                această pagină pentru acces rapid și ușor.
              </p>
              <p>
                <strong>Stocare locală:</strong> Favoritele sunt salvate în browser-ul
                tău și rămân disponibile chiar și după închiderea paginii.
              </p>
              <p>
                <strong>Notă:</strong> Dacă ștergi istoricul browser-ului sau folosești
                un alt dispozitiv, va trebui să salvezi din nou protocoalele favorite.
              </p>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
