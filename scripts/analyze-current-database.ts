import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Analyzes current database state to understand what protocols we have
 */

async function analyzeDatabase() {
  try {
    console.log('=== Database Analysis ===\n');

    // Total counts
    const totalProtocols = await prisma.protocol.count();
    console.log(`Total protocols in database: ${totalProtocols}`);

    // Count by status
    const statusCounts = await prisma.protocol.groupBy({
      by: ['status'],
      _count: true
    });

    console.log('\nProtocols by status:');
    statusCounts.forEach(s => {
      console.log(`  ${s.status}: ${s._count}`);
    });

    // Count with PDFs
    const withStoredPdf = await prisma.protocol.count({
      where: { storedPdfUrl: { not: null } }
    });
    const withOfficialPdf = totalProtocols; // officialPdfUrl is not nullable

    console.log(`\nProtocols with stored PDF: ${withStoredPdf}`);
    console.log(`Protocols with official PDF: ${withOfficialPdf}`);

    // Get all protocol codes
    const allProtocols = await prisma.protocol.findMany({
      select: {
        code: true,
        title: true,
        status: true,
        storedPdfUrl: true,
        officialPdfUrl: true
      },
      orderBy: { code: 'asc' }
    });

    console.log('\n=== All Protocol Codes ===');

    // Group by first letter
    const byLetter: Record<string, number> = {};
    allProtocols.forEach(p => {
      const letter = p.code[0];
      byLetter[letter] = (byLetter[letter] || 0) + 1;
    });

    console.log('\nDistribution by first letter:');
    Object.entries(byLetter).sort().forEach(([letter, count]) => {
      console.log(`  ${letter}: ${count} protocols`);
    });

    // Find protocols without any PDF
    const noPdf = allProtocols.filter(p => !p.storedPdfUrl && !p.officialPdfUrl);
    console.log(`\nProtocols without any PDF: ${noPdf.length}`);
    if (noPdf.length > 0 && noPdf.length <= 20) {
      noPdf.forEach(p => {
        console.log(`  ${p.code}: ${p.title.substring(0, 60)}`);
      });
    }

    // Save full list to file
    const fs = require('fs');
    fs.writeFileSync(
      'data/current-database-protocols.json',
      JSON.stringify(allProtocols, null, 2)
    );
    console.log('\n✓ Saved full protocol list to data/current-database-protocols.json');

    // Also save just the codes for easy comparison
    const codes = allProtocols.map(p => p.code);
    fs.writeFileSync(
      'data/current-database-codes.txt',
      codes.join('\n')
    );
    console.log('✓ Saved protocol codes to data/current-database-codes.txt');

    // Sample protocols
    console.log('\n=== Sample Protocols (first 20) ===');
    allProtocols.slice(0, 20).forEach(p => {
      const pdfStatus = p.storedPdfUrl ? '📄' : p.officialPdfUrl ? '📋' : '❌';
      console.log(`${pdfStatus} ${p.code}: ${p.title.substring(0, 70)}`);
    });

  } catch (error) {
    console.error('Error analyzing database:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

analyzeDatabase()
  .then(() => {
    console.log('\n✓ Database analysis complete');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Analysis failed:', error);
    process.exit(1);
  });
