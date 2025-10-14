'use client'

import { useState } from 'react'
import { Download, Printer, Share2, FileText } from 'lucide-react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { BookmarkButton } from '@/components/protocol/bookmark-button'
import type { Protocol } from '@/types/protocol'
import { formatDate, formatDateShort } from '@/lib/utils'
import { UI_TEXT } from '@/types/protocol'

interface ProtocolViewerProps {
  protocol: Protocol
}

export function ProtocolViewer({ protocol }: ProtocolViewerProps) {
  const [viewMode, setViewMode] = useState<'document' | 'structured' | 'pdf'>('structured')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-3">
              <Badge variant="outline" className="text-lg px-3 py-1">
                {protocol.code}
              </Badge>
              {protocol.verified && (
                <Badge variant="secondary">✓ Verificat</Badge>
              )}
              <Badge
                variant={
                  protocol.extractionQuality >= 80
                    ? 'default'
                    : protocol.extractionQuality >= 60
                    ? 'secondary'
                    : 'destructive'
                }
              >
                Calitate: {protocol.extractionQuality.toFixed(0)}%
              </Badge>
            </div>

            <h1 className="text-3xl md:text-4xl font-bold mb-3">
              {protocol.title}
            </h1>

            {protocol.dci && (
              <p className="text-lg text-muted-foreground">
                <span className="font-semibold">DCI:</span> {protocol.dci}
              </p>
            )}
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {protocol.lastUpdateDate && (
            <div className="text-sm">
              <div className="text-muted-foreground">Ultima Actualizare</div>
              <div className="font-semibold">
                {formatDateShort(protocol.lastUpdateDate)}
              </div>
            </div>
          )}

          {protocol.orderNumber && (
            <div className="text-sm">
              <div className="text-muted-foreground">Ordin</div>
              <div className="font-semibold">{protocol.orderNumber}</div>
            </div>
          )}

          {protocol.canFamilyDoctor && (
            <div className="text-sm">
              <div className="text-muted-foreground">Prescriptor</div>
              <div className="font-semibold text-green-600">
                ✓ Medic de familie
              </div>
            </div>
          )}

          {protocol.version > 1 && (
            <div className="text-sm">
              <div className="text-muted-foreground">Versiune</div>
              <div className="font-semibold">v{protocol.version}</div>
            </div>
          )}
        </div>

        {/* Categories and Prescribers */}
        <div className="flex flex-wrap gap-2">
          {protocol.categories.map((category) => (
            <Badge key={category} variant="secondary">
              {category}
            </Badge>
          ))}
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          <a
            href={protocol.officialPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            download
          >
            <Button>
              <Download className="mr-2 h-4 w-4" />
              Descarcă PDF Original
            </Button>
          </a>

          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 h-4 w-4" />
            Tipărește
          </Button>

          <BookmarkButton
            protocolId={protocol.id}
            code={protocol.code}
            title={protocol.title}
            variant="outline"
            size="default"
            showText
          />

          <Button
            variant="outline"
            onClick={() => {
              navigator.clipboard.writeText(window.location.href)
              alert('Link copiat în clipboard!')
            }}
          >
            <Share2 className="mr-2 h-4 w-4" />
            Partajează
          </Button>
        </div>
      </div>

      <Separator />

      {/* Viewing Modes */}
      <Tabs defaultValue="structured" value={viewMode} onValueChange={(v) => setViewMode(v as any)}>
        <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3">
          <TabsTrigger value="structured">
            {UI_TEXT.protocol.viewModes.structured}
          </TabsTrigger>
          <TabsTrigger value="document">
            {UI_TEXT.protocol.viewModes.document}
          </TabsTrigger>
          <TabsTrigger value="pdf">
            {UI_TEXT.protocol.viewModes.pdf}
          </TabsTrigger>
        </TabsList>

        {/* Structured View */}
        <TabsContent value="structured" className="mt-6">
          <StructuredView protocol={protocol} />
        </TabsContent>

        {/* Document View */}
        <TabsContent value="document" className="mt-6">
          <DocumentView protocol={protocol} />
        </TabsContent>

        {/* PDF View */}
        <TabsContent value="pdf" className="mt-6">
          <PDFView protocol={protocol} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Structured View - Organized in tabs by section
function StructuredView({ protocol }: { protocol: Protocol }) {
  if (!protocol.sections || protocol.sections.length === 0) {
    return <DocumentView protocol={protocol} />
  }

  return (
    <Tabs defaultValue={protocol.sections[0]?.type || 'all'} className="w-full">
      <TabsList className="w-full flex-wrap h-auto">
        {protocol.sections.map((section) => (
          <TabsTrigger key={section.id} value={section.type} className="text-sm">
            {UI_TEXT.protocol.sections[section.type as keyof typeof UI_TEXT.protocol.sections] || section.title}
          </TabsTrigger>
        ))}
      </TabsList>

      {protocol.sections.map((section) => (
        <TabsContent key={section.id} value={section.type} className="mt-6">
          <div className="prose prose-slate max-w-none">
            <h2 className="text-2xl font-bold mb-4">{section.title}</h2>
            <div
              dangerouslySetInnerHTML={{ __html: section.content }}
              className="protocol-content"
            />
          </div>
        </TabsContent>
      ))}
    </Tabs>
  )
}

// Document View - Full HTML content as a single document
function DocumentView({ protocol }: { protocol: Protocol }) {
  return (
    <div className="bg-white rounded-lg shadow-sm border p-8 print-friendly">
      <div className="prose prose-slate max-w-none">
        {/* Protocol Header */}
        <div className="not-prose mb-8">
          <h1 className="text-3xl font-bold mb-2">{protocol.title}</h1>
          {protocol.dci && (
            <p className="text-lg text-muted-foreground">DCI: {protocol.dci}</p>
          )}
          {protocol.orderNumber && (
            <p className="text-sm text-muted-foreground">
              Ordin: {protocol.orderNumber}
            </p>
          )}
        </div>

        {/* Full Content */}
        <div
          dangerouslySetInnerHTML={{ __html: protocol.htmlContent }}
          className="protocol-content"
        />

        {/* Images */}
        {protocol.images && protocol.images.length > 0 && (
          <div className="mt-8 space-y-4">
            <h3>Imagini și Diagrame</h3>
            {protocol.images.map((image) => (
              <div key={image.id} className="border rounded p-4">
                <img
                  src={image.imageUrl}
                  alt={image.altText || 'Protocol image'}
                  className="max-w-full h-auto"
                />
                {image.caption && (
                  <p className="text-sm text-muted-foreground mt-2">
                    {image.caption}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="not-prose mt-12 pt-6 border-t text-sm text-muted-foreground">
          <p>
            Sursa:{' '}
            <a
              href={protocol.cnasUrl || protocol.officialPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-medical-blue hover:underline"
            >
              CNAS România
            </a>
          </p>
          {protocol.lastUpdateDate && (
            <p>Ultima actualizare: {formatDate(protocol.lastUpdateDate)}</p>
          )}
        </div>
      </div>
    </div>
  )
}

// PDF View - Embedded PDF viewer
function PDFView({ protocol }: { protocol: Protocol }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-medical-blue" />
          <span className="font-semibold">Vizualizare PDF Original</span>
        </div>
        <a
          href={protocol.officialPdfUrl}
          target="_blank"
          rel="noopener noreferrer"
          download
        >
          <Button>
            <Download className="mr-2 h-4 w-4" />
            Descarcă
          </Button>
        </a>
      </div>

      {/* PDF Embed */}
      <div className="border rounded-lg overflow-hidden bg-gray-100">
        <iframe
          src={`${protocol.officialPdfUrl}#view=FitH`}
          className="w-full"
          style={{ height: '800px' }}
          title="Protocol PDF"
        />
      </div>

      <div className="text-sm text-muted-foreground text-center">
        <p>
          PDF-ul este afișat de pe site-ul oficial CNAS.{' '}
          <a
            href={protocol.officialPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-medical-blue hover:underline"
          >
            Deschide în pagină nouă
          </a>
        </p>
      </div>
    </div>
  )
}
