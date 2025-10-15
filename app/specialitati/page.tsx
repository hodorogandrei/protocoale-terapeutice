import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { CategoryCard } from '@/components/protocol/category-card'
import { Separator } from '@/components/ui/separator'

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

export default async function SpecialtiesPage() {
  const stats = await getStats()

  const categoryCounts = stats?.categoryCounts || {}
  const sortedCategories = Object.entries(categoryCounts).sort(
    ([, a], [, b]) => (b as number) - (a as number)
  )

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container px-4">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold mb-4">Specialități Medicale</h1>
            <p className="text-lg text-muted-foreground max-w-2xl">
              Explorează protocoalele terapeutice organizate pe specialități medicale.
              Fiecare specialitate conține protocoale specifice pentru tratamentul
              diferitelor afecțiuni.
            </p>
          </div>

          {/* Stats */}
          {stats && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <div className="text-3xl font-bold text-medical-blue">
                  {Object.keys(categoryCounts).length}
                </div>
                <div className="text-sm text-gray-600">Specialități</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <div className="text-3xl font-bold text-medical-green">
                  {stats.totalProtocols}
                </div>
                <div className="text-sm text-gray-600">Total Protocoale</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <div className="text-3xl font-bold text-medical-blue">
                  {Math.round(stats.totalProtocols / Object.keys(categoryCounts).length)}
                </div>
                <div className="text-sm text-gray-600">Medie/Specialitate</div>
              </div>
              <div className="bg-white p-4 rounded-lg shadow-md text-center">
                <div className="text-3xl font-bold text-medical-green">
                  {Math.max(...Object.values(categoryCounts) as number[])}
                </div>
                <div className="text-sm text-gray-600">Cel Mai Popular</div>
              </div>
            </div>
          )}

          <Separator className="my-8" />

          {/* Categories Grid */}
          {sortedCategories.length > 0 ? (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sortedCategories.map(([category, count]) => (
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
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🏥</div>
              <h3 className="text-xl font-semibold mb-2">
                Nicio specialitate disponibilă
              </h3>
              <p className="text-muted-foreground">
                Rulează scraper-ul pentru a popula baza de date cu protocoale.
              </p>
            </div>
          )}

          {/* Additional Info */}
          <div className="mt-12 bg-blue-50 rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-3">
              Despre Specialitățile Medicale
            </h3>
            <p className="text-muted-foreground mb-4">
              Protocoalele terapeutice sunt organizate pe specialități medicale pentru
              a facilita accesul rapid la informațiile relevante. Fiecare protocol
              este asociat cu una sau mai multe specialități în funcție de afecțiunea
              tratată și medicamentele prescrise.
            </p>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div>
                <h4 className="font-semibold mb-2">Categorii Principale:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Oncologie - Tratamente oncologice</li>
                  <li>• Reumatologie - Afecțiuni reumatismale</li>
                  <li>• Cardiologie - Boli cardiovasculare</li>
                  <li>• Neurologie - Afecțiuni neurologice</li>
                </ul>
              </div>
              <div>
                <h4 className="font-semibold mb-2">Caracteristici:</h4>
                <ul className="space-y-1 text-muted-foreground">
                  <li>• Protocoale actualizate regulat</li>
                  <li>• Criterii de includere clare</li>
                  <li>• Informații despre prescriptori</li>
                  <li>• Link-uri către surse oficiale</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
