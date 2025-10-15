/**
 * Download Missing CNAS Protocol PDFs
 *
 * Downloads the official CNAS PDFs that haven't been scraped yet
 */

import * as fs from 'fs/promises'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

// Missing CNAS PDFs identified from analysis
const MISSING_CNAS_PDFS = [
  {
    url: 'https://cnas.ro/wp-content/uploads/2024/03/protocoale.pdf',
    name: 'cnas-2024-03-protocoale.pdf',
    date: '2024-03'
  },
  {
    url: 'https://cnas.ro/wp-content/uploads/2024/10/Binder1-2.pdf',
    name: 'cnas-2024-10-binder.pdf',
    date: '2024-10'
  },
  {
    url: 'https://cnas.ro/wp-content/uploads/2025/01/lista-protocoalelor-terapeutice-ianuarie-2025-TOATE.pdf',
    name: 'cnas-2025-01-lista-toate.pdf',
    date: '2025-01'
  },
  {
    url: 'https://cnas.ro/wp-content/uploads/2025/08/lista-protocoalelor-terapeutice-august-2025-pentru-site-vaccinuri.pdf',
    name: 'cnas-2025-08-vaccinuri.pdf',
    date: '2025-08'
  },
  {
    url: 'https://cnas.ro/wp-content/uploads/2025/09/ALL-lista-protocoalelor-terapeutice-septembrie-2025-pentru-site-vaccin-HPV.pdf',
    name: 'cnas-2025-09-vaccin-hpv.pdf',
    date: '2025-09'
  }
]

async function downloadMissingPdfs() {
  console.log('📥 Downloading missing CNAS protocol PDFs...\n')

  await fs.mkdir(PDF_STORAGE_PATH, { recursive: true })

  let downloaded = 0
  let skipped = 0
  let errors = 0

  for (const pdf of MISSING_CNAS_PDFS) {
    console.log(`📄 ${pdf.date}: ${path.basename(pdf.url)}`)
    console.log(`   URL: ${pdf.url}`)

    const filePath = path.join(PDF_STORAGE_PATH, pdf.name)

    // Check if already exists
    try {
      await fs.access(filePath)
      console.log(`   ⏭️  Already exists, skipping`)
      skipped++
      continue
    } catch {
      // File doesn't exist, proceed with download
    }

    try {
      console.log(`   ⬇️  Downloading...`)
      const response = await fetch(pdf.url)

      if (!response.ok) {
        console.error(`   ❌ Failed: HTTP ${response.status}`)
        errors++
        continue
      }

      const buffer = await response.arrayBuffer()
      await fs.writeFile(filePath, Buffer.from(buffer))

      const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2)
      console.log(`   ✅ Downloaded: ${sizeMB} MB`)
      console.log(`   📁 Saved to: ${filePath}`)
      downloaded++

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Error: ${errorMsg}`)
      errors++
    }

    console.log()
  }

  console.log(`\n📊 Summary:`)
  console.log(`   Downloaded: ${downloaded}`)
  console.log(`   Skipped (already exist): ${skipped}`)
  console.log(`   Errors: ${errors}`)

  if (downloaded > 0) {
    console.log(`\n✅ Ready to process ${downloaded} new PDFs!`)
    console.log(`Next step: Run extract script to process these PDFs`)
  }
}

if (require.main === module) {
  downloadMissingPdfs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
}

export { downloadMissingPdfs }
