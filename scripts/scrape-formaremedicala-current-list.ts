import puppeteer from 'puppeteer';
import { writeFileSync } from 'fs';

/**
 * Scrapes the current protocol list from FormareMedicala.ro
 * to identify all available protocols and compare with our database
 */

interface ProtocolEntry {
  code: string;
  title: string;
  pdfUrl: string;
}

async function scrapeFormareMedicalaList(): Promise<ProtocolEntry[]> {
  console.log('Launching browser...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36');

    console.log('Navigating to FormareMedicala.ro protocoale page...');
    await page.goto('https://www.formaremedicala.ro/protocoale/', {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    console.log('Extracting protocol entries...');

    // Extract all protocol links from the page
    const protocols = await page.evaluate(() => {
      const entries: ProtocolEntry[] = [];

      // Try different selectors to find protocol links
      const links = Array.from(document.querySelectorAll('a[href*=".pdf"]'));

      for (const link of links) {
        const href = link.getAttribute('href');
        if (!href || !href.includes('.pdf')) continue;

        // Extract protocol code from filename (e.g., A001E.pdf -> A001E)
        const filename = href.split('/').pop() || '';
        const codeMatch = filename.match(/([A-Z]\d+[A-Z]+)\.pdf/i);

        if (codeMatch) {
          const code = codeMatch[1].toUpperCase();
          const title = link.textContent?.trim() || '';
          const pdfUrl = href.startsWith('http') ? href : `https://www.formaremedicala.ro${href}`;

          entries.push({ code, title, pdfUrl });
        }
      }

      // Also try to extract from table if present
      const tableRows = Array.from(document.querySelectorAll('table tr'));
      for (const row of tableRows) {
        const cells = Array.from(row.querySelectorAll('td'));
        if (cells.length >= 2) {
          const codeCell = cells[0]?.textContent?.trim() || '';
          const titleCell = cells[1]?.textContent?.trim() || '';
          const linkInRow = row.querySelector('a[href*=".pdf"]');

          const codeMatch = codeCell.match(/^([A-Z]\d+[A-Z]+)$/i);
          if (codeMatch && linkInRow) {
            const href = linkInRow.getAttribute('href') || '';
            const pdfUrl = href.startsWith('http') ? href : `https://www.formaremedicala.ro${href}`;
            entries.push({
              code: codeMatch[1].toUpperCase(),
              title: titleCell,
              pdfUrl
            });
          }
        }
      }

      return entries;
    });

    console.log(`\nFound ${protocols.length} protocol entries`);

    // Remove duplicates by code
    const uniqueProtocols = Array.from(
      new Map(protocols.map(p => [p.code, p])).values()
    );

    console.log(`Unique protocols: ${uniqueProtocols.length}`);

    // Save to JSON file
    const outputPath = 'data/formaremedicala-current-list.json';
    writeFileSync(outputPath, JSON.stringify(uniqueProtocols, null, 2));
    console.log(`\nSaved protocol list to ${outputPath}`);

    // Display sample
    console.log('\nSample protocols:');
    uniqueProtocols.slice(0, 10).forEach(p => {
      console.log(`  ${p.code}: ${p.title.substring(0, 60)}...`);
    });

    return uniqueProtocols;

  } catch (error) {
    console.error('Error scraping FormareMedicala.ro:', error);
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeFormareMedicalaList()
  .then(protocols => {
    console.log(`\n✓ Successfully scraped ${protocols.length} protocols from FormareMedicala.ro`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Scraping failed:', error);
    process.exit(1);
  });
