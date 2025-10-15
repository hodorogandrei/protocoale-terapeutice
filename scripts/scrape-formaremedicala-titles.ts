import puppeteer from 'puppeteer'
import * as fs from 'fs'
import * as path from 'path'

interface ProtocolReference {
  code: string
  title: string
  url: string
}

async function scrapeFormareMedicalaProtocols(): Promise<ProtocolReference[]> {
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

    console.log('🔍 Extracting protocol data...\n')

    // Extract all protocol links
    const protocols = await page.evaluate(() => {
      const protocolElements = document.querySelectorAll('a[href*="/protocoale/"]')
      const results: ProtocolReference[] = []

      protocolElements.forEach((element) => {
        const link = element as HTMLAnchorElement
        const href = link.href
        const text = link.textContent?.trim() || ''

        // Extract protocol code from URL or text
        // URLs look like: /protocoale/a001e-orlistatum/
        const urlMatch = href.match(/\/protocoale\/([a-z0-9]+)-/)
        const textMatch = text.match(/^([A-Z]\d+[A-Z\d]+)\s*[-:]/i)

        const code = (urlMatch ? urlMatch[1].toUpperCase() : textMatch ? textMatch[1].toUpperCase() : null)

        if (code && code !== 'PROTOCOALE') {
          // Extract title - remove code prefix if present
          let title = text
            .replace(/^[A-Z]\d+[A-Z\d]+\s*[-:]\s*/i, '')
            .trim()

          // If title is empty, try to get it from the URL slug
          if (!title) {
            const slugMatch = href.match(/\/protocoale\/[a-z0-9]+-(.+?)\/?$/)
            if (slugMatch) {
              title = slugMatch[1]
                .replace(/-/g, ' ')
                .toUpperCase()
            }
          }

          if (title) {
            results.push({
              code,
              title,
              url: href
            })
          }
        }
      })

      return results
    })

    // Deduplicate by code (keep first occurrence)
    const uniqueProtocols = new Map<string, ProtocolReference>()
    protocols.forEach(p => {
      if (!uniqueProtocols.has(p.code)) {
        uniqueProtocols.set(p.code, p)
      }
    })

    const protocolArray = Array.from(uniqueProtocols.values())
      .sort((a, b) => a.code.localeCompare(b.code))

    console.log(`✅ Found ${protocolArray.length} unique protocols\n`)

    // Print first 30 for verification
    console.log('📋 Sample protocols:')
    protocolArray.slice(0, 30).forEach(p => {
      console.log(`  ${p.code}: ${p.title}`)
    })
    console.log(`  ... and ${Math.max(0, protocolArray.length - 30)} more\n`)

    return protocolArray

  } finally {
    await browser.close()
  }
}

async function main() {
  try {
    const protocols = await scrapeFormareMedicalaProtocols()

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

    console.log('=' .repeat(80))
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
