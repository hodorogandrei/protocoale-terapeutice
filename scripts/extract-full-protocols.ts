/**
 * Extract Full Protocols from Downloaded PDFs
 *
 * Processes the comprehensive protocol PDFs and updates
 * incomplete protocols with full content
 */

import { db } from '../lib/db'
import { extractPdfContent } from '../lib/pdf-extractor'
import {
  parseProtocolList,
  validateProtocols,
  enhanceProtocols,
  extractDetailedContent
} from '../lib/protocol-list-parser'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

const FULL_PROTOCOL_PDFS = [
  'full-protocols-A-C.pdf',
  'full-protocols-D-L.pdf',
  'full-protocols-M-V.pdf',
  // Missing CNAS PDFs (2024-2025)
  'cnas-2024-03-protocoale.pdf',
  'cnas-2024-10-binder.pdf',
  'cnas-2025-01-lista-toate.pdf',
  'cnas-2025-08-vaccinuri.pdf',
  'cnas-2025-09-vaccin-hpv.pdf'
]

async function extractFullProtocols() {
  console.log('🔍 Extracting full protocols from comprehensive PDFs...\n')

  let totalUpdated = 0
  let totalProcessed = 0

  for (const pdfFile of FULL_PROTOCOL_PDFS) {
    const pdfPath = path.join(PDF_STORAGE_PATH, pdfFile)

    console.log(`📄 Processing: ${pdfFile}`)
    console.log(`   📖 Extracting PDF content...`)

    try {
      // Extract content from PDF
      const extracted = await extractPdfContent(pdfPath)

      console.log(`   ✓ Extracted ${extracted.metadata.pageCount} pages`)

      // Parse protocols using the advanced parser
      console.log(`   🔬 Parsing protocols...`)
      const result = await parseProtocolList(
        pdfPath,
        extracted.rawText,
        extracted.metadata.pageCount,
        pdfFile
      )

      if (!result.isProtocolList || result.protocols.length === 0) {
        console.log(`   ⚠️  No protocols found in this PDF`)
        continue
      }

      console.log(`   ✓ Found ${result.protocols.length} protocols`)
      console.log(`   📊 Parser method: ${result.method}, quality: ${result.quality}%`)

      // CRITICAL: Extract detailed content from full protocol sections
      console.log(`   📝 Extracting detailed content from protocol sections...`)
      let protocols = validateProtocols(result.protocols)
      protocols = enhanceProtocols(protocols)
      protocols = extractDetailedContent(protocols, extracted.rawText)
      console.log(`   ✅ Detailed content extracted`)

      const fullProtocols = protocols

      // Update each protocol in the database
      let updated = 0
      let skipped = 0

      for (const protocol of fullProtocols) {
        try {
          // Check if this protocol exists
          const existing = await db.protocol.findUnique({
            where: { code: protocol.code }
          })

          if (!existing) {
            console.log(`   ⊕ New protocol: ${protocol.code}`)
            // Create new protocol
            await db.protocol.create({
              data: {
                code: protocol.code,
                title: protocol.title,
                dci: protocol.dci,
                rawText: protocol.content,
                htmlContent: `<div class="protocol"><h1>${protocol.title}</h1>${protocol.dci ? `<p class="dci"><strong>DCI:</strong> ${protocol.dci}</p>` : ''}<pre>${protocol.content}</pre></div>`,
                officialPdfUrl: `https://cnas.ro/wp-content/uploads/2025/01/${pdfFile.replace('full-protocols-', '').replace('.pdf', '.pdf')}`,
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
            totalUpdated++
          } else if (existing.rawText.length < protocol.content.length) {
            // Update with fuller content
            console.log(`   ↻ Updating ${protocol.code}: ${existing.rawText.length} → ${protocol.content.length} chars`)

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
            totalUpdated++
          } else {
            skipped++
          }

          totalProcessed++

        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error)
          console.error(`   ✗ Error processing ${protocol.code}: ${errorMsg}`)
        }
      }

      console.log(`   ✅ Updated: ${updated}, Skipped: ${skipped}\n`)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Error processing ${pdfFile}: ${errorMsg}\n`)
    }
  }

  console.log(`\n📊 Final Summary:`)
  console.log(`   Total protocols processed: ${totalProcessed}`)
  console.log(`   Total protocols updated/created: ${totalUpdated}`)

  // Check remaining incomplete protocols
  const remaining = await db.protocol.count({
    where: {
      rawText: {
        // Find protocols with minimal content
      }
    }
  })

  const incompleteRemaining = await db.protocol.findMany({
    select: { rawText: true }
  }).then(protocols => protocols.filter(p => p.rawText.length < 500).length)

  console.log(`   Incomplete protocols remaining: ${incompleteRemaining}`)

  if (incompleteRemaining > 0) {
    console.log(`\n⚠️  Note: ${incompleteRemaining} protocols still have minimal content.`)
    console.log(`   These may be from older lists or unavailable in the current comprehensive PDFs.`)
  }
}

if (require.main === module) {
  extractFullProtocols()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { extractFullProtocols }
