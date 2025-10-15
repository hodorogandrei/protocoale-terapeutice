import puppeteer from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'

interface ProtocolReference {
  code: string
  title: string
  dci?: string
  category?: string
  pdfUrl?: string
}

async function scrapeFormareMedicalaTable(): Promise<ProtocolReference[]> {
  console.log('🚀 Launching browser...')

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  try {
    const page = await browser.newPage()
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36')

    console.log('📄 Loading formaremedicala.ro/protocoale...')
    await page.goto('https://www.formaremedicala.ro/protocoale/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    })

    // Wait a bit for any dynamic content
    await new Promise(resolve => setTimeout(resolve, 2000))

    console.log('🔍 Extracting table data...\n')

    // Extract all table rows
    const protocols = await page.evaluate(() => {
      const results: ProtocolReference[] = []

      // Find the main protocols table
      const table = document.querySelector('table')
      if (!table) return results

      const rows = table.querySelectorAll('tr')

      rows.forEach((row, index) => {
        // Skip header row
        if (index === 0) return

        const cells = row.querySelectorAll('td')
        if (cells.length < 2) return

        // Extract code from first cell
        const codeText = cells[0]?.textContent?.trim() || ''
        const codeMatch = codeText.match(/([A-Z]\d+[A-Z\d]+)/i)
        const code = codeMatch ? codeMatch[1].toUpperCase() : null

        if (!code) return

        // Extract title/DCI from second cell (or subsequent cells)
        let title = ''
        let dci = ''

        // Sometimes the title is in cell 1, sometimes in cell 2
        for (let i = 1; i < cells.length; i++) {
          const cellText = cells[i]?.textContent?.trim() || ''

          // Skip cells that are just "(pdf)" or empty
          if (cellText === '(pdf)' || cellText === '' || cellText.length < 2) continue

          // Check if this looks like a PDF link
          const pdfLink = cells[i]?.querySelector('a[href*=".pdf"]')
          if (pdfLink) continue

          // This is likely the title/DCI
          if (!title && cellText.length > 2) {
            title = cellText
          } else if (!dci && cellText.length > 2 && cellText !== title) {
            dci = cellText
          }
        }

        // Extract PDF URL if available
        const pdfLink = row.querySelector('a[href*=".pdf"]')
        const pdfUrl = pdfLink ? (pdfLink as HTMLAnchorElement).href : undefined

        if (title || dci) {
          results.push({
            code,
            title: title || dci,
            dci: dci || undefined,
            pdfUrl
          })
        }
      })

      return results
    })

    // Deduplicate by code
    const uniqueProtocols = new Map<string, ProtocolReference>()
    protocols.forEach(p => {
      if (!uniqueProtocols.has(p.code)) {
        uniqueProtocols.set(p.code, p)
      }
    })

    const protocolArray = Array.from(uniqueProtocols.values())
      .sort((a, b) => a.code.localeCompare(b.code))

    console.log(`✅ Found ${protocolArray.length} unique protocols\n`)

    // Print first 40 for verification
    console.log('📋 Sample protocols:')
    protocolArray.slice(0, 40).forEach(p => {
      console.log(`  ${p.code}: ${p.title}`)
    })
    if (protocolArray.length > 40) {
      console.log(`  ... and ${protocolArray.length - 40} more`)
    }
    console.log('')

    return protocolArray

  } finally {
    await browser.close()
  }
}

async function main() {
  try {
    const protocols = await scrapeFormareMedicalaTable()

    // Save to JSON
    const dataDir = path.join(process.cwd(), 'data')
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true })
    }

    const outputPath = path.join(dataDir, 'formaremedicala-reference.json')
    fs.writeFileSync(
      outputPath,
      JSON.stringify(protocols, null, 2),
      'utf-8'
    )

    console.log('='.repeat(80))
    console.log('✅ Scraping complete!')
    console.log(`📁 Reference data saved to: ${outputPath}`)
    console.log(`📊 Total protocols: ${protocols.length}`)
    console.log('='.repeat(80))

  } catch (error) {
    console.error('❌ Error:', error)
    process.exit(1)
  }
}

main()
