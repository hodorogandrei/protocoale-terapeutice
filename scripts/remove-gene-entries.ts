import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Removes gene mutation entries that were incorrectly identified as protocol codes
 *
 * Gene mutations (like G551D, T790M, etc.) are genetic variants mentioned in protocol
 * documents but are not standalone therapeutic protocols themselves.
 */

async function removeGeneEntries() {
  console.log('🔍 Identifying gene mutation entries to remove...\n');

  // Known genetic mutations that were extracted as protocol codes
  // These follow standard genetic nomenclature: Letter + Digits + Letter
  const knownGeneMutations = [
    // CFTR mutations (Cystic Fibrosis)
    'G551D',  // CFTR - common cystic fibrosis mutation
    'G551S',  // CFTR mutation
    'G178R',  // CFTR mutation
    'G1244E', // CFTR mutation
    'R117H',  // CFTR mutation
    'S549N',  // CFTR mutation
    'S549R',  // CFTR mutation
    'F508',   // CFTR mutation (part of F508del)
    'DF508',  // CFTR mutation (deltaf508)

    // EGFR mutations (Lung cancer)
    'T790M',  // EGFR - lung cancer resistance mutation
    'L858R',  // EGFR - lung cancer activating mutation

    // BCR-ABL mutations (Leukemia)
    'T315I',  // BCR-ABL - leukemia resistance mutation

    // BRAF mutations (Melanoma/Cancer)
    'V600E',  // BRAF - melanoma/cancer mutation
    'V600',   // BRAF mutation prefix

    // KIT mutations (Mastocytosis)
    'D816',   // KIT mutation in mastocytosis
  ];

  // Additional patterns that look like food additives or extraction errors
  const additionalRemovalCodes = [
    'E412',   // Food additive code (guar gum)
    'E1200',  // Food additive code (polydextrose)
  ];

  const codesToRemove = [...knownGeneMutations, ...additionalRemovalCodes];

  console.log('📋 Gene mutations and invalid codes to remove:');
  codesToRemove.forEach(code => console.log(`   - ${code}`));
  console.log();

  // First, display what we're about to delete
  const entriesToDelete = await prisma.protocol.findMany({
    where: {
      code: {
        in: codesToRemove
      }
    },
    select: {
      code: true,
      title: true,
      status: true,
    }
  });

  if (entriesToDelete.length === 0) {
    console.log('✅ No gene mutation entries found. Database is clean.');
    return;
  }

  console.log(`📊 Found ${entriesToDelete.length} entries to remove:\n`);
  entriesToDelete.forEach(entry => {
    console.log(`   ${entry.code}: ${entry.title.substring(0, 80)}${entry.title.length > 80 ? '...' : ''}`);
  });
  console.log();

  // Delete the entries
  console.log('🗑️  Deleting gene mutation entries...');
  const result = await prisma.protocol.deleteMany({
    where: {
      code: {
        in: codesToRemove
      }
    }
  });

  console.log(`✅ Successfully deleted ${result.count} gene mutation entries`);
  console.log();

  // Verify deletion
  const remaining = await prisma.protocol.findMany({
    where: {
      code: {
        in: codesToRemove
      }
    }
  });

  if (remaining.length === 0) {
    console.log('✅ Verification: All gene entries have been removed');
  } else {
    console.warn(`⚠️  Warning: ${remaining.length} entries still remain`);
  }

  // Show summary statistics
  const totalProtocols = await prisma.protocol.count();
  const variantProtocols = await prisma.protocol.count({
    where: { status: 'variant' }
  });

  console.log('\n📈 Database summary:');
  console.log(`   Total protocols: ${totalProtocols}`);
  console.log(`   Variant protocols remaining: ${variantProtocols}`);
}

removeGeneEntries()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error removing gene entries:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
