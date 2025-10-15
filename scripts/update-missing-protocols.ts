/**
 * Update Missing Protocol Content
 *
 * This script finds protocols with incomplete content (from list PDFs)
 * and attempts to match them with full protocol content from the downloaded PDFs.
 */

import { db } from '../lib/db'
import { extractPdfContent } from '../lib/pdf-extractor'
import * as fs from 'fs/promises'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

async function updateMissingProtocols() {
  console.log('🔍 Finding protocols with incomplete content...')

  // Find protocols with minimal content (<500 chars)
  const incompleteProtocols = await db.protocol.findMany({
    where: {
      rawText: {
        // Prisma doesn't have direct length check, so we'll filter in JS
      },
    },
    select: {
      id: true,
      code: true,
      title: true,
      rawText: true,
      storedPdfUrl: true,
      extractionQuality: true,
    },
  })

  const incomplete = incompleteProtocols.filter(p => p.rawText.length < 500)

  console.log(`   Found ${incomplete.length} protocols with incomplete content`)

  if (incomplete.length === 0) {
    console.log('✅ All protocols have complete content!')
    return
  }

  // Get all downloaded PDF files
  const pdfFiles = await fs.readdir(PDF_STORAGE_PATH)
  const fullPdfs = pdfFiles.filter(f => f.endsWith('.pdf'))

  console.log(`📁 Found ${fullPdfs.length} PDF files`)

  let updated = 0
  let notFound = 0

  for (const protocol of incomplete) {
    console.log(`\n🔎 Searching for full content: ${protocol.code} - ${protocol.title.substring(0, 50)}...`)

    // Try to find this protocol in one of the full PDFs
    let foundContent = false

    for (const pdfFile of fullPdfs) {
      const pdfPath = path.join(PDF_STORAGE_PATH, pdfFile)

      try {
        // Extract content from this PDF
        const extracted = await extractPdfContent(pdfPath)
        const rawText = extracted.rawText

        // Look for this protocol code in the PDF
        const protocolSectionRegex = new RegExp(
          `Protocol\\s+terapeutic.*?cod\\s*\\(${protocol.code}\\)`,
          'i'
        )

        if (protocolSectionRegex.test(rawText)) {
          console.log(`   ✓ Found in ${pdfFile}!`)

          // Extract the section for this protocol
          const lines = rawText.split('\n')
          let startIdx = -1
          let endIdx = lines.length

          for (let i = 0; i < lines.length; i++) {
            if (protocolSectionRegex.test(lines[i])) {
              startIdx = i
              break
            }
          }

          if (startIdx >= 0) {
            // Find the end of this protocol (next protocol or end of PDF)
            for (let i = startIdx + 1; i < lines.length; i++) {
              if (lines[i].match(/Protocol\s+terapeutic.*?cod\s*\(/i)) {
                endIdx = i
                break
              }
            }

            // Limit to reasonable window
            endIdx = Math.min(endIdx, startIdx + 500)

            const fullContent = lines.slice(startIdx, endIdx).join('\n').trim()

            if (fullContent.length > protocol.rawText.length) {
              // Update protocol with full content
              await db.protocol.update({
                where: { id: protocol.id },
                data: {
                  rawText: fullContent,
                  htmlContent: `<div class="protocol"><h1>${protocol.title}</h1><pre>${fullContent}</pre></div>`,
                  storedPdfUrl: `/data/pdfs/${pdfFile}`,
                  extractionQuality: Math.min(100, protocol.extractionQuality + 30),
                  updatedAt: new Date(),
                },
              })

              console.log(`   ✅ Updated with ${fullContent.length} chars (was ${protocol.rawText.length})`)
              updated++
              foundContent = true
              break
            }
          }
        }
      } catch (error) {
        // Skip PDFs that fail to process
        continue
      }
    }

    if (!foundContent) {
      console.log(`   ⚠️  Full content not found in any PDF`)
      notFound++
    }
  }

  console.log(`\n📊 Summary:`)
  console.log(`   - Protocols checked: ${incomplete.length}`)
  console.log(`   - Successfully updated: ${updated}`)
  console.log(`   - Not found: ${notFound}`)
}

// Run if called directly
if (require.main === module) {
  updateMissingProtocols()
    .then(() => {
      console.log('\n✅ Done!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Error:', error)
      process.exit(1)
    })
}

export { updateMissingProtocols }
