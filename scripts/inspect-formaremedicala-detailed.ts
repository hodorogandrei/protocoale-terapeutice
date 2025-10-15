import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

/**
 * Detailed inspection of FormareMedicala.ro protocoale page
 * to understand the actual structure and protocol count
 */

async function inspectPage() {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: false, // Show browser for debugging
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('Navigating to FormareMedicala.ro protocoale page...');
    await page.goto('https://www.formaremedicala.ro/protocoale/', {
      waitUntil: 'networkidle0',
      timeout: 60000
    });

    // Wait for content to load
    await new Promise(resolve => setTimeout(resolve, 3000));

    console.log('\n=== Page Analysis ===\n');

    // Get page title and main heading
    const pageInfo = await page.evaluate(() => {
      return {
        title: document.title,
        mainHeading: document.querySelector('h1')?.textContent?.trim() || 'Not found',
        url: window.location.href
      };
    });
    console.log('Page Title:', pageInfo.title);
    console.log('Main Heading:', pageInfo.mainHeading);
    console.log('URL:', pageInfo.url);

    // Check for any text mentioning protocol count
    const protocolCountText = await page.evaluate(() => {
      const bodyText = document.body.textContent || '';
      const match = bodyText.match(/(\d+)\s*protocol/i);
      return match ? match[0] : 'Not found';
    });
    console.log('\nProtocol count mentioned:', protocolCountText);

    // Find all possible protocol containers
    const containerInfo = await page.evaluate(() => {
      const results: any = {};

      // Check for tables
      const tables = document.querySelectorAll('table');
      results.tableCount = tables.length;
      results.tableRows = Array.from(tables).map(t => t.querySelectorAll('tr').length);

      // Check for lists
      const lists = document.querySelectorAll('ul, ol');
      results.listCount = lists.length;
      results.listItems = Array.from(lists).map(l => l.querySelectorAll('li').length);

      // Check for divs with class containing 'protocol', 'entry', 'item'
      const potentialContainers = document.querySelectorAll('[class*="protocol"], [class*="entry"], [class*="item"], [class*="list"]');
      results.potentialContainers = potentialContainers.length;

      // Count all PDF links
      const pdfLinks = document.querySelectorAll('a[href*=".pdf"]');
      results.pdfLinkCount = pdfLinks.length;

      // Sample PDF links
      results.samplePdfLinks = Array.from(pdfLinks).slice(0, 10).map(link => ({
        href: link.getAttribute('href'),
        text: link.textContent?.trim().substring(0, 60)
      }));

      return results;
    });

    console.log('\n=== Container Analysis ===');
    console.log('Tables found:', containerInfo.tableCount);
    console.log('Table rows:', containerInfo.tableRows);
    console.log('Lists found:', containerInfo.listCount);
    console.log('List items:', containerInfo.listItems);
    console.log('Potential containers:', containerInfo.potentialContainers);
    console.log('PDF links:', containerInfo.pdfLinkCount);

    console.log('\n=== Sample PDF Links ===');
    containerInfo.samplePdfLinks.forEach((link: any, i: number) => {
      console.log(`${i + 1}. ${link.text}`);
      console.log(`   ${link.href}`);
    });

    // Try to extract ALL protocols using comprehensive selectors
    const allProtocols = await page.evaluate(() => {
      const protocols: Array<{code: string, title: string, pdfUrl: string, source: string}> = [];

      // Strategy 1: Find all PDF links
      const pdfLinks = Array.from(document.querySelectorAll('a[href*=".pdf"]'));

      for (const link of pdfLinks) {
        const href = link.getAttribute('href') || '';
        const fullUrl = href.startsWith('http') ? href : `https://www.formaremedicala.ro${href}`;
        const filename = href.split('/').pop() || '';
        const codeMatch = filename.match(/([A-Z]\d+[A-Z]+)\.pdf/i);

        if (codeMatch) {
          const code = codeMatch[1].toUpperCase();
          let title = link.textContent?.trim() || '';

          // Try to get title from parent elements
          if (!title || title === '(pdf)' || title.length < 5) {
            const parent = link.closest('tr, li, div, p');
            title = parent?.textContent?.trim().replace(/\(pdf\)/gi, '').trim() || '';
          }

          protocols.push({
            code,
            title: title.substring(0, 200),
            pdfUrl: fullUrl,
            source: 'pdf-link'
          });
        }
      }

      // Strategy 2: Parse tables
      const tables = document.querySelectorAll('table');
      for (const table of tables) {
        const rows = Array.from(table.querySelectorAll('tr'));
        for (const row of rows) {
          const cells = Array.from(row.querySelectorAll('td, th'));
          if (cells.length >= 2) {
            const firstCell = cells[0]?.textContent?.trim() || '';
            const secondCell = cells[1]?.textContent?.trim() || '';
            const linkInRow = row.querySelector('a[href*=".pdf"]');

            const codeMatch = firstCell.match(/^([A-Z]\d+[A-Z]+)$/i);
            if (codeMatch && linkInRow) {
              const href = linkInRow.getAttribute('href') || '';
              const fullUrl = href.startsWith('http') ? href : `https://www.formaremedicala.ro${href}`;

              protocols.push({
                code: codeMatch[1].toUpperCase(),
                title: secondCell.substring(0, 200),
                pdfUrl: fullUrl,
                source: 'table'
              });
            }
          }
        }
      }

      return protocols;
    });

    console.log(`\n=== Total Protocols Found ===`);
    console.log(`Total entries: ${allProtocols.length}`);

    // Remove duplicates
    const uniqueProtocols = Array.from(
      new Map(allProtocols.map(p => [p.code, p])).values()
    );

    console.log(`Unique protocols: ${uniqueProtocols.length}`);

    // Save to file
    const outputPath = 'data/formaremedicala-detailed-analysis.json';
    writeFileSync(outputPath, JSON.stringify({
      pageInfo,
      containerInfo,
      totalFound: allProtocols.length,
      uniqueCount: uniqueProtocols.length,
      protocols: uniqueProtocols
    }, null, 2));

    console.log(`\nSaved analysis to ${outputPath}`);

    // Show code distribution
    const codesByFirstLetter: Record<string, number> = {};
    uniqueProtocols.forEach(p => {
      const letter = p.code[0];
      codesByFirstLetter[letter] = (codesByFirstLetter[letter] || 0) + 1;
    });

    console.log('\n=== Protocol Distribution by First Letter ===');
    Object.entries(codesByFirstLetter).sort().forEach(([letter, count]) => {
      console.log(`${letter}: ${count} protocols`);
    });

    console.log('\nKeeping browser open for 10 seconds for manual inspection...');
    await new Promise(resolve => setTimeout(resolve, 10000));

    return uniqueProtocols;

  } catch (error) {
    console.error('Error:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

inspectPage()
  .then(protocols => {
    console.log(`\n✓ Analysis complete`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Analysis failed:', error);
    process.exit(1);
  });
