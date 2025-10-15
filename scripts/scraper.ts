/**
 * CNAS Therapeutic Protocols Web Scraper
 *
 * This script:
 * 1. Scrapes https://cnas.ro/protocoale-terapeutice/
 * 2. Finds all protocol links and PDF URLs
 * 3. Downloads PDFs
 * 4. Triggers PDF extraction pipeline
 * 5. Stores complete content in database
 */

import { CheerioCrawler, Dataset } from 'crawlee'
import { db } from '../lib/db'
import { extractPdfContent } from '../lib/pdf-extractor'
import {
  parseProtocolList as parseProtocolListNew,
  validateProtocols,
  enhanceProtocols,
  extractDetailedContent
} from '../lib/protocol-list-parser'
import * as fs from 'fs/promises'
import * as path from 'path'

const CNAS_BASE_URL = 'https://cnas.ro'
const PROTOCOLS_URL = `${CNAS_BASE_URL}/protocoale-terapeutice/`
const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

interface ScrapedProtocol {
  title: string
  code?: string
  pdfUrl: string
  cnasUrl?: string
  publishDate?: string
  orderNumber?: string
}

interface ParsedProtocol {
  code: string
  title: string
  dci?: string
  content: string
  startPage?: number
  endPage?: number
  confidence?: number
  additionalInfo?: string
}

export async function scrapeCNASProtocols() {
  console.log('🚀 Starting CNAS protocols scraper...')

  // Create scraper run record
  const scraperRun = await db.scraperRun.create({
    data: {
      status: 'running',
      startedAt: new Date(),
    },
  })

  try {
    // Ensure PDF storage directory exists
    await fs.mkdir(PDF_STORAGE_PATH, { recursive: true })

    const protocols: ScrapedProtocol[] = []

    // Configure the crawler
    const crawler = new CheerioCrawler({
      maxRequestsPerCrawl: 100, // Limit for testing
      async requestHandler({ request, $, log }) {
        log.info(`Processing ${request.url}`)

        // Strategy 1: Look for PDF links in main page
        const pdfLinks = $('a[href$=".pdf"], a[href*="/wp-content/uploads/"]')

        pdfLinks.each((_, element) => {
          const $el = $(element)
          const href = $el.attr('href')
          const text = $el.text().trim()

          if (!href) return

          // Make URL absolute
          const absoluteUrl = href.startsWith('http')
            ? href
            : `${CNAS_BASE_URL}${href.startsWith('/') ? '' : '/'}${href}`

          // Only process PDF files
          if (!absoluteUrl.toLowerCase().endsWith('.pdf')) return

          // Extract protocol info from link text or nearby elements
          const title = text || $el.closest('tr').find('td').first().text().trim()

          protocols.push({
            title: title || 'Protocol Terapeutic',
            pdfUrl: absoluteUrl,
            cnasUrl: request.url,
          })

          log.info(`Found PDF: ${absoluteUrl}`)
        })

        // Strategy 2: Look for protocol table structure
        $('table tr').each((_, row) => {
          const $row = $(row)
          const cells = $row.find('td')

          if (cells.length >= 2) {
            const firstCell = $(cells[0]).text().trim()
            const pdfLink = $row.find('a[href$=".pdf"]').attr('href')

            if (pdfLink) {
              const absoluteUrl = pdfLink.startsWith('http')
                ? pdfLink
                : `${CNAS_BASE_URL}${pdfLink.startsWith('/') ? '' : '/'}${pdfLink}`

              // Extract protocol code if available (e.g., A001E, B002C)
              const codeMatch = firstCell.match(/^([A-Z]\d{3}[A-Z]?)/)
              const code = codeMatch ? codeMatch[1] : undefined

              protocols.push({
                title: firstCell || 'Protocol Terapeutic',
                code,
                pdfUrl: absoluteUrl,
                cnasUrl: request.url,
              })
            }
          }
        })
      },
    })

    // Start crawling from the main protocols page
    await crawler.run([PROTOCOLS_URL])

    console.log(`\n📊 Scraping complete! Found ${protocols.length} protocols`)

    // Update scraper run with found protocols
    await db.scraperRun.update({
      where: { id: scraperRun.id },
      data: {
        protocolsFound: protocols.length,
      },
    })

    // Process each protocol
    let updated = 0
    let added = 0
    let failed = 0

    for (const protocol of protocols) {
      try {
        console.log(`\n📄 Processing: ${protocol.title}`)

        // Check if protocol already exists
        const existing = protocol.code
          ? await db.protocol.findUnique({ where: { code: protocol.code } })
          : await db.protocol.findFirst({
              where: {
                OR: [
                  { title: protocol.title },
                  { officialPdfUrl: protocol.pdfUrl },
                ],
              },
            })

        if (existing) {
          // Check if PDF URL has changed (indicating an update)
          if (existing.officialPdfUrl !== protocol.pdfUrl) {
            console.log(`   🔄 Protocol updated, re-downloading PDF...`)
            await downloadAndProcessProtocol(protocol, existing.id)
            updated++
          } else {
            console.log(`   ✓ Protocol already exists, skipping`)
          }
        } else {
          // New protocol - download and process
          console.log(`   ✨ New protocol, downloading PDF...`)
          await downloadAndProcessProtocol(protocol)
          added++
        }
      } catch (error) {
        console.error(`   ❌ Failed to process protocol: ${error}`)
        failed++
      }
    }

    // Complete scraper run
    await db.scraperRun.update({
      where: { id: scraperRun.id },
      data: {
        status: 'completed',
        completedAt: new Date(),
        protocolsUpdated: updated,
        protocolsAdded: added,
        protocolsFailed: failed,
        summary: {
          total: protocols.length,
          updated,
          added,
          failed,
          skipped: protocols.length - updated - added - failed,
        },
      },
    })

    console.log(`\n✅ Scraper finished successfully!`)
    console.log(`   📊 Summary:`)
    console.log(`      - Total found: ${protocols.length}`)
    console.log(`      - New: ${added}`)
    console.log(`      - Updated: ${updated}`)
    console.log(`      - Failed: ${failed}`)
    console.log(`      - Skipped: ${protocols.length - updated - added - failed}`)
  } catch (error) {
    console.error('❌ Scraper failed:', error)

    await db.scraperRun.update({
      where: { id: scraperRun.id },
      data: {
        status: 'failed',
        completedAt: new Date(),
        errorLog: error instanceof Error ? error.message : String(error),
      },
    })

    throw error
  }
}

/**
 * Parse protocol list PDF and extract individual protocols
 * (IMPROVED VERSION - uses advanced table extraction)
 */
async function parseProtocolList(
  pdfPath: string,
  rawText: string,
  pageCount: number,
  title: string
): Promise<ParsedProtocol[]> {
  try {
    // Use the new improved parser
    const result = await parseProtocolListNew(pdfPath, rawText, pageCount, title)

    if (!result.isProtocolList || result.protocols.length === 0) {
      return []
    }

    console.log(`   📊 Parser used ${result.method} method with ${result.quality}% quality`)

    // Validate and enhance protocols
    let protocols = validateProtocols(result.protocols)
    protocols = enhanceProtocols(protocols)

    // Extract detailed content for each protocol
    protocols = extractDetailedContent(protocols, rawText)

    console.log(`   ✅ Successfully parsed ${protocols.length} protocols`)

    return protocols
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    if (process.env.DEBUG) {
      console.error(`   ❌ Advanced parsing failed: ${errorMsg}`)
    }

    // Fallback to basic parsing if advanced parsing fails
    try {
      return parseProtocolListFallback(rawText)
    } catch (fallbackError) {
      const fallbackMsg = fallbackError instanceof Error ? fallbackError.message : String(fallbackError)
      console.error(`   ❌ Fallback parsing also failed: ${fallbackMsg}`)
      return []
    }
  }
}

/**
 * Fallback parser (original simple implementation)
 */
function parseProtocolListFallback(rawText: string): ParsedProtocol[] {
  const protocols: ParsedProtocol[] = []
  const lines = rawText.split('\n')
  let currentProtocol: ParsedProtocol | null = null
  let contentBuffer: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Check if this line starts a new protocol (more flexible pattern)
    const match = line.match(/^([A-Z]\d{3,4}[A-Z]?)\s+(.+)/)

    if (match) {
      // Save previous protocol if exists
      if (currentProtocol && contentBuffer.length > 0) {
        currentProtocol.content = contentBuffer.join('\n')
        protocols.push(currentProtocol)
      }

      // Start new protocol
      const [, code, title] = match
      currentProtocol = {
        code: code.trim(),
        title: title.trim(),
        content: '',
        confidence: 50 // Lower confidence for fallback method
      }
      contentBuffer = []

      // Try to extract DCI from next few lines
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const nextLine = lines[j].trim()
        if (nextLine.match(/DCI/i) || nextLine.match(/^[A-Z][a-z]+(\s*,\s*[A-Z][a-z]+)*$/)) {
          currentProtocol.dci = nextLine.replace(/DCI:?\s*/i, '').trim()
          break
        }
      }
    } else if (currentProtocol) {
      // Add content to current protocol
      contentBuffer.push(line)
    }
  }

  // Add final protocol
  if (currentProtocol && contentBuffer.length > 0) {
    currentProtocol.content = contentBuffer.join('\n')
    protocols.push(currentProtocol)
  }

  console.log(`   📋 Fallback parser found ${protocols.length} protocols`)
  return protocols
}

async function downloadAndProcessProtocol(
  protocol: ScrapedProtocol,
  existingId?: string
) {
  // Download PDF
  const pdfPath = await downloadPDF(protocol.pdfUrl, protocol.code)

  // Extract content from PDF
  console.log(`   🔍 Extracting content from PDF...`)
  const extractedContent = await extractPdfContent(pdfPath)

  // Try parsing as protocol list using improved parser
  console.log(`   🔍 Analyzing PDF structure...`)
  const individualProtocols = await parseProtocolList(
    pdfPath,
    extractedContent.rawText,
    extractedContent.metadata.pageCount,
    protocol.title
  )

  if (individualProtocols.length > 0) {
    console.log(`   📋 Detected protocol list with ${individualProtocols.length} protocols`)

    // Process each individual protocol from the list
    let processedCount = 0
    for (const individualProtocol of individualProtocols) {
      try {
        await processIndividualProtocol({
          code: individualProtocol.code,
          title: individualProtocol.title,
          dci: individualProtocol.dci,
          content: individualProtocol.content,
          originalPdfPath: pdfPath,
          sourcePdfUrl: protocol.pdfUrl,
          cnasUrl: protocol.cnasUrl,
          confidence: individualProtocol.confidence,
        })
        processedCount++
      } catch (error) {
        console.error(`   ❌ Failed to process ${individualProtocol.code}: ${error}`)
      }
    }

    console.log(`   ✅ Processed ${processedCount}/${individualProtocols.length} protocols from list`)
    return
  }

  // Single protocol - process normally
  console.log(`   📄 Processing as single protocol`)
  await processSingleProtocol(protocol, extractedContent, pdfPath, existingId)
}

async function processSingleProtocol(
  protocol: ScrapedProtocol,
  extractedContent: any,
  pdfPath: string,
  existingId?: string
) {
  // Sanitize extracted text to remove invalid UTF8 bytes
  const sanitizedRawText = sanitizeText(extractedContent.rawText)
  const sanitizedHtmlContent = sanitizeText(extractedContent.htmlContent)

  // Generate protocol code if not provided
  const code = protocol.code || generateProtocolCode(protocol.title, protocol.pdfUrl)

  // Create local PDF URL
  const localPdfUrl = `/data/pdfs/${path.basename(pdfPath)}`

  if (existingId) {
    // Update existing protocol with new version
    const existing = await db.protocol.findUnique({
      where: { id: existingId },
      select: { version: true },
    })

    const newVersion = (existing?.version || 1) + 1

    await db.protocol.update({
      where: { id: existingId },
      data: {
        title: protocol.title,
        officialPdfUrl: protocol.pdfUrl,
        storedPdfUrl: localPdfUrl,
        cnasUrl: protocol.cnasUrl,
        rawText: sanitizedRawText,
        htmlContent: sanitizedHtmlContent,
        structuredJson: extractedContent.structuredJson as any,
        version: newVersion,
        extractionQuality: extractedContent.quality,
        lastUpdateDate: new Date(),
        updatedAt: new Date(),
      },
    })

    console.log(`   ✅ Protocol updated (v${newVersion})`)
  } else {
    // Create new protocol
    await db.protocol.create({
      data: {
        code,
        title: protocol.title,
        officialPdfUrl: protocol.pdfUrl,
        storedPdfUrl: localPdfUrl,
        cnasUrl: protocol.cnasUrl,
        rawText: sanitizedRawText,
        htmlContent: sanitizedHtmlContent,
        structuredJson: extractedContent.structuredJson as any,
        sublists: extractedContent.sublists || [],
        prescribers: extractedContent.prescribers || [],
        categories: extractedContent.categories || [],
        keywords: extractedContent.keywords || [],
        extractionQuality: extractedContent.quality,
        publishDate: new Date(),
        lastUpdateDate: new Date(),
      },
    })

    console.log(`   ✅ Protocol created`)
  }
}

async function processIndividualProtocol(data: {
  code: string
  title: string
  dci?: string
  content: string
  originalPdfPath: string
  sourcePdfUrl: string
  cnasUrl?: string
  confidence?: number
}) {
  try {
    // Validate inputs
    if (!data.code || !data.title) {
      throw new Error(`Invalid protocol data: missing code or title`)
    }

    // Check if protocol already exists
    const existing = await db.protocol.findUnique({
      where: { code: data.code },
    })

    // Sanitize content
    const sanitizedContent = sanitizeText(data.content)
    const sanitizedHtmlContent = `<div class="protocol"><h1>${sanitizeText(data.title)}</h1><pre>${sanitizeText(data.content)}</pre></div>`

    // Local PDF URL points to the list PDF
    const localPdfUrl = `/data/pdfs/${path.basename(data.originalPdfPath)}`

    // Use confidence score if provided, otherwise default to 85
    const extractionQuality = data.confidence || 85

    if (existing) {
      // Update existing
      await db.protocol.update({
        where: { code: data.code },
        data: {
          title: data.title,
          dci: data.dci,
          officialPdfUrl: data.sourcePdfUrl,
          storedPdfUrl: localPdfUrl,
          cnasUrl: data.cnasUrl,
          rawText: sanitizedContent,
          htmlContent: sanitizedHtmlContent,
          extractionQuality,
          lastUpdateDate: new Date(),
          updatedAt: new Date(),
        },
      })
      console.log(`      ✓ Updated ${data.code} (confidence: ${extractionQuality}%)`)
    } else {
      // Create new
      await db.protocol.create({
        data: {
          code: data.code,
          title: data.title,
          dci: data.dci,
          officialPdfUrl: data.sourcePdfUrl,
          storedPdfUrl: localPdfUrl,
          cnasUrl: data.cnasUrl,
          rawText: sanitizedContent,
          htmlContent: sanitizedHtmlContent,
          sublists: [],
          prescribers: [],
          categories: [],
          keywords: [],
          extractionQuality,
          publishDate: new Date(),
          lastUpdateDate: new Date(),
        },
      })
      console.log(`      ✓ Created ${data.code} (confidence: ${extractionQuality}%)`)
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`      ✗ Failed to process ${data.code}: ${errorMsg}`)
    throw error // Re-throw to be caught by caller
  }
}

async function downloadPDF(url: string, code?: string): Promise<string> {
  console.log(`   ⬇️  Downloading PDF from ${url}`)

  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`Failed to download PDF: ${response.statusText}`)
  }

  const buffer = await response.arrayBuffer()
  const filename = code
    ? `${code}.pdf`
    : `protocol-${Date.now()}.pdf`

  const filePath = path.join(PDF_STORAGE_PATH, filename)
  await fs.writeFile(filePath, Buffer.from(buffer))

  console.log(`   💾 Saved to ${filePath}`)
  return filePath
}

function generateProtocolCode(title: string, url: string): string {
  // Generate a unique code from URL to avoid collisions
  const urlHash = Buffer.from(url).toString('base64')
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 10)
    .toUpperCase()

  // Add timestamp to ensure uniqueness
  const timestamp = Date.now().toString().slice(-6)

  return `AUTO${urlHash}${timestamp}`
}

function sanitizeText(text: string): string {
  // Remove null bytes and other invalid UTF8 characters
  return text
    .replace(/\0/g, '') // Remove null bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove other control characters
    .trim()
}

// Run scraper if called directly
if (require.main === module) {
  scrapeCNASProtocols()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}
