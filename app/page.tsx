import Link from 'next/link'
import { ArrowRight, FileText, Search as SearchIcon, Zap } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SearchBar } from '@/components/protocol/search-bar'
import { CategoryCard } from '@/components/protocol/category-card'
import { Button } from '@/components/ui/button'
import { formatDateShort } from '@/lib/utils'

async function getStats() {
  try {
    const res = await fetch(`http://localhost:3000/api/stats`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    return null
  }
}

export default async function HomePage() {
  const stats = await getStats()

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="bg-gradient-to-b from-blue-50 to-white py-16 md:py-24">
          <div className="container px-4">
            <div className="text-center mb-12">
              <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4">
                Protocoale Terapeutice România
              </h1>
              <p className="text-lg md:text-xl text-gray-600 max-w-2xl mx-auto">
                Platformă modernă pentru accesarea protocoalelor terapeutice CNAS.
                Căutare rapidă, vizualizare structurată, conținut complet.
              </p>
            </div>

            {/* Search Bar */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <SearchBar />
              </div>
            </div>

            {/* Stats */}
            {stats && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                  <div className="text-3xl font-bold text-medical-blue">
                    {stats.totalProtocols}
                  </div>
                  <div className="text-sm text-gray-600">Protocoale</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                  <div className="text-3xl font-bold text-medical-green">
                    {Object.keys(stats.categoryCounts || {}).length}
                  </div>
                  <div className="text-sm text-gray-600">Specialități</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                  <div className="text-3xl font-bold text-medical-blue">
                    100%
                  </div>
                  <div className="text-sm text-gray-600">Conținut Extras</div>
                </div>
                <div className="bg-white p-4 rounded-lg shadow-md text-center">
                  <div className="text-sm font-semibold text-gray-700">
                    {stats.lastUpdate
                      ? formatDateShort(stats.lastUpdate)
                      : 'N/A'}
                  </div>
                  <div className="text-sm text-gray-600">Ultima Actualizare</div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Features Section */}
        <section className="py-16 md:py-24">
          <div className="container px-4">
            <h2 className="text-3xl font-bold text-center mb-12">
              De ce să folosești această platformă?
            </h2>

            <div className="grid md:grid-cols-3 gap-8">
              <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">🔍</div>
                <h3 className="text-xl font-bold mb-3">Căutare Avansată</h3>
                <p className="text-gray-600">
                  Caută rapid după medicament, boală, specialitate sau cod protocol.
                  Rezultate instant cu highlighting.
                </p>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">📄</div>
                <h3 className="text-xl font-bold mb-3">Conținut Complet</h3>
                <p className="text-gray-600">
                  Vizualizează întregul conținut al protocoalelor, nu doar PDF-uri.
                  Text formatat, tabele, imagini - totul accesibil.
                </p>
              </div>

              <div className="bg-white p-8 rounded-lg shadow-md hover:shadow-lg transition-shadow">
                <div className="text-4xl mb-4">⚡</div>
                <h3 className="text-xl font-bold mb-3">Actualizări Automate</h3>
                <p className="text-gray-600">
                  Protocoale actualizate zilnic direct de pe site-ul CNAS.
                  Notificări pentru modificări.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section */}
        {stats && stats.categoryCounts && Object.keys(stats.categoryCounts).length > 0 && (
          <section className="py-16 bg-gray-50">
            <div className="container px-4">
              <div className="flex items-center justify-between mb-8">
                <h2 className="text-3xl font-bold">Explorează după Specialitate</h2>
                <Link href="/specialitati">
                  <Button variant="outline">
                    Vezi toate
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {Object.entries(stats.categoryCounts)
                  .slice(0, 8)
                  .map(([category, count]) => (
                    <CategoryCard
                      key={category}
                      title={category}
                      icon={getCategoryIcon(category)}
                      count={count as number}
                      href={`/protocoale?category=${encodeURIComponent(category)}`}
                    />
                  ))}
              </div>
            </div>
          </section>
        )}

        {/* CTA Section */}
        <section className="py-16 md:py-24 bg-medical-blue text-white">
          <div className="container px-4 text-center">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Gata să începi?
            </h2>
            <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
              Accesează protocoalele terapeutice într-un mod modern, rapid și ușor de utilizat
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/protocoale">
                <Button size="lg" variant="secondary">
                  <FileText className="mr-2 h-5 w-5" />
                  Toate Protocoalele
                </Button>
              </Link>
              <Link href="/protocoale">
                <Button size="lg" variant="outline" className="bg-transparent text-white border-white hover:bg-white hover:text-medical-blue">
                  <SearchIcon className="mr-2 h-5 w-5" />
                  Caută Protocol
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function getCategoryIcon(category: string): string {
  const icons: Record<string, string> = {
    'Oncologie': '🎗️',
    'Reumatologie': '🦴',
    'Cardiologie': '❤️',
    'Neurologie': '🧠',
    'Endocrinologie': '💉',
    'Pneumologie': '🫁',
    'Gastroenterologie': '🔬',
    'Hematologie': '🩸',
    'Nefrologie': '🫘',
    'Psihiatrie': '🧘',
    'Dermatologie': '🩹',
    'Oftalmologie': '👁️',
  }
  return icons[category] || '📋'
}
