/**
 * Clean duplicate protocol titles from content
 *
 * Many protocols have redundant headers in their content that duplicate
 * information already in the title field. This script removes those headers
 * to provide cleaner, more professional content display.
 *
 * Pattern detected: "Protocol terapeutic corespunzător poziției nr. X cod (CODE): TITLE"
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Remove redundant protocol header from text content
 *
 * Matches patterns like:
 * - Protocol terapeutic corespunzător poziției nr. 355 cod (J07BM03): DCI VACCIN PAPILOMAVIRUS
 * - "Protocol terapeutic corespunzător poziției nr. 6 cod (CI01I-HTP): HIPERTENSIUNEA..."
 *
 * Handles variations in:
 * - Quotes (leading/trailing)
 * - Spacing (multiple spaces, unicode spaces)
 * - Diacritics (poziției vs poziţiei)
 * - Multi-line headers
 */
function removeRedundantHeader(text: string): string {
  if (!text) return text;

  // Remove leading quotes that might wrap the entire content
  let cleaned = text.replace(/^[""\s]+/, '');

  // Pattern 1: Standard protocol header (case-insensitive, flexible spacing)
  // Matches: "Protocol terapeutic corespunzător poziției nr. X cod (CODE): TITLE"
  const protocolHeaderPattern = /^["\s]*protocol\s+terapeutic\s+corespunz[ăa]tor\s+pozi[țt]iei\s+nr\.\s*\d+[^:]*:\s*[^\n]+/i;

  // Try to remove the header
  cleaned = cleaned.replace(protocolHeaderPattern, '');

  // Pattern 2: Alternative format with DCI
  // Matches: "Protocol terapeutic corespunzător poziţiei nr. 366 cod (J05AX28): DCI BULEVIRTIDUM"
  const dciPattern = /^["\s]*protocol\s+terapeutic[^:]+:\s*DCI\s+[^\n]+/i;
  cleaned = cleaned.replace(dciPattern, '');

  // Clean up remaining artifacts
  cleaned = cleaned
    .replace(/^["\s]+/, '') // Remove leading quotes/whitespace
    .replace(/^\n+/, '') // Remove leading newlines
    .trim();

  return cleaned;
}

/**
 * Remove redundant headers from HTML content
 * Similar to text cleaning but handles HTML tags
 */
function removeRedundantHeaderFromHTML(html: string): string {
  if (!html) return html;

  // Remove HTML-wrapped protocol headers
  let cleaned = html;

  // Pattern for HTML-wrapped headers (e.g., <p>Protocol terapeutic...</p>)
  const htmlHeaderPattern = /<[^>]*>\s*protocol\s+terapeutic\s+corespunz[ăa]tor[^<]*<\/[^>]*>/i;
  cleaned = cleaned.replace(htmlHeaderPattern, '');

  // Remove leading empty tags
  cleaned = cleaned.replace(/^(\s|<br\s*\/?>|<p>\s*<\/p>)+/i, '');

  return cleaned.trim();
}

/**
 * Analyze a protocol to determine if it has a redundant header
 */
function hasRedundantHeader(text: string): boolean {
  if (!text) return false;

  const firstLine = text.split('\n')[0].toLowerCase().trim();
  return firstLine.includes('protocol') &&
         firstLine.includes('terapeutic') &&
         firstLine.includes('cod');
}

/**
 * Main execution
 */
async function cleanDuplicateTitles() {
  console.log('🧹 Starting duplicate title cleanup...\n');

  // Get all protocols with content
  const protocols = await prisma.protocol.findMany({
    where: {
      OR: [
        { rawText: { not: '' } },
        { htmlContent: { not: '' } }
      ]
    },
    select: {
      id: true,
      code: true,
      title: true,
      rawText: true,
      htmlContent: true,
    },
  });

  console.log(`Found ${protocols.length} protocols to analyze\n`);

  let cleaned = 0;
  let skipped = 0;
  let errors = 0;

  // Statistics
  const stats = {
    hadRedundantHeader: 0,
    textCleaned: 0,
    htmlCleaned: 0,
    averageCharsRemoved: 0,
    totalCharsRemoved: 0,
  };

  for (const protocol of protocols) {
    try {
      const hasHeader = hasRedundantHeader(protocol.rawText);

      if (!hasHeader) {
        skipped++;
        continue;
      }

      stats.hadRedundantHeader++;

      // Clean text content
      const originalTextLength = protocol.rawText.length;
      const cleanedText = removeRedundantHeader(protocol.rawText);
      const textCharsRemoved = originalTextLength - cleanedText.length;

      // Clean HTML content
      const originalHtmlLength = protocol.htmlContent.length;
      const cleanedHtml = removeRedundantHeaderFromHTML(protocol.htmlContent);
      const htmlCharsRemoved = originalHtmlLength - cleanedHtml.length;

      // Only update if something changed
      if (textCharsRemoved > 0 || htmlCharsRemoved > 0) {
        await prisma.protocol.update({
          where: { id: protocol.id },
          data: {
            rawText: cleanedText,
            htmlContent: cleanedHtml,
          },
        });

        cleaned++;

        if (textCharsRemoved > 0) stats.textCleaned++;
        if (htmlCharsRemoved > 0) stats.htmlCleaned++;

        stats.totalCharsRemoved += textCharsRemoved + htmlCharsRemoved;

        // Show progress
        if (cleaned % 50 === 0) {
          console.log(`Progress: ${cleaned} protocols cleaned`);
        }

        // Show example for first few
        if (cleaned <= 3) {
          console.log(`\n✨ Cleaned ${protocol.code}: ${protocol.title.substring(0, 50)}...`);
          console.log(`   Removed ${textCharsRemoved} chars from text, ${htmlCharsRemoved} chars from HTML`);
        }
      } else {
        skipped++;
      }

    } catch (error) {
      errors++;
      console.error(`❌ Error processing ${protocol.code}:`, error);
    }
  }

  console.log('\n✅ Cleanup complete!\n');
  console.log('Statistics:');
  console.log(`  Total protocols analyzed: ${protocols.length}`);
  console.log(`  Had redundant headers: ${stats.hadRedundantHeader}`);
  console.log(`  Successfully cleaned: ${cleaned}`);
  console.log(`  Skipped (no header): ${skipped}`);
  console.log(`  Errors: ${errors}`);
  console.log(`\nContent cleaning:`);
  console.log(`  Text content cleaned: ${stats.textCleaned}`);
  console.log(`  HTML content cleaned: ${stats.htmlCleaned}`);
  console.log(`  Total characters removed: ${stats.totalCharsRemoved.toLocaleString()}`);

  if (cleaned > 0) {
    stats.averageCharsRemoved = Math.round(stats.totalCharsRemoved / cleaned);
    console.log(`  Average chars removed per protocol: ${stats.averageCharsRemoved}`);
  }

  console.log('\n💡 Tip: Run the extraction scripts with the updated header removal logic');
  console.log('   to prevent duplicates in future protocol imports.');
}

// Execute
cleanDuplicateTitles()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
