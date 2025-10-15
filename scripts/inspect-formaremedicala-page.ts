import puppeteer from 'puppeteer'

async function inspectPage() {
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

    console.log('🔍 Inspecting page structure...\n')

    // Get page HTML snippet
    const pageInfo = await page.evaluate(() => {
      // Get all links
      const allLinks = Array.from(document.querySelectorAll('a'))
      const protocolLinks = allLinks.filter(a => a.href.includes('protocoale'))

      // Get all headings
      const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5'))
        .map(h => ({
          tag: h.tagName,
          text: h.textContent?.trim().substring(0, 100)
        }))

      // Get main content area
      const mainContent = document.querySelector('main, article, .content, .main, #content')
      const mainHTML = mainContent ? mainContent.innerHTML.substring(0, 2000) : 'No main content found'

      return {
        totalLinks: allLinks.length,
        protocolLinks: protocolLinks.length,
        protocolLinkSamples: protocolLinks.slice(0, 10).map(a => ({
          href: a.href,
          text: a.textContent?.trim().substring(0, 100),
          classes: a.className,
          parent: a.parentElement?.tagName
        })),
        headings,
        mainHTMLSnippet: mainHTML
      }
    })

    console.log('Page Analysis:')
    console.log('=' .repeat(80))
    console.log(`Total links: ${pageInfo.totalLinks}`)
    console.log(`Protocol links: ${pageInfo.protocolLinks}`)
    console.log('')
    console.log('Protocol Link Samples:')
    pageInfo.protocolLinkSamples.forEach((link, i) => {
      console.log(`\n${i + 1}. ${link.href}`)
      console.log(`   Text: ${link.text}`)
      console.log(`   Classes: ${link.classes}`)
      console.log(`   Parent: ${link.parent}`)
    })
    console.log('\n' + '='.repeat(80))
    console.log('Headings on page:')
    pageInfo.headings.forEach(h => {
      console.log(`${h.tag}: ${h.text}`)
    })
    console.log('\n' + '='.repeat(80))
    console.log('Main content HTML snippet:')
    console.log(pageInfo.mainHTMLSnippet.substring(0, 1000))
    console.log('...')

  } finally {
    await browser.close()
  }
}

inspectPage()
