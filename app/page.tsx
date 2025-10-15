import Link from 'next/link'
import { ArrowRight, FileText, Search, Zap, Sparkles, Activity } from 'lucide-react'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { AdvancedSearchBar } from '@/components/protocol/advanced-search-bar'
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
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">
      <Header />

      <main className="flex-1">
        {/* Hero Section - Fluid Design */}
        <section className="relative overflow-hidden">
          {/* Animated Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-purple-500/5 to-pink-500/5" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(59,130,246,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,rgba(168,85,247,0.08),transparent_50%)]" />

          <div className="relative py-8 md:py-10">
            {/* Hero Content - Centered */}
            <div className="px-4 md:px-8 lg:px-12">
              <div className="mb-6 md:mb-8 text-center max-w-5xl mx-auto">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100/80 backdrop-blur-sm rounded-full mb-4">
                  <Sparkles className="h-4 w-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-700">Platformă independentă voluntară</span>
                </div>
                <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold text-gray-900 mb-4 tracking-tight leading-tight">
                  Protocoale <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Terapeutice</span>
                </h1>
                <p className="text-lg md:text-xl lg:text-2xl text-gray-600 leading-relaxed">
                  Căutare inteligentă. Informații structurate.
                </p>
              </div>

              {/* Advanced Search Bar - Centered */}
              <div className="mb-6 md:mb-8 max-w-4xl mx-auto relative z-50">
                <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-2xl p-4 md:p-6 border border-white/20">
                  <AdvancedSearchBar autoFocus showHistory />
                </div>
              </div>
            </div>

            {/* Important Disclaimer - Full Width */}
            <div className="mb-8 md:mb-12 relative z-10">
              <div className="bg-amber-50/90 backdrop-blur-sm border-y-2 border-amber-300/70 py-6 md:py-8 shadow-lg">
                <div className="flex items-start gap-4 md:gap-6 max-w-[95vw] mx-auto px-6 md:px-12 lg:px-16">
                  <span className="text-amber-600 text-3xl md:text-4xl flex-shrink-0 mt-1">⚠️</span>
                  <div className="flex-1">
                    <h3 className="text-lg md:text-2xl font-bold text-gray-900 mb-4 md:mb-6">Informații Importante</h3>

                    <div className="grid md:grid-cols-2 gap-4 md:gap-6">
                      <p className="text-sm md:text-base text-gray-800 leading-relaxed">
                        Aceasta este o platformă <strong>independentă</strong>, fără nicio afiliere cu CNAS sau alte instituții guvernamentale. Toate datele sunt extrase automat din{' '}
                        <a
                          href="https://cnas.ro/protocoale-terapeutice/"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline font-semibold"
                        >
                          baza de date oficială a CNAS
                        </a>
                        .
                      </p>

                      <p className="text-sm md:text-base text-gray-800 leading-relaxed md:pl-6 md:border-l-2 md:border-amber-300">
                        Platforma a fost dezvoltată pe bază <strong>voluntară</strong>, astfel <strong>pot exista erori de extracție și/sau întârzieri</strong> comparativ cu sursa oficială. Deși facem tot posibilul să prezentăm informații actualizate într-un format accesibil, <strong className="text-red-700">NU putem garanta acuratețea</strong> informațiilor. Vă încurajăm să <strong className="text-red-700">verificați informațiile cu un profesionist medical calificat (de exemplu, un medic specialist sau medic de familie)</strong> și să consultați sursa oficială CNAS înainte de a lua orice decizie, <strong>mai ales în situații critice</strong>.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats - Centered Layout */}
            <div className="px-4 md:px-8 lg:px-12">
              {stats && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 md:gap-4 max-w-5xl mx-auto">
                  <Link href="/protocoale" className="group">
                    <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-white/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 rounded-xl group-hover:bg-blue-200 transition-colors">
                          <FileText className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
                        </div>
                        <div>
                          <div className="text-3xl md:text-4xl font-bold text-gray-900">
                            {stats.totalProtocols}
                          </div>
                          <div className="text-xs md:text-sm font-medium text-gray-600">Protocoale</div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <Link href="/specialitati" className="group">
                    <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 border border-white/50">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-100 rounded-xl group-hover:bg-green-200 transition-colors">
                          <Activity className="h-6 w-6 md:h-8 md:w-8 text-green-600" />
                        </div>
                        <div>
                          <div className="text-3xl md:text-4xl font-bold text-gray-900">
                            {Object.keys(stats.categoryCounts || {}).length}
                          </div>
                          <div className="text-xs md:text-sm font-medium text-gray-600">Specialități</div>
                        </div>
                      </div>
                    </div>
                  </Link>

                  <div className="bg-white/80 backdrop-blur-sm p-4 md:p-6 rounded-2xl shadow-lg border border-white/50">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-100 rounded-xl">
                        <Sparkles className="h-6 w-6 md:h-8 md:w-8 text-purple-600" />
                      </div>
                      <div>
                        <div className="text-xl md:text-2xl font-semibold text-gray-900">
                          {stats.lastUpdate ? formatDateShort(stats.lastUpdate) : 'În actualizare'}
                        </div>
                        <div className="text-xs md:text-sm font-medium text-gray-600">Actualizare</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Features Section - Centered */}
        <section className="py-16 md:py-24 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/20 to-purple-50/20" />

          <div className="relative px-4 md:px-8 lg:px-12">
            <div className="mb-10 text-center max-w-4xl mx-auto">
              <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-4">
                La ce este utilă<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                  această platformă?
                </span>
              </h2>
              <p className="text-xl text-gray-600">
                Tehnologie modernă pentru accesul la informații medicale esențiale
              </p>
            </div>

            <div className="grid lg:grid-cols-3 gap-6 md:gap-8">
              <div className="group bg-gradient-to-br from-white to-blue-50/30 p-8 md:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/50">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Search className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Căutare Inteligentă</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Sugestii automate, istoric căutări, rezultate instant după medicament sau boală.
                </p>
              </div>

              <div className="group bg-gradient-to-br from-white to-purple-50/30 p-8 md:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/50">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Conținut Structurat</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Vizualizare organizată, text formatat, tabele interactive și navigare intuitivă.
                </p>
              </div>

              <div className="group bg-gradient-to-br from-white to-pink-50/30 p-8 md:p-10 rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-500 hover:-translate-y-2 border border-white/50">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-500 to-pink-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl md:text-3xl font-bold mb-4">Acces Rapid</h3>
                <p className="text-gray-600 text-lg leading-relaxed">
                  Interfață rapidă și intuitivă pentru accesarea protocoalelor terapeutice.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Categories Section - Fluid */}
        {stats && stats.categoryCounts && Object.keys(stats.categoryCounts).length > 0 && (
          <section className="py-16 md:py-24 relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50/20">
            <div className="px-4 md:px-8 lg:px-12">
              <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between mb-12 gap-6">
                <div>
                  <h2 className="text-4xl md:text-6xl font-bold tracking-tight mb-3">
                    Explorează după<br />
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">
                      Specialitate
                    </span>
                  </h2>
                  <p className="text-xl text-gray-600">
                    {Object.keys(stats.categoryCounts).length} specialități medicale disponibile
                  </p>
                </div>
                <Link href="/specialitati">
                  <Button size="lg" className="text-base px-8 h-14 rounded-xl bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
                    Vezi toate specialitățile
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
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

        {/* CTA Section - Fluid */}
        <section className="relative py-20 md:py-28 overflow-hidden">
          {/* Animated Gradient Background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_50%,rgba(255,255,255,0.1),transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_50%,rgba(255,255,255,0.08),transparent_50%)]" />

          <div className="relative px-4 md:px-8 lg:px-12">
            <div className="max-w-4xl">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full mb-8">
                <Sparkles className="h-4 w-4 text-white" />
                <span className="text-sm font-medium text-white">Începe acum</span>
              </div>

              <h2 className="text-5xl md:text-7xl font-bold mb-8 text-white tracking-tight leading-tight">
                Găsește protocolul<br />
                de care ai nevoie
              </h2>

              <p className="text-xl md:text-2xl mb-12 text-white/90 leading-relaxed max-w-2xl">
                Acces instant la peste {stats?.totalProtocols || 320} protocoale terapeutice din baza de date CNAS
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/protocoale">
                  <Button size="lg" className="text-lg px-10 py-7 h-auto rounded-xl bg-white text-blue-600 hover:bg-gray-100 shadow-2xl">
                    <FileText className="mr-3 h-6 w-6" />
                    Explorează Protocoalele
                  </Button>
                </Link>
                <Link href="/specialitati">
                  <Button size="lg" variant="outline" className="text-lg px-10 py-7 h-auto rounded-xl bg-transparent text-white border-2 border-white hover:bg-white hover:text-blue-600">
                    <Activity className="mr-3 h-6 w-6" />
                    Vezi Specialitățile
                  </Button>
                </Link>
              </div>
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
