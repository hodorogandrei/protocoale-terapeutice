'use client'

/**
 * Formatted Protocol View Component
 *
 * Displays therapeutic protocols with intelligent section extraction
 * inspired by Mediately.co's structured presentation.
 *
 * CRITICAL: 100% content preservation
 * - Featured sections shown first for quick access
 * - Complete protocol text always available in "Text Complet" tab
 * - No content is ever hidden or removed
 */

import { useState } from 'react'
import { ChevronDown, ChevronUp, FileText, Layers } from 'lucide-react'
import { formatProtocol, formatSectionContent } from '@/lib/protocol-formatter'

interface FormattedProtocolViewProps {
  rawText: string
  protocolCode?: string
}

export function FormattedProtocolView({ rawText, protocolCode }: FormattedProtocolViewProps) {
  const formatted = formatProtocol(rawText)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(formatted.featuredSections.slice(0, 3).map(s => s.id)) // First 3 sections expanded by default
  )
  const [viewMode, setViewMode] = useState<'structured' | 'full'>('structured')

  const toggleSection = (sectionId: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev)
      if (next.has(sectionId)) {
        next.delete(sectionId)
      } else {
        next.add(sectionId)
      }
      return next
    })
  }

  const expandAll = () => {
    setExpandedSections(new Set(formatted.featuredSections.map(s => s.id)))
  }

  const collapseAll = () => {
    setExpandedSections(new Set())
  }

  return (
    <div className="space-y-4">
      {/* View Mode Toggle */}
      <div className="flex items-center justify-between border-b pb-3">
        <div className="flex gap-2">
          <button
            onClick={() => setViewMode('structured')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'structured'
                ? 'bg-medical-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Layers className="h-4 w-4" />
            Vizualizare Structurată
          </button>
          <button
            onClick={() => setViewMode('full')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              viewMode === 'full'
                ? 'bg-medical-blue text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <FileText className="h-4 w-4" />
            Text Complet
          </button>
        </div>

        {/* Expand/Collapse Controls (only in structured view) */}
        {viewMode === 'structured' && formatted.hasStructure && (
          <div className="flex gap-2">
            <button
              onClick={expandAll}
              className="text-sm text-medical-blue hover:underline"
            >
              Extinde Tot
            </button>
            <span className="text-gray-300">|</span>
            <button
              onClick={collapseAll}
              className="text-sm text-medical-blue hover:underline"
            >
              Restrânge Tot
            </button>
          </div>
        )}
      </div>

      {/* Extraction Confidence Indicator */}
      {formatted.hasStructure && formatted.extractionConfidence > 0 && viewMode === 'structured' && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <div className="flex items-center gap-2 text-sm text-blue-800">
            <Layers className="h-4 w-4" />
            <span>
              Structură detectată automat (
              {formatted.extractionConfidence >= 80 ? 'înaltă' :
               formatted.extractionConfidence >= 50 ? 'medie' : 'redusă'} încredere: {formatted.extractionConfidence}%)
            </span>
          </div>
          <p className="text-xs text-blue-600 mt-1">
            Secțiunile de mai jos au fost identificate automat. Pentru text complet nemodificat, vezi tab-ul &quot;Text Complet&quot;.
          </p>
        </div>
      )}

      {/* Structured View with Featured Sections */}
      {viewMode === 'structured' && (
        <div className="space-y-3">
          {formatted.hasStructure ? (
            <>
              {formatted.featuredSections.map((section) => {
                const isExpanded = expandedSections.has(section.id)

                return (
                  <div
                    key={section.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:border-medical-blue transition-colors"
                  >
                    {/* Section Header */}
                    <button
                      onClick={() => toggleSection(section.id)}
                      className="w-full flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                    >
                      <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                        <span className="text-medical-blue text-lg">
                          {section.order}.
                        </span>
                        {section.title}
                      </h3>
                      {isExpanded ? (
                        <ChevronUp className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      ) : (
                        <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                      )}
                    </button>

                    {/* Section Content */}
                    {isExpanded && (
                      <div className="p-6 bg-white">
                        {section.subsections && section.subsections.length > 0 ? (
                          // Render subsections
                          <div className="space-y-4">
                            {section.subsections.map((subsection) => (
                              <div key={subsection.id} className="border-l-2 border-medical-blue pl-4">
                                <h4 className="font-semibold text-gray-800 mb-2">
                                  {subsection.title}
                                </h4>
                                <div
                                  className="prose prose-sm max-w-none"
                                  dangerouslySetInnerHTML={{
                                    __html: formatSectionContent(subsection.content)
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        ) : (
                          // Render main content
                          <div
                            className="prose prose-sm max-w-none"
                            dangerouslySetInnerHTML={{
                              __html: formatSectionContent(section.content)
                            }}
                          />
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* Link to Full Text */}
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mt-6">
                <p className="text-sm text-amber-800">
                  <strong>Notă:</strong> Secțiunile de mai sus sunt extrase automat pentru acces rapid.
                  Pentru conținutul complet nemodificat al protocolului, comută la tab-ul{' '}
                  <button
                    onClick={() => setViewMode('full')}
                    className="font-semibold underline hover:text-amber-900"
                  >
                    Text Complet
                  </button>
                  .
                </p>
              </div>
            </>
          ) : (
            // No structure detected - show message and full text
            <div className="space-y-4">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700">
                  Nu s-a putut detecta o structură clară pentru acest protocol.
                  Textul complet este afișat mai jos.
                </p>
              </div>
              <div className="bg-white border border-gray-200 rounded-lg p-6">
                <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
                  {formatted.fullText}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full Text View (Always Available - 100% Content Preservation) */}
      {viewMode === 'full' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 text-sm text-blue-800 mb-2">
              <FileText className="h-4 w-4" />
              <strong>Text Complet Nemodificat</strong>
            </div>
            <p className="text-xs text-blue-700">
              Acest conținut reprezintă textul complet al protocolului așa cum a fost extras din PDF-ul oficial CNAS,
              fără nicio modificare sau filtrare. Pentru o vizualizare structurată cu secțiuni,
              comută la &quot;Vizualizare Structurată&quot;.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <pre className="whitespace-pre-wrap font-sans text-sm text-gray-700 leading-relaxed">
              {formatted.fullText}
            </pre>
          </div>
        </div>
      )}
    </div>
  )
}
