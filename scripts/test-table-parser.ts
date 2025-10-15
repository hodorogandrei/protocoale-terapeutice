/**
 * Test Script for Improved Table Parser
 *
 * This script demonstrates the improved table extraction capabilities
 * for parsing CNAS protocol PDFs.
 */

import { extractTablesFromPDF, parseProtocolsFromTables } from '../lib/table-extractor'
import {
  parseProtocolList,
  validateProtocols,
  enhanceProtocols
} from '../lib/protocol-list-parser'
import * as path from 'path'
import * as fs from 'fs/promises'

async function testTableParser(pdfPath: string) {
  console.log('🧪 Testing Improved Table Parser')
  console.log('=' .repeat(60))
  console.log(`📄 PDF: ${path.basename(pdfPath)}`)
  console.log('')

  try {
    // Check if file exists
    try {
      await fs.access(pdfPath)
    } catch {
      console.error(`❌ File not found: ${pdfPath}`)
      console.log('\nℹ️  Please provide a valid PDF path as argument:')
      console.log(`   npx tsx scripts/test-table-parser.ts <path-to-pdf>`)
      return
    }

    // Test 1: Table Extraction
    console.log('1️⃣ Testing Table Extraction...')
    console.log('-'.repeat(60))

    const tables = await extractTablesFromPDF(pdfPath)
    console.log(`   ✓ Extracted ${tables.length} table(s)`)

    for (const table of tables) {
      console.log(`   📊 Table on page ${table.pageNumber}:`)
      console.log(`      - Rows: ${table.rows.length}`)
      console.log(`      - Columns: ${table.columns.length}`)

      // Show first few rows as sample
      const sampleRows = table.rows.slice(0, 3)
      for (const row of sampleRows) {
        const rowText = row.cells.map(c => c.text.substring(0, 30)).join(' | ')
        console.log(`      - ${rowText}`)
      }

      if (table.rows.length > 3) {
        console.log(`      ... (${table.rows.length - 3} more rows)`)
      }
    }

    console.log('')

    // Test 2: Protocol Parsing from Tables
    console.log('2️⃣ Testing Protocol Parsing from Tables...')
    console.log('-'.repeat(60))

    const protocols = parseProtocolsFromTables(tables)
    console.log(`   ✓ Parsed ${protocols.length} protocol(s)`)

    for (const protocol of protocols.slice(0, 5)) {
      console.log(`   📋 ${protocol.code}: ${protocol.title}`)
      if (protocol.dci) {
        console.log(`      DCI: ${protocol.dci}`)
      }
      console.log(`      Confidence: ${protocol.confidence}%`)
      console.log(`      Page: ${protocol.pageNumber}`)
    }

    if (protocols.length > 5) {
      console.log(`   ... (${protocols.length - 5} more protocols)`)
    }

    console.log('')

    // Test 3: Full Protocol List Parsing
    console.log('3️⃣ Testing Full Protocol List Parser...')
    console.log('-'.repeat(60))

    // Read raw text for comparison
    const pdf = require('pdf-parse')
    const dataBuffer = await fs.readFile(pdfPath)
    const pdfData = await pdf(dataBuffer)

    const result = await parseProtocolList(
      pdfPath,
      pdfData.text,
      pdfData.numpages,
      path.basename(pdfPath)
    )

    console.log(`   ✓ Is Protocol List: ${result.isProtocolList}`)
    console.log(`   ✓ Method Used: ${result.method}`)
    console.log(`   ✓ Quality Score: ${result.quality}%`)
    console.log(`   ✓ Protocols Found: ${result.protocols.length}`)

    console.log('')

    // Test 4: Protocol Validation and Enhancement
    console.log('4️⃣ Testing Protocol Validation...')
    console.log('-'.repeat(60))

    const validatedProtocols = validateProtocols(result.protocols)
    console.log(`   ✓ Valid Protocols: ${validatedProtocols.length}/${result.protocols.length}`)

    if (result.protocols.length > validatedProtocols.length) {
      const invalidCount = result.protocols.length - validatedProtocols.length
      console.log(`   ⚠️  Filtered out ${invalidCount} invalid protocol(s)`)
    }

    const enhancedProtocols = enhanceProtocols(validatedProtocols)
    console.log(`   ✓ Enhanced protocols with additional metadata`)

    console.log('')

    // Summary
    console.log('📊 SUMMARY')
    console.log('='.repeat(60))
    console.log(`Tables Detected:      ${tables.length}`)
    console.log(`Protocols Extracted:  ${protocols.length}`)
    console.log(`Valid Protocols:      ${validatedProtocols.length}`)
    console.log(`Extraction Quality:   ${result.quality}%`)
    console.log(`Method Used:          ${result.method}`)

    console.log('')

    // Show sample protocols
    if (enhancedProtocols.length > 0) {
      console.log('📋 SAMPLE PROTOCOLS')
      console.log('='.repeat(60))

      for (const protocol of enhancedProtocols.slice(0, 10)) {
        console.log(`${protocol.code} - ${protocol.title}`)
        if (protocol.dci) {
          console.log(`  DCI: ${protocol.dci}`)
        }
        console.log(`  Confidence: ${protocol.confidence}%`)
        console.log('')
      }

      if (enhancedProtocols.length > 10) {
        console.log(`... and ${enhancedProtocols.length - 10} more protocols`)
      }
    }

    console.log('✅ Test completed successfully!')

  } catch (error) {
    console.error('❌ Test failed:', error)
    if (error instanceof Error) {
      console.error('Stack:', error.stack)
    }
    process.exit(1)
  }
}

// Run test
const pdfPath = process.argv[2]

if (!pdfPath) {
  console.log('Usage: npx tsx scripts/test-table-parser.ts <path-to-pdf>')
  console.log('')
  console.log('Example:')
  console.log('  npx tsx scripts/test-table-parser.ts data/pdfs/protocol-list.pdf')
  process.exit(1)
}

testTableParser(pdfPath)
  .then(() => {
    console.log('\n✅ Done!')
    process.exit(0)
  })
  .catch((error) => {
    console.error('\n❌ Error:', error)
    process.exit(1)
  })
