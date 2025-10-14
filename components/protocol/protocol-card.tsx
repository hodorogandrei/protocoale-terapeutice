import Link from 'next/link'
import { FileText, Download, Calendar } from 'lucide-react'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BookmarkButton } from '@/components/protocol/bookmark-button'
import { formatDateShort } from '@/lib/utils'
import type { Protocol } from '@/types/protocol'

interface ProtocolCardProps {
  protocol: Protocol
}

export function ProtocolCard({ protocol }: ProtocolCardProps) {
  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="outline">{protocol.code}</Badge>
              {protocol.verified && (
                <Badge variant="secondary" className="text-xs">
                  Verificat
                </Badge>
              )}
            </div>
            <CardTitle className="text-lg leading-tight">
              <Link
                href={`/protocol/${protocol.code}`}
                className="hover:text-medical-blue transition-colors"
              >
                {protocol.title}
              </Link>
            </CardTitle>
            {protocol.dci && (
              <CardDescription className="mt-1">
                DCI: {protocol.dci}
              </CardDescription>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-2">
          {/* Categories */}
          {protocol.categories.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {protocol.categories.slice(0, 3).map((category) => (
                <Badge key={category} variant="secondary" className="text-xs">
                  {category}
                </Badge>
              ))}
            </div>
          )}

          {/* Prescribers info */}
          {protocol.canFamilyDoctor && (
            <div className="text-sm text-green-600 flex items-center gap-1">
              <span className="font-medium">✓</span>
              <span>Poate fi prescris de medicul de familie</span>
            </div>
          )}

          {/* Last update */}
          {protocol.lastUpdateDate && (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Calendar className="h-3 w-3" />
              <span>Actualizat: {formatDateShort(protocol.lastUpdateDate)}</span>
            </div>
          )}

          {/* Extraction quality indicator */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full ${
                  protocol.extractionQuality >= 80
                    ? 'bg-green-500'
                    : protocol.extractionQuality >= 60
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${protocol.extractionQuality}%` }}
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {protocol.extractionQuality.toFixed(0)}%
            </span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="flex justify-between">
        <Link href={`/protocol/${protocol.code}`}>
          <Button variant="outline" size="sm">
            <FileText className="h-4 w-4 mr-2" />
            Vizualizează
          </Button>
        </Link>

        <div className="flex gap-2">
          <BookmarkButton
            protocolId={protocol.id}
            code={protocol.code}
            title={protocol.title}
          />
          <a href={protocol.officialPdfUrl} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon">
              <Download className="h-4 w-4" />
              <span className="sr-only">Descarcă PDF</span>
            </Button>
          </a>
        </div>
      </CardFooter>
    </Card>
  )
}
