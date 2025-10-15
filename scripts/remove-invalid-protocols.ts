import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * Removes truly invalid protocol entries from the database
 *
 * This script removes fragment entries, table rows, and other extraction artifacts
 * that don't represent actual therapeutic protocols.
 *
 * Entries with corrupted TITLES but valid CONTENT are kept (to be fixed separately).
 */

async function removeInvalidProtocols() {
  console.log('🔍 Identifying truly invalid protocol entries for removal...\n');

  // Categories of codes to remove with justification
  const removalCategories: Record<string, string[]> = {
    // Pure DCI fragments with no real protocol content
    'DCI_FRAGMENTS': [
      'A017E',  // "): DCI"
      'A018E',  // "): DCI"
      'A024E',  // "): DCI"
      'A16AB09', // "): DCI"
      'A16AX03', // "): DCI"
      'C02KX02', // "): DCI"
      'C07FX05', // "): DCI"
      'C10BA06', // "): DCI"
      'G002N',   // "): DCI"
      'G004N',   // "): DCI"
      'G005N',   // "): DCI"
      'G006N',   // "): DCI"
      'G007N',   // "): DCI"
      'G008N',   // "): DCI"
      'G009N',   // "): DCI"
      'G010N',   // "): DCI"
      'H003N',   // "): DCI"
      'J006N',   // "): DCI"
      'J009N',   // "): DCI"
    ],

    // Section headers only (not protocols)
    'SECTION_HEADERS': [
      'A006E',  // "Indicaţii"
      'B009N',  // "Indicaţii"
      'B010N',  // "Indicaţii"
      'B011N',  // "IndicaĠii"
      'J002N',  // "Indicaţii"
      'J005N',  // "Indicaţii"
      'J007N',  // "Indicaţii"
    ],

    // Table fragments (full table rows extracted as protocols)
    'TABLE_FRAGMENTS': [
      'A020E',    // COD PROTOCOL table row
      'A05AA04',  // COD PROTOCOL table row
      'B02BX05',  // COD PROTOCOL table row
    ],

    // Empty code references (incomplete extractions)
    'EMPTY_CODE_REFS': [
      'A025E',     // "Protocol terapeutic nr. 19 cod ()"
      'A16AA04',   // "Protocol terapeutic 272 cod ()"
      'J01XB01',   // "Protocol terapeutic ... cod ( )"
      'J05AX12',   // "Protocol terapeutic ... cod ()"
      'L01FX25',   // "Protocol terapeutic ... cod ()"
      'L01XE17',   // "Protocol terapeutic ... cod ( )"
      'L047E',     // "Protocol terapeutic ... cod ()"
    ],

    // Biomarker/lab test codes (not therapeutic protocols)
    'BIOMARKERS': [
      'CD26',    // Fragment: "sau CD4+/ -)"
      'IL17RA',  // Fragment: "complexul receptorului..."
      'P450',    // Fragment: "enzimele citocromului"
      'AP50',    // Fragment: "alterne a complementului"
      'B19',     // Fragment: "hepatitei A şi parvovirusul"
      'B27',     // Fragment: "antigenul HLA - prezent"
      'CA125',   // Lab marker fragment
      'PC20',    // Lab test fragment
    ],

    // Other invalid codes (food additives, misc fragments)
    'OTHER_FRAGMENTS': [
      'E420',    // Food additive code (sorbitol)
      'B12',     // Vitamin fragment
      'B01AF01', // Fragment: ") şoldului sau genunchiului"
      'B01AF02', // Fragment: ") şoldului sau genunchiului continuat"
      'B02BD14', // Reference fragment
      'C09DB05', // Fragment: "poziției nr. 281 cod ()"
      'D002L',   // Fragment
      'G001C',   // Fragment
      'G31C',    // Fragment: "C1-"
      'H006C',   // Fragment: "corespunzător poziţiei nr. 8"
      'H006E',   // Fragment: "poziţiei nr. 95 cod ( )"
      'H011Q',   // Fragment: "poziţiei nr. 96, cod :"
      'L022B',   // Fragment: ", cod ( ): EPOETINUM"
      'L047C',   // Fragment: "corespunzător poziţiei nr. 206"
    ],

    // ATC code fragments (not protocols)
    'ATC_FRAGMENTS': [
      'L01BC59',  // ATC code only
      'L01FF',    // ATC code only: "L01EX DCI"
      'L01XC13',  // Fragment: "): DCI"
      'L01XC21',  // Too short/fragment
      'L01XC26',  // Too short/fragment
      'L01XX19',  // ATC code fragment
      'L01XX50',  // ATC code fragment
      'L01XX52',  // ATC code fragment
      'L01XX63',  // ATC code fragment
      'L04AC08',  // ATC code fragment
      'M09AX03',  // ATC code fragment
      'M09AX07',  // ATC code fragment
      'R03AL06',  // ATC code fragment
      'R07AX32',  // ATC code fragment
      'S01LA06',  // ATC code fragment
    ],

    // Complex/malformed hybrid codes
    'MALFORMED_CODES': [
      'B01AC21-HTAPCT',      // Hybrid code
      'J06BA01-PDICDCI',     // Malformed code
      'L04AA43-HPNRAVULIZUMABUM', // Malformed code
      'R03DX05-UCSURTICARIE', // Hybrid code
    ],

    // Short variant codes that are fragments
    'VARIANT_FRAGMENTS': [
      'G31F',    // Fragment with "variant" status
      'L01',     // Too short: "TISAGENLECLEUCEL TISAGENLECLEUCEL"
      'BD01D',   // Duplicate title fragment
      'CI01I',   // Fragment
    ],
  };

  // Flatten all codes to remove
  const allCodesToRemove = Object.values(removalCategories).flat();
  console.log(`📊 Total codes marked for removal: ${allCodesToRemove.length}\n`);

  // Show breakdown by category
  console.log('📋 Breakdown by category:\n');
  Object.entries(removalCategories).forEach(([category, codes]) => {
    console.log(`  ${category}: ${codes.length} codes`);
  });
  console.log();

  // Fetch entries to be deleted
  const entriesToDelete = await prisma.protocol.findMany({
    where: {
      code: { in: allCodesToRemove }
    },
    select: {
      code: true,
      title: true,
      status: true,
    },
    orderBy: { code: 'asc' }
  });

  if (entriesToDelete.length === 0) {
    console.log('✅ No invalid entries found. Database is clean.');
    return;
  }

  console.log(`\n🗑️  Entries to be deleted (${entriesToDelete.length}):\n`);
  entriesToDelete.forEach(entry => {
    const titlePreview = entry.title.length > 60
      ? entry.title.substring(0, 57) + '...'
      : entry.title;
    console.log(`  ${entry.code.padEnd(20)} [${entry.status}]: ${titlePreview}`);
  });
  console.log();

  // Perform deletion
  console.log('🗑️  Deleting invalid protocol entries...');
  const result = await prisma.protocol.deleteMany({
    where: {
      code: { in: allCodesToRemove }
    }
  });

  console.log(`✅ Successfully deleted ${result.count} invalid entries\n`);

  // Verify deletion
  const remaining = await prisma.protocol.findMany({
    where: {
      code: { in: allCodesToRemove }
    }
  });

  if (remaining.length === 0) {
    console.log('✅ Verification: All invalid entries have been removed');
  } else {
    console.warn(`⚠️  Warning: ${remaining.length} entries still remain`);
    remaining.forEach(r => console.log(`   - ${r.code}`));
  }

  // Show summary statistics
  const totalProtocols = await prisma.protocol.count();
  const activeProtocols = await prisma.protocol.count({ where: { status: 'active' } });
  const variantProtocols = await prisma.protocol.count({ where: { status: 'variant' } });
  const pendingProtocols = await prisma.protocol.count({ where: { status: 'pending' } });

  console.log('\n📈 Database summary after cleanup:');
  console.log(`   Total protocols: ${totalProtocols}`);
  console.log(`   - Active: ${activeProtocols}`);
  console.log(`   - Variant: ${variantProtocols}`);
  console.log(`   - Pending: ${pendingProtocols}`);
}

removeInvalidProtocols()
  .then(() => {
    console.log('\n✨ Cleanup complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error removing invalid protocols:', error);
    process.exit(1);
  })
  .finally(() => {
    prisma.$disconnect();
  });
