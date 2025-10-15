import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';

const prisma = new PrismaClient();

/**
 * Compares FormareMedicala.ro protocol list with our database
 * to identify missing protocols that need to be imported
 */

interface FormareMedicalaProtocol {
  code: string;
  title: string;
  pdfUrl: string;
}

async function compareAndFindMissing() {
  try {
    // Load FormareMedicala.ro complete list
    const formareMedicalaData = JSON.parse(
      readFileSync('data/formaremedicala-complete-list.json', 'utf-8')
    ) as FormareMedicalaProtocol[];

    console.log(`FormareMedicala.ro protocols: ${formareMedicalaData.length}`);

    // Load all protocols from database
    const dbProtocols = await prisma.protocol.findMany({
      select: { code: true, title: true, status: true }
    });

    console.log(`Database protocols: ${dbProtocols.length}`);

    // Create sets for comparison
    const dbCodes = new Set(dbProtocols.map(p => p.code));
    const formareCodes = new Set(formareMedicalaData.map(p => p.code));

    // Find missing protocols (in FormareMedicala but not in DB)
    const missingProtocols = formareMedicalaData.filter(p => !dbCodes.has(p.code));

    // Find extra protocols (in DB but not in FormareMedicala)
    const extraProtocols = dbProtocols.filter(p => !formareCodes.has(p.code));

    console.log(`\n=== Comparison Results ===`);
    console.log(`Missing protocols (need to import): ${missingProtocols.length}`);
    console.log(`Extra protocols (in DB only): ${extraProtocols.length}`);
    console.log(`Common protocols: ${dbProtocols.length - extraProtocols.length}`);

    // Analyze missing protocols by first letter
    const missingByLetter: Record<string, number> = {};
    missingProtocols.forEach(p => {
      const letter = p.code[0];
      missingByLetter[letter] = (missingByLetter[letter] || 0) + 1;
    });

    console.log(`\n=== Missing Protocols by First Letter ===`);
    Object.entries(missingByLetter).sort().forEach(([letter, count]) => {
      console.log(`  ${letter}: ${count} protocols`);
    });

    // Show first 30 missing protocols
    console.log(`\n=== First 30 Missing Protocols ===`);
    missingProtocols.slice(0, 30).forEach((p, i) => {
      console.log(`${i + 1}. ${p.code}: ${p.title.substring(0, 80)}`);
    });

    // Analyze extra protocols
    console.log(`\n=== Extra Protocols (in DB but not in FormareMedicala) ===`);
    const extraByStatus: Record<string, number> = {};
    extraProtocols.forEach(p => {
      extraByStatus[p.status] = (extraByStatus[p.status] || 0) + 1;
    });

    console.log('Extra protocols by status:');
    Object.entries(extraByStatus).forEach(([status, count]) => {
      console.log(`  ${status}: ${count}`);
    });

    if (extraProtocols.length <= 30) {
      console.log('\nExtra protocols list:');
      extraProtocols.forEach((p, i) => {
        console.log(`${i + 1}. [${p.status}] ${p.code}: ${p.title.substring(0, 70)}`);
      });
    }

    // Save results to files
    writeFileSync(
      'data/missing-protocols.json',
      JSON.stringify(missingProtocols, null, 2)
    );
    console.log(`\n✓ Saved missing protocols to data/missing-protocols.json`);

    writeFileSync(
      'data/extra-protocols.json',
      JSON.stringify(extraProtocols, null, 2)
    );
    console.log('✓ Saved extra protocols to data/extra-protocols.json');

    // Create summary report
    const summary = {
      timestamp: new Date().toISOString(),
      formareMedicalaCount: formareMedicalaData.length,
      databaseCount: dbProtocols.length,
      missingCount: missingProtocols.length,
      extraCount: extraProtocols.length,
      commonCount: dbProtocols.length - extraProtocols.length,
      missingByLetter,
      extraByStatus,
      gap: formareMedicalaData.length - dbProtocols.length + extraProtocols.length
    };

    writeFileSync(
      'data/comparison-summary.json',
      JSON.stringify(summary, null, 2)
    );
    console.log('✓ Saved comparison summary to data/comparison-summary.json');

    // Analysis summary
    console.log(`\n=== Summary ===`);
    console.log(`FormareMedicala.ro has ${formareMedicalaData.length} protocols`);
    console.log(`Our database has ${dbProtocols.length} protocols`);
    console.log(`We need to add ${missingProtocols.length} new protocols`);
    console.log(`We have ${extraProtocols.length} protocols not on FormareMedicala`);
    console.log(`Net gap to fill: ${summary.gap} protocols`);

    return { missingProtocols, extraProtocols, summary };

  } catch (error) {
    console.error('Error comparing protocols:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

compareAndFindMissing()
  .then(result => {
    console.log(`\n✓ Comparison complete`);
    console.log(`Next step: Download ${result.missingProtocols.length} missing PDFs and import them`);
    process.exit(0);
  })
  .catch(error => {
    console.error('\n✗ Comparison failed:', error);
    process.exit(1);
  });
