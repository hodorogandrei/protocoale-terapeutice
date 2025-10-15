import { PrismaClient } from '@prisma/client';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { extractPdfContent } from '../lib/pdf-extractor';

const prisma = new PrismaClient();

/**
 * Extracts and imports missing protocols from downloaded PDFs
 * Uses the same extraction logic as the main scraper
 */

interface MissingProtocol {
  code: string;
  title: string;
  pdfUrl: string;
}

async function importMissingProtocols() {
  try {
    // Load missing protocols list
    const missingProtocols = JSON.parse(
      readFileSync('data/missing-protocols.json', 'utf-8')
    ) as MissingProtocol[];

    console.log(`Found ${missingProtocols.length} missing protocols to process\n`);

    const pdfDir = 'data/pdfs/individual';
    const stats = {
      processed: 0,
      imported: 0,
      skipped: 0,
      failed: 0,
      failedCodes: [] as string[]
    };

    for (let i = 0; i < missingProtocols.length; i++) {
      const protocol = missingProtocols[i];
      const pdfPath = join(pdfDir, `${protocol.code}.pdf`);

      // Check if PDF exists
      if (!existsSync(pdfPath)) {
        console.log(`[${i + 1}/${missingProtocols.length}] ⏭️  Skipped ${protocol.code} (PDF not found)`);
        stats.skipped++;
        continue;
      }

      // Check if already in database
      const existing = await prisma.protocol.findUnique({
        where: { code: protocol.code }
      });

      if (existing) {
        console.log(`[${i + 1}/${missingProtocols.length}] ⏭️  Skipped ${protocol.code} (already in database)`);
        stats.skipped++;
        continue;
      }

      try {
        console.log(`[${i + 1}/${missingProtocols.length}] 📄 Processing ${protocol.code}: ${protocol.title.substring(0, 60)}...`);
        stats.processed++;

        // Extract PDF content
        const extraction = await extractPdfContent(pdfPath);

        if (!extraction.rawText || extraction.rawText.length < 100) {
          console.log(`   ❌ Failed: Insufficient content extracted`);
          stats.failed++;
          stats.failedCodes.push(protocol.code);
          continue;
        }

        // Create protocol entry
        await prisma.protocol.create({
          data: {
            code: protocol.code,
            title: protocol.title,
            dci: protocol.title, // Will be refined later
            rawText: extraction.rawText,
            htmlContent: extraction.htmlContent,
            structuredJson: extraction.structuredJson as any,
            officialPdfUrl: protocol.pdfUrl,
            storedPdfUrl: `/api/pdfs-individual/${protocol.code}.pdf`,
            cnasUrl: 'https://www.formaremedicala.ro/protocoale/',
            sublists: extraction.sublists || [],
            prescribers: extraction.prescribers || [],
            keywords: extraction.keywords || [],
            categories: extraction.categories || [],
            extractionQuality: extraction.quality,
            status: 'active'
          }
        });

        console.log(`   ✅ Imported successfully (${(extraction.rawText.length / 1024).toFixed(1)}KB of text, quality: ${extraction.quality.toFixed(1)}%)`);
        stats.imported++;

      } catch (error: any) {
        console.log(`   ❌ Error processing ${protocol.code}: ${error.message}`);
        stats.failed++;
        stats.failedCodes.push(protocol.code);
      }
    }

    // Print summary
    console.log(`\n=== Import Summary ===`);
    console.log(`Total protocols: ${missingProtocols.length}`);
    console.log(`📄 Processed: ${stats.processed}`);
    console.log(`✅ Imported: ${stats.imported}`);
    console.log(`⏭️  Skipped: ${stats.skipped}`);
    console.log(`❌ Failed: ${stats.failed}`);

    if (stats.failedCodes.length > 0) {
      console.log(`\nFailed codes (${stats.failedCodes.length}):`);
      console.log(stats.failedCodes.join(', '));
    }

    // Final database count
    const totalInDb = await prisma.protocol.count();
    console.log(`\n📊 Total protocols in database: ${totalInDb}`);

    return stats;

  } catch (error) {
    console.error('Fatal error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

importMissingProtocols()
  .then(stats => {
    console.log(`\n✓ Import complete`);
    console.log(`Successfully imported ${stats.imported} new protocols`);
    console.log(`Next step: Run specialty generation and verification`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Import failed:', error);
    process.exit(1);
  });
