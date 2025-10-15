/**
 * Download Individual Protocol PDFs from FormareMedicala.ro
 *
 * Downloads individual protocol PDFs (one per code) from formaremedicala.ro
 * to complement the CNAS multi-protocol PDFs already in the system.
 *
 * Storage: data/pdfs/individual/
 * API endpoint: /api/pdfs-individual/[filename]
 */

import puppeteer from 'puppeteer'
import * as fs from 'fs/promises'
import * as path from 'path'

const FORMAREMEDICALA_URL = 'https://www.formaremedicala.ro/protocoale/'
const PDF_STORAGE_PATH = path.join(process.cwd(), 'data', 'pdfs', 'individual')

interface ProtocolPdf {
  code: string
  title: string
  url: string
  filename: string
}

async function downloadFormareMedicalaPdfs() {
  console.log('📥 Downloading individual protocol PDFs from FormareMedicala.ro...\n')

  // Ensure storage directory exists
  await fs.mkdir(PDF_STORAGE_PATH, { recursive: true })
  console.log(`📁 Storage directory: ${PDF_STORAGE_PATH}\n`)

  // Launch browser
  console.log('🌐 Launching browser to scrape PDF links...')
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.goto(FORMAREMEDICALA_URL, { waitUntil: 'networkidle2' })

    // Extract all PDF links from the page
    console.log('🔍 Extracting PDF links...\n')
    const pdfLinks = await page.evaluate(() => {
      const links: { title: string; url: string }[] = []
      const anchors = document.querySelectorAll('a[href$=".pdf"]')

      anchors.forEach((anchor) => {
        const href = anchor.getAttribute('href')
        const text = anchor.textContent?.trim() || ''

        if (href) {
          links.push({
            title: text,
            url: href.startsWith('http') ? href : `https://www.formaremedicala.ro${href}`
          })
        }
      })

      return links
    })

    console.log(`✅ Found ${pdfLinks.length} PDF links\n`)

    // Process each PDF link
    const protocols: ProtocolPdf[] = []
    for (const link of pdfLinks) {
      // Extract protocol code from URL (e.g., J05AX28.pdf -> J05AX28)
      const urlMatch = link.url.match(/([A-Z]\d{2,4}[A-Z]?\d?)\.pdf$/i)
      if (!urlMatch) {
        console.log(`⚠️  Skipping (no code in URL): ${link.url}`)
        continue
      }

      const code = urlMatch[1].toUpperCase()
      const filename = `${code}.pdf`

      protocols.push({
        code,
        title: link.title,
        url: link.url,
        filename
      })
    }

    console.log(`📋 Identified ${protocols.length} protocol PDFs\n`)

    // Download PDFs
    let downloaded = 0
    let skipped = 0
    let errors = 0

    for (let i = 0; i < protocols.length; i++) {
      const protocol = protocols[i]
      const filePath = path.join(PDF_STORAGE_PATH, protocol.filename)

      console.log(`[${i + 1}/${protocols.length}] ${protocol.code}`)

      // Check if file already exists
      try {
        await fs.access(filePath)
        console.log(`   ⏭️  Already exists, skipping\n`)
        skipped++
        continue
      } catch {
        // File doesn't exist, proceed with download
      }

      // Download PDF
      try {
        console.log(`   📥 Downloading from: ${protocol.url}`)

        const response = await fetch(protocol.url)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const buffer = await response.arrayBuffer()
        await fs.writeFile(filePath, Buffer.from(buffer))

        const sizeMB = (buffer.byteLength / 1024 / 1024).toFixed(2)
        console.log(`   ✅ Downloaded: ${sizeMB} MB`)
        console.log(`   💾 Saved to: ${protocol.filename}\n`)

        downloaded++

        // Add small delay to be respectful to the server
        await new Promise(resolve => setTimeout(resolve, 500))

      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error)
        console.error(`   ❌ Error: ${errorMsg}\n`)
        errors++
      }
    }

    console.log('\n' + '='.repeat(60))
    console.log('📊 Download Summary:')
    console.log('='.repeat(60))
    console.log(`Total PDFs found:     ${protocols.length}`)
    console.log(`Downloaded:           ${downloaded}`)
    console.log(`Skipped (existing):   ${skipped}`)
    console.log(`Errors:               ${errors}`)
    console.log('='.repeat(60))

    if (downloaded > 0) {
      console.log('\n✅ Download complete!')
      console.log('\nNext steps:')
      console.log('1. Run: npx tsx scripts/associate-formaremedicala-pdfs.ts')
      console.log('   to link these PDFs to protocols in the database')
    } else {
      console.log('\n✅ All PDFs already downloaded!')
    }

  } finally {
    await browser.close()
  }
}

if (require.main === module) {
  downloadFormareMedicalaPdfs()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('\n❌ Fatal error:', error)
      process.exit(1)
    })
}

export { downloadFormareMedicalaPdfs }
