/**
 * Process ALL Downloaded PDFs
 *
 * Scans all PDFs in data/pdfs directory and extracts protocols,
 * updating incomplete protocols with full content
 */

import { db } from '../lib/db'
import { extractPdfContent } from '../lib/pdf-extractor'
import {
  parseProtocolList,
  validateProtocols,
  enhanceProtocols,
  extractDetailedContent
} from '../lib/protocol-list-parser'
import * as fs from 'fs/promises'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

async function processAllPdfs() {
  console.log('🔍 Processing ALL PDFs in data/pdfs directory...\n')

  // Get all PDF files
  const files = await fs.readdir(PDF_STORAGE_PATH)
  const pdfFiles = files.filter(f => f.endsWith('.pdf'))

  console.log(`📚 Found ${pdfFiles.length} PDF files\n`)

  let totalUpdated = 0
  let totalProcessed = 0
  let totalSkipped = 0

  for (const pdfFile of pdfFiles) {
    const pdfPath = path.join(PDF_STORAGE_PATH, pdfFile)

    console.log(`📄 Processing: ${pdfFile}`)

    try {
      // Extract content from PDF
      const extracted = await extractPdfContent(pdfPath)

      console.log(`   ✓ Extracted ${extracted.metadata.pageCount} pages`)

      // Parse protocols
      const result = await parseProtocolList(
        pdfPath,
        extracted.rawText,
        extracted.metadata.pageCount,
        pdfFile
      )

      if (!result.isProtocolList || result.protocols.length === 0) {
        console.log(`   ⚠️  No protocols found\n`)
        continue
      }

      console.log(`   ✓ Found ${result.protocols.length} protocols (${result.method}, ${result.quality}%)`)

      // Extract detailed content
      let protocols = validateProtocols(result.protocols)
      protocols = enhanceProtocols(protocols)
      protocols = extractDetailedContent(protocols, extracted.rawText)

      // Update incomplete protocols only
      let updated = 0
      let skipped = 0

      for (const protocol of protocols) {
        try {
          const existing = await db.protocol.findUnique({
            where: { code: protocol.code }
          })

          if (!existing) {
            // New protocol - create it
            await db.protocol.create({
              data: {
                code: protocol.code,
                title: protocol.title,
                dci: protocol.dci,
                rawText: protocol.content,
                htmlContent: `<div class="protocol"><h1>${protocol.title}</h1>${protocol.dci ? `<p class="dci"><strong>DCI:</strong> ${protocol.dci}</p>` : ''}<pre>${protocol.content}</pre></div>`,
                officialPdfUrl: `https://cnas.ro/wp-content/uploads/${pdfFile}`,
                storedPdfUrl: `/data/pdfs/${pdfFile}`,
                extractionQuality: protocol.confidence || 100,
                publishDate: new Date(),
                lastUpdateDate: new Date(),
                sublists: [],
                prescribers: [],
                categories: [],
                keywords: [],
              }
            })
            updated++
            console.log(`   ⊕ Created ${protocol.code}`)
          } else if (existing.rawText.length < protocol.content.length) {
            // Update with fuller content
            await db.protocol.update({
              where: { code: protocol.code },
              data: {
                title: protocol.title,
                dci: protocol.dci || existing.dci,
                rawText: protocol.content,
                htmlContent: `<div class="protocol"><h1>${protocol.title}</h1>${protocol.dci ? `<p class="dci"><strong>DCI:</strong> ${protocol.dci}</p>` : ''}<pre>${protocol.content}</pre></div>`,
                storedPdfUrl: `/data/pdfs/${pdfFile}`,
                extractionQuality: Math.max(existing.extractionQuality, protocol.confidence || 100),
                lastUpdateDate: new Date(),
                updatedAt: new Date(),
              }
            })
            updated++
            console.log(`   ↻ Updated ${protocol.code}: ${existing.rawText.length} → ${protocol.content.length} chars`)
          } else {
            skipped++
          }

          totalProcessed++

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`   ✗ Error processing ${protocol.code}: ${errorMsg}`)
        }
      }

      if (updated > 0) {
        console.log(`   ✅ Updated: ${updated}, Skipped: ${skipped}`)
      }
      console.log()

      totalUpdated += updated
      totalSkipped += skipped

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Error: ${errorMsg}\n`)
    }
  }

  console.log(`\n📊 Final Summary:`)
  console.log(`   PDFs processed: ${pdfFiles.length}`)
  console.log(`   Protocols processed: ${totalProcessed}`)
  console.log(`   Protocols updated/created: ${totalUpdated}`)
  console.log(`   Protocols skipped: ${totalSkipped}`)

  // Check final coverage
  const stats = await db.protocol.aggregate({
    _count: { id: true }
  })

  const protocols = await db.protocol.findMany({
    select: { rawText: true }
  })
  const withContent = protocols.filter(p => p.rawText && p.rawText.length > 500).length

  const incomplete = stats._count.id - withContent

  console.log(`\n📈 Final Coverage:`)
  console.log(`   Total: ${stats._count.id}`)
  console.log(`   With content: ${withContent} (${((withContent / stats._count.id) * 100).toFixed(1)}%)`)
  console.log(`   Incomplete: ${incomplete} (${((incomplete / stats._count.id) * 100).toFixed(1)}%)`)
}

if (require.main === module) {
  processAllPdfs()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { processAllPdfs }
