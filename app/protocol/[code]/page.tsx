import { notFound } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Header } from '@/components/layout/header'
import { Footer } from '@/components/layout/footer'
import { ProtocolViewer } from '@/components/protocol/protocol-viewer'
import { Button } from '@/components/ui/button'
import type { Protocol } from '@/types/protocol'

async function getProtocol(code: string): Promise<Protocol | null> {
  try {
    const res = await fetch(`http://localhost:3000/api/protocols/${code}`, {
      cache: 'no-store',
    })

    if (!res.ok) return null

    return res.json()
  } catch (error) {
    return null
  }
}

export default async function ProtocolPage({
  params,
}: {
  params: { code: string }
}) {
  const protocol = await getProtocol(params.code)

  if (!protocol) {
    notFound()
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1 py-8">
        <div className="container px-4">
          {/* Back Button */}
          <Link href="/protocoale">
            <Button variant="ghost" className="mb-6">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Înapoi la protocoale
            </Button>
          </Link>

          {/* Protocol Viewer */}
          <ProtocolViewer protocol={protocol} />
        </div>
      </main>

      <Footer />
    </div>
  )
}

// Generate metadata for SEO
export async function generateMetadata({
  params,
}: {
  params: { code: string }
}) {
  const protocol = await getProtocol(params.code)

  if (!protocol) {
    return {
      title: 'Protocol negăsit',
    }
  }

  return {
    title: `${protocol.code} - ${protocol.title} | Protocoale Terapeutice`,
    description: protocol.dci
      ? `Protocol terapeutic pentru ${protocol.dci}. ${protocol.title}`
      : protocol.title,
    keywords: [
      protocol.code,
      protocol.title,
      protocol.dci,
      ...protocol.categories,
      ...protocol.keywords,
    ].filter(Boolean),
  }
}
