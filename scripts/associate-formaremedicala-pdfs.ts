/**
 * Associate FormareMedicala PDFs with Database Protocols
 *
 * Scans data/pdfs/individual/ directory and updates protocols in the database
 * to link them with their individual PDF files via storedPdfUrl field.
 *
 * This preserves the existing officialPdfUrl (CNAS multi-protocol PDFs)
 * while adding storedPdfUrl (formaremedicala individual PDFs).
 */

import { db } from '../lib/db'
import * as fs from 'fs/promises'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs', 'individual')

interface MatchResult {
  code: string
  filename: string
  matched: boolean
  updated: boolean
  reason?: string
}

async function associateFormareMedicalaPdfs() {
  console.log('🔗 Associating FormareMedicala PDFs with database protocols...\n')

  // Check if directory exists
  try {
    await fs.access(PDF_STORAGE_PATH)
  } catch {
    console.error(`❌ Directory not found: ${PDF_STORAGE_PATH}`)
    console.log('\nPlease run the download script first:')
    console.log('  npx tsx scripts/download-formaremedicala-pdfs.ts')
    process.exit(1)
  }

  // Get all PDF files
  const files = await fs.readdir(PDF_STORAGE_PATH)
  const pdfFiles = files.filter(f => f.toLowerCase().endsWith('.pdf'))

  console.log(`📁 Found ${pdfFiles.length} PDF files in ${PDF_STORAGE_PATH}\n`)

  if (pdfFiles.length === 0) {
    console.log('⚠️  No PDFs found. Run the download script first.')
    process.exit(0)
  }

  const results: MatchResult[] = []
  let matched = 0
  let updated = 0
  let notFound = 0
  let alreadySet = 0

  for (const filename of pdfFiles) {
    // Extract protocol code from filename (e.g., J05AX28.pdf -> J05AX28)
    const codeMatch = filename.match(/^([A-Z]\d{2,4}[A-Z]?\d?)\.pdf$/i)

    if (!codeMatch) {
      console.log(`⚠️  Invalid filename format: ${filename}`)
      results.push({
        code: filename,
        filename,
        matched: false,
        updated: false,
        reason: 'Invalid filename format'
      })
      continue
    }

    const code = codeMatch[1].toUpperCase()

    // Try to find protocol in database
    try {
      const protocol = await db.protocol.findUnique({
        where: { code },
        select: {
          id: true,
          code: true,
          title: true,
          storedPdfUrl: true,
          officialPdfUrl: true
        }
      })

      if (!protocol) {
        console.log(`❌ ${code}: Not found in database`)
        results.push({
          code,
          filename,
          matched: false,
          updated: false,
          reason: 'Protocol not found in database'
        })
        notFound++
        continue
      }

      matched++

      // Check if storedPdfUrl is already set to this file
      const newStoredPdfUrl = `/api/pdfs-individual/${filename}`

      if (protocol.storedPdfUrl === newStoredPdfUrl) {
        console.log(`✓ ${code}: Already associated with ${filename}`)
        results.push({
          code,
          filename,
          matched: true,
          updated: false,
          reason: 'Already set'
        })
        alreadySet++
        continue
      }

      // Update storedPdfUrl
      await db.protocol.update({
        where: { code },
        data: {
          storedPdfUrl: newStoredPdfUrl,
          updatedAt: new Date()
        }
      })

      console.log(`✅ ${code}: Associated with ${filename}`)
      if (protocol.storedPdfUrl) {
        console.log(`   Previous: ${protocol.storedPdfUrl}`)
      }
      console.log(`   New: ${newStoredPdfUrl}`)

      results.push({
        code,
        filename,
        matched: true,
        updated: true
      })
      updated++

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`❌ ${code}: Error - ${errorMsg}`)
      results.push({
        code,
        filename,
        matched: false,
        updated: false,
        reason: errorMsg
      })
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60))
  console.log('📊 Association Summary:')
  console.log('='.repeat(60))
  console.log(`Total PDFs processed:         ${pdfFiles.length}`)
  console.log(`Matched with database:        ${matched}`)
  console.log(`Updated in database:          ${updated}`)
  console.log(`Already set (no update):      ${alreadySet}`)
  console.log(`Not found in database:        ${notFound}`)
  console.log('='.repeat(60))

  // Show unmatched PDFs if any
  if (notFound > 0) {
    console.log('\n⚠️  Unmatched PDFs (not in database):')
    console.log('='.repeat(60))
    results
      .filter(r => !r.matched && r.reason === 'Protocol not found in database')
      .forEach(r => console.log(`   ${r.code}`))
    console.log('\nThese protocols may need to be added to the database first.')
  }

  // Final statistics from database
  console.log('\n📈 Database Statistics:')
  console.log('='.repeat(60))

  const totalProtocols = await db.protocol.count()
  const withStoredPdf = await db.protocol.count({
    where: {
      storedPdfUrl: {
        not: null,
        contains: 'pdfs-individual'
      }
    }
  })

  console.log(`Total protocols:              ${totalProtocols}`)
  console.log(`With individual PDF:          ${withStoredPdf} (${((withStoredPdf / totalProtocols) * 100).toFixed(1)}%)`)
  console.log('='.repeat(60))

  console.log('\n✅ Association complete!')
}

if (require.main === module) {
  associateFormareMedicalaPdfs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Fatal error:', error)
      process.exit(1)
    })
}

export { associateFormareMedicalaPdfs }
