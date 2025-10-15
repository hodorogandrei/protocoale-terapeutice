import Link from 'next/link'
import { ArrowRight, FileText, Search as SearchIcon, Zap } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { SearchBar } from '@/components/protocol/search-bar'
import { CategoryCard } from '@/components/protocol/category-card'
import { Button } from '@/components/ui/button'
import { formatDateShort } from '@/lib/utils'

// Force dynamic rendering
export const dynamic = 'force-dynamic'
export const revalidate = 0

async function getStats() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:4444'
    const res = await fetch(`${baseUrl}/api/stats`, {
      cache: 'no-store',
    })
    if (!res.ok) return null
    return res.json()
  } catch (error) {
    console.error('Error fetching stats:', error)
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
            <div className="max-w-3xl mx-auto mb-8">
              <div className="bg-white rounded-lg shadow-lg p-6">
                <SearchBar />
              </div>
            </div>

            {/* Disclaimer and Mentions */}
            <div className="max-w-3xl mx-auto mb-12">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
                <div className="flex items-start gap-3">
                  <div className="text-amber-600 text-xl mt-0.5">ℹ️</div>
                  <div className="flex-1 space-y-2">
                    <p className="text-gray-800 font-medium">
                      Platformă informațională neoficială
                    </p>
                    <div className="text-gray-700 space-y-1.5">
                      <p>
                        Această platformă oferă acces simplificat la protocoalele terapeutice publicate de{' '}
                        <a
                          href="https://cnas.ro/protocoale-terapeutice/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-medical-blue hover:underline font-medium"
                        >
                          CNAS
                        </a>
                        . Informațiile sunt extrase automat și pot conține erori sau întârzieri față de sursa oficială.
                      </p>
                      <p>
                        <strong>Nu reprezintă sfat medical.</strong> Pentru decizii terapeutice, consultați întotdeauna un medic specialist. Sursa oficială: {' '}
                        <a
                          href="https://cnas.ro/protocoale-terapeutice/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-medical-blue hover:underline"
                        >
                          cnas.ro/protocoale-terapeutice
                        </a>
                      </p>
                    </div>
                  </div>
                </div>
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
                  .sort(([, a], [, b]) => (b as number) - (a as number))
                  .map(([category, count]) => (
                    <CategoryCard
                      key={category}
                      title={category}
                      icon={getCategoryIcon(category)}
                      count={count as number}
                      href={`/protocoale?category=${encodeURIComponent(category)}`}
                      description={getCategoryDescription(category)}
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
    'Imunologie': '🛡️',
    'Boli Infecțioase': '🦠',
    'Ginecologie': '👩‍⚕️',
    'Urologie': '🩺',
    'Pediatrie': '👶',
    'Ortopedice': '🦿',
    'Anestezie': '💊',
    'ORL': '👂',
    'Parazitologie': '🔬',
    'Diverse': '📋',
  }
  return icons[category] || '📋'
}

function getCategoryDescription(category: string): string {
  const descriptions: Record<string, string> = {
    'Oncologie': 'Protocoale pentru tratamentul cancerului și terapii oncologice',
    'Reumatologie': 'Tratamente pentru afecțiuni reumatismale și articulare',
    'Cardiologie': 'Protocoale pentru afecțiuni cardiovasculare',
    'Neurologie': 'Tratamente pentru afecțiuni neurologice și cerebrale',
    'Endocrinologie': 'Protocoale pentru diabet, hormoni și metabolism',
    'Pneumologie': 'Tratamente pentru afecțiuni respiratorii',
    'Gastroenterologie': 'Protocoale pentru afecțiuni digestive și hepatice',
    'Hematologie': 'Tratamente pentru afecțiuni hematologice și sanguine',
    'Nefrologie': 'Protocoale pentru afecțiuni renale',
    'Psihiatrie': 'Tratamente pentru afecțiuni psihiatrice și mentale',
    'Dermatologie': 'Protocoale pentru afecțiuni dermatologice',
    'Oftalmologie': 'Tratamente pentru afecțiuni oftalmologice',
    'Imunologie': 'Protocoale pentru afecțiuni imunitare și imunoterapie',
    'Boli Infecțioase': 'Tratamente pentru boli infecțioase și antivirale',
    'Ginecologie': 'Protocoale pentru afecțiuni ginecologice',
    'Urologie': 'Tratamente pentru afecțiuni urologice',
    'Pediatrie': 'Protocoale pentru copii și nou-născuți',
    'Ortopedice': 'Tratamente pentru afecțiuni osoase și articulare',
    'Anestezie': 'Protocoale pentru anestezie și analgezie',
    'ORL': 'Tratamente pentru afecțiuni ORL',
    'Parazitologie': 'Protocoale pentru boli parazitare',
    'Diverse': 'Alte protocoale terapeutice',
  }
  return descriptions[category] || 'Protocoale terapeutice'
}
