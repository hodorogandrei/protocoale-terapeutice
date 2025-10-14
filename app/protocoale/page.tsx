'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SearchBar } from '@/components/protocol/search-bar'
import { ProtocolCard } from '@/components/protocol/protocol-card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Loader2, SlidersHorizontal } from 'lucide-react'
import type { Protocol } from '@/types/protocol'

interface ProtocolsResponse {
  protocols: Protocol[]
  pagination: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export default function ProtocolsPage() {
  const searchParams = useSearchParams()
  const [data, setData] = useState<ProtocolsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const page = parseInt(searchParams.get('page') || '1')

  useEffect(() => {
    async function fetchProtocols() {
      setLoading(true)
      setError(null)

      try {
        const params = new URLSearchParams()
        if (query) params.set('q', query)
        if (category) params.set('specialty', category)
        params.set('page', page.toString())
        params.set('limit', '20')

        const res = await fetch(`/api/protocols?${params.toString()}`)
        if (!res.ok) throw new Error('Failed to fetch protocols')

        const data = await res.json()
        setData(data)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred')
      } finally {
        setLoading(false)
      }
    }

    fetchProtocols()
  }, [query, category, page])

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">
              {query
                ? `Rezultate pentru "${query}"`
                : category
                ? `Protocoale - ${category}`
                : 'Toate Protocoalele'}
            </h1>

            {/* Search Bar */}
            <div className="max-w-2xl">
              <SearchBar />
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6">
            <div className="flex items-center gap-2 flex-wrap">
              <Button variant="outline" size="sm">
                <SlidersHorizontal className="h-4 w-4 mr-2" />
                Filtre
              </Button>

              {query && (
                <Badge variant="secondary" className="text-sm">
                  Căutare: {query}
                </Badge>
              )}

              {category && (
                <Badge variant="secondary" className="text-sm">
                  Categorie: {category}
                </Badge>
              )}
            </div>
          </div>

          <Separator className="my-6" />

          {/* Results */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-medical-blue" />
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-red-600 mb-4">Eroare: {error}</p>
              <Button onClick={() => window.location.reload()}>
                Încearcă din nou
              </Button>
            </div>
          ) : data && data.protocols.length > 0 ? (
            <>
              {/* Results Count */}
              <div className="mb-6">
                <p className="text-muted-foreground">
                  {data.pagination.total} {data.pagination.total === 1 ? 'protocol găsit' : 'protocoale găsite'}
                </p>
              </div>

              {/* Protocol Grid */}
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                {data.protocols.map((protocol) => (
                  <ProtocolCard key={protocol.id} protocol={protocol} />
                ))}
              </div>

              {/* Pagination */}
              {data.pagination.totalPages > 1 && (
                <div className="flex justify-center gap-2">
                  {Array.from({ length: data.pagination.totalPages }, (_, i) => i + 1).map(
                    (pageNum) => (
                      <Button
                        key={pageNum}
                        variant={pageNum === page ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          const params = new URLSearchParams(searchParams.toString())
                          params.set('page', pageNum.toString())
                          window.location.href = `/protocoale?${params.toString()}`
                        }}
                      >
                        {pageNum}
                      </Button>
                    )
                  )}
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔍</div>
              <h3 className="text-xl font-semibold mb-2">
                Nu s-au găsit protocoale
              </h3>
              <p className="text-muted-foreground mb-6">
                Încearcă să modifici criteriile de căutare
              </p>
              <Button onClick={() => (window.location.href = '/protocoale')}>
                Resetează filtrele
              </Button>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
