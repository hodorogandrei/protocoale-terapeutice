/**
 * Test Title Extraction Fix
 *
 * Tests the fixed parsing logic on problematic protocols
 * to ensure titles are correctly extracted
 */

import { extractPdfContent } from '../lib/pdf-extractor'
import {
  parseProtocolList,
  validateProtocols,
  enhanceProtocols,
  extractDetailedContent
} from '../lib/protocol-list-parser'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

// Test specific PDFs that contain the problematic protocols
const TEST_PDFS = [
  'full-protocols-M-V.pdf', // Should contain N0020F and N0021F (M-V range)
]

async function testTitleExtraction() {
  console.log('🧪 Testing Title Extraction Fix\n')
  console.log('Testing protocols N0020F and N0021F...\n')

  let foundN0020F = false
  let foundN0021F = false

  for (const pdfFile of TEST_PDFS) {
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
        console.log(`   ⚠️  No protocols found in this PDF\n`)
        continue
      }

      console.log(`   ✓ Found ${result.protocols.length} protocols`)

      // Validate and enhance
      let protocols = validateProtocols(result.protocols)
      protocols = enhanceProtocols(protocols)
      protocols = extractDetailedContent(protocols, extracted.rawText)

      // Find our test protocols
      const n0020f = protocols.find(p => p.code === 'N0020F')
      const n0021f = protocols.find(p => p.code === 'N0021F')

      if (n0020f) {
        foundN0020F = true
        console.log('\n   ✅ Found N0020F:')
        console.log(`      Code: ${n0020f.code}`)
        console.log(`      Title: ${n0020f.title}`)
        console.log(`      DCI: ${n0020f.dci || 'N/A'}`)
        console.log(`      Confidence: ${n0020f.confidence}%`)

        // Check if title is correct
        if (n0020f.title.includes('ATOMOXETINUM') ||
            n0020f.title.toUpperCase().includes('ATOMOXETIN')) {
          console.log('      ✅ Title looks correct!')
        } else if (n0020f.title.match(/ă tor pozi|tor pozi|poziţiei/i)) {
          console.log('      ❌ Title still contains corrupted fragments!')
        } else {
          console.log('      ⚠️  Title may need verification')
        }
      }

      if (n0021f) {
        foundN0021F = true
        console.log('\n   ✅ Found N0021F:')
        console.log(`      Code: ${n0021f.code}`)
        console.log(`      Title: ${n0021f.title}`)
        console.log(`      DCI: ${n0021f.dci || 'N/A'}`)
        console.log(`      Confidence: ${n0021f.confidence}%`)

        // Check if title is correct
        if (n0021f.title.includes('METHYLFENIDATUM') ||
            n0021f.title.toUpperCase().includes('METHYLPHENIDAT')) {
          console.log('      ✅ Title looks correct!')
        } else if (n0021f.title.match(/ă tor pozi|tor pozi|poziţiei/i)) {
          console.log('      ❌ Title still contains corrupted fragments!')
        } else {
          console.log('      ⚠️  Title may need verification')
        }
      }

      // Check for any protocols with corrupted titles
      const corruptedProtocols = protocols.filter(p =>
        p.title.match(/ă tor pozi|tor pozi|corespunz|poziţiei/i)
      )

      if (corruptedProtocols.length > 0) {
        console.log(`\n   ⚠️  Found ${corruptedProtocols.length} protocols with corrupted titles:`)
        corruptedProtocols.forEach(p => {
          console.log(`      ${p.code}: "${p.title}"`)
        })
      } else {
        console.log('\n   ✅ No corrupted titles detected in this PDF!')
      }

      console.log()

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Error processing ${pdfFile}: ${errorMsg}\n`)
    }
  }

  console.log('\n📊 Test Summary:')
  console.log(`   N0020F found: ${foundN0020F ? '✅' : '❌'}`)
  console.log(`   N0021F found: ${foundN0021F ? '✅' : '❌'}`)

  if (!foundN0020F || !foundN0021F) {
    console.log('\n⚠️  Note: Some test protocols were not found.')
    console.log('   They may be in different PDFs or have different codes.')
  }

  console.log('\n💡 Next steps:')
  console.log('   1. If titles are correct, run: npm run extract-full-protocols')
  console.log('   2. This will re-extract all protocols with the fixed parsing logic')
}

if (require.main === module) {
  testTitleExtraction()
    .then(() => {
      console.log('\n✅ Test complete!')
      process.exit(0)
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error)
      process.exit(1)
    })
}

export { testTitleExtraction }
