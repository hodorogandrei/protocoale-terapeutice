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

async function downloadAndProcessProtocol(
  protocol: ScrapedProtocol,
  existingId?: string
) {
  // Download PDF
  const pdfPath = await downloadPDF(protocol.pdfUrl, protocol.code)

  // Extract content from PDF
  console.log(`   🔍 Extracting content from PDF...`)
  const extractedContent = await extractPdfContent(pdfPath)

  // Generate protocol code if not provided
  const code = protocol.code || generateProtocolCode(protocol.title)

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
        cnasUrl: protocol.cnasUrl,
        rawText: extractedContent.rawText,
        htmlContent: extractedContent.htmlContent,
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
        cnasUrl: protocol.cnasUrl,
        rawText: extractedContent.rawText,
        htmlContent: extractedContent.htmlContent,
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

function generateProtocolCode(title: string): string {
  // Generate a unique code from title
  const hash = title
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 8)
    .toUpperCase()

  return `AUTO${hash}`
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
