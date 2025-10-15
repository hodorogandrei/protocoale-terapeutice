/**
 * Fix Psychiatry Protocols
 *
 * Quick script to re-extract just the M-V PDF to fix corrupted psychiatry protocols
 */

import { db } from '../lib/db'
import { extractPdfContent } from '../lib/pdf-extractor'
import {
  parseProtocolList,
  validateProtocols,
  enhanceProtocols,
  extractDetailedContent
} from '../lib/protocol-list-parser'
import { removeRedundantHeader, removeRedundantHeaderFromHTML, extractCleanTitle } from '../lib/text-utils'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

async function fixPsychiatryProtocols() {
  console.log('🔧 Fixing psychiatry protocols from M-V PDF...\n')

  const pdfFile = 'full-protocols-M-V.pdf'
  const pdfPath = path.join(PDF_STORAGE_PATH, pdfFile)

  console.log(`📄 Processing: ${pdfFile}`)

  try {
    // Extract content from PDF
    const extracted = await extractPdfContent(pdfPath)
    console.log(`✓ Extracted ${extracted.metadata.pageCount} pages`)

    // Parse protocols
    console.log(`🔬 Parsing protocols...`)
    const result = await parseProtocolList(
      pdfPath,
      extracted.rawText,
      extracted.metadata.pageCount,
      pdfFile
    )

    console.log(`✓ Found ${result.protocols.length} protocols\n`)

    // Extract detailed content
    let protocols = validateProtocols(result.protocols)
    protocols = enhanceProtocols(protocols)
    protocols = extractDetailedContent(protocols, extracted.rawText)

    // Update each protocol in the database
    let updated = 0
    let skipped = 0

    for (const protocol of protocols) {
      try {
        const existing = await db.protocol.findUnique({
          where: { code: protocol.code }
        })

        if (!existing) {
          console.log(`⊕ New protocol: ${protocol.code}`)

          const cleanedText = removeRedundantHeader(protocol.content)
          const cleanTitle = extractCleanTitle(protocol.title, cleanedText)
          const htmlContent = `<div class="protocol"><h1>${cleanTitle}</h1>${protocol.dci ? `<p class="dci"><strong>DCI:</strong> ${protocol.dci}</p>` : ''}<pre>${cleanedText}</pre></div>`
          const cleanedHtml = removeRedundantHeaderFromHTML(htmlContent)

          await db.protocol.create({
            data: {
              code: protocol.code,
              title: cleanTitle,
              dci: protocol.dci,
              rawText: cleanedText,
              htmlContent: cleanedHtml,
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
        } else {
          // Check if existing title is corrupted
          const hasCorruptedTitle = existing.title.match(/poziţiei|corespunz|ă tor pozi|Protocol terapeutic.*cod.*\(\)/i)

          const cleanedText = removeRedundantHeader(protocol.content)
          const cleanTitle = extractCleanTitle(protocol.title, cleanedText)

          // Update if: longer content, corrupted title, or better title available
          const shouldUpdate = existing.rawText.length < protocol.content.length ||
                              hasCorruptedTitle ||
                              (cleanTitle.length > 5 && cleanTitle !== existing.title && !existing.title.includes(cleanTitle))

          if (shouldUpdate) {
            const reason = hasCorruptedTitle ? 'corrupted title' :
                          existing.rawText.length < protocol.content.length ? `${existing.rawText.length} → ${protocol.content.length} chars` :
                          'better title'
            console.log(`↻ Updating ${protocol.code}: ${reason}`)

            const htmlContent = `<div class="protocol"><h1>${cleanTitle}</h1>${protocol.dci ? `<p class="dci"><strong>DCI:</strong> ${protocol.dci}</p>` : ''}<pre>${cleanedText}</pre></div>`
            const cleanedHtml = removeRedundantHeaderFromHTML(htmlContent)

            await db.protocol.update({
              where: { code: protocol.code },
              data: {
                title: cleanTitle,
                dci: protocol.dci || existing.dci,
                rawText: cleanedText,
                htmlContent: cleanedHtml,
                storedPdfUrl: `/data/pdfs/${pdfFile}`,
                extractionQuality: Math.max(existing.extractionQuality, protocol.confidence || 100),
                lastUpdateDate: new Date(),
                updatedAt: new Date(),
              }
            })
            updated++
          } else {
            skipped++
          }
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`✗ Error processing ${protocol.code}: ${errorMsg}`)
      }
    }

    console.log(`\n✅ Updated: ${updated}, Skipped: ${skipped}`)

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error: ${errorMsg}`)
    throw error
  }
}

fixPsychiatryProtocols()
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Failed:', error)
    process.exit(1)
  })
