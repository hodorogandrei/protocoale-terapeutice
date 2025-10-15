import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';

const prisma = new PrismaClient();

/**
 * Verifies the import results and generates a comprehensive report
 */

async function verifyImportResults() {
  try {
    console.log('=== Import Verification Report ===\n');

    // Get final database counts
    const totalProtocols = await prisma.protocol.count();
    const activeProtocols = await prisma.protocol.count({ where: { status: 'active' } });
    const variantProtocols = await prisma.protocol.count({ where: { status: 'variant' } });
    const pendingProtocols = await prisma.protocol.count({ where: { status: 'pending' } });
    const discontinuedProtocols = await prisma.protocol.count({ where: { status: 'discontinued' } });

    console.log('📊 Protocol Counts:');
    console.log(`  Total: ${totalProtocols}`);
    console.log(`  Active: ${activeProtocols}`);
    console.log(`  Variant: ${variantProtocols}`);
    console.log(`  Pending: ${pendingProtocols}`);
    console.log(`  Discontinued: ${discontinuedProtocols}`);

    // Count protocols with PDFs
    const withStoredPdf = await prisma.protocol.count({ where: { storedPdfUrl: { not: null } } });
    const withoutStoredPdf = await prisma.protocol.count({ where: { storedPdfUrl: null } });

    console.log(`\n📄 PDF Availability:`);
    console.log(`  With individual PDF: ${withStoredPdf}`);
    console.log(`  Without individual PDF: ${withoutStoredPdf}`);

    // Count by first letter
    const allProtocols = await prisma.protocol.findMany({
      select: { code: true, title: true, status: true, extractionQuality: true },
      orderBy: { code: 'asc' }
    });

    const byLetter: Record<string, number> = {};
    allProtocols.forEach(p => {
      const letter = p.code[0];
      byLetter[letter] = (byLetter[letter] || 0) + 1;
    });

    console.log('\n📑 Distribution by First Letter:');
    Object.entries(byLetter).sort().forEach(([letter, count]) => {
      console.log(`  ${letter}: ${count} protocols`);
    });

    // Quality statistics
    const avgQuality = allProtocols.reduce((sum, p) => sum + p.extractionQuality, 0) / allProtocols.length;
    const highQuality = allProtocols.filter(p => p.extractionQuality >= 80).length;
    const mediumQuality = allProtocols.filter(p => p.extractionQuality >= 50 && p.extractionQuality < 80).length;
    const lowQuality = allProtocols.filter(p => p.extractionQuality < 50).length;

    console.log('\n✨ Extraction Quality:');
    console.log(`  Average quality: ${avgQuality.toFixed(1)}%`);
    console.log(`  High quality (≥80%): ${highQuality} (${(highQuality/totalProtocols*100).toFixed(1)}%)`);
    console.log(`  Medium quality (50-79%): ${mediumQuality} (${(mediumQuality/totalProtocols*100).toFixed(1)}%)`);
    console.log(`  Low quality (<50%): ${lowQuality} (${(lowQuality/totalProtocols*100).toFixed(1)}%)`);

    // Compare with FormareMedicala.ro
    const formareMedicalaData = JSON.parse(
      readFileSync('data/formaremedicala-complete-list.json', 'utf-8')
    );

    const formareCodes = new Set(formareMedicalaData.map((p: any) => p.code));
    const dbCodes = new Set(allProtocols.map(p => p.code));

    const stillMissing = formareMedicalaData.filter((p: any) => !dbCodes.has(p.code));
    const coverage = ((formareMedicalaData.length - stillMissing.length) / formareMedicalaData.length * 100).toFixed(1);

    console.log('\n🎯 Coverage vs FormareMedicala.ro:');
    console.log(`  FormareMedicala.ro protocols: ${formareMedicalaData.length}`);
    console.log(`  Protocols imported: ${formareMedicalaData.length - stillMissing.length}`);
    console.log(`  Coverage: ${coverage}%`);
    console.log(`  Still missing: ${stillMissing.length}`);

    if (stillMissing.length > 0 && stillMissing.length <= 20) {
      console.log('\n  Missing protocols:');
      stillMissing.forEach((p: any, i: number) => {
        console.log(`  ${i + 1}. ${p.code}: ${p.title.substring(0, 70)}`);
      });
    }

    // Sample newly imported protocols
    const newlyImported = allProtocols.filter(p =>
      ['A10BD24', 'D11AH-L04AA', 'L01EJ02', 'R03AL09', 'M09AX07', 'L04AC19'].includes(p.code)
    );

    if (newlyImported.length > 0) {
      console.log('\n📋 Sample Newly Imported Protocols:');
      newlyImported.forEach(p => {
        console.log(`  ${p.code}: ${p.title.substring(0, 70)}`);
        console.log(`    Status: ${p.status}, Quality: ${p.extractionQuality.toFixed(1)}%`);
      });
    }

    // Generate final report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalProtocols,
        activeProtocols,
        variantProtocols,
        pendingProtocols,
        discontinuedProtocols,
        withStoredPdf,
        withoutStoredPdf,
        avgQuality: parseFloat(avgQuality.toFixed(1)),
        highQuality,
        mediumQuality,
        lowQuality
      },
      coverage: {
        formareMedicalaTotal: formareMedicalaData.length,
        imported: formareMedicalaData.length - stillMissing.length,
        coveragePercent: parseFloat(coverage),
        stillMissing: stillMissing.length
      },
      distribution: byLetter,
      stillMissingCodes: stillMissing.map((p: any) => p.code)
    };

    writeFileSync(
      'data/import-verification-report.json',
      JSON.stringify(report, null, 2)
    );
    console.log('\n✅ Verification report saved to data/import-verification-report.json');

    return report;

  } catch (error) {
    console.error('Error verifying import:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

verifyImportResults()
  .then(() => {
    console.log('\n✓ Verification complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Verification failed:', error);
    process.exit(1);
  });
