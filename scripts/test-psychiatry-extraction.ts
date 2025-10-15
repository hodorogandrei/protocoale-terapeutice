/**
 * Test psychiatry protocol extraction
 *
 * This script tests the extraction of specific psychiatry protocols
 * to identify why they are being corrupted in the database
 */

import { extractPdfContent } from '../lib/pdf-extractor'
import {
  parseProtocolList,
  validateProtocols,
  enhanceProtocols,
  extractDetailedContent
} from '../lib/protocol-list-parser'
import { removeRedundantHeader, extractCleanTitle } from '../lib/text-utils'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

const TEST_PROTOCOLS = ['N0020F', 'N003F', 'N017F', 'N018F', 'N019F', 'N0021F']

async function testPsychiatryExtraction() {
  console.log('🧪 Testing psychiatry protocol extraction...\n')

  const pdfFile = 'full-protocols-M-V.pdf'
  const pdfPath = path.join(PDF_STORAGE_PATH, pdfFile)

  console.log(`📄 Processing: ${pdfFile}\n`)

  try {
    // Extract content from PDF
    const extracted = await extractPdfContent(pdfPath)
    console.log(`✓ Extracted ${extracted.metadata.pageCount} pages\n`)

    // Parse protocols
    console.log(`🔬 Parsing protocols...`)
    const result = await parseProtocolList(
      pdfPath,
      extracted.rawText,
      extracted.metadata.pageCount,
      pdfFile
    )

    console.log(`✓ Found ${result.protocols.length} protocols\n`)

    // Validate and enhance
    let protocols = validateProtocols(result.protocols)
    protocols = enhanceProtocols(protocols)
    protocols = extractDetailedContent(protocols, extracted.rawText)

    // Find the problematic psychiatry protocols
    const testProtocols = protocols.filter(p => TEST_PROTOCOLS.includes(p.code))

    console.log(`\n📊 Test Results for Psychiatry Protocols:\n`)

    for (const protocol of testProtocols) {
      console.log(`\n${'='.repeat(80)}`)
      console.log(`Code: ${protocol.code}`)
      console.log(`Title: ${protocol.title}`)
      console.log(`DCI: ${protocol.dci || 'N/A'}`)
      console.log(`Content length: ${protocol.content.length} chars`)
      console.log(`Confidence: ${protocol.confidence}%`)

      // Show first 200 chars of content
      console.log(`\nFirst 200 chars of content:`)
      console.log(protocol.content.substring(0, 200))

      // Test clean title extraction
      const cleanedText = removeRedundantHeader(protocol.content)
      const cleanTitle = extractCleanTitle(protocol.title, cleanedText)
      console.log(`\nCleaned title: ${cleanTitle}`)
      console.log(`Cleaned content length: ${cleanedText.length}`)
      console.log(`${'='.repeat(80)}`)
    }

    // Check if any are missing
    const foundCodes = new Set(testProtocols.map(p => p.code))
    const missingCodes = TEST_PROTOCOLS.filter(code => !foundCodes.has(code))

    if (missingCodes.length > 0) {
      console.log(`\n⚠️  Missing protocols: ${missingCodes.join(', ')}`)
    }

  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error)
    console.error(`❌ Error: ${errorMsg}`)
    console.error(error)
  }
}

testPsychiatryExtraction()
  .then(() => {
    console.log('\n✅ Test complete!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Test failed:', error)
    process.exit(1)
  })
