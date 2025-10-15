/**
 * Download Full Protocol PDFs
 *
 * Downloads the comprehensive alphabetical protocol PDFs from CNAS
 * that contain the complete protocol texts (not just lists)
 */

import * as fs from 'fs/promises'
import * as path from 'path'

const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs')

// The comprehensive full protocol PDFs from CNAS (January 2025)
const FULL_PROTOCOL_PDFS = [
  {
    url: 'https://cnas.ro/wp-content/uploads/2025/01/A_C.pdf',
    name: 'full-protocols-A-C.pdf',
    range: 'A-C'
  },
  {
    url: 'https://cnas.ro/wp-content/uploads/2025/01/D_L.pdf',
    name: 'full-protocols-D-L.pdf',
    range: 'D-L'
  },
  {
    url: 'https://cnas.ro/wp-content/uploads/2025/01/M_V.pdf',
    name: 'full-protocols-M-V.pdf',
    range: 'M-V'
  }
]

async function downloadFullProtocols() {
  console.log('📥 Downloading full protocol PDFs from CNAS...')

  await fs.mkdir(PDF_STORAGE_PATH, { recursive: true })

  for (const pdf of FULL_PROTOCOL_PDFS) {
    console.log(`\n📄 Downloading ${pdf.range} protocols...`)
    console.log(`   URL: ${pdf.url}`)

    try {
      const response = await fetch(pdf.url)

      if (!response.ok) {
        console.error(`   ❌ Failed: HTTP ${response.status}`)
        continue
      }

      const buffer = await response.arrayBuffer()
      const filePath = path.join(PDF_STORAGE_PATH, pdf.name)

      await fs.writeFile(filePath, Buffer.from(buffer))

      const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2)
      console.log(`   ✅ Downloaded: ${sizeMB} MB`)
      console.log(`   📁 Saved to: ${filePath}`)

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`   ❌ Error: ${errorMsg}`)
    }
  }

  console.log('\n✅ Download complete!')
  console.log('\nNext step: Run the scraper on these PDFs to extract full protocol content.')
}

if (require.main === module) {
  downloadFullProtocols()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Error:', error)
      process.exit(1)
    })
}

export { downloadFullProtocols }
