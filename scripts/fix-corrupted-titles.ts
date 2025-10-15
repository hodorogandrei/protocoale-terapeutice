import { PrismaClient } from '@prisma/client';
import { validateAndCorrectTitle, isTitleCorrupted, findProtocolsNeedingCorrection } from '../lib/title-validator';

const prisma = new PrismaClient();

/**
 * Fix corrupted protocol titles in the database
 *
 * This script:
 * 1. Identifies protocols with corrupted titles
 * 2. Extracts proper titles from protocol rawText content
 * 3. Validates and updates titles
 */

async function fixCorruptedTitles() {
  console.log('🔍 Scanning database for corrupted protocol titles...\n');

  // Fetch all protocols
  const protocols = await prisma.protocol.findMany({
    orderBy: { code: 'asc' },
    select: {
      code: true,
      title: true,
      rawText: true,
    }
  });

  console.log(`📊 Total protocols in database: ${protocols.length}\n`);

  // Find protocols needing correction
  const needsCorrection = findProtocolsNeedingCorrection(protocols);

  console.log(`🔧 Found ${needsCorrection.length} protocols with corrupted titles\n`);

  if (needsCorrection.length === 0) {
    console.log('✅ All protocol titles are valid!');
    return;
  }

  // Show preview of corrections
  console.log('📋 Preview of corrections:\n');
  needsCorrection.slice(0, 30).forEach(({ code, currentTitle, suggestedTitle }) => {
    const currentPreview = currentTitle.length > 60
      ? currentTitle.substring(0, 57) + '...'
      : currentTitle;
    const suggestedPreview = suggestedTitle.length > 60
      ? suggestedTitle.substring(0, 57) + '...'
      : suggestedTitle;

    console.log(`${code}:`);
    console.log(`  Current:   ${currentPreview}`);
    console.log(`  Suggested: ${suggestedPreview}`);
    console.log();
  });

  if (needsCorrection.length > 30) {
    console.log(`  ... and ${needsCorrection.length - 30} more\n`);
  }

  // Apply corrections
  console.log('🔧 Applying corrections...\n');

  let updated = 0;
  let failed = 0;

  for (const { code, suggestedTitle } of needsCorrection) {
    try {
      await prisma.protocol.update({
        where: { code },
        data: {
          title: suggestedTitle,
          updatedAt: new Date()
        }
      });
      updated++;

      if (updated % 20 === 0) {
        console.log(`   ✓ Updated ${updated}/${needsCorrection.length} protocols...`);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error(`   ✗ Failed to update ${code}: ${errorMsg}`);
      failed++;
    }
  }

  console.log(`\n✅ Successfully updated: ${updated} protocols`);
  if (failed > 0) {
    console.log(`❌ Failed: ${failed} protocols`);
  }

  // Verify corrections
  console.log('\n🔍 Verifying corrections...\n');

  const verifyProtocols = await prisma.protocol.findMany({
    where: {
      code: {
        in: needsCorrection.map(p => p.code)
      }
    },
    select: {
      code: true,
      title: true,
      rawText: true
    }
  });

  const stillCorrupted = verifyProtocols.filter(p => isTitleCorrupted(p.title));

  if (stillCorrupted.length === 0) {
    console.log('✅ All corrections applied successfully!');
  } else {
    console.log(`⚠️  ${stillCorrupted.length} protocols still have issues:\n`);
    stillCorrupted.forEach(p => {
      console.log(`   ${p.code}: ${p.title.substring(0, 60)}`);
    });
  }

  // Final statistics
  const finalStats = {
    totalProtocols: protocols.length,
    corrected: updated,
    failed: failed,
    remainingIssues: stillCorrupted.length,
    successRate: Math.round((updated / needsCorrection.length) * 100)
  };

  console.log('\n📊 Final Statistics:');
  console.log(`   Total protocols: ${finalStats.totalProtocols}`);
  console.log(`   Titles corrected: ${finalStats.corrected}`);
  console.log(`   Failed updates: ${finalStats.failed}`);
  console.log(`   Remaining issues: ${finalStats.remainingIssues}`);
  console.log(`   Success rate: ${finalStats.successRate}%`);
}

fixCorruptedTitles()
  .then(() => {
    console.log('\n✨ Title correction complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error fixing corrupted titles:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
